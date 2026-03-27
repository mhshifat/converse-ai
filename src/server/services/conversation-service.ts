import { prisma } from '@/lib/prisma';
import { AgentProviderFactory } from '@/adapters/agent-provider-factory';
import { getDefaultAgentForProject } from '../repositories/project-agent-repository';
import { buildContextForProject } from './agent-context-service';
import { getEmailSender } from '@/server/delivery/email-sender';
import { getSmsSender } from '@/server/delivery/sms-sender';
import { fireWebhook } from '@/server/delivery/webhook-sender';

/** business_hours: { timezone: string, schedule: [{ day: number (0=Sun), start: '09:00', end: '17:00' }] }. Returns true if now is within any window. */
function isWithinBusinessHours(businessHours: unknown): boolean {
  if (!businessHours || typeof (businessHours as Record<string, unknown>).timezone !== 'string')
    return true;
  const bh = businessHours as { timezone: string; schedule?: { day: number; start: string; end: string }[] };
  const schedule = Array.isArray(bh.schedule) ? bh.schedule : [];
  if (schedule.length === 0) return true;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: bh.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = dayMap[weekday ?? 'Sun'] ?? 0;
  const minutesSinceMidnight = hour * 60 + minute;
  const parseTime = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return schedule.some(
    (s) =>
      s.day === today &&
      minutesSinceMidnight >= parseTime(s.start) &&
      minutesSinceMidnight < parseTime(s.end)
  );
}

/**
 * Builds an instruction for the AI to collect required/optional fields from the data schema.
 * Injected into the system prompt so the AI ensures required fields are filled before closing.
 */
function buildVoiceChannelInstruction(dataSchema: Record<string, unknown>): string {
  const props = dataSchema.properties as Record<string, unknown> | undefined;
  let spellingSection = '';
  if (props && Object.keys(props).length > 0) {
    const spellingFields = Object.keys(props).filter((k) => {
      const lower = k.toLowerCase();
      return (
        lower.includes('name') ||
        lower.includes('email') ||
        lower.includes('phone') ||
        lower.includes('address') ||
        lower.includes('zip') ||
        lower.includes('postal') ||
        lower.includes('number') ||
        lower.includes('url') ||
        lower.includes('website')
      );
    });
    if (spellingFields.length > 0) {
      spellingSection =
        `\nFor these fields (${spellingFields.join(', ')}), after the customer says the value, ask them to spell it out letter by letter or digit by digit to confirm.\n` +
        'Examples:\n' +
        '- "Could you spell your name for me, letter by letter?"\n' +
        '- "Could you spell out your email address for me?"\n' +
        '- "Could you say your phone number digit by digit?"\n' +
        'After they spell it, repeat it back to confirm before moving on.\n';
    }
  }
  return (
    '\n\n--- VOICE CALL RULES ---\n' +
    'The customer is on a voice call. Follow these rules strictly:\n' +
    '1. Ask ONLY ONE question per message. NEVER ask two or more questions in the same reply.\n' +
    '2. Wait for the customer to answer before asking the next question.\n' +
    '3. Keep each message short — one sentence for the question, optionally one sentence of context.\n' +
    '4. Do NOT list multiple things you need. Collect information one field at a time.\n' +
    'BAD example: "May I have your name? And what is your email? Also, which department?"\n' +
    'GOOD example: "May I have your name, please?"\n' +
    '(Then wait for answer, then ask the next question in your next message.)\n' +
    spellingSection
  );
}

