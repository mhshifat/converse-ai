'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProjectSettingsTabProps {
  projectId: string;
  dataSchema?: unknown;
  deliveryIntegrationIds: string[];
}

export function ProjectSettingsTab({
  projectId,
  dataSchema,
  deliveryIntegrationIds,
}: ProjectSettingsTabProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [schemaText, setSchemaText] = useState(
    typeof dataSchema === 'object' && dataSchema !== null
      ? JSON.stringify(dataSchema, null, 2)
      : '{}'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(deliveryIntegrationIds);

  const { data: integrations } = trpc.integrations.list.useQuery();
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => setServerError(null),
    onError: (err) => setServerError(err.message),
  });

  const handleSaveSchema = () => {
    setServerError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(schemaText);
    } catch {
      setServerError('Invalid JSON');
      return;
    }
    updateProject.mutate({
      id: projectId,
      dataSchema: parsed,
    });
  };

  const handleSaveDelivery = () => {
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

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Data schema</h3>
        <p className="text-sm text-muted-foreground">
          JSON schema describing the structure to extract from conversations (e.g. appointment
          details). Used when the conversation ends to compile data.
        </p>
        <div>
          <Label>Schema (JSON)</Label>
          <Textarea
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            className="font-mono text-sm min-h-[120px] mt-1"
            placeholder='{"type": "object", "properties": {...}}'
          />
        </div>
        <Button onClick={handleSaveSchema} disabled={updateProject.isPending}>
          {updateProject.isPending ? 'Saving…' : 'Save schema'}
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Delivery integrations</h3>
        <p className="text-sm text-muted-foreground">
          Where to send compiled conversation data when a conversation ends.
        </p>
        {integrations?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No integrations yet. Add one from the Integrations page.
          </p>
        ) : (
          <div className="space-y-2">
            {integrations?.map((i) => (
              <div key={i.id} className="flex items-center gap-2">
                <Checkbox
                  id={`int-${i.id}`}
                  checked={selectedIds.includes(i.id)}
                  onCheckedChange={() => toggleIntegration(i.id)}
                />
                <label
                  htmlFor={`int-${i.id}`}
                  className="text-sm font-medium capitalize"
                >
                  {i.type}
                  {'webhookUrl' in i.config && (
                    <span className="text-muted-foreground font-normal ml-1">
                      — {String(i.config.webhookUrl).slice(0, 30)}…
                    </span>
                  )}
                </label>
              </div>
            ))}
            <Button
              onClick={handleSaveDelivery}
              disabled={updateProject.isPending}
              className="mt-2"
            >
              {updateProject.isPending ? 'Saving…' : 'Save delivery'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
