import { prisma } from '@/lib/prisma';
import { AgentProviderFactory } from '@/adapters/agent-provider-factory';
import { getDefaultAgentForProject } from '../repositories/project-agent-repository';
import { buildContextForProject } from './agent-context-service';
import { sendCompiledDataEmail } from './email-delivery';

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

  const conversation = await prisma.conversation.create({
    data: {
      chatbot_id: chatbotId,
      customer_id: customerId,
      agent_id: agentId,
      channel,
      status: 'active',
    },
  });
  return {
    id: conversation.id,
    agentId: conversation.agent_id,
  };
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: 'customer' | 'agent'
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { agent: true, chatbot: { select: { project_id: true } } },
  });
  if (!conversation || conversation.status !== 'active') return null;

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

  if (senderType === 'customer') {
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
    const knowledgeContext = await buildContextForProject(projectId);
    const systemPromptWithKnowledge =
      conversation.agent.system_prompt +
      (knowledgeContext ? knowledgeContext : '');
    const { response } = await provider.sendMessage({
      prompt: content,
      conversationId,
      agentId: conversation.agent_id,
      context: {
        history,
        systemPrompt: systemPromptWithKnowledge,
        model: agentSettings.model,
      },
    });

    await prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: conversation.agent_id,
        content: response,
      },
    });
    return { response };
  }
  return { response: null };
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
    await sendCompiledDataEmail(
      {
        from: config.from as string | undefined,
        to: config.to as string | undefined,
        host: config.host as string | undefined,
        port: config.port as number | undefined,
        user: config.user as string | undefined,
        pass: config.pass as string | undefined,
        secure: config.secure as boolean | undefined,
        apiKey: config.apiKey as string | undefined,
        domain: config.domain as string | undefined,
      },
      data
    );
  }
}