function buildDataCollectionInstruction(schema: Record<string, unknown>): string {
  const props = schema.properties as Record<string, unknown> | undefined;
  const requiredList = schema.required as string[] | undefined;
  if (!props || typeof props !== 'object' || Object.keys(props).length === 0) return '';
  const required = Array.isArray(requiredList) ? requiredList : [];
  const allKeys = Object.keys(props);
  const optional = allKeys.filter((k) => !required.includes(k));
  if (required.length === 0 && optional.length === 0) return '';
  const lines: string[] = [
    '\n\n--- DATA TO COLLECT (mandatory for bookings/appointments) ---',
    'You MUST collect the following from the customer. For any booking or appointment, explicitly ask for each required field that you do not yet have. Do not confirm the booking or say "is there anything else?" until every required field has been provided.',
    '',
  ];
  if (required.length > 0) {
    lines.push(
      `REQUIRED (must have all before closing or confirming): ${required.join(', ')}.`
    );
    lines.push(
      `For each missing required field, ask clearly (e.g. "May I have your name?", "What is your phone number?", "What email should we use?"). Do not skip any required field. A booking is only successful when you have: ${required.join(', ')}.`
    );
    lines.push('');
  }
  if (optional.length > 0) {
    lines.push(
      `Optional (ask once if natural; if the customer declines or says "skip", move on): ${optional.join(', ')}.`
    );
    lines.push('');
  }
  lines.push(
    'Rule: Do not say the booking is confirmed, do not ask "anything else?", and do not use __END_CONVERSATION__ until you have collected every required field listed above.'
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

const EMBED_BEACON_THROTTLE_MS = 60_000;

/** Records that the embed script ran on a page (origin only). Throttled per chatbot to limit writes. */
export async function recordEmbedBeacon(
  apiKey: string,
  pageUrl: string
): Promise<{ ok: true; recorded: boolean } | { ok: false }> {
  const chatbot = await getChatbotByApiKey(apiKey);
  if (!chatbot) return { ok: false };

  let origin: string;
  try {
    const u = new URL(pageUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: true, recorded: false };
    origin = u.origin;
  } catch {
    return { ok: true, recorded: false };
  }
  if (origin.length > 512) origin = origin.slice(0, 512);

  const now = Date.now();
  const last = chatbot.last_embed_beacon_at;
  if (last && now - last.getTime() < EMBED_BEACON_THROTTLE_MS) {
    return { ok: true, recorded: false };
  }

  await prisma.chatbot.update({
    where: { id: chatbot.id },
    data: {
      last_embed_beacon_at: new Date(),
      last_embed_origin: origin,
    },
  });
  return { ok: true, recorded: true };
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

export type StartConversationResult =
  | { id: string; agentId: string; agentName: string }
  | { unavailable: 'outside_hours' | 'queue_full'; message?: string | null }
  | null;

export async function startConversation(
  chatbotId: string,
  customerId: string,
  channel: 'text' | 'call'
): Promise<StartConversationResult> {
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: { project: true },
  });
  if (!chatbot) return null;

  const project = chatbot.project;
  if (project.business_hours && !isWithinBusinessHours(project.business_hours)) {
    return {
      unavailable: 'outside_hours',
      message: project.out_of_office_message ?? 'We are currently outside business hours.',
    };
  }

  const tenantId = project.tenant_id;
  const projectId = project.id;
  let agentId = await getDefaultAgentForProject(projectId, channel);
  if (!agentId) agentId = await assignAgent(tenantId);
  if (!agentId) {
    if (project.queue_overflow_message)
      return { unavailable: 'queue_full', message: project.queue_overflow_message };
    return null;
  }

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
  void fireWebhook(tenantId, 'conversation.created', {
    conversationId: conversation.id,
    projectId,
    chatbotId,
    customerId,
  });
  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } });
  return {
    id: conversation.id,
    agentId: conversation.agent_id,
    agentName: agent?.name ?? 'Unknown Agent',
  };
}

/**
 * Creates a conversation and the first customer message in one go. Use this instead of
 * startConversation + sendMessage for the first message so we never persist 0-message conversations.
 */
export type SendFirstMessageResult =
  | { conversationId: string; response: string | null; handoffRequested: boolean }
  | { unavailable: 'outside_hours' | 'queue_full'; message?: string | null }
  | null;

