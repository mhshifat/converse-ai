'use client';

import * as React from 'react';
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Mic,
  Quote,
  Send,
  Square,
  Strikethrough,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type CannedChip = { id: string; shortcut: string; content: string };

export interface LiveChatComposerProps {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  cannedList?: CannedChip[];
  onCannedPick: (content: string) => void;
  isRecordingVoice: boolean;
  voiceUploading: boolean;
  onVoiceToggle: () => void;
}

function wrapSelection(value: string, start: number, end: number, before: string, after: string) {
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const innerStart = start + before.length;
  const innerEnd = innerStart + selected.length;
  return { next, innerStart, innerEnd };
}

function insertAt(value: string, start: number, end: number, chunk: string) {
  const next = value.slice(0, start) + chunk + value.slice(end);
  const pos = start + chunk.length;
  return { next, innerStart: pos, innerEnd: pos };
}

function TbBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function LiveChatComposer({
  value,
  onChange,
  onSend,
  placeholder = 'Type a reply…',
  disabled,
  sending,
  cannedList,
  onCannedPick,
  isRecordingVoice,
  voiceUploading,
  onVoiceToggle,
}: LiveChatComposerProps) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  const focusRange = React.useCallback((start: number, end: number) => {
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }, []);

  const applyWrap = React.useCallback(
    (before: string, after = before) => {
      const el = taRef.current;
      if (!el) return;
      const { next, innerStart, innerEnd } = wrapSelection(
        value,
        el.selectionStart,
        el.selectionEnd,
        before,
        after
      );
      onChange(next);
      focusRange(innerStart, innerEnd);
    },
    [value, onChange, focusRange]
  );

  const applyInsert = React.useCallback(
    (chunk: string) => {
      const el = taRef.current;
      if (!el) return;
      const { next, innerStart, innerEnd } = insertAt(value, el.selectionStart, el.selectionEnd, chunk);
      onChange(next);
      focusRange(innerStart, innerEnd);
    },
    [value, onChange, focusRange]
  );

  const applyLink = React.useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || 'link text';
    const url = typeof window !== 'undefined' ? window.prompt('Link URL (https://…)', 'https://') : null;
    if (url == null || !String(url).trim()) return;
    let u = String(url).trim();
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    const chunk = `[${selected}](${u})`;
    const next = value.slice(0, start) + chunk + value.slice(end);
    onChange(next);
    const caret = start + chunk.length;
    focusRange(caret, caret);
  }, [value, onChange, focusRange]);

  const applyLinePrefix = React.useCallback(
    (prefix: string) => {
      const el = taRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const { next, innerStart } = insertAt(value, lineStart, lineStart, prefix);
      onChange(next);
      focusRange(innerStart, innerStart);
    },
    [value, onChange, focusRange]
  );

  const canUseToolbar = !disabled && !voiceUploading;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !sending && !disabled) onSend();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-xl border border-border/80 bg-card p-2.5 shadow-sm">
        {cannedList && cannedList.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5 border-b border-border/50 pb-2">
            {cannedList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCannedPick(c.content)}
                disabled={disabled}
                className={cn(
                  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-left text-xs font-medium text-foreground transition-colors',
                  'hover:bg-muted disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                <Zap className="size-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <span className="truncate">{c.shortcut}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div
          className="mb-2 flex flex-wrap items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-1"
          role="toolbar"
          aria-label="Markdown formatting"
        >
          <TbBtn label="Bold" onClick={() => applyWrap('**')} disabled={!canUseToolbar}>
            <Bold className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <TbBtn label="Italic" onClick={() => applyWrap('*')} disabled={!canUseToolbar}>
            <Italic className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <TbBtn label="Strikethrough" onClick={() => applyWrap('~~')} disabled={!canUseToolbar}>
            <Strikethrough className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <TbBtn label="Inline code" onClick={() => applyWrap('`')} disabled={!canUseToolbar}>
            <Code className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border/80" aria-hidden />
          <TbBtn label="Bullet list" onClick={() => applyLinePrefix('- ')} disabled={!canUseToolbar}>
            <List className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <TbBtn label="Numbered list" onClick={() => applyLinePrefix('1. ')} disabled={!canUseToolbar}>
            <ListOrdered className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <TbBtn label="Quote" onClick={() => applyLinePrefix('> ')} disabled={!canUseToolbar}>
            <Quote className="size-4" strokeWidth={2.25} />
          </TbBtn>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-border/80" aria-hidden />
          <TbBtn label="Insert link" onClick={applyLink} disabled={!canUseToolbar}>
            <Link2 className="size-4" strokeWidth={2.25} />
          </TbBtn>
        </div>

        <div className="flex items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 rounded-lg border-border bg-background shadow-none"
                onClick={onVoiceToggle}
                disabled={voiceUploading || sending || disabled}
                aria-label={isRecordingVoice ? 'Stop recording' : 'Record voice'}
              >
                {voiceUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isRecordingVoice ? (
                  <Square className="size-4 text-destructive fill-destructive" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isRecordingVoice ? 'Stop and send voice' : 'Record voice message'}
            </TooltipContent>
          </Tooltip>

          <Textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            className={cn(
              'field-sizing-fixed max-h-40 min-h-[44px] flex-1 resize-y rounded-lg border-border bg-background py-2.5 text-sm shadow-none',
              'focus-visible:ring-2'
            )}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                className="size-10 shrink-0 rounded-lg border-0 bg-zinc-600 text-white shadow-sm hover:bg-zinc-700 dark:bg-zinc-500 dark:hover:bg-zinc-600"
                onClick={onSend}
                disabled={!value.trim() || sending || disabled}
                aria-label="Send message"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Send (Enter) · new line (Shift+Enter)
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground">
          Markdown: toolbar inserts syntax; messages render with bold, lists, links, and code.
        </p>
      </div>
    </TooltipProvider>
  );
}
