import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CreateIntegrationForm } from '@/components/modules/integrations/create-integration-form';

export default async function ProjectNewIntegrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10 max-w-lg">
      <Link href={`/projects/${id}/integrations`}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to project integrations
        </Button>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Add integration</h1>
      <p className="text-muted-foreground mb-6">
        Configure where to send compiled conversation data (email, Discord, or SMS). Then enable it
        for this project on the Delivery tab.
      </p>
      <CreateIntegrationForm returnTo={`/projects/${id}/integrations`} />
    </div>
  );
}
