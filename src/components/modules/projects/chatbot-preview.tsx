'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Mic,
  Send,
  PenLine,
  Paperclip,
  Sparkles,
  Bot,
  UserRound,
  X,
} from 'lucide-react';
import type { ChatbotWidgetConfig } from '@/lib/chatbot-widget-config';
import { ConverseLogo } from '@/components/shared/converse-logo';
import { cn } from '@/lib/utils';

interface ChatbotPreviewProps {
  config: ChatbotWidgetConfig;
  className?: string;
}

/** Live preview of the chatbot widget for the customization tab (desktop right column) */
export const ChatbotPreview = React.memo(function ChatbotPreview({ config, className }: ChatbotPreviewProps) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const { bubble, popup, header, footer, messages } = config;
  const showProactiveWelcome = (config.proactiveWelcomeEnabled ?? false) && !welcomeDismissed;
  const logoSize = header.logoSize ?? 28;
  const primary = config.primaryColor ?? '#2563eb';
  // Use primary when section value is unset or empty so primary color change always reflects
  const bubbleBg = bubble.backgroundColor || primary;
  const userBubbleBg = messages.userBubbleBackground || primary;
  const sendBtnBg = footer.sendButtonBackground || primary;

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
      <p className="absolute left-3 top-3 text-xs font-medium text-muted-foreground">Live preview</p>
      <div className={cn('absolute inset-0 flex p-6', viewportPosition[config.position])}>
        <div className={cn('absolute', widgetPosition[config.position])}>
          {/* Proactive welcome card (first visit) - modern, eye-catching */}
          {showProactiveWelcome && (
            <div
              className="absolute z-10 w-[320px] max-w-[calc(100vw-48px)] overflow-hidden rounded-[28px]"
              style={{
                backgroundColor: popup.backgroundColor,
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18), 0 12px 24px -8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
                borderTop: `3px solid ${primary}`,
                animation: 'chat-welcome-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                ...(config.position.includes('bottom')
                  ? { bottom: bubble.size + 10, right: config.position === 'bottom-right' ? 0 : undefined, left: config.position === 'bottom-left' ? 0 : undefined }
                  : { top: bubble.size + 10, right: config.position === 'top-right' ? 0 : undefined, left: config.position === 'top-left' ? 0 : undefined }),
              }}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3.5 px-[18px] pt-[18px]">
                <button
                  type="button"
                  onClick={() => setWelcomeDismissed(true)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full opacity-50 transition-colors hover:opacity-100 hover:bg-black/5"
                  style={{ color: messages.welcomeTextColor }}
                  aria-label="Dismiss"
                >
                  <X className="size-5" />
                </button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className="font-bold leading-tight tracking-tight"
                    style={{ color: messages.welcomeTextColor, fontSize: (messages.fontSize ?? 14) + 3 }}
                  >
                    {config.welcomeMessage}
                  </p>
                  {(config.proactiveWelcomeStatus ?? '') && (
                    <p className="mt-1.5 text-sm text-black/55" style={{ fontSize: messages.fontSize }}>
                      {config.proactiveWelcomeStatus}
                    </p>
                  )}
                </div>
                {(config.proactiveWelcomeAvatarUrl ?? '') && (
                  <img
                    src={config.proactiveWelcomeAvatarUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white/80 shadow-sm"
                  />
                )}
              </div>
              <div className="mt-4 border-t border-black/6" />
              <div className="px-[18px] py-4 text-center">
                <button
                  type="button"
                  onClick={() => { setWelcomeDismissed(true); setOpen(true); }}
                  className="w-full rounded-xl py-3 px-5 font-semibold text-white tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    backgroundColor: primary,
                    fontSize: messages.fontSize,
                    boxShadow: `0 4px 14px ${primary}40`,
                  }}
                >
                  {config.proactiveWelcomeCtaLabel ?? 'Chat with us'}
                </button>
              </div>
            </div>
          )}
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
                    onClick={() => setOpen(false)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground active:scale-95"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Messages area */}
              <div
                className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
                style={{ backgroundColor: popup.backgroundColor }}
              >
                {/* Welcome */}
                <div
                  className="flex items-start gap-2 animate-[chat-welcome-in_0.35s_ease-out]"
                  style={{
                    color: messages.welcomeTextColor,
                    fontSize: messages.fontSize,
                  }}
                >
                  <span
                    className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-muted/80 p-1.5"
                    style={{ color: messages.welcomeTextColor }}
                  >
                    <Sparkles className="size-3.5" />
                  </span>
                  <span className="leading-snug">{config.welcomeMessage}</span>
                </div>

                {/* User message */}
                <div className="flex items-end justify-end gap-2 animate-[chat-msg-in-user_0.3s_ease-out_0.05s_both]">
                  <div
                    className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md"
                    style={{
                      backgroundColor: userBubbleBg,
                      color: messages.userBubbleTextColor,
                      fontSize: messages.fontSize,
                      borderRadius: messages.bubbleBorderRadius,
                    }}
                  >
                    Hello!
                  </div>
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
                    style={{
                      backgroundColor: userBubbleBg,
                      borderColor: userBubbleBg,
                      color: messages.userBubbleTextColor,
                    }}
                  >
                    <UserRound className="size-3.5" />
                  </span>
                </div>

                {/* Agent message */}
                <div className="flex items-end justify-start gap-2 animate-[chat-msg-in-agent_0.3s_ease-out_0.1s_both]">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                    style={{
                      backgroundColor: messages.agentBubbleBackground,
                      color: messages.agentBubbleTextColor,
                    }}
                  >
                    <Bot className="size-3.5" />
                  </span>
                  <div
                    className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md"
                    style={{
                      backgroundColor: messages.agentBubbleBackground,
                      color: messages.agentBubbleTextColor,
                      fontSize: messages.fontSize,
                      borderRadius: messages.bubbleBorderRadius,
                    }}
                  >
                    Hi! How can I help?
                  </div>
                </div>
              </div>

              {/* Footer: mode switch + input */}
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
                          ? {
                              backgroundColor: sendBtnBg,
                              color: footer.sendButtonTextColor,
                            }
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
                          ? {
                              backgroundColor: sendBtnBg,
                              color: footer.sendButtonTextColor,
                            }
                          : undefined
                      }
                    >
                      <Mic className="size-3.5" />
                      Voice
                    </button>
                  </div>
                )}

                {mode === 'chat' ? (
                  <div className="flex gap-2">
                    <div
                      className="flex flex-1 items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-1"
                      style={{
                        backgroundColor: footer.inputBackground,
                        borderColor: footer.borderColor,
                        borderRadius: footer.inputBorderRadius * 2,
                      }}
                    >
                      {config.attachmentsEnabled && (
                        <Paperclip className="size-4 shrink-0 opacity-70" style={{ color: messages.welcomeTextColor }} />
                      )}
                      <PenLine
                        className="size-4 shrink-0"
                        style={{ color: messages.welcomeTextColor }}
                      />
                      <input
                        type="text"
                        readOnly
                        placeholder={footer.inputPlaceholder}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70"
                        style={{
                          color: footer.inputTextColor,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 hover:opacity-90"
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
                      style={{ color: messages.welcomeTextColor }}
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
});
