'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw } from 'lucide-react';

interface ChatbotEmbedSectionProps {
  projectId: string;
}

export function ChatbotEmbedSection({ projectId }: ChatbotEmbedSectionProps) {
  const [copied, setCopied] = useState(false);
  // Prefer NEXT_PUBLIC_APP_URL so the copied snippet uses your production URL (not localhost).
  const [origin, setOrigin] = useState<string>('');
  const { data: chatbot, isLoading, refetch } = trpc.chatbot.getByProjectId.useQuery({ projectId });
  const regenerateKey = trpc.chatbot.regenerateApiKey.useMutation({
    onSuccess: () => refetch(),
  });

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
