import { IntegrationsList } from '@/components/modules/integrations/integrations-list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <Link href="/dashboard/integrations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add integration
          </Button>
        </Link>
      </div>
      <IntegrationsList />
    </div>
  );
}
