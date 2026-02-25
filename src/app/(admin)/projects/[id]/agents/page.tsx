import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProjectAgentsContent } from '@/components/modules/projects/project-agents-content';

export default async function ProjectAgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <Link href={`/projects/${id}`}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to project
        </Button>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Project agents</h1>
      <p className="mt-1 text-muted-foreground">
        Assign agents to handle chat and voice conversations for this project&apos;s widget.
      </p>
      <div className="mt-6">
        <ProjectAgentsContent projectId={id} />
      </div>
    </div>
  );
}
