import { CreateAgentForm } from '@/components/modules/agents/create-agent-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewAgentPage() {
  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/agents">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to agents
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">Create agent</h1>
      <p className="text-muted-foreground mb-6">
        Configure the AI agent with a name and system prompt. The agent will be
        assigned to conversations (text or call).
      </p>
      <CreateAgentForm />
    </div>
  );
}
