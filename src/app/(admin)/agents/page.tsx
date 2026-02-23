import { AgentsList } from '@/components/modules/agents/agents-list';
import { DashboardPageHeader } from '@/components/modules/dashboard/dashboard-page-header';

export default function AgentsPage() {
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <DashboardPageHeader
        title="Agents"
        description="Configure AI agents, system prompts, and provider settings."
        action={{ label: 'New agent', href: '/dashboard/agents/new' }}
      />
      <AgentsList />
    </div>
  );
}
