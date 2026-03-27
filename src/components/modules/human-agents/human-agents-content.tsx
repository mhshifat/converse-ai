'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
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
import Link from 'next/link';
import { UserPlus, User, Trash2, Users, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HumanAgentsContentProps {
  projectId?: string;
}

export function HumanAgentsContent({ projectId }: HumanAgentsContentProps = {}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

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
    onSuccess: () => {
      setRemoveTarget(null);
      void utils.humanAgents.list.invalidate();
    },
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

      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-stretch lg:gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
              <UserPlus className="size-6" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Add a human agent
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Choose a teammate who can open{' '}
                <span className="font-medium text-foreground/90">Live chat</span>, take queued
                conversations, and reply when customers ask for a real person. They need an existing
                account in your workspace.
              </p>
            </div>
            {projectId ? (
              <Button variant="outline" size="sm" className="w-fit gap-2" asChild>
                <Link href={`/projects/${projectId}/live-chat`}>
                  <MessageCircle className="size-4" />
                  Open Live chat
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-dashed border-border/70 bg-muted/25 p-5 sm:p-6">
            {loadingUsers ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full max-w-[200px]" />
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No one left to add</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Everyone in your workspace is already a human agent, or you have not invited other
                    users yet. New accounts you add to the tenant will show up here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="human-agent-user" className="text-sm font-medium">
                    Workspace user
                  </Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger
                      id="human-agent-user"
                      className="h-auto min-h-11 w-full items-start gap-2 bg-background py-2.5 shadow-none **:data-[slot=select-value]:line-clamp-none **:data-[slot=select-value]:flex **:data-[slot=select-value]:w-full **:data-[slot=select-value]:min-w-0 **:data-[slot=select-value]:flex-col **:data-[slot=select-value]:items-start **:data-[slot=select-value]:gap-0.5 **:data-[slot=select-value]:text-left **:data-[slot=select-value]:whitespace-normal"
                    >
                      <SelectValue placeholder="Choose who to add…" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="items-start py-2">
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium leading-tight">
                              {u.name || u.email}
                            </span>
                            {u.email && u.name ? (
                              <span className="truncate text-xs leading-tight text-muted-foreground">
                                {u.email}
                              </span>
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    People already in the list below are not shown here.
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-11 w-full gap-2 sm:w-auto sm:min-w-[140px]"
                  onClick={() => {
                    if (selectedUserId) addMutation.mutate({ userId: selectedUserId });
                  }}
                  disabled={!selectedUserId || addMutation.isPending}
                >
                  <UserPlus className="size-4" />
                  {addMutation.isPending ? 'Adding…' : 'Add to team'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

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
                  onClick={() =>
                    setRemoveTarget({
                      id: a.id,
                      label: a.displayName || a.userName || a.userEmail || 'this user',
                    })
                  }
                  disabled={removeMutation.isPending}
                  aria-label="Remove human agent"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove human agent?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `${removeTarget.label} will no longer appear in Live chat or receive handoff queues for this workspace. This does not delete their user account.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMutation.isPending || !removeTarget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) removeMutation.mutate({ id: removeTarget.id });
              }}
            >
              {removeMutation.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
