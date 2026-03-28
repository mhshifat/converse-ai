import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import { getVoiceSignalingJwtSecret, signVoiceJoinToken } from '@/server/lib/voice-signaling-jwt';
import * as conversationService from '../services/conversation-service';
import * as groqVoice from '../services/groq-voice-service';
import { WIDGET_CHAT_UNAVAILABLE } from '../widget-customer-messages';

export const widgetRouter = router({
  getConfig: publicProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .query(async ({ input }) => {
      return withCorrelationError('widget.getConfig', async (correlationId) => {
        const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
        if (!chatbot) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        const project = chatbot.project as {
          default_rating_type?: string;
          proactive_delay_seconds?: number | null;
          proactive_on_exit_intent?: boolean | null;
        } | null;
        const config = {
          ...(chatbot.config as Record<string, unknown>),
          defaultRatingType: project?.default_rating_type === 'nps' ? 'nps' : 'thumbs',
          proactiveDelaySeconds: project?.proactive_delay_seconds ?? undefined,
          proactiveOnExitIntent: project?.proactive_on_exit_intent ?? false,
        };
        return {
          name: chatbot.name,
          config,
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
        if (!chatbot) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        const result = await conversationService.startConversation(
          chatbot.id,
          input.customerId,
          input.channel
        );
        if (!result) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        if ('unavailable' in result) return result;
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
        attachmentUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.sendFirstMessage', async (correlationId) => {
        const result = await conversationService.sendFirstMessage(
          input.apiKey,
          input.customerId,
          input.channel,
          input.content,
          { attachmentUrl: input.attachmentUrl }
        );
        if (!result) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        if ('unavailable' in result) return result;
        return result;
      });
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
        attachmentUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.sendMessage', async (correlationId) => {
        const result = await conversationService.sendMessage(
          input.conversationId,
          input.content,
          'customer',
          input.attachmentUrl
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

  /** Short-lived JWT for WebSocket join on the voice signaling server (customer role). */
  getVoiceSignalingToken: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        conversationId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      return withCorrelationError('widget.getVoiceSignalingToken', async (correlationId) => {
        const secret = getVoiceSignalingJwtSecret();
        if (!secret) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Live voice is not configured.',
          });
        }
        const ok = await conversationService.assertWidgetVoiceSignalingForCustomer(
          input.apiKey,
          input.conversationId
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Conversation not found or voice not available');
        return {
          token: signVoiceJoinToken({
            conversationId: input.conversationId,
            role: 'customer',
            secret,
          }),
        };
      });
    }),

  reportEmbedBeacon: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        pageUrl: z.string().url().max(2048),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.reportEmbedBeacon', async (correlationId) => {
        const result = await conversationService.recordEmbedBeacon(input.apiKey, input.pageUrl);
        if (!result.ok) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        return { success: true };
      });
    }),

  submitRating: publicProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        ratingType: z.enum(['thumbs', 'nps']),
        ratingValue: z.number(), // 1/-1 for thumbs, 0-10 for NPS
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.submitRating', async (correlationId) => {
        const ok = await conversationService.submitRating(
          input.conversationId,
          input.ratingType,
          input.ratingValue
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Conversation not found or not ended');
        return { success: true };
      });
    }),

  transcribeVoice: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        audioBase64: z.string().min(1),
        contentType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.transcribeVoice', async (correlationId) => {
        const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
        if (!chatbot) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        const buffer = Buffer.from(input.audioBase64, 'base64');
        const text = await groqVoice.transcribeAudio(buffer, {
          contentType: input.contentType ?? 'audio/webm',
        });
        return { text: text || '(no speech detected)' };
      });
    }),

  synthesizeSpeech: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return withCorrelationError('widget.synthesizeSpeech', async (correlationId) => {
        const chatbot = await conversationService.getChatbotByApiKey(input.apiKey);
        if (!chatbot) throwNotFoundWithId(correlationId, WIDGET_CHAT_UNAVAILABLE);
        const buffer = await groqVoice.synthesizeSpeech(input.text);
        return { audioBase64: buffer.toString('base64') };
      });
    }),
});
