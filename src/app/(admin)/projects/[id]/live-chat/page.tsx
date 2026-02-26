import { notFound } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { LiveChatContent } from '@/components/modules/live-chat/live-chat-content';

export default async function ProjectLiveChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) notFound();

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: session.user.tenantId },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <h1 className="text-2xl font-bold tracking-tight">Live chat</h1>
      <p className="mt-1 text-muted-foreground">
        Take customer conversations for this project that requested a human. Assign yourself and reply in real time.
      </p>
      <div className="mt-6">
        <LiveChatContent projectId={projectId} />
      </div>
    </div>
  );
}
