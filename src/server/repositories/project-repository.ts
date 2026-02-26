import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 10;

export interface ListProjectsInput {
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listProjects(input: ListProjectsInput) {
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
    prisma.project.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize,
      include: { _count: { select: { chatbots: true } } },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items: items.map((p) => ({
      id: p.id,
      tenantId: p.tenant_id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      dataSchema: p.data_schema,
      deliveryIntegrationIds: p.delivery_integration_ids,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      chatbotCount: p._count.chatbots,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProjectById(projectId: string, tenantId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
    include: {
      chatbots: true,
    },
  });
  if (!project) return null;
  return {
    id: project.id,
    tenantId: project.tenant_id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    dataSchema: project.data_schema,
    deliveryIntegrationIds: project.delivery_integration_ids,
    conversationMode: (project.conversation_mode as 'human_only' | 'ai_only' | 'both') ?? 'both',
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    chatbots: project.chatbots.map((c) => ({
      id: c.id,
      projectId: c.project_id,
      name: c.name,
      config: c.config,
      apiKey: c.api_key,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  };
}

export async function createProject(data: {
  tenantId: string;
  name: string;
  description?: string;
  icon?: string | null;
}) {
  const project = await prisma.project.create({
    data: {
      tenant_id: data.tenantId,
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? null,
    },
  });
  return {
    id: project.id,
    tenantId: project.tenant_id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    dataSchema: project.data_schema,
    deliveryIntegrationIds: project.delivery_integration_ids,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

export async function updateProject(
  projectId: string,
  tenantId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string | null;
    dataSchema?: unknown;
    deliveryIntegrationIds?: string[];
    conversationMode?: 'human_only' | 'ai_only' | 'both';
  }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return null;

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.dataSchema !== undefined && { data_schema: data.dataSchema as object }),
      ...(data.deliveryIntegrationIds !== undefined && {
        delivery_integration_ids: data.deliveryIntegrationIds,
      }),
      ...(data.conversationMode !== undefined && { conversation_mode: data.conversationMode }),
    },
  });
  return {
    id: updated.id,
    tenantId: updated.tenant_id,
    name: updated.name,
    description: updated.description,
    icon: updated.icon,
    dataSchema: updated.data_schema,
    deliveryIntegrationIds: updated.delivery_integration_ids,
    conversationMode: (updated.conversation_mode as 'human_only' | 'ai_only' | 'both') ?? 'both',
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function deleteProject(projectId: string, tenantId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return false;
  await prisma.project.delete({ where: { id: projectId } });
  return true;
}
