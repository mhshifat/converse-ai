import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProjectGeneralSettingsContent } from '@/components/modules/projects/project-general-settings-content';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) notFound();

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: session.user.tenantId },
    select: { id: true },
  });
  if (!project) notFound();

  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <Link href={`/projects/${projectId}`}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to project
        </Button>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Project settings</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Update how this project appears in the app, and manage permanent deletion.
      </p>
      <div className="mt-6 max-w-2xl">
        <ProjectGeneralSettingsContent projectId={projectId} />
      </div>
    </div>
  );
}
