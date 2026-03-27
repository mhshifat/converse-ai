import { notFound } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ProjectDetail } from '@/components/modules/projects/project-detail';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) notFound();

  const project = await prisma.project.findFirst({
    where: { id, tenant_id: session.user.tenantId },
    include: { chatbots: true },
  });
  if (!project) notFound();

  return (
    <div className="p-8">
      <ProjectDetail
        project={{
          id: project.id,
          tenantId: project.tenant_id,
          name: project.name,
          description: project.description ?? undefined,
          icon: project.icon ?? undefined,
          logoUrl: project.logo_url ?? undefined,
          dataSchema: project.data_schema,
          deliveryIntegrationIds: Array.isArray(project.delivery_integration_ids)
            ? (project.delivery_integration_ids as string[])
            : undefined,
          conversationMode: (project.conversation_mode as 'human_only' | 'ai_only' | 'both') ?? 'both',
          defaultRatingType: (project.default_rating_type as 'thumbs' | 'nps') ?? 'thumbs',
          businessHours: project.business_hours as Record<string, unknown> | null,
          outOfOfficeMessage: project.out_of_office_message ?? undefined,
          queueOverflowMessage: project.queue_overflow_message ?? undefined,
          slaEscalateMinutes: project.sla_escalate_minutes ?? undefined,
          escalationKeywords: (project.escalation_keywords as string[] | null) ?? undefined,
          proactiveDelaySeconds: project.proactive_delay_seconds ?? undefined,
          proactiveOnExitIntent: project.proactive_on_exit_intent ?? false,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          chatbots: project.chatbots.map((c) => ({
            id: c.id,
            projectId: c.project_id,
            name: c.name,
            config: c.config as Record<string, unknown>,
            apiKey: c.api_key ?? undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          })),
        }}
      />
    </div>
  );
}
