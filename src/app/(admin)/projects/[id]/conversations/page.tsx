import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ConversationsList } from '@/components/modules/projects/conversations-list';

export default async function ProjectConversationsPage({
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
      <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
      <p className="mt-1 text-muted-foreground">
        View all chat and voice conversations for this project. Open one to see the full transcript and compiled data.
      </p>
      <div className="mt-6">
        <ConversationsList projectId={id} />
      </div>
    </div>
  );
}
