'use client';

import { Bot, Headphones, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMarkdown } from '@/components/modules/chat/chat-markdown';

export type LiveChatMessageBubble = {
  id: string;
  senderType: 'customer' | 'agent' | 'human_agent';
  content: string;
  payload?: { type?: string; url?: string } | Record<string, unknown> | null;
};

export function LiveChatMessageRow({ message }: { message: LiveChatMessageBubble }) {
  const { senderType, content, payload } = message;
  const isCustomer = senderType === 'customer';
  const isHuman = senderType === 'human_agent';

  const audioUrl =
    payload && typeof payload === 'object' && payload.type === 'audio' && typeof payload.url === 'string'
      ? payload.url
      : null;

  const audio = audioUrl ? <audio controls src={audioUrl} className="mt-2 h-9 max-w-full" /> : null;

  if (isCustomer) {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[min(85%,28rem)] min-w-0 rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-md ring-1 ring-primary/15">
          <div className="mb-1.5 flex items-center justify-end gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/75">
              Visitor
            </span>
          </div>
          {audio}
          <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{content}</p>
        </div>
        <div
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-2 ring-background dark:bg-primary/20"
          aria-hidden
        >
          <User className="size-4" strokeWidth={2} />
        </div>
      </div>
    );
  }

  const Icon = isHuman ? Headphones : Bot;
  const palette = isHuman
    ? {
        avatar: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/55 dark:text-emerald-300 dark:ring-emerald-800/50',
        bubble:
          'border-emerald-200/90 bg-emerald-50 text-emerald-950 ring-emerald-500/10 dark:border-emerald-800/55 dark:bg-emerald-950/40 dark:text-emerald-50 dark:ring-emerald-500/5',
        badge: 'text-emerald-800 dark:text-emerald-200',
        muted: 'text-emerald-900/65 dark:text-emerald-200/70',
      }
    : {
        avatar: 'bg-violet-100 text-violet-700 ring-violet-200/80 dark:bg-violet-950/55 dark:text-violet-300 dark:ring-violet-800/50',
        bubble:
          'border-violet-200/90 bg-violet-50 text-foreground ring-violet-500/10 dark:border-violet-900/50 dark:bg-violet-950/40 dark:ring-violet-500/5',
        badge: 'text-violet-800 dark:text-violet-200',
        muted: 'text-violet-900/65 dark:text-violet-200/70',
      };

  return (
    <div className="flex justify-start gap-2.5">
      <div
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-2 ring-background',
          palette.avatar
        )}
        aria-hidden
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </div>
      <div
        className={cn(
          'max-w-[min(85%,28rem)] min-w-0 rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-sm shadow-sm ring-1',
          palette.bubble
        )}
      >
        <div className={cn('mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0', palette.badge)}>
          <span className="text-[11px] font-bold uppercase tracking-wide">
            {isHuman ? 'You' : 'AI'}
          </span>
          <span className={cn('text-[10px] font-medium', palette.muted)}>
            {isHuman ? 'Human agent' : 'Assistant'}
          </span>
        </div>
        {audio}
        <ChatMarkdown text={content} />
      </div>
    </div>
  );
}
