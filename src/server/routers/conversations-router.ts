import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as conversationRepo from '../repositories/conversation-repository';

export const conversationsRouter = router({
  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().uuid().optional(),
        status: z.enum(['active', 'closed']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return withCorrelationError('conversations.listByProject', async () => {
        return conversationRepo.listConversationsByProject(
          input.projectId,
          ctx.user.tenantId,
          {
            limit: input.limit,
            cursor: input.cursor,
            status: input.status,
          }
        );
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('conversations.getById', async (correlationId) => {
        const conversation = await conversationRepo.getConversationById(
          input.id,
          ctx.user.tenantId
        );
        if (!conversation) throwNotFoundWithId(correlationId, 'Conversation not found');
        return conversation;
      });
    }),
});
