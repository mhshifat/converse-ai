'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EditIntegrationForm } from './edit-integration-form';

interface IntegrationDetailProps {
  integration: {
    id: string;
    tenantId: string;
    type: 'email' | 'discord' | 'sms';
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function IntegrationDetail({ integration }: IntegrationDetailProps) {
  const router = useRouter();

  return (
    <div>
      <Link href="/dashboard/integrations">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to integrations
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2 capitalize">{integration.type}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Update configuration. Sensitive values (e.g. API key) are not shown.
      </p>
      <EditIntegrationForm
        integrationId={integration.id}
        type={integration.type}
        defaultConfig={integration.config}
        onDeleted={() => router.push('/dashboard/integrations')}
      />
    </div>
  );
}
