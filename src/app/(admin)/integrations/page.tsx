import { IntegrationsList } from '@/components/modules/integrations/integrations-list';
import { DashboardPageHeader } from '@/components/modules/dashboard/dashboard-page-header';

export default function IntegrationsPage() {
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <DashboardPageHeader
        title="Integrations"
        description="Email, Discord, and SMS for delivering compiled conversation data."
        action={{ label: 'Add integration', href: '/dashboard/integrations/new' }}
      />
      <IntegrationsList />
    </div>
  );
}
