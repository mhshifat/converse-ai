import { redirect } from 'next/navigation';
import { getValidatedSessionUser } from '@/server/session-validation';
import { prisma } from '@/lib/prisma';
import { ProjectNotFound } from './not-found';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getValidatedSessionUser();
  if (!user) redirect('/api/auth/clear-session?then=/login');

  const project = await prisma.project.findFirst({
    where: { id, tenant_id: user.tenantId },
    select: { id: true },
  });

  if (!project) return <ProjectNotFound />;

  return <>{children}</>;
}
