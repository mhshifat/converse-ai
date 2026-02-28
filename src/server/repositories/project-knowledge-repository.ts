import { prisma } from '@/lib/prisma';

export interface ProjectKnowledgeItem {
  id: string;
  projectId: string;
  title: string | null;
  content: string;
  sourceType: string | null;
  sourceRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listByProject(
  projectId: string,
  tenantId: string
): Promise<ProjectKnowledgeItem[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return [];

  const rows = await prisma.project_knowledge.findMany({
    where: { project_id: projectId },
    orderBy: { updated_at: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    content: r.content,
    sourceType: r.source_type,
    sourceRef: r.source_ref,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getById(
  id: string,
  projectId: string,
  tenantId: string
): Promise<ProjectKnowledgeItem | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return null;
  const row = await prisma.project_knowledge.findFirst({
    where: { id, project_id: projectId },
  });
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getContextString(projectId: string): Promise<string> {
  const rows = await prisma.project_knowledge.findMany({
    where: { project_id: projectId },
    orderBy: { updated_at: 'desc' },
  });
  if (rows.length === 0) return '';

  const parts = rows.map((r) => {
    const label = r.title ? `[${r.title}]` : '';
    return `${label}\n${r.content}`.trim();
  });
  return parts.join('\n\n---\n\n');
}

export async function create(
  projectId: string,
  tenantId: string,
  data: {
    title?: string | null;
    content: string;
    sourceType?: string | null;
    sourceRef?: string | null;
  }
): Promise<ProjectKnowledgeItem | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return null;

  const row = await prisma.project_knowledge.create({
    data: {
      project_id: projectId,
      title: data.title ?? null,
      content: data.content,
      source_type: data.sourceType ?? null,
      source_ref: data.sourceRef ?? null,
    },
  });
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function update(
  id: string,
  projectId: string,
  tenantId: string,
  data: { title?: string | null; content?: string }
): Promise<ProjectKnowledgeItem | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return null;

  const existing = await prisma.project_knowledge.findFirst({
    where: { id, project_id: projectId },
  });
  if (!existing) return null;

  const row = await prisma.project_knowledge.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
    },
  });
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateContent(
  id: string,
  projectId: string,
  tenantId: string,
  data: { title?: string | null; content: string }
): Promise<ProjectKnowledgeItem | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return null;
  const existing = await prisma.project_knowledge.findFirst({
    where: { id, project_id: projectId },
  });
  if (!existing) return null;
  const row = await prisma.project_knowledge.update({
    where: { id },
    data: { title: data.title ?? existing.title, content: data.content },
  });
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function remove(
  id: string,
  projectId: string,
  tenantId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: tenantId },
  });
  if (!project) return false;

  const existing = await prisma.project_knowledge.findFirst({
    where: { id, project_id: projectId },
  });
  if (!existing) return false;
  await prisma.project_knowledge.delete({ where: { id } });
  return true;
}

export async function getProjectKnowledgeBaseUrl(
  projectId: string
): Promise<string | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { knowledge_base_url: true },
  });
  return project?.knowledge_base_url ?? null;
}
