'use client';

import React, { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  defaultRatingType?: 'thumbs' | 'nps';
  businessHours?: Record<string, unknown> | null;
  outOfOfficeMessage?: string;
  queueOverflowMessage?: string;
  slaEscalateMinutes?: number;
  escalationKeywords?: string[];
  proactiveDelaySeconds?: number;
  proactiveOnExitIntent?: boolean;
}

export function ProjectSettingsTab({
  projectId,
  dataSchema,
  deliveryIntegrationIds,
  conversationMode: initialConversationMode = 'both',
  defaultRatingType: initialDefaultRatingType = 'thumbs',
  outOfOfficeMessage: initialOutOfOffice = '',
  queueOverflowMessage: initialQueueOverflow = '',
  slaEscalateMinutes: initialSlaMinutes,
  escalationKeywords: initialEscalationKeywords = [],
  proactiveDelaySeconds: initialProactiveDelay,
  proactiveOnExitIntent: initialProactiveExit = false,
}: ProjectSettingsTabProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [conversationMode, setConversationMode] = useState<ConversationMode>(initialConversationMode);
  const [defaultRatingType, setDefaultRatingType] = useState<'thumbs' | 'nps'>(initialDefaultRatingType);
  const [outOfOfficeMessage, setOutOfOfficeMessage] = useState(initialOutOfOffice);
  const [queueOverflowMessage, setQueueOverflowMessage] = useState(initialQueueOverflow);
  const [slaEscalateMinutes, setSlaEscalateMinutes] = useState<string>(initialSlaMinutes != null ? String(initialSlaMinutes) : '');
  const [escalationKeywords, setEscalationKeywords] = useState<string>(initialEscalationKeywords.join(', '));
  const [proactiveDelaySeconds, setProactiveDelaySeconds] = useState<string>(initialProactiveDelay != null ? String(initialProactiveDelay) : '');
  const [proactiveOnExitIntent, setProactiveOnExitIntent] = useState(initialProactiveExit);
  React.useEffect(() => {
    setConversationMode(initialConversationMode);
  }, [initialConversationMode]);
  React.useEffect(() => {
    setDefaultRatingType(initialDefaultRatingType);
    setOutOfOfficeMessage(initialOutOfOffice);
    setQueueOverflowMessage(initialQueueOverflow);
    setSlaEscalateMinutes(initialSlaMinutes != null ? String(initialSlaMinutes) : '');
    setEscalationKeywords(initialEscalationKeywords.join(', '));
    setProactiveDelaySeconds(initialProactiveDelay != null ? String(initialProactiveDelay) : '');
    setProactiveOnExitIntent(initialProactiveExit);
  }, [initialDefaultRatingType, initialOutOfOffice, initialQueueOverflow, initialSlaMinutes, initialEscalationKeywords, initialProactiveDelay, initialProactiveExit]);
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
      setCorrelationId(null);
      if (data?.conversationMode) setConversationMode(data.conversationMode);
      if (data?.defaultRatingType != null) setDefaultRatingType(data.defaultRatingType);
      if (data?.outOfOfficeMessage != null) setOutOfOfficeMessage(data.outOfOfficeMessage ?? '');
      if (data?.queueOverflowMessage != null) setQueueOverflowMessage(data.queueOverflowMessage ?? '');
      if (data?.slaEscalateMinutes != null) setSlaEscalateMinutes(String(data.slaEscalateMinutes));
      if (data?.escalationKeywords) setEscalationKeywords(data.escalationKeywords.join(', '));
      if (data?.proactiveDelaySeconds != null) setProactiveDelaySeconds(String(data.proactiveDelaySeconds));
      if (data?.proactiveOnExitIntent != null) setProactiveOnExitIntent(data.proactiveOnExitIntent);
    },
    onError: (err) => {
      setServerError(err.message);
      setCorrelationId((err as { data?: { correlationId?: string } }).data?.correlationId ?? null);
    },
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
    setCorrelationId(null);
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
    setCorrelationId(null);
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
    setCorrelationId(null);
    updateProject.mutate({
      id: projectId,
      conversationMode,
    });
  };

  const handleSaveBehavior = () => {
    setServerError(null);
    setCorrelationId(null);
    const sla = slaEscalateMinutes.trim() === '' ? null : parseInt(slaEscalateMinutes, 10);
    const proactive = proactiveDelaySeconds.trim() === '' ? null : parseInt(proactiveDelaySeconds, 10);
    const keywords = escalationKeywords
      .split(/,\s*/)
      .map((k) => k.trim())
      .filter(Boolean);
    updateProject.mutate({
      id: projectId,
      defaultRatingType,
      outOfOfficeMessage: outOfOfficeMessage || null,
      queueOverflowMessage: queueOverflowMessage || null,
      slaEscalateMinutes: sla ?? undefined,
      escalationKeywords: keywords.length ? keywords : null,
      proactiveDelaySeconds: proactive ?? undefined,
      proactiveOnExitIntent,
    });
  };

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {serverError}
            {correlationId && (
              <span
                className="ml-2 text-xs cursor-pointer underline underline-offset-2"
                title="Copy correlation ID"
                onClick={() => void navigator.clipboard.writeText(correlationId)}
              >
                (ID: {correlationId})
              </span>
            )}
          </AlertDescription>
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
        <h3 className="font-semibold">Behavior</h3>
        <p className="text-sm text-muted-foreground">
          Rating type, availability messages, SLA escalation, and proactive chat.
        </p>
        <div className="grid gap-4 max-w-xl">
          <div>
            <Label>Widget rating type</Label>
            <Select
              value={defaultRatingType}
              onValueChange={(v) => setDefaultRatingType(v as 'thumbs' | 'nps')}
            >
              <SelectTrigger className="w-[200px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thumbs">Thumbs up/down</SelectItem>
                <SelectItem value="nps">NPS (0–10)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Out of office message</Label>
            <Textarea
              className="mt-1"
              placeholder="We are currently outside business hours."
              value={outOfOfficeMessage}
              onChange={(e) => setOutOfOfficeMessage(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Queue overflow message</Label>
            <Textarea
              className="mt-1"
              placeholder="No agents available. Please try again later."
              value={queueOverflowMessage}
              onChange={(e) => setQueueOverflowMessage(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>SLA escalate (minutes)</Label>
            <Input
              type="number"
              min={0}
              className="mt-1 w-24"
              placeholder="e.g. 5"
              value={slaEscalateMinutes}
              onChange={(e) => setSlaEscalateMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Auto handoff if no first response within this many minutes.</p>
          </div>
          <div>
            <Label>Escalation keywords</Label>
            <Input
              className="mt-1"
              placeholder="manager, human, complaint"
              value={escalationKeywords}
              onChange={(e) => setEscalationKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated; if customer message contains any, handoff is requested.</p>
          </div>
          <div>
            <Label>Proactive delay (seconds)</Label>
            <Input
              type="number"
              min={0}
              className="mt-1 w-24"
              placeholder="0 = disabled"
              value={proactiveDelaySeconds}
              onChange={(e) => setProactiveDelaySeconds(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Open widget automatically after this many seconds on page.</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="proactive-exit"
              checked={proactiveOnExitIntent}
              onCheckedChange={(c) => setProactiveOnExitIntent(!!c)}
            />
            <label htmlFor="proactive-exit" className="text-sm font-medium">Proactive on exit intent</label>
          </div>
        </div>
        <Button onClick={handleSaveBehavior} disabled={updateProject.isPending} className="mt-2">
          {updateProject.isPending ? 'Saving…' : 'Save behavior'}
        </Button>
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
                  {('webhookUrl' in i.config || 'url' in i.config) && (
                    <span className="text-muted-foreground font-normal ml-1">
                      — {String((i.config as { webhookUrl?: string; url?: string }).webhookUrl ?? (i.config as { url?: string }).url ?? '').slice(0, 30)}…
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
