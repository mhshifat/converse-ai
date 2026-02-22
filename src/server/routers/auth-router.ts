import { z } from 'zod';
import { nanoid } from 'nanoid';
import { publicProcedure, router } from '../trpc';
import { AuthProviderFactory } from '../../../auth/auth-provider-factory';
import { prisma } from '../../../lib/prisma';
import { generateCorrelationId } from '../../../lib/logging/correlation-id';
import { sessionOptions, SessionUser } from '../../../lib/session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export const authRouter = router({
  signup: publicProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      tenant: z.string().min(2).optional(),
    }))
    .mutation(async ({ input }) => {
      const correlationId = generateCorrelationId();
      try {
        const slug = input.tenant
          ? input.tenant.toLowerCase().replace(/\s+/g, '-')
          : `user-${nanoid(10)}`;
        const name = input.tenant ?? 'Personal';
        let tenantRecord = await prisma.tenant.findUnique({ where: { slug } });
        if (!tenantRecord) {
          tenantRecord = await prisma.tenant.create({
            data: { name, slug },
          });
        }
        const provider = AuthProviderFactory.getProvider('email');
        const result = await provider.signUp({
          name: input.name,
          email: input.email,
          password: input.password,
          tenantId: tenantRecord.id,
        });
        if (!result.success || !result.user) {
          return { success: false, error: result.error, correlationId };
        }
        // Set session cookie with permissions
        const session = await getIronSession(cookies(), sessionOptions);
        session.user = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          tenantId: result.user.tenantId,
          permissions: result.user.permissions,
        };
        await session.save();
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Signup failed', correlationId };
      }
    }),
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const correlationId = generateCorrelationId();
      try {
        const provider = AuthProviderFactory.getProvider('email');
        const result = await provider.signIn({ email: input.email, password: input.password });
        if (!result.success || !result.user) {
          return { success: false, error: result.error, correlationId };
        }
        // Set session cookie with permissions
        const session = await getIronSession(cookies(), sessionOptions);
        session.user = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          tenantId: result.user.tenantId,
          permissions: result.user.permissions,
        };
        await session.save();
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Login failed', correlationId };
      }
    }),
  logout: publicProcedure.mutation(async () => {
    const session = await getIronSession(cookies(), sessionOptions);
    session.destroy();
    return { success: true };
  }),
  me: publicProcedure.query(async () => {
    const session = await getIronSession(cookies(), sessionOptions);
    return { user: session.user || null };
  }),
});