export async function sendFirstMessage(
  apiKey: string,
  customerId: string,
  channel: 'text' | 'call',
  content: string,
  attachmentUrl?: string
): Promise<SendFirstMessageResult> {
  const chatbot = await getChatbotByApiKey(apiKey);
  if (!chatbot) return null;

  const project = chatbot.project;
  if (project.business_hours && !isWithinBusinessHours(project.business_hours)) {
    return {
      unavailable: 'outside_hours',
      message: project.out_of_office_message ?? 'We are currently outside business hours.',
    };
  }

  const tenantId = project.tenant_id;
  const projectId = project.id;
  let agentId = await getDefaultAgentForProject(projectId, channel);
  if (!agentId) agentId = await assignAgent(tenantId);
  if (!agentId) {
    if (project.queue_overflow_message)
      return { unavailable: 'queue_full', message: project.queue_overflow_message };
    return null;
  }

  const conversationMode = (project.conversation_mode as string) ?? 'both';
  const conversation = await prisma.conversation.create({
    data: {
      chatbot_id: chatbot.id,
      customer_id: customerId,
      agent_id: agentId,
      channel,
      status: 'active',
      ...(conversationMode === 'human_only' && { handoff_requested_at: new Date() }),
    },
  });
  const conversationId = conversation.id;
  void fireWebhook(tenantId, 'conversation.created', {
    conversationId,
    projectId,
    chatbotId: chatbot.id,
    customerId,
  });

  await prisma.message.create({
    data: {
      conversation_id: conversationId,
      sender_type: 'customer',
      sender_id: customerId,
      content,
      payload: attachmentUrl ? ({ type: 'file', url: attachmentUrl } as object) : undefined,
    },
  });

  const humanOnlyMode = conversationMode === 'human_only';
  if (humanOnlyMode) {
    return { conversationId, response: null, handoffRequested: true };
  }

  const conversationWithAgent = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { agent: true, chatbot: { include: { project: true } } },
  });
  if (!conversationWithAgent) return { conversationId, response: null, handoffRequested: false };

  const agentSettings = (conversationWithAgent.agent.settings ?? {}) as Record<string, unknown>;
  const providerType = (agentSettings.provider as 'groq' | 'openai') ?? 'groq';
  const providerApiKey = agentSettings.apiKey as string | undefined;
  const provider = AgentProviderFactory.getProvider(providerType, { apiKey: providerApiKey });
  const messages = await prisma.message.findMany({
    where: { conversation_id: conversationId },
    orderBy: { created_at: 'asc' },
  });
  const history = messages.map((m) => ({
    role: m.sender_type === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }));
  const knowledgeContext = await buildContextForProject(projectId, { query: content });
  const dataSchema = (conversationWithAgent.chatbot.project.data_schema ?? {}) as Record<string, unknown>;
  const dataCollectionInstruction = buildDataCollectionInstruction(dataSchema);
  const aiOnlyMode = conversationMode === 'ai_only';
  const handoffInstruction = aiOnlyMode
    ? ''
    : '\n\nOnly when the customer explicitly asks to speak with a human agent, a real person, or to be transferred to support (e.g. "I want to talk to a person", "connect me to an agent", "I need human help"), or when they have a complaint or escalation you cannot resolve, end your reply with exactly: __HANDOFF__. Do NOT use __HANDOFF__ when the customer is simply closing the conversation (e.g. "no thanks", "that\'s all", "nothing else", "I\'m good", "no that\'s all")—reply with a short closing (e.g. "Glad I could help. Take care!") and do not add __HANDOFF__. Only use __END_CONVERSATION__ when you are saying a final goodbye (e.g. "Glad I could help. Take care!") after the customer has already said they are done (e.g. "no thanks", "that\'s all", "nothing else"). Do NOT use __END_CONVERSATION__ when you are asking the customer a question like "Is there anything else I can help you with?" or "Anything else?"—wait for their answer first; only close the conversation in your next reply if they decline.';
  const voiceInstruction = channel === 'call' ? buildVoiceChannelInstruction(dataSchema) : '';
  const systemPromptWithKnowledge =
    conversationWithAgent.agent.system_prompt +
    (knowledgeContext ? knowledgeContext : '') +
    (dataCollectionInstruction ? dataCollectionInstruction : '') +
    voiceInstruction +
    handoffInstruction;
  let { response } = await provider.sendMessage({
    prompt: content,
    conversationId,
    agentId: conversationWithAgent.agent_id,
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
  let conversationEnded = false;
  if (response.includes('__END_CONVERSATION__')) {
    response = response.replace(/\n?__END_CONVERSATION__\n?/g, '').trim() || response;
    conversationEnded = true;
  }
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: conversationWithAgent.agent_id,
        content: response,
      },
    }),
    prisma.conversation.updateMany({
      where: { id: conversationId, first_response_at: null },
      data: { first_response_at: new Date() },
    }),
  ]);
  let compiledData: Record<string, unknown> = {};
  let endedMessages: { role: 'customer' | 'agent' | 'human_agent'; content: string }[] = [];
  if (conversationEnded) {
    const endResult = await endConversation(conversationId);
    if (endResult) {
      compiledData = endResult.compiledData ?? {};
      endedMessages = endResult.messages ?? [];
    }
  }
  return {
    conversationId,
    response,
    handoffRequested,
    conversationEnded,
    ...(conversationEnded ? { compiledData, messages: endedMessages } : {}),
  };
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: 'customer' | 'agent',
  attachmentUrl?: string
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

  const message = await prisma.message.create({
    data: {
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      content,
      payload:
        senderType === 'customer' && attachmentUrl
          ? ({ type: 'file', url: attachmentUrl } as object)
          : undefined,
    },
  });
  void fireWebhook(conversation.chatbot.project.tenant_id, 'message.sent', {
    conversationId,
    projectId: conversation.chatbot.project_id,
    chatbotId: conversation.chatbot_id,
    customerId: conversation.customer_id,
    messageId: message.id,
    content,
    senderType,
  });

  if (senderType === 'customer' && !conversation.handoff_requested_at) {
    const project = conversation.chatbot.project;
    const slaMinutes = project.sla_escalate_minutes ?? 0;
    const keywords = (project.escalation_keywords as string[] | null) ?? [];
    const contentLower = content.toLowerCase();
    const slaBreach =
      slaMinutes > 0 &&
      !conversation.first_response_at &&
      Date.now() - conversation.started_at.getTime() > slaMinutes * 60 * 1000;
    const keywordMatch =
      keywords.length > 0 &&
      keywords.some((k) => contentLower.includes(String(k).toLowerCase()));
    if (slaBreach || keywordMatch) {
      await requestHumanHandoff(conversationId);
    }
  }

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
    const knowledgeContext = await buildContextForProject(projectId, { query: content });
    const dataSchema = (project.data_schema ?? {}) as Record<string, unknown>;
    const dataCollectionInstruction = buildDataCollectionInstruction(dataSchema);
    const voiceInstruction = conversation.channel === 'call' ? buildVoiceChannelInstruction(dataSchema) : '';
    const handoffInstruction = aiOnlyMode
      ? ''
      : '\n\nOnly when the customer explicitly asks to speak with a human agent, a real person, or to be transferred to support (e.g. "I want to talk to a person", "connect me to an agent", "I need human help"), or when they have a complaint or escalation you cannot resolve, end your reply with exactly: __HANDOFF__. Do NOT use __HANDOFF__ when the customer is simply closing the conversation (e.g. "no thanks", "that\'s all", "nothing else", "I\'m good", "no that\'s all")—reply with a short closing (e.g. "Glad I could help. Take care!") and do not add __HANDOFF__. Only use __END_CONVERSATION__ when you are saying a final goodbye (e.g. "Glad I could help. Take care!") after the customer has already said they are done (e.g. "no thanks", "that\'s all", "nothing else"). Do NOT use __END_CONVERSATION__ when you are asking the customer a question like "Is there anything else I can help you with?" or "Anything else?"—wait for their answer first; only close the conversation in your next reply if they decline.';
    const systemPromptWithKnowledge =
      conversation.agent.system_prompt +
      (knowledgeContext
        ? knowledgeContext
        : '') +
      (dataCollectionInstruction ? dataCollectionInstruction : '') +
      voiceInstruction +
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
    let conversationEnded = false;
    if (response.includes('__END_CONVERSATION__')) {
      response = response.replace(/\n?__END_CONVERSATION__\n?/g, '').trim() || response;
      conversationEnded = true;
    }
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: conversation.agent_id,
          content: response,
        },
      }),
      prisma.conversation.updateMany({
        where: { id: conversationId, first_response_at: null },
        data: { first_response_at: new Date() },
      }),
    ]);
    let compiledData: Record<string, unknown> = {};
    let endedMessages: { role: 'customer' | 'agent' | 'human_agent'; content: string }[] = [];
    if (conversationEnded) {
      const endResult = await endConversation(conversationId);
      if (endResult) {
        compiledData = endResult.compiledData ?? {};
        endedMessages = endResult.messages ?? [];
      }
    }
    return {
      response,
      handoffRequested,
      conversationEnded,
      ...(conversationEnded ? { compiledData, messages: endedMessages } : {}),
    };
  }

  if (senderType === 'customer' && humanOnlyMode) {
    return { response: null, handoffRequested: true, conversationEnded: false };
  }
  return { response: null, handoffRequested: false, conversationEnded: false };
}

