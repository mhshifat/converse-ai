import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;

export interface ListContactsInput {
  tenantId: string;
  projectId?: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listContacts(input: ListContactsInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * pageSize;
  const search = input.search?.trim();

  const where = {
    tenant_id: input.tenantId,
    ...(input.projectId != null ? { project_id: input.projectId } : {}),
    ...(search
      ? {
          OR: [
            { external_id: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    items: items.map((c) => ({
      id: c.id,
      tenantId: c.tenant_id,
      projectId: c.project_id,
      externalId: c.external_id,
      name: c.name,
      email: c.email,
      customFields: c.custom_fields as Record<string, unknown> | null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getContactById(contactId: string, tenantId: string) {
  const c = await prisma.contact.findFirst({
    where: { id: contactId, tenant_id: tenantId },
  });
  if (!c) return null;
  return {
    id: c.id,
    tenantId: c.tenant_id,
    projectId: c.project_id,
    externalId: c.external_id,
    name: c.name,
    email: c.email,
    customFields: c.custom_fields as Record<string, unknown> | null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/** Find contact by tenant + project (or null) + external_id (widget customer_id). */
export async function getContactByExternalId(
  tenantId: string,
  externalId: string,
  projectId?: string | null
) {
  const c = await prisma.contact.findFirst({
    where: {
      tenant_id: tenantId,
      external_id: externalId,
      ...(projectId != null ? { project_id: projectId } : { project_id: null }),
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    tenantId: c.tenant_id,
    projectId: c.project_id,
    externalId: c.external_id,
    name: c.name,
    email: c.email,
    customFields: c.custom_fields as Record<string, unknown> | null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export interface CreateContactInput {
  tenantId: string;
  projectId?: string | null;
  externalId: string;
  name?: string | null;
  email?: string | null;
  customFields?: Record<string, unknown> | null;
}

export async function createContact(input: CreateContactInput) {
  const c = await prisma.contact.create({
    data: {
      tenant_id: input.tenantId,
      project_id: input.projectId ?? null,
      external_id: input.externalId,
      name: input.name ?? null,
      email: input.email ?? null,
      custom_fields: (input.customFields ?? null) as object | null,
    },
  });
  return {
    id: c.id,
    tenantId: c.tenant_id,
    projectId: c.project_id,
    externalId: c.external_id,
    name: c.name,
    email: c.email,
    customFields: c.custom_fields as Record<string, unknown> | null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export interface UpdateContactInput {
  name?: string | null;
  email?: string | null;
  customFields?: Record<string, unknown> | null;
}

export async function updateContact(
  contactId: string,
  tenantId: string,
  input: UpdateContactInput
) {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, tenant_id: tenantId },
  });
  if (!existing) return null;
  const c = await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(input.name !== undefined && { name: input.name ?? null }),
      ...(input.email !== undefined && { email: input.email ?? null }),
      ...(input.customFields !== undefined && {
        custom_fields: (input.customFields ?? null) as object | null,
      }),
    },
  });
  return {
    id: c.id,
    tenantId: c.tenant_id,
    projectId: c.project_id,
    externalId: c.external_id,
    name: c.name,
    email: c.email,
    customFields: c.custom_fields as Record<string, unknown> | null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/** Upsert: create or update by tenant_id, project_id, external_id. */
export async function upsertContact(input: CreateContactInput & Partial<UpdateContactInput>) {
  const { tenantId, projectId, externalId, name, email, customFields } = input;
  if (projectId != null && projectId !== '') {
    const c = await prisma.contact.upsert({
      where: {
        tenant_id_project_id_external_id: {
          tenant_id: tenantId,
          project_id: projectId,
          external_id: externalId,
        },
      },
      create: {
        tenant_id: tenantId,
        project_id: projectId,
        external_id: externalId,
        name: name ?? null,
        email: email ?? null,
        custom_fields: (customFields ?? null) as object | null,
      },
      update: {
        ...(name !== undefined && { name: name ?? null }),
        ...(email !== undefined && { email: email ?? null }),
        ...(customFields !== undefined && { custom_fields: (customFields ?? null) as object | null }),
      },
    });
    return {
      id: c.id,
      tenantId: c.tenant_id,
      projectId: c.project_id,
      externalId: c.external_id,
      name: c.name,
      email: c.email,
      customFields: c.custom_fields as Record<string, unknown> | null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }
  const existing = await prisma.contact.findFirst({
    where: { tenant_id: tenantId, project_id: null, external_id: externalId },
  });
  if (existing) {
    return updateContact(existing.id, tenantId, {
      name: name ?? existing.name,
      email: email ?? existing.email,
      customFields: customFields ?? (existing.custom_fields as Record<string, unknown>),
    }).then((r) => (r ? { ...r, projectId: null } : null));
  }
  return createContact({
    tenantId,
    projectId: null,
    externalId,
    name: name ?? null,
    email: email ?? null,
    customFields: customFields ?? null,
  });
}

export async function deleteContact(contactId: string, tenantId: string) {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, tenant_id: tenantId },
  });
  if (!existing) return false;
  await prisma.contact.delete({ where: { id: contactId } });
  return true;
}
