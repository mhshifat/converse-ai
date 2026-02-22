import { AgentsList } from '@/components/modules/agents/agents-list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Link href="/dashboard/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New agent
          </Button>
        </Link>
      </div>
      <AgentsList />
    </div>
  );
}
