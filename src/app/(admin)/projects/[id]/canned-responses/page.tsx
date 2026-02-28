import { CannedResponsesContent } from '@/components/modules/canned-responses/canned-responses-content';

export default async function ProjectCannedResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <h1 className="text-2xl font-bold tracking-tight">Quick replies</h1>
      <p className="mt-1 text-muted-foreground">
        Canned responses for live chat in this project. Use shortcuts in the reply box when handling conversations.
      </p>
      <div className="mt-6">
        <CannedResponsesContent projectId={projectId} />
      </div>
    </div>
  );
}
