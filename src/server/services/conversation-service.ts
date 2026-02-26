import { prisma } from '@/lib/prisma';
import { AgentProviderFactory } from '@/adapters/agent-provider-factory';
import { getDefaultAgentForProject } from '../repositories/project-agent-repository';
import { buildContextForProject } from './agent-context-service';
import { getEmailSender } from '@/server/delivery/email-sender';
import { getSmsSender } from '@/server/delivery/sms-sender';

/**
 * Builds an instruction for the AI to collect required/optional fields from the data schema.
 * Injected into the system prompt so the AI ensures required fields are filled before closing.
 */
function buildDataCollectionInstruction(schema: Record<string, unknown>): string {
  const props = schema.properties as Record<string, unknown> | undefined;
  const requiredList = schema.required as string[] | undefined;
  if (!props || typeof props !== 'object' || Object.keys(props).length === 0) return '';
  const required = Array.isArray(requiredList) ? requiredList : [];
  const allKeys = Object.keys(props);
  const optional = allKeys.filter((k) => !required.includes(k));
  if (required.length === 0 && optional.length === 0) return '';
  const lines: string[] = [
    '\n\n--- DATA TO COLLECT (from conversation) ---',
    'When relevant, collect the following from the customer. Use their answers to fill these fields mentally; you do not need to output the fields, just remember and use them in your replies.',
  ];
  if (required.length > 0) {
    lines.push(
      `Required (you MUST collect these before closing the conversation or saying you are done; keep asking until the customer provides them): ${required.join(', ')}.`
    );
  }
  if (optional.length > 0) {
    lines.push(
      `Optional (ask once if natural; if the customer does not want to provide, ignores, or says "skip", leave empty and move on): ${optional.join(', ')}.`
    );
  }
  lines.push(
    'Do not suggest closing the conversation or say "is there anything else" until all required fields above have been collected. For optional fields, do not insist—if the customer declines or does not answer, continue without them.'
  );
  lines.push('---\n');
  return lines.join('\n');
}

export async function getChatbotByApiKey(apiKey: string) {
  const chatbot = await prisma.chatbot.findUnique({
    where: { api_key: apiKey },
    include: {
      project: true,
    },
  });
  return chatbot;
}

export async function assignAgent(tenantId: string): Promise<string | null> {
  const agents = await prisma.agent.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
  });
  if (agents.length === 0) return null;
  const idx = Math.floor(Math.random() * agents.length);
  return agents[idx]!.id;
}

