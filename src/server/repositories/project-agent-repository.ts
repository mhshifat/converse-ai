import { prisma } from '@/lib/prisma';

export interface ProjectAgentAssignment {
  id: string;
  projectId: string;
  agentId: string;
  isDefaultChat: boolean;
  isDefaultVoice: boolean;
  agent: {
    id: string;
    name: string;
    systemPrompt: string;
    settings: Record<string, unknown>;
  };
}

export async function listProjectAgents(
  projectId: string,
  tenantId: string
): Promise<ProjectAgentAssignment[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return [];

  const rows = await prisma.project_agent.findMany({
    where: { project_id: projectId },
    include: { agent: true },
    orderBy: [
      { is_default_chat: 'desc' },
      { is_default_voice: 'desc' },
      { created_at: 'asc' },
    ],
  });

  return rows
    .filter((r) => r.agent.tenant_id === tenantId)
    .map((r) => ({
      id: r.id,
      projectId: r.project_id,
      agentId: r.agent_id,
      isDefaultChat: r.is_default_chat,
      isDefaultVoice: r.is_default_voice,
      agent: {
        id: r.agent.id,
        name: r.agent.name,
        systemPrompt: r.agent.system_prompt,
        settings: (r.agent.settings ?? {}) as Record<string, unknown>,
      },
    }));
}

export async function assignAgentToProject(
  projectId: string,
  agentId: string,
  tenantId: string,
  options?: { isDefaultChat?: boolean; isDefaultVoice?: boolean }
): Promise<ProjectAgentAssignment | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenant_id: tenantId },
  });
  if (!project || !agent) return null;

  const existing = await prisma.project_agent.findUnique({
    where: {
      project_id_agent_id: { project_id: projectId, agent_id: agentId },
    },
  });
  if (existing) {
    const updated = await prisma.project_agent.update({
      where: { id: existing.id },
      data: {
        ...(options?.isDefaultChat !== undefined && { is_default_chat: options.isDefaultChat }),
        ...(options?.isDefaultVoice !== undefined && { is_default_voice: options.isDefaultVoice }),
      },
      include: { agent: true },
    });
    return {
      id: updated.id,
      projectId: updated.project_id,
      agentId: updated.agent_id,
      isDefaultChat: updated.is_default_chat,
      isDefaultVoice: updated.is_default_voice,
      agent: {
        id: updated.agent.id,
        name: updated.agent.name,
        systemPrompt: updated.agent.system_prompt,
        settings: (updated.agent.settings ?? {}) as Record<string, unknown>,
      },
    };
  }

  const first = await prisma.project_agent.count({ where: { project_id: projectId } });
  const isFirst = first === 0;
  const row = await prisma.project_agent.create({
    data: {
      project_id: projectId,
      agent_id: agentId,
      is_default_chat: options?.isDefaultChat ?? isFirst,
      is_default_voice: options?.isDefaultVoice ?? isFirst,
    },
    include: { agent: true },
  });
  return {
    id: row.id,
    projectId: row.project_id,
    agentId: row.agent_id,
    isDefaultChat: row.is_default_chat,
    isDefaultVoice: row.is_default_voice,
    agent: {
      id: row.agent.id,
      name: row.agent.name,
      systemPrompt: row.agent.system_prompt,
      settings: (row.agent.settings ?? {}) as Record<string, unknown>,
    },
  };
}

export async function unassignAgentFromProject(
  projectId: string,
  agentId: string,
  tenantId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return false;

  const row = await prisma.project_agent.findUnique({
    where: {
      project_id_agent_id: { project_id: projectId, agent_id: agentId },
    },
  });
  if (!row) return false;
  await prisma.project_agent.delete({ where: { id: row.id } });
  return true;
}

export async function setProjectAgentDefault(
  projectId: string,
  agentId: string,
  channel: 'chat' | 'voice',
  tenantId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return false;

  const assignment = await prisma.project_agent.findUnique({
    where: {
      project_id_agent_id: { project_id: projectId, agent_id: agentId },
    },
  });
  if (!assignment) return false;

  if (channel === 'chat') {
    await prisma.project_agent.updateMany({
      where: { project_id: projectId },
      data: { is_default_chat: false },
    });
    await prisma.project_agent.update({
      where: { id: assignment.id },
      data: { is_default_chat: true },
    });
  } else {
    await prisma.project_agent.updateMany({
      where: { project_id: projectId },
      data: { is_default_voice: false },
    });
    await prisma.project_agent.update({
      where: { id: assignment.id },
      data: { is_default_voice: true },
    });
  }
  return true;
}

/** Get the agent ID to use for a new conversation on this project for the given channel. */
export async function getDefaultAgentForProject(
  projectId: string,
  channel: 'text' | 'call'
): Promise<string | null> {
  const isChat = channel === 'text';
  const row = await prisma.project_agent.findFirst({
    where: {
      project_id: projectId,
      ...(isChat ? { is_default_chat: true } : { is_default_voice: true }),
    },
    include: { agent: true },
  });
  if (row) return row.agent_id;
  const fallback = await prisma.project_agent.findFirst({
    where: { project_id: projectId },
    include: { agent: true },
  });
  return fallback?.agent_id ?? null;
}
