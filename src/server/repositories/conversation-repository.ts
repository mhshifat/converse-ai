import { prisma } from '@/lib/prisma';

export async function listConversationsByProject(
  projectId: string,
  tenantId: string,
  options?: { limit?: number; cursor?: string; status?: 'active' | 'closed' }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    select: { id: true },
  });
  if (!project) return { conversations: [], nextCursor: null };

  const limit = Math.min(options?.limit ?? 50, 100);
  const where: { chatbot: { project_id: string }; status?: string } = {
    chatbot: { project_id: projectId },
  };
  if (options?.status) where.status = options.status;

  const conversations = await prisma.conversation.findMany({
    where,
    take: limit + 1,
    ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    orderBy: { started_at: 'desc' },
    include: {
      agent: { select: { id: true, name: true } },
      chatbot: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
  });

  const nextCursor = conversations.length > limit ? conversations[limit - 1]!.id : null;
  const items = conversations.slice(0, limit);

  return {
    conversations: items.map((c) => ({
      id: c.id,
      customerId: c.customer_id,
      channel: c.channel as 'text' | 'call',
      status: c.status as 'active' | 'closed',
      startedAt: c.started_at,
      endedAt: c.ended_at,
      messageCount: c._count.messages,
      agentName: c.agent.name,
      chatbotName: c.chatbot.name,
      compiledData: c.compiled_data as Record<string, unknown> | null,
    })),
    nextCursor,
  };
}

export async function getConversationById(conversationId: string, tenantId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      agent: { select: { id: true, name: true } },
      chatbot: { include: { project: { select: { id: true, tenant_id: true } } } },
      messages: { orderBy: { created_at: 'asc' } },
    },
  });
  if (!conversation || conversation.chatbot.project.tenant_id !== tenantId) return null;

  return {
    id: conversation.id,
    customerId: conversation.customer_id,
    channel: conversation.channel as 'text' | 'call',
    status: conversation.status as 'active' | 'closed',
    startedAt: conversation.started_at,
    endedAt: conversation.ended_at,
    compiledData: conversation.compiled_data as Record<string, unknown> | null,
    agentName: conversation.agent.name,
    chatbotName: conversation.chatbot.name,
    handoffRequestedAt: conversation.handoff_requested_at,
    assignedHumanAgentId: conversation.assigned_human_agent_id,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      senderType: m.sender_type as 'customer' | 'agent' | 'human_agent',
      senderId: m.sender_id,
      content: m.content,
      createdAt: m.created_at,
    })),
  };
}
