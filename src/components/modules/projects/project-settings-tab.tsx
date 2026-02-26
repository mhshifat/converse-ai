'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { JsonSchemaBuilder } from './json-schema-builder';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ConversationMode = 'human_only' | 'ai_only' | 'both';

interface ProjectSettingsTabProps {
  projectId: string;
  dataSchema?: unknown;
  deliveryIntegrationIds: string[];
  conversationMode?: ConversationMode;
}

export function ProjectSettingsTab({
  projectId,
  dataSchema,
  deliveryIntegrationIds,
  conversationMode: initialConversationMode = 'both',
}: ProjectSettingsTabProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [conversationMode, setConversationMode] = useState<ConversationMode>(initialConversationMode);
  React.useEffect(() => {
    setConversationMode(initialConversationMode);
  }, [initialConversationMode]);
  const [schemaText, setSchemaText] = useState(
    typeof dataSchema === 'object' && dataSchema !== null
      ? JSON.stringify(dataSchema, null, 2)
      : '{}'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(deliveryIntegrationIds);

  const { data: integrations } = trpc.integrations.list.useQuery();
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: (data) => {
      setServerError(null);
      if (data?.conversationMode) setConversationMode(data.conversationMode);
    },
    onError: (err) => setServerError(err.message),
  });

  const parsedSchema = React.useMemo(() => {
    try {
      return JSON.parse(schemaText) as unknown;
    } catch {
      return null;
    }
  }, [schemaText]);

  const handleSchemaBuilderChange = useCallback((value: Record<string, unknown>) => {
    setSchemaText(JSON.stringify(value, null, 2));
  }, []);

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

  const handleSaveConversationMode = () => {
    setServerError(null);
    updateProject.mutate({
      id: projectId,
      conversationMode,
    });
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
        <h3 className="font-semibold">Conversation mode</h3>
        <p className="text-sm text-muted-foreground">
          Choose who handles chat: AI only, human agents only, or both (AI first; handoff to human when the AI cannot help).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={conversationMode}
            onValueChange={(v) => setConversationMode(v as ConversationMode)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both (AI + human handoff)</SelectItem>
              <SelectItem value="ai_only">AI only</SelectItem>
              <SelectItem value="human_only">Human agents only</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleSaveConversationMode}
            disabled={updateProject.isPending}
          >
            {updateProject.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Data schema</h3>
        <p className="text-sm text-muted-foreground">
          JSON schema describing the structure to extract from conversations (e.g. appointment
          details). Used when the conversation ends to compile data.
        </p>
        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full max-w-[280px] grid-cols-2">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="builder" className="mt-4">
            {parsedSchema !== null ? (
              <JsonSchemaBuilder
                value={parsedSchema}
                onChange={handleSchemaBuilderChange}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Invalid JSON in raw mode. Switch to Raw JSON to fix it, or reset to{' '}
                <code className="rounded bg-muted px-1">&#123;&#125;</code>.
              </p>
            )}
          </TabsContent>
          <TabsContent value="raw" className="mt-4">
            <Label>Schema (JSON)</Label>
            <Textarea
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              className="font-mono text-sm min-h-[200px] mt-1"
              placeholder='{"type": "object", "properties": {...}}'
            />
          </TabsContent>
        </Tabs>
        <Button onClick={handleSaveSchema} disabled={updateProject.isPending} className="mt-4">
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
