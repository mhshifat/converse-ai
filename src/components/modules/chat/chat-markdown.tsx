'use client';

import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import { cn } from '@/lib/utils';

/** Shared markdown mapping for chat bubbles (admin live chat + widget preview). Links inherit bubble color. */
export const chatMarkdownComponents: Partial<Components> = {
  p: ({ children }) => (
    <p className="mb-2 max-w-none wrap-break-word last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }) => <li className="wrap-break-word leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-inherit underline underline-offset-2 opacity-90"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-current/25 pl-3 opacity-95">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="my-2 max-w-full overflow-x-auto rounded-lg bg-black/8 p-2.5 text-[11px] leading-relaxed dark:bg-white/10">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return (
        <code className={cn('font-mono text-[11px]', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-black/10 px-1 py-0.5 font-mono text-[11px] dark:bg-white/15"
        {...props}
      >
        {children}
      </code>
    );
  },
};

export function ChatMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        'min-w-0 [font-size:inherit] leading-[inherit] **:text-inherit [&_code]:text-[0.92em]',
        className
      )}
    >
      <Markdown components={chatMarkdownComponents}>{text}</Markdown>
    </div>
  );
}
