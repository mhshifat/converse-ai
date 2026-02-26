import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId, throwBadRequestWithId } from '@/server/trpc-error';
import * as humanAgentRepo from '../repositories/human-agent-repository';
import { prisma } from '@/lib/prisma';

export const humanAgentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return withCorrelationError('humanAgents.list', async () => {
      return humanAgentRepo.listByTenant(ctx.user.tenantId);
    });
  }),

  listTenantUsers: protectedProcedure.query(async ({ ctx }) => {
    return withCorrelationError('humanAgents.listTenantUsers', async () => {
      const users = await prisma.user.findMany({
        where: { tenant_id: ctx.user.tenantId },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
      return users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    });
  }),

  add: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), displayName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('humanAgents.add', async (correlationId) => {
        const added = await humanAgentRepo.add(
          ctx.user.tenantId,
          input.userId,
          input.displayName
        );
        if (!added) throwBadRequestWithId(correlationId, 'User not found in your tenant or already a human agent');
        return added;
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('humanAgents.remove', async (correlationId) => {
        const ok = await humanAgentRepo.remove(input.id, ctx.user.tenantId);
        if (!ok) throwNotFoundWithId(correlationId, 'Human agent not found');
        return { success: true };
      });
    }),

  setAvailability: protectedProcedure
    .input(z.object({ isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('humanAgents.setAvailability', async () => {
        await humanAgentRepo.setAvailability(
          ctx.user.id,
          ctx.user.tenantId,
          input.isAvailable
        );
        return { success: true };
      });
    }),
});
