'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mic,
  Send,
  PenLine,
  Sparkles,
  Bot,
  UserRound,
  X,
} from 'lucide-react';
import type { ChatbotWidgetConfig } from '@/lib/chatbot-widget-config';
import { ConverseLogo } from '@/components/shared/converse-logo';
import { cn } from '@/lib/utils';
import { trpc } from '@/utils/trpc';

interface LiveChatbotPreviewProps {
  config: ChatbotWidgetConfig;
  apiKey: string;
  customerId: string;
  className?: string;
  onConversationInfo?: (info: { agentName: string; conversationId: string }) => void;
  onConversationEnd?: (data: { messages: ChatMessage[]; compiledData: Record<string, unknown> }) => void;
  /** Minutes of no customer activity before showing "any other questions?" warning; then 1 more minute before auto-close. Default 3. */
  inactivityMinutes?: number;
}

interface ChatMessage {
  role: 'customer' | 'agent' | 'human_agent';
  content: string;
}

export type { ChatMessage };

export function LiveChatbotPreview({
  config,
  apiKey,
  customerId,
  className,
  onConversationInfo,
  onConversationEnd,
  inactivityMinutes = 3,
}: LiveChatbotPreviewProps) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [ended, setEnded] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const endConversationMutateRef = useRef<(input: { conversationId: string }) => void>(() => {});
  conversationIdRef.current = conversationId;

  const { bubble, popup, header, footer, messages: msgCfg } = config;
  const logoSize = header.logoSize ?? 28;
  const primary = config.primaryColor ?? '#2563eb';
  const bubbleBg = bubble.backgroundColor ?? primary;
  const userBubbleBg = msgCfg.userBubbleBackground ?? primary;
  const sendBtnBg = footer.sendButtonBackground ?? primary;

  const sendFirstMessage = trpc.widget.sendFirstMessage.useMutation({
    onSuccess: (data) => {
      if (data?.conversationId) {
        setConversationId(data.conversationId);
        setEnded(false);
        onConversationInfo?.({ conversationId: data.conversationId, agentName: 'Unknown' });
      }
      if (data?.response != null) {
        setMessages((prev) => [...prev, { role: 'agent', content: data.response }]);
      }
      if (data?.handoffRequested) setHandoffRequested(true);
      if (data?.conversationEnded) {
        setConversationId(null);
        setEnded(true);
        const endedMessages = (data as { messages?: ChatMessage[] }).messages ?? [];
        const compiled = (data as { compiledData?: Record<string, unknown> }).compiledData ?? {};
        onConversationEnd?.({ messages: endedMessages, compiledData: compiled });
      }
    },
  });

  const sendMessage = trpc.widget.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data?.response != null) {
        setMessages((prev) => [...prev, { role: 'agent', content: data.response }]);
      }
      if (data?.handoffRequested) {
        setHandoffRequested(true);
      }
      if (data?.conversationEnded) {
        setConversationId(null);
        setEnded(true);
        const endedMessages = (data as { messages?: ChatMessage[] }).messages ?? [];
        const compiled = (data as { compiledData?: Record<string, unknown> }).compiledData ?? {};
        onConversationEnd?.({ messages: endedMessages, compiledData: compiled });
      }
    },
  });

  const endConversation = trpc.widget.endConversation.useMutation({
    onSuccess: (data) => {
      const compiled = (data as { compiledData?: Record<string, unknown> })?.compiledData ?? {};
      setConversationId(null);
      setHandoffRequested(false);
      setEnded(true);
      onConversationEnd?.({ messages, compiledData: compiled });
    },
  });
  endConversationMutateRef.current = endConversation.mutate;

  const requestHumanHandoff = trpc.widget.requestHumanHandoff.useMutation({
    onSuccess: () => {
      setHandoffRequested(true);
      setMessages((prev) => [...prev, { role: 'agent', content: 'Connecting you with a support agent. Please wait.' }]);
    },
  });

  const { data: handoffMessages } = trpc.widget.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId && handoffRequested, refetchInterval: 3500 }
  );

  useEffect(() => {
    if (!handoffRequested || !handoffMessages?.messages) return;
    setMessages(
      handoffMessages.messages.map((m) => ({
        role: m.senderType === 'customer' ? 'customer' : ('agent' as 'agent'),
        content: m.content,
      }))
    );
  }, [handoffRequested, handoffMessages]);

  const clearInactivityTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setShowInactivityWarning(false);
  }, []);

  const hasUserSentMessage = messages.some((m) => m.role === 'customer');

  useEffect(() => {
    if (!conversationId || ended) {
      clearInactivityTimers();
      return;
    }
    if (!hasUserSentMessage) {
      clearInactivityTimers();
      return;
    }
    clearInactivityTimers();
    const warningMs = Math.max(1, inactivityMinutes - 1) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowInactivityWarning(true);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        const cid = conversationIdRef.current;
        if (cid) {
          endConversationMutateRef.current({ conversationId: cid });
        }
      }, 60 * 1000);
    }, warningMs);
    return () => clearInactivityTimers();
  }, [conversationId, ended, hasUserSentMessage, inactivityMinutes, clearInactivityTimers]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const startInactivityTimersAfterSend = useCallback(() => {
    clearInactivityTimers();
    if (!conversationIdRef.current || ended) return;
    const warningMs = Math.max(1, inactivityMinutes - 1) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowInactivityWarning(true);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        const cid = conversationIdRef.current;
        if (cid) {
          endConversationMutateRef.current({ conversationId: cid });
        }
      }, 60 * 1000);
    }, warningMs);
  }, [ended, inactivityMinutes, clearInactivityTimers]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    if (conversationId) {
      if (sendMessage.isPending) return;
    } else {
      if (!apiKey || sendFirstMessage.isPending) return;
    }
    const channel = mode === 'voice' ? 'call' : 'text';
    setInput('');
    setMessages((prev) => [...prev, { role: 'customer', content: text }]);
    if (conversationId) {
      sendMessage.mutate({ conversationId, content: text });
    } else {
      sendFirstMessage.mutate({ apiKey, customerId, channel, content: text });
    }
    startInactivityTimersAfterSend();
  }, [input, conversationId, apiKey, customerId, mode, sendMessage, sendFirstMessage, startInactivityTimersAfterSend]);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (conversationId) {
      endConversation.mutate({ conversationId });
    }
  }, [conversationId, endConversation]);

  const handleStayInChat = useCallback(() => {
    clearInactivityTimers();
    if (!conversationIdRef.current || ended) return;
    const warningMs = Math.max(1, inactivityMinutes - 1) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowInactivityWarning(true);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        const cid = conversationIdRef.current;
        if (cid) {
          endConversationMutateRef.current({ conversationId: cid });
        }
      }, 60 * 1000);
    }, warningMs);
  }, [ended, inactivityMinutes, clearInactivityTimers]);

  const viewportPosition = {
    'bottom-right': 'items-end justify-end',
    'bottom-left': 'items-end justify-start',
    'top-right': 'items-start justify-end',
    'top-left': 'items-start justify-start',
  };
  const widgetPosition = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <div
      className={cn('relative h-full min-h-[480px] rounded-xl border border-border/60 bg-muted/20', className)}
      style={{ minHeight: popup.height + 100 }}
    >
      <p className="absolute left-3 top-3 text-xs font-medium text-muted-foreground">
        Live preview — test as your customer
      </p>
      <div className={cn('absolute inset-0 flex p-6', viewportPosition[config.position])}>
        <div className={cn('absolute', widgetPosition[config.position])}>
          {/* Bubble */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.borderRadius,
              backgroundColor: bubbleBg,
              color: bubble.iconColor,
              boxShadow: bubble.shadow,
            }}
            aria-label="Toggle chat"
          >
            <MessageSquare className="size-6" />
          </button>

          {/* Popup */}
          {open && (
            <div
              className="absolute flex flex-col overflow-hidden animate-[chat-pop-in_0.25s_ease-out]"
              style={{
                width: popup.width,
                height: popup.height,
                borderRadius: popup.borderRadius,
                boxShadow: popup.shadow,
                backgroundColor: popup.backgroundColor,
                ...(config.position.includes('bottom')
                  ? { bottom: bubble.size + 12, right: config.position === 'bottom-right' ? 0 : undefined, left: config.position === 'bottom-left' ? 0 : undefined }
                  : { top: bubble.size + 12, right: config.position === 'top-right' ? 0 : undefined, left: config.position === 'top-left' ? 0 : undefined }),
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                style={{
                  backgroundColor: header.backgroundColor,
                  color: header.textColor,
                  borderBottom: `1px solid ${footer.borderColor}`,
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {header.logoUrl ? (
                    <img
                      src={header.logoUrl}
                      alt=""
                      className="shrink-0 rounded object-contain"
                      style={{ width: logoSize, height: logoSize }}
                    />
                  ) : (
                    <span
                      className="flex shrink-0 items-center justify-center rounded bg-foreground text-background"
                      style={{ width: logoSize, height: logoSize }}
                    >
                      <ConverseLogo size={logoSize * 0.6} className="[&_svg]:text-background" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate font-semibold" style={{ fontSize: header.fontSize }}>
                      {header.title}
                    </span>
                    {header.subtitle && (
                      <span className="block truncate text-xs opacity-70" style={{ color: header.textColor }}>
                        {header.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                {header.statusText && (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1">
                    <span
                      className="size-2 rounded-full animate-[chat-status-pulse_2s_ease-in-out_infinite]"
                      style={{ backgroundColor: header.statusDotColor ?? '#22c55e' }}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {header.statusText}
                    </span>
                  </div>
                )}
                {header.showCloseButton && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground active:scale-95"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Messages area */}
              <div
                ref={listRef}
                className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
                style={{ backgroundColor: popup.backgroundColor }}
              >
                {/* Welcome */}
                <div
                  className="flex items-start gap-2 animate-[chat-welcome-in_0.35s_ease-out]"
                  style={{
                    color: msgCfg.welcomeTextColor,
                    fontSize: msgCfg.fontSize,
                  }}
                >
                  <span
                    className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-muted/80 p-1.5"
                    style={{ color: msgCfg.welcomeTextColor }}
                  >
                    <Sparkles className="size-3.5" />
                  </span>
                  <span className="leading-snug">{config.welcomeMessage}</span>
                </div>

                {/* Real messages */}
                {messages.map((msg, i) =>
                  msg.role === 'customer' ? (
                    <div key={i} className="flex items-end justify-end gap-2 animate-[chat-msg-in-user_0.3s_ease-out_both]">
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm"
                        style={{
                          backgroundColor: userBubbleBg,
                          color: msgCfg.userBubbleTextColor,
                          fontSize: msgCfg.fontSize,
                          borderRadius: msgCfg.bubbleBorderRadius,
                        }}
                      >
                        {msg.content}
                      </div>
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
                        style={{
                          backgroundColor: userBubbleBg,
                          borderColor: userBubbleBg,
                          color: msgCfg.userBubbleTextColor,
                        }}
                      >
                        <UserRound className="size-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div key={i} className="flex items-end justify-start gap-2 animate-[chat-msg-in-agent_0.3s_ease-out_both]">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                        style={{
                          backgroundColor: msgCfg.agentBubbleBackground,
                          color: msgCfg.agentBubbleTextColor,
                        }}
                      >
                        <Bot className="size-3.5" />
                      </span>
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm"
                        style={{
                          backgroundColor: msgCfg.agentBubbleBackground,
                          color: msgCfg.agentBubbleTextColor,
                          fontSize: msgCfg.fontSize,
                          borderRadius: msgCfg.bubbleBorderRadius,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                )}

                {/* Typing indicator */}
                {sendMessage.isPending && (
                  <div className="flex items-end justify-start gap-2">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                      style={{
                        backgroundColor: msgCfg.agentBubbleBackground,
                        color: msgCfg.agentBubbleTextColor,
                      }}
                    >
                      <Bot className="size-3.5" />
                    </span>
                    <div
                      className="flex items-center gap-1 rounded-2xl px-4 py-3 shadow-sm"
                      style={{
                        backgroundColor: msgCfg.agentBubbleBackground,
                        borderRadius: msgCfg.bubbleBorderRadius,
                      }}
                    >
                      <span className="size-2 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0ms]" style={{ color: msgCfg.agentBubbleTextColor }} />
                      <span className="size-2 rounded-full bg-current opacity-40 animate-bounce [animation-delay:150ms]" style={{ color: msgCfg.agentBubbleTextColor }} />
                      <span className="size-2 rounded-full bg-current opacity-40 animate-bounce [animation-delay:300ms]" style={{ color: msgCfg.agentBubbleTextColor }} />
                    </div>
                  </div>
                )}

                {/* Inactivity warning: "Do you have any other questions?" */}
                {showInactivityWarning && !ended && (
                  <div
                    className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2.5 text-left"
                  >
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Do you have any other questions? This chat will close in 1 minute due to inactivity.
                    </p>
                  </div>
                )}

                {ended && (
                  <div className="text-center text-xs text-muted-foreground py-2 px-2 rounded-md bg-muted/50">
                    This conversation has ended. Send a new message below to start a new conversation.
                  </div>
                )}
              </div>

              {/* Footer: mode switch + input or stay in chat */}
              <div
                className="flex flex-col gap-2 p-3"
                style={{
                  backgroundColor: footer.backgroundColor,
                  borderTop: `1px solid ${footer.borderColor}`,
                }}
              >
                {config.voiceEnabled && (
                  <div className="flex rounded-lg p-0.5" style={{ backgroundColor: footer.borderColor + '40' }}>
                    <button
                      type="button"
                      onClick={() => setMode('chat')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all duration-200',
                        mode === 'chat'
                          ? 'text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      style={
                        mode === 'chat'
                          ? { backgroundColor: sendBtnBg, color: footer.sendButtonTextColor }
                          : undefined
                      }
                    >
                      <MessageSquare className="size-3.5" />
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all duration-200',
                        mode === 'voice'
                          ? 'text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      style={
                        mode === 'voice'
                          ? { backgroundColor: sendBtnBg, color: footer.sendButtonTextColor }
                          : undefined
                      }
                    >
                      <Mic className="size-3.5" />
                      Voice
                    </button>
                  </div>
                )}

                {mode === 'chat' ? (
                  <div className="flex flex-col gap-2">
                    {showInactivityWarning && !ended && (
                      <button
                        type="button"
                        onClick={handleStayInChat}
                        className="w-full rounded-md py-2 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: sendBtnBg,
                          color: footer.sendButtonTextColor,
                        }}
                      >
                        Stay in chat
                      </button>
                    )}
                    <div className="flex gap-2">
                      <div
                        className="flex flex-1 items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-1"
                        style={{
                          backgroundColor: footer.inputBackground,
                          borderColor: footer.borderColor,
                          borderRadius: footer.inputBorderRadius * 2,
                        }}
                      >
                        <PenLine
                          className="size-4 shrink-0"
                          style={{ color: msgCfg.welcomeTextColor }}
                        />
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          disabled={!apiKey}
                          placeholder={footer.inputPlaceholder}
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70 disabled:opacity-50"
                          style={{ color: footer.inputTextColor }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim() || (conversationId ? sendMessage.isPending : !apiKey || sendFirstMessage.isPending)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 hover:opacity-90 disabled:opacity-50"
                        style={{
                          backgroundColor: sendBtnBg,
                          color: footer.sendButtonTextColor,
                          borderRadius: footer.sendButtonBorderRadius * 2,
                          boxShadow: `0 2px 8px ${sendBtnBg}40`,
                        }}
                        aria-label="Send"
                      >
                        <Send className="size-4" />
                      </button>
                    </div>
                    {handoffRequested && (
                      <p
                        className="mt-2 text-center text-xs"
                        style={{ color: msgCfg.welcomeTextColor }}
                      >
                        Connected to support agent
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl py-3"
                    style={{
                      backgroundColor: footer.borderColor + '30',
                      borderRadius: footer.inputBorderRadius,
                    }}
                  >
                    <button
                      type="button"
                      className="flex size-12 items-center justify-center rounded-full transition-transform active:scale-95 hover:opacity-90"
                      style={{
                        backgroundColor: sendBtnBg,
                        color: footer.sendButtonTextColor,
                        boxShadow: `0 2px 12px ${sendBtnBg}50`,
                      }}
                      aria-label="Start voice"
                    >
                      <Mic className="size-6" />
                    </button>
                    <span
                      className="text-xs font-medium"
                      style={{ color: msgCfg.welcomeTextColor }}
                    >
                      Tap to start voice
                    </span>
                  </div>
                )}
                {config.showPoweredBy && (
                  <p className="mt-2 text-center">
                    <a
                      href="https://converseai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Powered by ConverseAI
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
