import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as cannedResponseRepo from '../repositories/canned-response-repository';

export const cannedResponseRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      return withCorrelationError('cannedResponse.list', async () => {
        return cannedResponseRepo.listByTenantAndProject(
          ctx.user.tenantId,
          input.projectId ?? null
        );
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional().nullable(),
        shortcut: z.string().min(1, 'Shortcut is required'),
        content: z.string().min(1, 'Content is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('cannedResponse.create', async () => {
        return cannedResponseRepo.create(ctx.user.tenantId, {
          projectId: input.projectId ?? null,
          shortcut: input.shortcut,
          content: input.content,
        });
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        shortcut: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('cannedResponse.update', async (correlationId) => {
        const result = await cannedResponseRepo.update(
          input.id,
          ctx.user.tenantId,
          { shortcut: input.shortcut, content: input.content }
        );
        if (!result) throwNotFoundWithId(correlationId, 'Canned response not found');
        return result;
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('cannedResponse.remove', async (correlationId) => {
        const ok = await cannedResponseRepo.remove(input.id, ctx.user.tenantId);
        if (!ok) throwNotFoundWithId(correlationId, 'Canned response not found');
        return { success: true };
      });
    }),
});
