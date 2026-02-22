import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as chatbotRepo from '../repositories/chatbot-repository';

export const chatbotRouter = router({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const chatbot = await chatbotRepo.getChatbotByProjectId(
        input.projectId,
        ctx.user.tenantId
      );
      return chatbot;
    }),

  getOrCreateForProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const chatbot = await chatbotRepo.getOrCreateChatbotForProject(
        input.projectId,
        ctx.user.tenantId
      );
      if (!chatbot) throw new Error('Project not found');
      return chatbot;
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        chatbotId: z.string().uuid(),
        config: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await chatbotRepo.updateChatbotConfig(
        input.chatbotId,
        ctx.user.tenantId,
        input.config
      );
      if (!updated) throw new Error('Chatbot not found');
      return updated;
    }),

  regenerateApiKey: protectedProcedure
    .input(z.object({ chatbotId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await chatbotRepo.regenerateChatbotApiKey(
        input.chatbotId,
        ctx.user.tenantId
      );
      if (!result) throw new Error('Chatbot not found');
      return result;
    }),
});
