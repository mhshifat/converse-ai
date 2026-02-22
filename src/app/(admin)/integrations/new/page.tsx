import { CreateIntegrationForm } from '@/components/modules/integrations/create-integration-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewIntegrationPage() {
  return (
    <div className="p-8 max-w-lg">
      <Link href="/dashboard/integrations">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to integrations
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">Add integration</h1>
      <p className="text-muted-foreground mb-6">
        Configure where to send compiled conversation data (email, Discord, or SMS).
      </p>
      <CreateIntegrationForm />
    </div>
  );
}