export async function endConversation(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      chatbot: { include: { project: true } },
      messages: true,
      agent: true,
    },
  });
  if (!conversation || conversation.status !== 'active') return null;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'closed', ended_at: new Date() },
  });

  const project = conversation.chatbot.project;
  const schema = (project.data_schema ?? {}) as Record<string, unknown>;
  const deliveryIds = (project.delivery_integration_ids ?? []) as string[];
  if (deliveryIds.length === 0) {
    console.warn(
      '[ConverseAI] Conversation ended but no delivery integrations are enabled for this project. To receive compiled data (e.g. by email), enable one in Project → Integrations → Delivery integrations and save.'
    );
  }

  let compiledData: Record<string, unknown>;
  const llmExtracted = await extractDataWithLLM(
    conversation.messages,
    schema,
    conversation.agent
  );
  if (llmExtracted) {
    const customerText = conversation.messages
      .filter((m) => m.sender_type === 'customer')
      .map((m) => m.content)
      .join('\n');
    compiledData = {
      ...llmExtracted,
      summary: customerText.slice(0, 500),
      messageCount: conversation.messages.length,
    };
  } else {
    compiledData = compileDataFromMessages(conversation.messages, schema);
  }

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
    const fallbackEmail =
      (await prisma.user.findFirst({
        where: { tenant_id: project.tenant_id },
        select: { email: true },
        orderBy: { created_at: 'asc' },
      }))?.email ?? null;
    for (const integration of integrations) {
      try {
        await deliverCompiledData(
          integration.type,
          integration.config as Record<string, unknown>,
          compiledData,
          { fallbackEmail }
        );
      } catch (err) {
        console.error(
          `[ConverseAI] Delivery failed for integration ${integration.id} (${integration.type}):`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  const messages = conversation.messages.map((m) => ({
    role: (m.sender_type === 'customer' ? 'customer' : m.sender_type === 'human_agent' ? 'human_agent' : 'agent') as 'customer' | 'agent' | 'human_agent',
    content: m.content,
  }));
  return { success: true, compiledData, messages };
}

/** Sample payload for test delivery. */
const TEST_DELIVERY_DATA: Record<string, unknown> = {
  summary: 'Test message from ConverseAI. If you received this, your delivery integration is working.',
  messageCount: 0,
  name: 'Test User',
  email: 'test@example.com',
  phone: '',
};

/**
 * Send a test payload to all delivery integrations enabled for the project.
 * Used so users can verify email/Discord/SMS before relying on real conversation data.
 */
export async function sendTestDelivery(
  projectId: string,
  tenantId: string
): Promise<{ success: true; sentTo: number } | { success: false; error: string }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    select: { delivery_integration_ids: true, tenant_id: true },
  });
  if (!project) return { success: false, error: 'Project not found.' };
  const deliveryIds = (project.delivery_integration_ids ?? []) as string[];
  if (deliveryIds.length === 0) {
    return {
      success: false,
      error: 'No delivery integrations enabled. Select at least one above and save, then try again.',
    };
  }
  const integrations = await prisma.integration.findMany({
    where: { id: { in: deliveryIds }, tenant_id: project.tenant_id },
  });
  const fallbackEmail =
    (await prisma.user.findFirst({
      where: { tenant_id: project.tenant_id },
      select: { email: true },
      orderBy: { created_at: 'asc' },
    }))?.email ?? null;
  let sentTo = 0;
  const errors: string[] = [];
  for (const integration of integrations) {
    try {
      await deliverCompiledData(
        integration.type,
        integration.config as Record<string, unknown>,
        TEST_DELIVERY_DATA,
        { fallbackEmail }
      );
      sentTo++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${integration.type}: ${msg}`);
      console.error(
        `[ConverseAI] Test delivery failed for integration ${integration.id} (${integration.type}):`,
        msg
      );
    }
  }
  if (sentTo === 0 && errors.length > 0) {
    return { success: false, error: errors[0] ?? 'Delivery failed.' };
  }
  return { success: true, sentTo };
}

/**
 * LLM-based extraction: ask the agent's provider to extract schema fields from the conversation.
 * Returns a plain object with schema keys, or null on failure (parse error, API error).
 */
async function extractDataWithLLM(
  messages: { sender_type: string; content: string }[],
  schema: Record<string, unknown>,
  agent: { settings?: unknown }
): Promise<Record<string, unknown> | null> {
  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props || typeof props !== 'object' || Object.keys(props).length === 0) return null;

  const keys = Object.keys(props);
  const required = (schema.required as string[] | undefined) ?? [];
  const agentSettings = (agent.settings ?? {}) as Record<string, unknown>;
  const providerType = (agentSettings.provider as 'groq' | 'openai') ?? 'groq';
  const providerApiKey = agentSettings.apiKey as string | undefined;
  const model = agentSettings.model as string | undefined;

  const provider = AgentProviderFactory.getProvider(providerType, { apiKey: providerApiKey });
  const transcript = messages
    .map((m) => `${m.sender_type === 'customer' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n\n');
  const systemPrompt = `You are a data extractor. Extract the following fields from the conversation and return ONLY a valid JSON object. Use these exact keys: ${keys.join(', ')}. Required keys (must be present, use "" if not found): ${required.join(', ')}. Optional keys: omit the key if not found. Use only information explicitly stated in the conversation. Return nothing but the JSON object, no markdown, no explanation.`;
  const userPrompt = `Conversation:\n\n${transcript.slice(0, 6000)}\n\nExtract and return the JSON object.`;

  try {
    const { response } = await provider.sendMessage({
      prompt: userPrompt,
      conversationId: '',
      agentId: '',
      context: {
        history: [],
        systemPrompt,
        model,
      },
    });
    const trimmed = response.trim();
    const jsonStr = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in parsed) result[key] = parsed[key];
      else if (required.includes(key)) result[key] = '';
    }
    return result;
  } catch (err) {
    console.warn('[ConverseAI] LLM extraction failed, using heuristic:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Common email regex */
const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
/** Phone: digits, optional +, spaces/dashes, at least 10 digits */
const PHONE_REGEX =
  /\+?[\d\s\-()]{10,}/g;
/** Extract integer (e.g. age) */
const INTEGER_REGEX = /\b(\d{1,3})\b/g;

function compileDataFromMessages(
  messages: { sender_type: string; content: string }[],
  schema: Record<string, unknown>
): Record<string, unknown> {
  const fullText = messages.map((m) => m.content).join('\n');
  const customerText = messages
    .filter((m) => m.sender_type === 'customer')
    .map((m) => m.content)
    .join('\n');
  const props = (schema.properties as Record<string, unknown>) ?? {};
  const required = (schema.required as string[] | undefined) ?? [];
  const result: Record<string, unknown> = {
    messageCount: messages.length,
  };

  for (const key of Object.keys(props)) {
    const keyLower = key.toLowerCase();
    let value: string | number | undefined;

    if (keyLower === 'email') {
      const match = fullText.match(EMAIL_REGEX);
      value = match?.[0] ?? undefined;
    } else if (keyLower === 'phone') {
      const matches = fullText.match(PHONE_REGEX);
      const cleaned = matches?.map((s) => s.replace(/\D/g, '').trim()).filter((s) => s.length >= 10);
      value = cleaned?.[0] ?? undefined;
    } else if (keyLower === 'age') {
      const match = fullText.match(INTEGER_REGEX);
      const ages = match?.map(Number).filter((n) => n >= 1 && n <= 120) ?? [];
      value = ages.length > 0 ? ages[0] : undefined;
    } else if (keyLower === 'dob' || keyLower === 'dateofbirth') {
      const dateLike =
        /(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})/;
      const m = fullText.match(dateLike);
      value = m?.[0] ?? undefined;
    } else if (keyLower === 'name') {
      const lines = fullText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const nameLike = /^[A-Za-z\s\-']{2,50}$/;
      for (const line of lines) {
        if (
          line.length >= 3 &&
          nameLike.test(line) &&
          !EMAIL_REGEX.test(line) &&
          !PHONE_REGEX.test(line)
        ) {
          value = line;
          break;
        }
      }
      if (value === undefined && lines.length > 0) value = lines[0];
    } else {
      const lines = fullText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      value = lines.find((line) => line.length <= 200) ?? undefined;
    }

    if (value !== undefined) result[key] = value;
    else if (required.includes(key)) result[key] = '';
  }

  result.summary = customerText.slice(0, 500);
  return result;
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
  data: Record<string, unknown>,
  options?: { fallbackEmail?: string | null }
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
    const to =
      (config.to as string) ??
      process.env.DELIVERY_EMAIL_TO ??
      options?.fallbackEmail ??
      null;
    if (!to) {
      console.warn(
        '[ConverseAI] Email delivery skipped: no recipient. Set "to" on the email integration, DELIVERY_EMAIL_TO in server env, or ensure a user exists in this tenant.'
      );
      return;
    }
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
      messages: {
        orderBy: { created_at: 'asc' },
        select: { sender_type: true, content: true, payload: true, created_at: true },
      },
    },
  });
  if (!conversation) return null;
  const active = conversation.status === 'active';
  return {
    status: conversation.status,
    // Closed conversations still store handoff columns; widget must not show "connected to agent".
    handoffRequested: active ? !!conversation.handoff_requested_at : false,
    assignedHumanAgentId: active ? conversation.assigned_human_agent_id : null,
    messages: conversation.messages.map((m) => ({
      senderType: m.sender_type,
      content: m.content,
      payload: m.payload as Record<string, unknown> | null,
      createdAt: m.created_at,
    })),
  };
}

