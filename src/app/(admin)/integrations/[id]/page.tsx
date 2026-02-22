import { notFound } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { IntegrationDetail } from '@/components/modules/integrations/integration-detail';

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user) notFound();

  const integration = await prisma.integration.findFirst({
    where: { id, tenant_id: session.user.tenantId },
  });
  if (!integration) notFound();

  return (
    <div className="p-8 max-w-lg">
      <IntegrationDetail
        integration={{
          id: integration.id,
          tenantId: integration.tenant_id,
          type: integration.type as 'email' | 'discord' | 'sms',
          config: integration.config as Record<string, unknown>,
          createdAt: integration.created_at,
          updatedAt: integration.updated_at,
        }}
      />
    </div>
  );
}
