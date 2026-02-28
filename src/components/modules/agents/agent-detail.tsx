'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EditAgentForm } from './edit-agent-form';
import { AgentVersionsSection } from './agent-versions-section';

interface AgentDetailProps {
  agent: {
    id: string;
    tenantId: string;
    name: string;
    systemPrompt: string;
    settings: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const router = useRouter();

  return (
    <div>
      <Link href="/dashboard/agents">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to agents
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">{agent.name}</h1>
      <EditAgentForm
        key={agent.updatedAt?.toISOString() ?? agent.id}
        agentId={agent.id}
        defaultValues={{
          name: agent.name,
          systemPrompt: agent.systemPrompt,
        }}
        onDeleted={() => router.push('/dashboard/agents')}
      />
      <AgentVersionsSection
        agentId={agent.id}
        onRollback={() => router.refresh()}
      />
    </div>
  );
}
