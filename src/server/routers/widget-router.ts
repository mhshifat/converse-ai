import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import * as conversationService from '../services/conversation-service';

export const widgetRouter = router({
  getConfig: publicProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .query(async ({ input }) => {
      const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
      if (!chatbot) throw new Error('Invalid API key');
      return {
        name: chatbot.name,
        config: chatbot.config as Record<string, unknown>,
      };
    }),

  startConversation: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        customerId: z.string().min(1),
        channel: z.enum(['text', 'call']),
      })
    )
    .mutation(async ({ input }) => {
      const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
      if (!chatbot) throw new Error('Invalid API key');
      const result = await conversationService.startConversation(
        chatbot.id,
        input.customerId,
        input.channel
      );
      if (!result) throw new Error('No agent available');
      return result;
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const result = await conversationService.sendMessage(
        input.conversationId,
        input.content,
        'customer'
      );
      if (!result) throw new Error('Conversation not found or ended');
      return result;
    }),

  endConversation: publicProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const result = await conversationService.endConversation(input.conversationId);
      if (!result) throw new Error('Conversation not found or already ended');
      return result;
    }),
});
