'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { MessageSquare, Bot, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationsListProps {
  projectId: string;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(d));
}

export function ConversationsList({ projectId }: ConversationsListProps) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.conversations.listByProject.useInfiniteQuery(
      {
        projectId,
        limit: 20,
        status: statusFilter,
      },
      {
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    );

  const { data: detail, isLoading: detailLoading } = trpc.conversations.getById.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const conversations = data?.pages?.flatMap((p) => p.conversations) ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 border-b">
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {error.message}
      </div>
    );
  }

  const isEmpty = conversations.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Status</span>
        <div className="flex rounded-lg border border-border/60 p-0.5">
          {(['active', 'closed', undefined] as const).map((s) => (
            <button
              key={String(s)}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === s
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === undefined ? 'All' : s === 'active' ? 'Active' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {isEmpty ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <MessageSquare className="size-10 text-muted-foreground/70" />
              </EmptyMedia>
              <EmptyTitle>No conversations yet</EmptyTitle>
              <EmptyDescription>
                Conversations from the chat widget and playground will appear here. Start a test in the Playground or embed the widget on your site.
              </EmptyDescription>
              <EmptyContent>
                <Button asChild variant="outline" size="sm">
                  <a href={`/projects/${projectId}/playground`}>Open Playground</a>
                </Button>
              </EmptyContent>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Customer</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="w-[160px]">Started</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[140px]" title={c.customerId}>
                      {c.customerId}
                    </TableCell>
                    <TableCell>{c.agentName}</TableCell>
                    <TableCell className="capitalize">{c.channel}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          c.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{c.messageCount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(c.startedAt)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasNextPage && (
              <div className="border-t border-border/60 p-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          className="w-full sm:max-w-lg overflow-y-auto"
          side="right"
        >
          <SheetHeader>
            <SheetTitle>Conversation details</SheetTitle>
          </SheetHeader>
          {selectedId && (
            <div className="flex flex-col gap-4 p-4 pt-0">
              {detailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : detail ? (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Customer:</span> <code className="font-mono text-xs">{detail.customerId}</code></p>
                    <p><span className="text-muted-foreground">Agent:</span> {detail.agentName}</p>
                    <p><span className="text-muted-foreground">Channel:</span> <span className="capitalize">{detail.channel}</span></p>
                    <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{detail.status}</span></p>
                    <p><span className="text-muted-foreground">Started:</span> {formatDate(detail.startedAt)}</p>
                    {detail.endedAt && (
                      <p><span className="text-muted-foreground">Ended:</span> {formatDate(detail.endedAt)}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Transcript</h3>
                      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {detail.messages.length} messages
                      </span>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                      {detail.messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No messages.</p>
                      ) : (
                        detail.messages.map((m) => (
                          <div key={m.id} className="flex gap-2 text-sm">
                            <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground w-16">
                              {m.senderType === 'customer' ? 'Customer' : 'Agent'}
                            </span>
                            <span className="text-foreground wrap-break-word">{m.content}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {detail.compiledData && Object.keys(detail.compiledData).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Compiled data</h3>
                      </div>
                      <pre className="max-h-[180px] overflow-auto rounded-lg border border-border/40 bg-muted/20 p-3 text-xs font-mono text-foreground">
                        {JSON.stringify(detail.compiledData, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Could not load conversation.</p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