export async function requestHumanHandoff(conversationId: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      status: true,
      handoff_requested_at: true,
    },
  });
  if (!conversation || conversation.status !== 'active') return false;
  if (conversation.handoff_requested_at) return true; // already requested
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { handoff_requested_at: new Date() },
  });
  // Do not auto-assign here: an available agent would "take" the chat invisibly, so Live chat
  // showed no waiting rows and other agents saw nothing. Agents pick conversations via Take.
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
        ended_at: null,
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
        ended_at: null,
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

export async function transferConversationToAgent(
  conversationId: string,
  fromUserId: string,
  toUserId: string,
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
    conversation.assigned_human_agent_id !== fromUserId
  )
    return false;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assigned_human_agent_id: toUserId,
      transferred_to_agent_id: toUserId,
    },
  });
  return true;
}

export async function submitRating(
  conversationId: string,
  ratingType: 'thumbs' | 'nps',
  ratingValue: number
): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { status: true },
  });
  if (!conversation || conversation.status !== 'closed') return false;
  const value =
    ratingType === 'thumbs' ? Math.sign(ratingValue) : Math.min(10, Math.max(0, Math.round(ratingValue)));
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      rating_type: ratingType,
      rating_value: value,
      rated_at: new Date(),
    },
  });
  return true;
}

export async function sendMessageAsHuman(
  conversationId: string,
  content: string,
  userId: string,
  tenantId: string,
  payload?: Record<string, unknown> | null
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
      payload: payload ?? undefined,
    },
  });
  return { success: true };
}
