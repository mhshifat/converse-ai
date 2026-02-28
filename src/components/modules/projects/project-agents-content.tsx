'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Bot, MessageSquare, Phone, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectAgentsContentProps {
  projectId: string;
}

export function ProjectAgentsContent({ projectId }: ProjectAgentsContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'assign'>('create');
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [provider, setProvider] = useState<string>('groq');
  const [model, setModel] = useState<string>('llama-3.3-70b-versatile');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const utils = trpc.useUtils();
  const { data: assigned, isLoading } = trpc.projectAgents.list.useQuery({ projectId });
  const { data: available } = trpc.projectAgents.listAvailableToAssign.useQuery(
    { projectId },
    { enabled: dialogOpen && mode === 'assign' }
  );

  useEffect(() => {
    if (dialogOpen && mode === 'assign' && available && available.length === 0) {
      toast.info('No other agents available. Create one in the "Create new" tab.');
    }
  }, [dialogOpen, mode, available]);

  const assignMutation = trpc.projectAgents.assign.useMutation({
    onSuccess: () => {
      utils.projectAgents.list.invalidate({ projectId });
      utils.projectAgents.listAvailableToAssign.invalidate({ projectId });
    },
  });
  const unassignMutation = trpc.projectAgents.unassign.useMutation({
    onSuccess: () => {
      utils.projectAgents.list.invalidate({ projectId });
      utils.projectAgents.listAvailableToAssign.invalidate({ projectId });
    },
  });
  const setDefaultMutation = trpc.projectAgents.setDefault.useMutation({
    onSuccess: () => utils.projectAgents.list.invalidate({ projectId }),
  });
  const createAgentMutation = trpc.agents.create.useMutation({
    onSuccess: (agent) => {
      assignMutation.mutate({
        projectId,
        agentId: agent.id,
        isDefaultChat: (assigned?.length ?? 0) === 0,
        isDefaultVoice: (assigned?.length ?? 0) === 0,
      });
    },
  });

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setName('');
    setSystemPrompt('');
    setProvider('groq');
    setModel('llama-3.3-70b-versatile');
    setSelectedAgentId('');
  };

  const handleCreateAndAssign = () => {
    if (!name.trim() || !systemPrompt.trim()) return;
    createAgentMutation.mutate({
      name: name.trim(),
      systemPrompt: systemPrompt.trim(),
      settings: {
        provider: provider as 'groq' | 'openai',
        model: model || undefined,
      },
    });
    setDialogOpen(false);
  };

  const handleAssignExisting = () => {
    if (!selectedAgentId) return;
    assignMutation.mutate({
      projectId,
      agentId: selectedAgentId,
      isDefaultChat: (assigned?.length ?? 0) === 0,
      isDefaultVoice: (assigned?.length ?? 0) === 0,
    });
    setDialogOpen(false);
  };

  const isEmpty = !isLoading && (!assigned || assigned.length === 0);

  return (
    <div className="space-y-8">
      {/* How it works */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-foreground mb-2">How agents work</h2>
        <p className="text-muted-foreground text-sm max-w-2xl">
          When a customer opens your chat widget, they can <strong>chat</strong> or use{' '}
          <strong>voice</strong>. Assign one or more agents to this project and choose which agent
          handles each channel. The default agent for Chat handles text conversations; the default
          for Voice handles calls. You can set different agents for each.
        </p>
      </div>

      {/* Assigned agents */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Assigned agents</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="gap-2">
                <Plus className="size-4" />
                Add agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle>Add agent to project</DialogTitle>
                <DialogDescription>
                  Create a new agent or assign an existing one from your tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex gap-2 py-2">
                <Button
                  variant={mode === 'create' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('create')}
                >
                  Create new
                </Button>
                <Button
                  variant={mode === 'assign' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('assign')}
                >
                  Assign existing
                </Button>
              </div>
              {mode === 'create' ? (
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Support Agent"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>System prompt</Label>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="You are a helpful support agent. Be concise and friendly."
                      rows={6}
                      className="mt-1 min-h-[120px] max-h-[40vh] resize-y overflow-y-auto"
                    />
                  </div>
                  <div>
                    <Label>AI provider</Label>
                    <Select value={provider} onValueChange={(v) => { setProvider(v); if (v === 'groq') setModel('llama-3.3-70b-versatile'); if (v === 'openai') setModel('gpt-4o-mini'); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="groq">Groq</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {provider === 'groq' && (
                          <>
                            <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                            <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                            <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                          </>
                        )}
                        {provider === 'openai' && (
                          <>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Choose an agent</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select agent…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(available ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    {available?.length === 0 && (
                      <p className="text-muted-foreground text-xs mt-1.5">
                        No other agents available. Use &quot;Create new&quot; to add one.
                      </p>
                    )}
                  </Select>
                </div>
              )}
              </div>
              <DialogFooter className="shrink-0">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                {mode === 'create' ? (
                  <Button
                    onClick={handleCreateAndAssign}
                    disabled={!name.trim() || !systemPrompt.trim() || createAgentMutation.isPending}
                  >
                    {createAgentMutation.isPending ? 'Creating…' : 'Create & assign'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleAssignExisting}
                    disabled={!selectedAgentId || assignMutation.isPending}
                  >
                    {assignMutation.isPending ? 'Assigning…' : 'Assign'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          </div>
        ) : isEmpty ? (
          <Empty className="rounded-xl border border-dashed border-border/60 bg-muted/10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot className="text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No agents assigned</EmptyTitle>
              <EmptyDescription>
                Add an agent to handle chat and voice conversations for this project&apos;s widget.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={handleOpenDialog} className="gap-2">
                <Plus className="size-4" />
                Add agent
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3">
            {assigned?.map((pa) => (
              <div
                key={pa.id}
                className={cn(
                  'rounded-xl border border-border/50 bg-card p-4 flex flex-wrap items-start justify-between gap-4'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{pa.agent.name}</span>
                    {pa.isDefaultChat && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <MessageSquare className="size-3" />
                        Default for Chat
                      </span>
                    )}
                    {pa.isDefaultVoice && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Phone className="size-3" />
                        Default for Voice
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                    {pa.agent.systemPrompt}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!pa.isDefaultChat && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDefaultMutation.mutate({
                          projectId,
                          agentId: pa.agentId,
                          channel: 'chat',
                        })
                      }
                      disabled={setDefaultMutation.isPending}
                    >
                      <MessageSquare className="size-3.5 mr-1" />
                      Set Chat default
                    </Button>
                  )}
                  {!pa.isDefaultVoice && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDefaultMutation.mutate({
                          projectId,
                          agentId: pa.agentId,
                          channel: 'voice',
                        })
                      }
                      disabled={setDefaultMutation.isPending}
                    >
                      <Phone className="size-3.5 mr-1" />
                      Set Voice default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      unassignMutation.mutate({ projectId, agentId: pa.agentId })
                    }
                    disabled={unassignMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