export async function startConversation(
  chatbotId: string,
  customerId: string,
  channel: 'text' | 'call'
) {
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: { project: true },
  });
  if (!chatbot) return null;

  const tenantId = chatbot.project.tenant_id;
  const projectId = chatbot.project.id;
  let agentId = await getDefaultAgentForProject(projectId, channel);
  if (!agentId) agentId = await assignAgent(tenantId);
  if (!agentId) return null;

  const conversationMode = (chatbot.project.conversation_mode as string) ?? 'both';
  const conversation = await prisma.conversation.create({
    data: {
      chatbot_id: chatbotId,
      customer_id: customerId,
      agent_id: agentId,
      channel,
      status: 'active',
      ...(conversationMode === 'human_only' && { handoff_requested_at: new Date() }),
    },
  });
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } });
  return {
    id: conversation.id,
    agentId: conversation.agent_id,
    agentName: agent?.name ?? 'Unknown Agent',
  };
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: 'customer' | 'agent'
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { agent: true, chatbot: { include: { project: true } } },
  });
  if (!conversation || conversation.status !== 'active') return null;

  const conversationMode = (conversation.chatbot.project.conversation_mode as string) ?? 'both';
  const withHuman = !!conversation.assigned_human_agent_id;
  const humanOnlyMode = conversationMode === 'human_only';
  const aiOnlyMode = conversationMode === 'ai_only';
  const senderId =
    senderType === 'customer'
      ? conversation.customer_id
      : conversation.agent_id;

  await prisma.message.create({
    data: {
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      content,
    },
  });

  if (senderType === 'customer' && !withHuman && !humanOnlyMode) {
    const agentSettings = (conversation.agent.settings ?? {}) as Record<string, unknown>;
    const providerType =
      (agentSettings.provider as 'groq' | 'openai') ?? 'groq';
    const providerApiKey = agentSettings.apiKey as string | undefined;
    const provider = AgentProviderFactory.getProvider(providerType, {
      apiKey: providerApiKey,
    });
    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
    const history = messages.map((m) => ({
      role: m.sender_type === 'customer' ? 'user' : 'assistant',
      content: m.content,
    }));
    const projectId = conversation.chatbot.project_id;
    const project = conversation.chatbot.project;
    const knowledgeContext = await buildContextForProject(projectId);
    const dataSchema = (project.data_schema ?? {}) as Record<string, unknown>;
    const dataCollectionInstruction = buildDataCollectionInstruction(dataSchema);
    const handoffInstruction = aiOnlyMode
      ? ''
      : '\n\nOnly when the customer explicitly asks to speak with a human agent, a real person, or to be transferred to support (e.g. "I want to talk to a person", "connect me to an agent", "I need human help"), or when they have a complaint or escalation you cannot resolve, end your reply with exactly: __HANDOFF__. Do NOT use __HANDOFF__ when the customer is simply closing the conversation (e.g. "no thanks", "that\'s all", "nothing else", "I\'m good", "no that\'s all")—reply with a short closing (e.g. "Glad I could help. Take care!") and do not add __HANDOFF__.';
    const systemPromptWithKnowledge =
      conversation.agent.system_prompt +
      (knowledgeContext
        ? knowledgeContext
        : '') +
      (dataCollectionInstruction ? dataCollectionInstruction : '') +
      handoffInstruction;
    let { response } = await provider.sendMessage({
      prompt: content,
      conversationId,
      agentId: conversation.agent_id,
      context: {
        history,
        systemPrompt: systemPromptWithKnowledge,
        model: agentSettings.model,
      },
    });

    let handoffRequested = false;
    if (!aiOnlyMode && response.includes('__HANDOFF__')) {
      await requestHumanHandoff(conversationId);
      response = "I'm connecting you with a human agent who can help.";
      handoffRequested = true;
    }

    await prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: conversation.agent_id,
        content: response,
      },
    });
    return { response, handoffRequested };
  }

  if (senderType === 'customer' && humanOnlyMode) {
    return { response: null, handoffRequested: true };
  }
  return { response: null, handoffRequested: false };
}

export async function endConversation(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { chatbot: { include: { project: true } }, messages: true },
  });
  if (!conversation || conversation.status !== 'active') return null;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'closed', ended_at: new Date() },
  });

  const project = conversation.chatbot.project;
  const deliveryIds = (project.delivery_integration_ids ?? []) as string[];
  const compiledData = compileDataFromMessages(
    conversation.messages,
    (project.data_schema ?? {}) as Record<string, unknown>
  );

  if (Object.keys(compiledData).length > 0) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { compiled_data: compiledData },
    });
  }

  if (deliveryIds.length > 0) {
    const integrations = await prisma.integration.findMany({
      where: { id: { in: deliveryIds }, tenant_id: project.tenant_id },
    });
    for (const integration of integrations) {
      await deliverCompiledData(
        integration.type,
        integration.config as Record<string, unknown>,
        compiledData
      );
    }
  }

  return { success: true, compiledData };
}

