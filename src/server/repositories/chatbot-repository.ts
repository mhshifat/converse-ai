import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

const DEFAULT_CONFIG = {
  primaryColor: '#2563eb',
  position: 'bottom-right',
  welcomeMessage: 'How can I help you today?',
  voiceEnabled: true,
} as const;

export async function getChatbotByProjectId(projectId: string, tenantId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    include: { chatbots: true },
  });
  if (!project) return null;
  const chatbot = project.chatbots[0] ?? null;
  if (!chatbot) return null;
  const cfg = chatbot.config as Record<string, unknown>;
  const defaultRatingType = (project as { default_rating_type?: string }).default_rating_type === 'nps' ? 'nps' : 'thumbs';
  return {
    id: chatbot.id,
    projectId: chatbot.project_id,
    name: chatbot.name,
    config: { ...cfg, defaultRatingType },
    apiKey: chatbot.api_key ?? undefined,
    createdAt: chatbot.created_at,
    updatedAt: chatbot.updated_at,
  };
}

export async function getOrCreateChatbotForProject(
  projectId: string,
  tenantId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    include: { chatbots: true },
  });
  if (!project) return null;

  let chatbot = project.chatbots[0] ?? null;
  if (!chatbot) {
    chatbot = await prisma.chatbot.create({
      data: {
        project_id: projectId,
        name: `${project.name} Chatbot`,
        config: DEFAULT_CONFIG,
        api_key: `cv_${nanoid(32)}`,
      },
    });
  }
  return {
    id: chatbot.id,
    projectId: chatbot.project_id,
    name: chatbot.name,
    config: chatbot.config as Record<string, unknown>,
    apiKey: chatbot.api_key ?? undefined,
    createdAt: chatbot.created_at,
    updatedAt: chatbot.updated_at,
  };
}

export async function updateChatbotConfig(
  chatbotId: string,
  tenantId: string,
  config: Record<string, unknown>
) {
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: chatbotId },
    include: { project: true },
  });
  if (!chatbot || chatbot.project.tenant_id !== tenantId) return null;
  const updated = await prisma.chatbot.update({
    where: { id: chatbotId },
    data: { config: config as object },
  });
  return {
    id: updated.id,
    projectId: updated.project_id,
    name: updated.name,
    config: updated.config as Record<string, unknown>,
    apiKey: updated.api_key ?? undefined,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function regenerateChatbotApiKey(chatbotId: string, tenantId: string) {
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: chatbotId },
    include: { project: true },
  });
  if (!chatbot || chatbot.project.tenant_id !== tenantId) return null;
  const newKey = `cv_${nanoid(32)}`;
  const updated = await prisma.chatbot.update({
    where: { id: chatbotId },
    data: { api_key: newKey },
  });
  return { apiKey: updated.api_key! };
}
