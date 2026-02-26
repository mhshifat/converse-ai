'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { MessageSquare, User, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveChatContentProps {
  projectId?: string;
}

export function LiveChatContent({ projectId }: LiveChatContentProps = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const { data: handoff, isLoading } = trpc.liveChat.listHandoffConversations.useQuery(
    projectId ? { projectId } : undefined,
    { refetchInterval: 5000 }
  );
  const unassigned = handoff?.unassigned ?? [];
  const myAssigned = handoff?.myAssigned ?? [];
  const isAssignedToSelected =
    !!selectedId && myAssigned.some((c) => c.id === selectedId);
  const { data: conversation, isLoading: loadingConv } = trpc.liveChat.getConversation.useQuery(
    { conversationId: selectedId! },
    { enabled: !!selectedId, refetchInterval: isAssignedToSelected ? 3000 : false }
  );
  const utils = trpc.useUtils();
  const assignMutation = trpc.liveChat.assignToMe.useMutation({
    onSuccess: () => {
      void utils.liveChat.listHandoffConversations.invalidate();
      if (selectedId) void utils.liveChat.getConversation.invalidate({ conversationId: selectedId });
    },
  });
  const sendMutation = trpc.liveChat.sendMessage.useMutation({
    onSuccess: () => {
      setInput('');
      void utils.liveChat.getConversation.invalidate({ conversationId: selectedId! });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  const all = [...unassigned, ...myAssigned];
  const selected = selectedId ? all.find((c) => c.id === selectedId) : null;
  const isAssigned = selectedId && myAssigned.some((c) => c.id === selectedId);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Waiting for agent</h2>
          {unassigned.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ul className="space-y-1">
              {unassigned.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedId === c.id ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="font-medium truncate block">{c.chatbotName}</span>
                    <span className="text-muted-foreground text-xs">{c.messageCount} messages</span>
                  </button>
                  <Button
                    size="sm"
                    className="mt-1 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      assignMutation.mutate({ conversationId: c.id });
                      setSelectedId(c.id);
                    }}
                    disabled={assignMutation.isPending}
                  >
                    Take
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">My conversations</h2>
          {myAssigned.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ul className="space-y-1">
              {myAssigned.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedId === c.id ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="font-medium truncate block">{c.chatbotName}</span>
                    <span className="text-muted-foreground text-xs">{c.messageCount} messages</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden">
        {!selectedId ? (
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare className="text-muted-foreground size-12" />
              </EmptyMedia>
              <EmptyTitle>Select a conversation</EmptyTitle>
              <EmptyDescription>
                Pick one from &quot;Waiting for agent&quot; and click Take, or open one from &quot;My conversations&quot; to reply.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="p-3 border-b border-border/60 flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{selected?.chatbotName}</span>
              {!isAssigned && (
                <Button
                  size="sm"
                  onClick={() => assignMutation.mutate({ conversationId: selectedId })}
                  disabled={assignMutation.isPending}
                >
                  Take
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {loadingConv ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                conversation?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex gap-2',
                      m.senderType === 'customer' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl px-4 py-2 text-sm',
                        m.senderType === 'customer'
                          ? 'bg-primary text-primary-foreground'
                          : m.senderType === 'human_agent'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-muted text-foreground'
                      )}
                    >
                      {m.senderType === 'human_agent' && (
                        <span className="text-xs font-medium opacity-80 block mb-0.5">You</span>
                      )}
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            {isAssigned && (
              <div className="p-3 border-t border-border/60 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a reply..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (input.trim()) {
                        sendMutation.mutate({ conversationId: selectedId, content: input.trim() });
                      }
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (input.trim())
                      sendMutation.mutate({ conversationId: selectedId, content: input.trim() });
                  }}
                  disabled={!input.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