function compileDataFromMessages(
  messages: { sender_type: string; content: string }[],
  _schema: Record<string, unknown>
): Record<string, unknown> {
  const customerMessages = messages
    .filter((m) => m.sender_type === 'customer')
    .map((m) => m.content)
    .join('\n');
  return {
    summary: customerMessages.slice(0, 500),
    messageCount: messages.length,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function deliverCompiledData(
  type: string,
  config: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<void> {
  if (type === 'discord' && typeof config.webhookUrl === 'string') {
    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Conversation data: ${JSON.stringify(data)}`,
      }),
    });
    return;
  }
  if (type === 'email') {
    const to = (config.to as string) ?? process.env.DELIVERY_EMAIL_TO;
    if (!to) return;
    const body = JSON.stringify(data, null, 2);
    await getEmailSender().send({
      to,
      from: config.from as string | undefined,
      subject: 'ConverseAI: Conversation data',
      text: body,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${escapeHtml(body)}</pre>`,
    });
    return;
  }
  if (type === 'sms') {
    const to = (config.to as string) ?? process.env.DELIVERY_SMS_TO;
    if (!to) return;
    const body = `Conversation data: ${JSON.stringify(data)}`;
    await getSmsSender().send({
      to,
      from: config.from as string | undefined,
      body,
    });
  }
}

// --- Human handoff ---

export async function getConversationMessagesForWidget(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      status: true,
      handoff_requested_at: true,
      assigned_human_agent_id: true,
      messages: { orderBy: { created_at: 'asc' }, select: { sender_type: true, content: true, created_at: true } },
    },
  });
  if (!conversation) return null;
  return {
    status: conversation.status,
    handoffRequested: !!conversation.handoff_requested_at,
    assignedHumanAgentId: conversation.assigned_human_agent_id,
    messages: conversation.messages.map((m) => ({
      senderType: m.sender_type,
      content: m.content,
      createdAt: m.created_at,
    })),
  };
}

export async function requestHumanHandoff(conversationId: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, status: true, handoff_requested_at: true },
  });
  if (!conversation || conversation.status !== 'active') return false;
  if (conversation.handoff_requested_at) return true; // already requested
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { handoff_requested_at: new Date() },
  });
  return true;
}

export async function listHandoffConversationsForHuman(
  tenantId: string,
  userId: string,
  projectId?: string
): Promise<{ unassigned: HandoffConversationSummary[]; myAssigned: HandoffConversationSummary[] }> {
  const projectWhere = projectId
    ? { id: projectId, tenant_id: tenantId }
    : { tenant_id: tenantId };
  const [unassigned, myAssigned] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        status: 'active',
        handoff_requested_at: { not: null },
        assigned_human_agent_id: null,
        chatbot: { project: { is: projectWhere } },
      },
      orderBy: { handoff_requested_at: 'asc' },
      include: {
        chatbot: { select: { name: true } },
        agent: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.findMany({
      where: {
        status: 'active',
        assigned_human_agent_id: userId,
        chatbot: { project: { is: projectWhere } },
      },
      orderBy: { started_at: 'desc' },
      include: {
        chatbot: { select: { name: true } },
        agent: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);
  const toSummary = (c: (typeof unassigned)[0]) => ({
    id: c.id,
    customerId: c.customer_id,
    channel: c.channel as 'text' | 'call',
    handoffRequestedAt: c.handoff_requested_at!,
    chatbotName: c.chatbot.name,
    agentName: c.agent.name,
    messageCount: c._count.messages,
  });
  return {
    unassigned: unassigned.map(toSummary),
    myAssigned: myAssigned.map(toSummary),
  };
}

export type HandoffConversationSummary = {
  id: string;
  customerId: string;
  channel: string;
  handoffRequestedAt: Date;
  chatbotName: string;
  agentName: string;
  messageCount: number;
};

export async function assignConversationToHuman(
  conversationId: string,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { chatbot: { include: { project: { select: { tenant_id: true } } } } },
  });
  if (
    !conversation ||
    conversation.chatbot.project.tenant_id !== tenantId ||
    conversation.status !== 'active' ||
    !conversation.handoff_requested_at ||
    conversation.assigned_human_agent_id != null
  )
    return false;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { assigned_human_agent_id: userId },
  });
  return true;
}

export async function sendMessageAsHuman(
  conversationId: string,
  content: string,
  userId: string,
  tenantId: string
): Promise<{ success: boolean }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { chatbot: { include: { project: { select: { tenant_id: true } } } } },
  });
  if (
    !conversation ||
    conversation.chatbot.project.tenant_id !== tenantId ||
    conversation.status !== 'active' ||
    conversation.assigned_human_agent_id !== userId
  )
    return { success: false };
  await prisma.message.create({
    data: {
      conversation_id: conversationId,
      sender_type: 'human_agent',
      sender_id: userId,
      content,
    },
  });
  return { success: true };
}
