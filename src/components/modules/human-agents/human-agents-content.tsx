'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { UserPlus, User, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface HumanAgentsContentProps {
  projectId?: string;
}

export function HumanAgentsContent({ projectId }: HumanAgentsContentProps = {}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const utils = trpc.useUtils();
  const { data: agents, isLoading } = trpc.humanAgents.list.useQuery();
  const { data: users, isLoading: loadingUsers } = trpc.humanAgents.listTenantUsers.useQuery();
  const addMutation = trpc.humanAgents.add.useMutation({
    onSuccess: () => {
      setServerError(null);
      setSelectedUserId('');
      void utils.humanAgents.list.invalidate();
    },
    onError: (e) => setServerError(e.message),
  });
  const removeMutation = trpc.humanAgents.remove.useMutation({
    onSuccess: () => void utils.humanAgents.list.invalidate(),
    onError: (e) => setServerError(e.message),
  });

  const agentUserIds = new Set((agents ?? []).map((a) => a.userId));
  const availableUsers = (users ?? []).filter((u) => !agentUserIds.has(u.id));

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Add human agent</h2>
        {loadingUsers ? (
          <Skeleton className="h-10 w-64" />
        ) : availableUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            All users in your tenant are already human agents, or there are no other users.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label className="text-xs">User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} {u.email ? `(${u.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (selectedUserId)
                  addMutation.mutate({ userId: selectedUserId });
              }}
              disabled={!selectedUserId || addMutation.isPending}
              className="gap-2"
            >
              <UserPlus className="size-4" />
              {addMutation.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Human agents</h2>
        {(agents ?? []).length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <User className="text-muted-foreground size-10" />
              </EmptyMedia>
              <EmptyTitle>No human agents yet</EmptyTitle>
              <EmptyDescription>
                Add users above. They can then open Live chat to take over customer conversations.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline" size="sm">
                <a href={projectId ? `/projects/${projectId}/live-chat` : '/dashboard'}>
                  Open Live chat
                </a>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {agents!.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium truncate block">
                      {a.displayName || a.userName || a.userEmail}
                    </span>
                    <span className="text-muted-foreground text-xs truncate block">
                      {a.userEmail}
                    </span>
                  </div>
                  {a.isAvailable && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                      Available
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate({ id: a.id })}
                  disabled={removeMutation.isPending}
                  aria-label="Remove"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
