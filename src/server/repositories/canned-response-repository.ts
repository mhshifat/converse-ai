import { prisma } from '@/lib/prisma';

export interface CannedResponseItem {
  id: string;
  tenantId: string;
  projectId: string | null;
  shortcut: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listByTenantAndProject(
  tenantId: string,
  projectId: string | null
): Promise<CannedResponseItem[]> {
  const rows = await prisma.canned_response.findMany({
    where: {
      tenant_id: tenantId,
      OR: [{ project_id: null }, { project_id: projectId ?? undefined }],
    },
    orderBy: { shortcut: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    projectId: r.project_id,
    shortcut: r.shortcut,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function create(
  tenantId: string,
  data: { projectId?: string | null; shortcut: string; content: string }
): Promise<CannedResponseItem> {
  const row = await prisma.canned_response.create({
    data: {
      tenant_id: tenantId,
      project_id: data.projectId ?? null,
      shortcut: data.shortcut.trim(),
      content: data.content.trim(),
    },
  });
  return {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    shortcut: row.shortcut,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function update(
  id: string,
  tenantId: string,
  data: { shortcut?: string; content?: string }
): Promise<CannedResponseItem | null> {
  const existing = await prisma.canned_response.findFirst({
    where: { id, tenant_id: tenantId },
  });
  if (!existing) return null;
  const row = await prisma.canned_response.update({
    where: { id },
    data: {
      ...(data.shortcut !== undefined && { shortcut: data.shortcut.trim() }),
      ...(data.content !== undefined && { content: data.content.trim() }),
    },
  });
  return {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    shortcut: row.shortcut,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function remove(id: string, tenantId: string): Promise<boolean> {
  const existing = await prisma.canned_response.findFirst({
    where: { id, tenant_id: tenantId },
  });
  if (!existing) return false;
  await prisma.canned_response.delete({ where: { id } });
  return true;
}
