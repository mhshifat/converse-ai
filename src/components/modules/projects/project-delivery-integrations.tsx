'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Plug, Mail, MessageCircle, Phone, ExternalLink } from 'lucide-react';

const typeLabel: Record<string, string> = {
  email: 'Email',
  discord: 'Discord',
  sms: 'SMS',
};

const typeIcon: Record<string, React.ReactNode> = {
  email: <Mail className="size-4" />,
  discord: <MessageCircle className="size-4" />,
  sms: <Phone className="size-4" />,
};

interface ProjectDeliveryIntegrationsProps {
  projectId: string;
  deliveryIntegrationIds: string[];
}

export function ProjectDeliveryIntegrations({
  projectId,
  deliveryIntegrationIds,
}: ProjectDeliveryIntegrationsProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(deliveryIntegrationIds);
  React.useEffect(() => {
    setSelectedIds(deliveryIntegrationIds);
  }, [deliveryIntegrationIds]);

  const utils = trpc.useUtils();
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      setServerError(null);
      void utils.projects.getById.invalidate({ id: projectId });
    },
    onError: (err) => setServerError(err.message),
  });

  const handleSave = () => {
    setServerError(null);
    updateProject.mutate({
      id: projectId,
      deliveryIntegrationIds: selectedIds,
    });
  };

  const toggleIntegration = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <p className="text-muted-foreground text-sm">Loading integrations…</p>
      </div>
    );
  }

  const list = integrations ?? [];

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Delivery integrations</h3>
          <p className="text-muted-foreground text-sm mt-1">
            When a conversation ends, compiled data (summary, extracted fields) can be sent to
            these integrations. Add Discord webhooks, email, SMS, or other endpoints from your
            account, then enable them for this project below.
          </p>
        </div>

        {list.length === 0 ? (
          <Empty className="rounded-lg border border-dashed border-border/60 bg-muted/10 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Plug className="text-muted-foreground size-8" />
              </EmptyMedia>
              <EmptyTitle>No integrations yet</EmptyTitle>
              <EmptyDescription>
                Create a Discord webhook, email, SMS, or webhook integration first. Then come back
                and enable them for this project.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={`/projects/${projectId}/integrations/new`}>
                  Add integration
                  <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                Select which integrations receive data when a conversation ends.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${projectId}/integrations/new`}>
                  Add another
                  <ExternalLink className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
            <div className="space-y-3">
              {list.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {typeIcon[i.type] ?? <Plug className="size-4" />}
                    <span className="font-medium text-foreground capitalize">
                      {typeLabel[i.type] ?? i.type}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-muted-foreground text-sm truncate">
                    {'webhookUrl' in i.config && typeof i.config.webhookUrl === 'string' && (
                      <span>{i.config.webhookUrl}</span>
                    )}
                    {(i.type === 'email' || i.type === 'sms') && (
                      <span>
                        {(i.config.to as string) || (i.config.from as string) || 'System default'}
                      </span>
                    )}
                    {i.type === 'discord' && !('webhookUrl' in i.config) && (
                      <span>Configured</span>
                    )}
                  </div>
                  <Checkbox
                    id={`delivery-${i.id}`}
                    checked={selectedIds.includes(i.id)}
                    onCheckedChange={() => toggleIntegration(i.id)}
                  />
                  <label htmlFor={`delivery-${i.id}`} className="sr-only">
                    Enable for this project
                  </label>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSave}
              disabled={updateProject.isPending || selectedIds.join() === deliveryIntegrationIds.join()}
            >
              {updateProject.isPending ? 'Saving…' : 'Save delivery settings'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
