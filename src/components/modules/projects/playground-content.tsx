'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Bot, FileText, Hash } from 'lucide-react';
import { mergeWidgetConfig } from '@/lib/chatbot-widget-config';
import { LiveChatbotPreview, type ChatMessage } from './live-chatbot-preview';

interface PlaygroundContentProps {
  projectId: string;
}

interface ConversationInfo {
  agentName: string;
  conversationId: string;
}

interface EndedData {
  messages: ChatMessage[];
  compiledData: Record<string, unknown>;
}

function generateCustomerId(): string {
  return 'playground_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now().toString(36);
}

export function PlaygroundContent({ projectId }: PlaygroundContentProps) {
  const [customerId, setCustomerId] = useState(generateCustomerId);
  const [previewKey, setPreviewKey] = useState(0);
  const [convInfo, setConvInfo] = useState<ConversationInfo | null>(null);
  const [endedData, setEndedData] = useState<EndedData | null>(null);
  const transcriptSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endedData) {
      transcriptSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [endedData]);

  const { data: chatbot, isLoading: loadingChatbot } = trpc.chatbot.getByProjectId.useQuery(
    { projectId },
    { staleTime: 60_000 }
  );

  const apiKey = chatbot?.apiKey ?? null;
  const config = mergeWidgetConfig(chatbot?.config ?? null);

  const handleNewConversation = useCallback(() => {
    setCustomerId(generateCustomerId());
    setPreviewKey((k) => k + 1);
    setConvInfo(null);
    setEndedData(null);
  }, []);

  const handleConversationInfo = useCallback((info: ConversationInfo) => {
    setConvInfo(info);
    setEndedData(null);
  }, []);

  const handleConversationEnd = useCallback((data: EndedData) => {
    setEndedData(data);
  }, []);

  if (loadingChatbot) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!chatbot || !apiKey) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <p className="mb-4 text-muted-foreground">
          Create a chatbot and get an API key in the Chatbot tab (or Integrations) before testing in the playground.
        </p>
        <Button asChild size="sm">
          <Link href={`/projects/${projectId}`}>Go to project → Chatbot</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Session info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="size-3.5" />
            Customer: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{customerId}</code>
          </div>
          {convInfo && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bot className="size-3.5" />
              Agent assigned: <span className="font-medium text-foreground">{convInfo.agentName}</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleNewConversation}>
          <RotateCcw className="mr-1.5 size-4" />
          New conversation
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        This is the exact chatbot your customers see — same design, colors, and behavior from your customization settings.
        If there’s no activity for a few minutes, the chat will ask if you have any other questions and then close automatically; you can also close with the X button. See the "Conversation details & transcript" section below after a conversation ends.
      </p>

      <p className="text-xs text-muted-foreground">
        To test voice: enable Voice in Chatbot → Customize, then use the Chat/Voice toggle below. Start call → speak → pause to get a reply → speak again; end call when done.
      </p>

      {/* Widget preview */}
      <LiveChatbotPreview
        key={previewKey}
        config={config}
        apiKey={apiKey}
        customerId={customerId}
        onConversationInfo={handleConversationInfo}
        onConversationEnd={handleConversationEnd}
        inactivityMinutes={config.inactivityMinutes ?? 2}
      />

      {/* Transcript + compiled data — scroll target when conversation ends */}
      <div ref={transcriptSectionRef} className="scroll-mt-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Conversation details & transcript
        </h2>
        {!endedData ? (
          <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            End the conversation (close with X or wait for inactivity) to see the full transcript and compiled data here. The page will scroll to this section automatically.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
          {/* Transcript */}
          <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Conversation transcript</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {endedData.messages.length} messages
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
              {endedData.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
              ) : (
                endedData.messages.map((msg, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground w-16">
                      {msg.role === 'customer' ? 'Customer' : 'Agent'}
                    </span>
                    <span className="text-foreground">{msg.content}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Compiled data */}
          <div className="min-w-0 rounded-xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Compiled data</h3>
              <span className="ml-auto text-[11px] text-muted-foreground">
                Extracted when conversation ended — delivered to configured integrations
              </span>
            </div>
            <pre className="min-w-0 max-h-[200px] overflow-auto rounded-lg border border-border/40 bg-muted/20 p-3 text-xs font-mono text-foreground whitespace-pre-wrap break-words">
              {JSON.stringify(endedData.compiledData, null, 2)}
            </pre>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
