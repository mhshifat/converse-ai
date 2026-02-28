'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';

interface CannedResponsesContentProps {
  /** When set, quick replies are scoped to this project; when null/undefined, tenant-wide. */
  projectId?: string | null;
}

export function CannedResponsesContent({ projectId = null }: CannedResponsesContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');

  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.cannedResponse.list.useQuery({
    projectId: projectId ?? null,
  });
  const createMutation = trpc.cannedResponse.create.useMutation({
    onSuccess: () => {
      utils.cannedResponse.list.invalidate({ projectId: projectId ?? null });
      setShortcut('');
      setContent('');
      setDialogOpen(false);
    },
  });
  const removeMutation = trpc.cannedResponse.remove.useMutation({
    onSuccess: () => utils.cannedResponse.list.invalidate({ projectId: projectId ?? null }),
  });

  const handleCreate = () => {
    if (!shortcut.trim() || !content.trim()) return;
    createMutation.mutate({
      projectId: projectId ?? null,
      shortcut: shortcut.trim(),
      content: content.trim(),
    });
  };

  const isEmpty = !isLoading && (!items || items.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {projectId ? 'Quick replies for this project' : 'Tenant-wide quick replies'}
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add quick reply
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add quick reply</DialogTitle>
              <DialogDescription>
                Shortcut (e.g. /thanks) and the text to insert when agents click it in live chat.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Shortcut</Label>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="/thanks"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Thank you for contacting us. Is there anything else?"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!shortcut.trim() || !content.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : isEmpty ? (
        <Empty className="rounded-xl border border-dashed border-border/60 bg-muted/10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircle className="text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No quick replies yet</EmptyTitle>
            <EmptyDescription>
              Add shortcuts like /thanks or /bye so agents can insert them with one click in live chat.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add quick reply
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {items?.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono text-sm font-medium text-foreground">{item.shortcut}</span>
                <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">{item.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeMutation.mutate({ id: item.id })}
                disabled={removeMutation.isPending}
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
