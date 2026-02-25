import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChatbotEmbedSection } from '@/components/modules/projects/chatbot-embed-section';

export default async function ProjectIntegrationsPage({
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
      <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-1 text-muted-foreground">
        Embed the chat widget and connect project-scoped integrations.
      </p>
      <div className="mt-6 space-y-6">
        <ChatbotEmbedSection projectId={id} />
      </div>
    </div>
  );
}
