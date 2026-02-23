import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as chatbotRepo from '../repositories/chatbot-repository';

export const chatbotRouter = router({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('chatbot.getByProjectId', async () => {
        return chatbotRepo.getChatbotByProjectId(
          input.projectId,
          ctx.user.tenantId
        );
      });
    }),

  getOrCreateForProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('chatbot.getOrCreateForProject', async (correlationId) => {
        const chatbot = await chatbotRepo.getOrCreateChatbotForProject(
          input.projectId,
          ctx.user.tenantId
        );
        if (!chatbot) throwNotFoundWithId(correlationId, 'Project not found');
        return chatbot;
      });
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        chatbotId: z.string().uuid(),
        config: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('chatbot.updateConfig', async (correlationId) => {
        const updated = await chatbotRepo.updateChatbotConfig(
          input.chatbotId,
          ctx.user.tenantId,
          input.config
        );
        if (!updated) throwNotFoundWithId(correlationId, 'Chatbot not found');
        return updated;
      });
    }),

  regenerateApiKey: protectedProcedure
    .input(z.object({ chatbotId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('chatbot.regenerateApiKey', async (correlationId) => {
        const result = await chatbotRepo.regenerateChatbotApiKey(
          input.chatbotId,
          ctx.user.tenantId
        );
        if (!result) throwNotFoundWithId(correlationId, 'Chatbot not found');
        return result;
      });
    }),
});
