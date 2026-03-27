'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, CheckCircle2, XCircle, Loader2, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatbotEmbedSectionProps {
  projectId: string;
}

export function ChatbotEmbedSection({ projectId }: ChatbotEmbedSectionProps) {
  const [copied, setCopied] = useState(false);
  // Prefer NEXT_PUBLIC_APP_URL so the copied snippet uses your production URL (not localhost).
  const [origin, setOrigin] = useState<string>('');
  const { data: chatbot, isLoading, refetch } = trpc.chatbot.getByProjectId.useQuery(
    { projectId },
    { refetchOnWindowFocus: true }
  );
  const regenerateKey = trpc.chatbot.regenerateApiKey.useMutation({
    onSuccess: () => refetch(),
  });

  const {
    data: widgetConfigOk,
    isLoading: widgetCheckLoading,
    isError: widgetCheckError,
    error: widgetCheckErr,
    refetch: refetchWidgetCheck,
    isFetching: widgetCheckFetching,
  } = trpc.widget.getConfig.useQuery(
    { apiKey: chatbot?.apiKey ?? '' },
    {
      enabled: Boolean(chatbot?.apiKey),
      retry: 1,
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const value = appUrl ? appUrl.replace(/\/$/, '') : window.location.origin;
    const id = setTimeout(() => setOrigin(value), 0);
    return () => clearTimeout(id);
  }, []);

  const embedSnippet =
    chatbot?.apiKey &&
    origin &&
    `<!-- ConverseAI Chat Widget -->
<script>
  (function(w,d,s,id){
    var js = d.getElementsByTagName(s)[0];
    if(d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "${origin}/embed.js";
    js.dataset.apiKey = "${chatbot.apiKey}";
    w.document.head.appendChild(js);
  })(window, document, 'script', 'converseai-widget');
</script>`;

  const handleCopyEmbed = () => {
    if (!embedSnippet) return;
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Chat widget embed</h3>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Chat widget embed</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Create a chatbot in the Chatbot tab to get the embed code and API key.
        </p>
        <Button asChild size="sm">
          <Link href={`/projects/${projectId}`}>Go to project → Chatbot</Link>
        </Button>
      </div>
    );
  }

  if (!chatbot.apiKey) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Chat widget embed</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Generate an API key in the Chatbot tab to get the embed snippet.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${projectId}`}>Open Chatbot tab</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Embed code</h3>

      <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Widget connection
            </p>
            {widgetCheckLoading && !widgetConfigOk && !widgetCheckError ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Checking API key and widget config…
              </div>
            ) : null}
            {widgetConfigOk && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Connected — this server accepts your widget API key and returns chatbot settings.
              </div>
            )}
            {widgetCheckError && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <XCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
                <span>
                  Not reachable:{' '}
                  {widgetCheckErr?.message ??
                    'The widget could not load configuration. Regenerate the key or verify deployment.'}
                </span>
              </div>
            )}
            {widgetCheckFetching && widgetConfigOk ? (
              <p className="text-xs text-muted-foreground">Refreshing…</p>
            ) : null}
            <p className="text-xs text-muted-foreground pt-1 max-w-lg">
              Config check hits ConverseAI only. Live-site detection uses a one-line beacon when the
              script loads on a real page (see below).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              void refetchWidgetCheck();
              void refetch();
            }}
            disabled={widgetCheckFetching}
          >
            <RefreshCw className={`mr-1 size-4 ${widgetCheckFetching ? 'animate-spin' : ''}`} />
            Check again
          </Button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Live site (embed beacon)
        </p>
        {chatbot.lastEmbedBeaconAt && chatbot.lastEmbedOrigin ? (
          <div className="flex items-start gap-2 text-sm">
            <Globe className="size-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium text-foreground break-all">{chatbot.lastEmbedOrigin}</p>
              <p className="text-xs text-muted-foreground">
                Last script load recorded{' '}
                {formatDistanceToNow(new Date(chatbot.lastEmbedBeaconAt), { addSuffix: true })}.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No page load recorded yet. After the snippet is on your site, opening any page that runs
            it sends the site origin here (at most once per minute). Refresh this page or switch back
            to the tab to update.
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2 max-w-lg">
          Only the origin (e.g. https://shop.example.com) is stored, not full URLs. The beacon runs
          after the widget loads configuration successfully.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Snippet</h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateKey.mutate({ chatbotId: chatbot.id })}
            disabled={regenerateKey.isPending}
          >
            <RefreshCw className="mr-1 size-4" />
            New API key
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyEmbed}>
            <Copy className="mr-1 size-4" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        Paste before <code className="rounded bg-muted px-1 text-xs">&lt;/body&gt;</code> on your
        site.
      </p>
      <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-xs overflow-x-auto mt-2">
        {embedSnippet ?? 'Generate an API key first.'}
      </pre>
      <p className="text-muted-foreground mt-2 text-xs">
        API key: <code className="rounded bg-muted px-1">{chatbot.apiKey}</code>
      </p>
      <p className="text-muted-foreground mt-3 text-xs max-w-xl">
        The API key is public and scoped to this widget only; it does not grant admin access.
      </p>
    </div>
  );
}
