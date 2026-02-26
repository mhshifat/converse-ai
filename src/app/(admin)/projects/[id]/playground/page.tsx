import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PlaygroundContent } from '@/components/modules/projects/playground-content';

export default async function ProjectPlaygroundPage({
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
      <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
      <p className="mt-1 text-muted-foreground">
        Test the full chatbot flow as a customer: start a conversation, send messages or simulate a call, and complete the flow before embedding on your site.
      </p>
      <div className="mt-6">
        <PlaygroundContent projectId={id} />
      </div>
    </div>
  );
}
