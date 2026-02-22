'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, RefreshCw } from 'lucide-react';

interface ProjectChatbotTabProps {
  projectId: string;
  initialChatbot: {
    id: string;
    name: string;
    config: Record<string, unknown>;
    apiKey?: string;
  } | null;
}

export function ProjectChatbotTab({ projectId, initialChatbot }: ProjectChatbotTabProps) {
  const [chatbot, setChatbot] = useState(initialChatbot);
  const [copied, setCopied] = useState(false);

  const getOrCreate = trpc.chatbot.getOrCreateForProject.useMutation({
    onSuccess: (data) => setChatbot(data),
  });

  const updateConfig = trpc.chatbot.updateConfig.useMutation({
    onSuccess: (data) => setChatbot((c) => (c ? { ...c, ...data } : data)),
  });

  const regenerateKey = trpc.chatbot.regenerateApiKey.useMutation({
    onSuccess: (data) => setChatbot((c) => (c ? { ...c, apiKey: data.apiKey } : c)),
  });

  const config = (chatbot?.config ?? {}) as Record<string, unknown>;
  const primaryColor = (config.primaryColor as string) ?? '#2563eb';
  const position = (config.position as string) ?? 'bottom-right';
  const welcomeMessage = (config.welcomeMessage as string) ?? 'How can I help you today?';
  const voiceEnabled = (config.voiceEnabled as boolean) ?? true;

  const embedSnippet =
    chatbot?.apiKey &&
    `<!-- ConverseAI Chat Widget -->
<script>
  (function(w,d,s,id){
    var js = d.getElementsByTagName(s)[0];
    if(d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "${typeof window !== 'undefined' ? window.location.origin : ''}/embed.js";
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

  if (!chatbot && !getOrCreate.isPending) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground mb-4">
          Create a chatbot to customize its design and get the embed code.
        </p>
        <Button onClick={() => getOrCreate.mutate({ projectId })} disabled={getOrCreate.isPending}>
          {getOrCreate.isPending ? 'Creating…' : 'Create chatbot'}
        </Button>
      </div>
    );
  }

  if (!chatbot) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Appearance</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Primary color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) =>
                  updateConfig.mutate({
                    chatbotId: chatbot.id,
                    config: { ...config, primaryColor: e.target.value },
                  })
                }
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) =>
                  updateConfig.mutate({
                    chatbotId: chatbot.id,
                    config: { ...config, primaryColor: e.target.value },
                  })
                }
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <Label>Position</Label>
            <Select
              value={position}
              onValueChange={(v) =>
                updateConfig.mutate({
                  chatbotId: chatbot.id,
                  config: { ...config, position: v },
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom right</SelectItem>
                <SelectItem value="bottom-left">Bottom left</SelectItem>
                <SelectItem value="top-right">Top right</SelectItem>
                <SelectItem value="top-left">Top left</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Welcome message</Label>
          <Input
            value={welcomeMessage}
            onChange={(e) =>
              updateConfig.mutate({
                chatbotId: chatbot.id,
                config: { ...config, welcomeMessage: e.target.value },
              })
            }
            placeholder="How can I help?"
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={voiceEnabled}
            onCheckedChange={(checked) =>
              updateConfig.mutate({
                chatbotId: chatbot.id,
                config: { ...config, voiceEnabled: checked },
              })
            }
          />
          <Label>Enable voice (call)</Label>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Embed code</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateKey.mutate({ chatbotId: chatbot.id })}
              disabled={regenerateKey.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              New API key
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyEmbed}>
              <Copy className="h-4 w-4 mr-1" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste this snippet before <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> on your website.
        </p>
        <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {embedSnippet ?? 'Create a chatbot and generate an API key first.'}
        </pre>
        {chatbot.apiKey && (
          <p className="text-xs text-muted-foreground">
            API key: <code className="bg-muted px-1 rounded">{chatbot.apiKey}</code>
          </p>
        )}
      </div>
    </div>
  );
}
