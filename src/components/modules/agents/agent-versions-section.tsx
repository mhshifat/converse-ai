'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { History, ChevronDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AgentVersionsSectionProps {
  agentId: string;
  onRollback?: () => void;
}

export function AgentVersionsSection({ agentId, onRollback }: AgentVersionsSectionProps) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.agents.listVersions.useQuery(
    { agentId },
    { enabled: open }
  );
  const rollbackMutation = trpc.agents.rollback.useMutation({
    onSuccess: () => {
      void utils.agents.listVersions.invalidate({ agentId });
      void utils.agents.getById.invalidate({ id: agentId });
      onRollback?.();
    },
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-8 rounded-xl border border-border/60 bg-card overflow-hidden">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            <History className="size-4 text-muted-foreground" />
            Prompt & config history
          </span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/60 px-4 py-3">
          {!open ? null : isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : !versions?.length ? (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <History className="text-muted-foreground size-8" />
                </EmptyMedia>
                <EmptyTitle>No version history</EmptyTitle>
                <EmptyDescription>
                  Each time you save changes, a new version is stored. Roll back to restore a previous prompt and settings.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Version {v.version}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {v.systemPrompt.slice(0, 120)}
                      {v.systemPrompt.length > 120 ? '…' : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => rollbackMutation.mutate({ agentId, version: v.version })}
                    disabled={rollbackMutation.isPending}
                  >
                    <RotateCcw className="size-3.5" />
                    Rollback
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
