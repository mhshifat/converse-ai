import { z } from 'zod';
import { nanoid } from 'nanoid';
import { publicProcedure, router } from '../trpc';
import { AuthProviderFactory } from '../../auth/auth-provider-factory';
import { prisma } from '../../lib/prisma';
import { generateCorrelationId } from '../../lib/logging/correlation-id';
import { handleError } from '../../lib/logging/error-utils';
import { sessionOptions, type SessionData } from '../../lib/session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import {
  createVerificationToken,
  sendVerificationEmail,
  verifyEmailToken,
} from '../services/verification-service';

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
        const token = await createVerificationToken(result.user.id);
        const emailResult = await sendVerificationEmail(result.user.email, token);
        if (!emailResult.sent && emailResult.error) {
          // User created but email may not have been sent; still return success and they can use resend
          return {
            success: true,
            requiresVerification: true,
            emailSent: false,
            emailError: emailResult.error,
            correlationId,
          };
        }
        return {
          success: true,
          requiresVerification: true,
          emailSent: emailResult.sent,
          correlationId,
        };
      } catch (error: unknown) {
        const { userMessage, correlationId: cid } = handleError({
          error,
          correlationId,
          context: 'auth.signup',
        });
        return { success: false, error: userMessage, correlationId: cid };
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
        if (!result.success) {
          return {
            success: false,
            error: result.error,
            correlationId,
            emailNotVerified: result.error === 'EMAIL_NOT_VERIFIED',
          };
        }
        if (!result.user) {
          return { success: false, error: result.error ?? 'Login failed', correlationId };
        }
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
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
      } catch (error: unknown) {
        const { userMessage, correlationId: cid } = handleError({
          error,
          correlationId,
          context: 'auth.login',
        });
        return { success: false, error: userMessage, correlationId: cid };
      }
    }),
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const correlationId = generateCorrelationId();
      try {
        const result = await verifyEmailToken(input.token);
        return result.success ? result : { ...result, correlationId };
      } catch (error: unknown) {
        const { userMessage, correlationId: cid } = handleError({
          error,
          correlationId,
          context: 'auth.verifyEmail',
        });
        return { success: false, error: userMessage, correlationId: cid };
      }
    }),
  resendVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const correlationId = generateCorrelationId();
      try {
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) {
          return { success: false, error: 'No account found with this email', correlationId };
        }
        if ((user as { email_verified?: boolean }).email_verified) {
          return { success: true, alreadyVerified: true };
        }
        const token = await createVerificationToken(user.id);
        const emailResult = await sendVerificationEmail(user.email, token);
        if (!emailResult.sent) {
          return {
            success: false,
            error: emailResult.error ?? 'Failed to send verification email',
            correlationId,
          };
        }
        return { success: true };
      } catch (error: unknown) {
        const { userMessage, correlationId: cid } = handleError({
          error,
          correlationId,
          context: 'auth.resendVerification',
        });
        return { success: false, error: userMessage, correlationId: cid };
      }
    }),
  logout: publicProcedure.mutation(async () => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.destroy();
    return { success: true };
  }),
  me: publicProcedure.query(async () => {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    return { user: session.user ?? null };
  }),
});
