import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as conversationService from '../services/conversation-service';
import * as conversationRepo from '../repositories/conversation-repository';
import * as humanAgentRepo from '../repositories/human-agent-repository';

export const liveChatRouter = router({
  listHandoffConversations: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return withCorrelationError('liveChat.listHandoffConversations', async () => {
        const isHuman = await humanAgentRepo.isHumanAgent(ctx.user.id, ctx.user.tenantId);
        if (!isHuman) return { unassigned: [], myAssigned: [] };
        return conversationService.listHandoffConversationsForHuman(
          ctx.user.tenantId,
          ctx.user.id,
          input?.projectId
        );
      });
    }),

  assignToMe: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('liveChat.assignToMe', async (correlationId) => {
        const isHuman = await humanAgentRepo.isHumanAgent(ctx.user.id, ctx.user.tenantId);
        if (!isHuman) throw new Error('You are not a human agent');
        const ok = await conversationService.assignConversationToHuman(
          input.conversationId,
          ctx.user.id,
          ctx.user.tenantId
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Conversation not found or already assigned');
        return { success: true };
      });
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('liveChat.sendMessage', async (correlationId) => {
        const isHuman = await humanAgentRepo.isHumanAgent(ctx.user.id, ctx.user.tenantId);
        if (!isHuman) throw new Error('You are not a human agent');
        const result = await conversationService.sendMessageAsHuman(
          input.conversationId,
          input.content,
          ctx.user.id,
          ctx.user.tenantId
        );
        if (!result.success) throwNotFoundWithId(correlationId, 'Conversation not found or not assigned to you');
        return result;
      });
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('liveChat.getConversation', async (correlationId) => {
        const isHuman = await humanAgentRepo.isHumanAgent(ctx.user.id, ctx.user.tenantId);
        if (!isHuman) throw new Error('You are not a human agent');
        const conversation = await conversationRepo.getConversationById(
          input.conversationId,
          ctx.user.tenantId
        );
        if (!conversation) throwNotFoundWithId(correlationId, 'Conversation not found');
        const isUnassigned = conversation.handoffRequestedAt && !conversation.assignedHumanAgentId;
        const isMine = conversation.assignedHumanAgentId === ctx.user.id;
        if (!isUnassigned && !isMine)
          throwNotFoundWithId(correlationId, 'Conversation not assigned to you');
        return conversation;
      });
    }),

  endConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('liveChat.endConversation', async (correlationId) => {
        const isHuman = await humanAgentRepo.isHumanAgent(ctx.user.id, ctx.user.tenantId);
        if (!isHuman) throw new Error('You are not a human agent');
        const conversation = await conversationRepo.getConversationById(
          input.conversationId,
          ctx.user.tenantId
        );
        if (!conversation) throwNotFoundWithId(correlationId, 'Conversation not found');
        const isAssignedToMe = conversation.assignedHumanAgentId === ctx.user.id;
        const isUnassigned = conversation.handoffRequestedAt && !conversation.assignedHumanAgentId;
        if (!isAssignedToMe && !isUnassigned)
          throw new Error('You can only close conversations assigned to you or waiting for an agent');
        if (conversation.status === 'closed')
          throw new Error('Conversation is already closed');
        const result = await conversationService.endConversation(input.conversationId);
        if (!result) throwNotFoundWithId(correlationId, 'Conversation not found');
        return result;
      });
    }),
});
