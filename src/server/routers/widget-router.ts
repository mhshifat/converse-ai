import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as conversationService from '../services/conversation-service';

export const widgetRouter = router({
  getConfig: publicProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .query(async ({ input }) => {
      return withCorrelationError('widget.getConfig', async (correlationId) => {
        const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
        if (!chatbot) throwNotFoundWithId(correlationId, 'Invalid API key');
        return {
          name: chatbot.name,
          config: chatbot.config as Record<string, unknown>,
        };
      });
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
      return withCorrelationError('widget.startConversation', async (correlationId) => {
        const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
        if (!chatbot) throwNotFoundWithId(correlationId, 'Invalid API key');
        const result = await conversationService.startConversation(
          chatbot.id,
          input.customerId,
          input.channel
        );
        if (!result) throwNotFoundWithId(correlationId, 'No agent available');
        return result;
      });
    }),

  sendFirstMessage: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        customerId: z.string().min(1),
        channel: z.enum(['text', 'call']),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.sendFirstMessage', async (correlationId) => {
        const result = await conversationService.sendFirstMessage(
          input.apiKey,
          input.customerId,
          input.channel,
          input.content
        );
        if (!result) throwNotFoundWithId(correlationId, 'Invalid API key or no agent available');
        return result;
      });
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.sendMessage', async (correlationId) => {
        const result = await conversationService.sendMessage(
          input.conversationId,
          input.content,
          'customer'
        );
        if (!result) throwNotFoundWithId(correlationId, 'Conversation not found or ended');
        return result;
      });
    }),

  endConversation: publicProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.endConversation', async (correlationId) => {
        const result = await conversationService.endConversation(input.conversationId);
        if (!result) throwNotFoundWithId(correlationId, 'Conversation not found or already ended');
        return result;
      });
    }),

  requestHumanHandoff: publicProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.requestHumanHandoff', async (correlationId) => {
        const ok = await conversationService.requestHumanHandoff(input.conversationId);
        if (!ok) throwNotFoundWithId(correlationId, 'Conversation not found or already ended');
        return { success: true };
      });
    }),

  getMessages: publicProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input }) => {
      return withCorrelationError('widget.getMessages', async (correlationId) => {
        const data = await conversationService.getConversationMessagesForWidget(input.conversationId);
        if (!data) throwNotFoundWithId(correlationId, 'Conversation not found');
        return data;
      });
    }),
});
