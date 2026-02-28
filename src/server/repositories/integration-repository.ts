import { prisma } from '@/lib/prisma';

export async function listIntegrations(tenantId: string) {
  const items = await prisma.integration.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  });
  return items.map((i) => ({
    id: i.id,
    tenantId: i.tenant_id,
    type: i.type as 'email' | 'discord' | 'sms' | 'webhook',
    config: i.config as Record<string, unknown>,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  }));
}

export async function getIntegrationById(integrationId: string, tenantId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenant_id: tenantId },
  });
  if (!integration) return null;
  return {
    id: integration.id,
    tenantId: integration.tenant_id,
    type: integration.type as 'email' | 'discord' | 'sms' | 'webhook',
    config: integration.config as Record<string, unknown>,
    createdAt: integration.created_at,
    updatedAt: integration.updated_at,
  };
}

export async function createIntegration(data: {
  tenantId: string;
  type: 'email' | 'discord' | 'sms' | 'webhook';
  config: Record<string, unknown>;
}) {
  const integration = await prisma.integration.create({
    data: {
      tenant_id: data.tenantId,
      type: data.type,
      config: data.config as object,
    },
  });
  return {
    id: integration.id,
    tenantId: integration.tenant_id,
    type: integration.type as 'email' | 'discord' | 'sms' | 'webhook',
    config: integration.config as Record<string, unknown>,
    createdAt: integration.created_at,
    updatedAt: integration.updated_at,
  };
}

export async function updateIntegration(
  integrationId: string,
  tenantId: string,
  data: { config: Record<string, unknown> }
) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenant_id: tenantId },
  });
  if (!integration) return null;
  const updated = await prisma.integration.update({
    where: { id: integrationId },
    data: { config: data.config as object },
  });
  return {
    id: updated.id,
    tenantId: updated.tenant_id,
    type: updated.type as 'email' | 'discord' | 'sms' | 'webhook',
    config: updated.config as Record<string, unknown>,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

export async function deleteIntegration(integrationId: string, tenantId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, tenant_id: tenantId },
  });
  if (!integration) return false;
  await prisma.integration.delete({ where: { id: integrationId } });
  return true;
}
