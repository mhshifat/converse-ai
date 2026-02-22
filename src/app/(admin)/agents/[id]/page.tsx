import { notFound } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { AgentDetail } from '@/components/modules/agents/agent-detail';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user) notFound();

  const agent = await prisma.agent.findFirst({
    where: { id, tenant_id: session.user.tenantId },
  });
  if (!agent) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <AgentDetail
        agent={{
          id: agent.id,
          tenantId: agent.tenant_id,
          name: agent.name,
          systemPrompt: agent.system_prompt,
          settings: agent.settings as Record<string, unknown>,
          createdAt: agent.created_at,
          updatedAt: agent.updated_at,
        }}
      />
    </div>
  );
}
