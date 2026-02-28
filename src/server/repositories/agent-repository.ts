import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 10;

export interface ListAgentsInput {
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listAgents(input: ListAgentsInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * pageSize;

  const where = {
    tenant_id: input.tenantId,
    ...(input.search?.trim()
      ? {
          name: { contains: input.search.trim(), mode: 'insensitive' as const },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.agent.count({ where }),
  ]);

  return {
    items: items.map((a) => ({
      id: a.id,
      tenantId: a.tenant_id,
      name: a.name,
      systemPrompt: a.system_prompt,
      settings: a.settings as Record<string, unknown>,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAgentById(agentId: string, tenantId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenant_id: tenantId },
  });
  if (!agent) return null;
  return {
    id: agent.id,
    tenantId: agent.tenant_id,
    name: agent.name,
    systemPrompt: agent.system_prompt,
    settings: agent.settings as Record<string, unknown>,
    createdAt: agent.created_at,
    updatedAt: agent.updated_at,
  };
}

export async function createAgent(data: {
  tenantId: string;
  name: string;
  systemPrompt: string;
  settings?: Record<string, unknown>;
}) {
  const agent = await prisma.agent.create({
    data: {
      tenant_id: data.tenantId,
      name: data.name,
      system_prompt: data.systemPrompt,
      settings: (data.settings ?? {}) as object,
    },
  });
  await prisma.agent_version.create({
    data: {
      agent_id: agent.id,
      version: 1,
      system_prompt: agent.system_prompt,
      settings: agent.settings as object,
    },
  });
  return {
    id: agent.id,
    tenantId: agent.tenant_id,
    name: agent.name,
    systemPrompt: agent.system_prompt,
    settings: agent.settings as Record<string, unknown>,
    createdAt: agent.created_at,
    updatedAt: agent.updated_at,
  };
}

export async function updateAgent(
  agentId: string,
  tenantId: string,
  data: {
    name?: string;
    systemPrompt?: string;
    settings?: Record<string, unknown>;
  }
) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenant_id: tenantId },
  });
  if (!agent) return null;

  const nextVersion =
    (await prisma.agent_version
      .aggregate({ where: { agent_id: agentId }, _max: { version: true } })
      .then((r) => (r._max.version ?? 0) + 1));
  await prisma.agent_version.create({
    data: {
      agent_id: agentId,
      version: nextVersion,
      system_prompt: agent.system_prompt,
      settings: agent.settings as object,
    },
  });

  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.systemPrompt !== undefined && { system_prompt: data.systemPrompt }),
      ...(data.settings !== undefined && { settings: data.settings as object }),
    },
  });
  return {
    id: updated.id,
    tenantId: updated.tenant_id,
    name: updated.name,
    systemPrompt: updated.system_prompt,
    settings: updated.settings as Record<string, unknown>,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export interface AgentVersionItem {
  id: string;
  agentId: string;
  version: number;
  systemPrompt: string;
  settings: Record<string, unknown>;
  createdAt: Date;
}

export async function listAgentVersions(
  agentId: string,
  tenantId: string
): Promise<AgentVersionItem[]> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenant_id: tenantId },
  });
  if (!agent) return [];
  const rows = await prisma.agent_version.findMany({
    where: { agent_id: agentId },
    orderBy: { version: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    agentId: r.agent_id,
    version: r.version,
    systemPrompt: r.system_prompt,
    settings: r.settings as Record<string, unknown>,
    createdAt: r.created_at,
  }));
}

export async function rollbackAgentToVersion(
  agentId: string,
  version: number,
  tenantId: string
): Promise<boolean> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenant_id: tenantId },
  });
  if (!agent) return false;
  const v = await prisma.agent_version.findFirst({
    where: { agent_id: agentId, version },
  });
  if (!v) return false;
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      system_prompt: v.system_prompt,
      settings: v.settings,
    },
  });
  return true;
}

export async function deleteAgent(agentId: string, tenantId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, tenant_id: tenantId },
  });
  if (!agent) return false;
  await prisma.agent.delete({ where: { id: agentId } });
  return true;
}

export async function getAgentsForTenant(tenantId: string) {
  const agents = await prisma.agent.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
  });
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    systemPrompt: a.system_prompt,
    settings: a.settings as Record<string, unknown>,
  }));
}
