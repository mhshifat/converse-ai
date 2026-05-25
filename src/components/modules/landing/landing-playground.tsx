'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Target,
  Stethoscope,
  UtensilsCrossed,
  RotateCcw,
} from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';
import { AppLogo } from '@/components/shared/app-logo';
import { APP_NAME } from '@/lib/app-branding';
import { cn } from '@/lib/utils';

interface QA {
  id: string;
  q: string;
  a: string;
}

interface ScenarioAccent {
  /** Sent-by-customer bubble + primary button background */
  primary: string;
  /** Suggested-question chip classes (border + bg + text + hover) */
  chip: string;
  /** Tab active-state ring color */
  ring: string;
  /** Tab active-state icon bg */
  iconBg: string;
}

interface Scenario {
  id: string;
  label: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  agentName: string;
  intro: string;
  qa: QA[];
  accent: ScenarioAccent;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'ecom',
    label: 'E-commerce support',
    blurb: 'Orders, shipping, returns',
    icon: ShoppingBag,
    agentName: 'Acme Apparel Assistant',
    intro:
      "Hi! 👋 I can help with orders, shipping, returns, and product questions. What can I do for you?",
    qa: [
      {
        id: 'order',
        q: "Where's my order?",
        a: "I can check that for you. Could you share your order number? (It starts with #AC- and was emailed to you at checkout.)",
      },
      {
        id: 'ship',
        q: 'Do you ship internationally?',
        a: 'Yes — we ship to 47 countries. Standard delivery is 5–9 business days, and shipping is free on orders over $80.',
      },
      {
        id: 'return',
        q: "What's your return policy?",
        a: "30 days, no questions asked. When you're ready, I'll email you a prepaid return label — no phone call needed.",
      },
    ],
    accent: {
      primary: 'bg-blue-600',
      chip: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
      ring: 'ring-blue-200',
      iconBg: 'bg-blue-100 text-blue-700',
    },
  },
  {
    id: 'lead',
    label: 'Lead capture',
    blurb: 'B2B qualification',
    icon: Target,
    agentName: 'Growth Studio',
    intro:
      'Hey there — we help SaaS and e-commerce teams scale acquisition. Curious to learn more, or have something specific in mind?',
    qa: [
      {
        id: 'cost',
        q: 'We need SEO help — what does it cost?',
        a: 'Pricing depends on scope. Quick triage so I can be useful: roughly how many monthly visitors do you have today, and what conversion rate are you seeing?',
      },
      {
        id: 'cases',
        q: 'Can I see case studies?',
        a: "Absolutely. Which industry should I send first — e-commerce, B2B SaaS, or local services? I'll match the case studies to your space.",
      },
      {
        id: 'audit',
        q: 'Do you offer a free audit?',
        a: 'Yes — a 20-minute call where we review your site live. Want me to share a Calendly link?',
      },
    ],
    accent: {
      primary: 'bg-violet-600',
      chip: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
      ring: 'ring-violet-200',
      iconBg: 'bg-violet-100 text-violet-700',
    },
  },
  {
    id: 'health',
    label: 'Healthcare triage',
    blurb: 'Clinic intake',
    icon: Stethoscope,
    agentName: 'Maple Family Clinic',
    intro:
      "Hi! I can help with appointment booking, hours, insurance, and basic intake questions. How can I help today?",
    qa: [
      {
        id: 'sprain',
        q: 'I think I sprained my ankle — should I come in?',
        a: "I'm not a doctor, but here's a quick check: can you put weight on it? Is there visible swelling, bruising, or numbness? Based on your answers I'll suggest the right appointment type.",
      },
      {
        id: 'hours',
        q: 'What are your hours today?',
        a: "We're open until 7:00 PM today. The last walk-in slot is 6:15 PM. Want me to book you in?",
      },
      {
        id: 'ins',
        q: 'Do you accept BlueCross?',
        a: "Yes — BlueCross PPO and HMO. Please bring your insurance card and a photo ID. Anything else you'd like to know before booking?",
      },
    ],
    accent: {
      primary: 'bg-emerald-600',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      ring: 'ring-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
  },
  {
    id: 'food',
    label: 'Restaurant booking',
    blurb: 'Reservations & menu',
    icon: UtensilsCrossed,
    agentName: 'Olive & Oak',
    intro:
      "Welcome to Olive & Oak! I can help with reservations, menu questions, and dietary options. What's on your mind?",
    qa: [
      {
        id: 'book',
        q: 'Table for 4 tonight at 8?',
        a: 'Let me check… I have 8:15 PM at the indoor bar, or 8:30 PM at a window table. Which sounds better?',
      },
      {
        id: 'vegan',
        q: 'Do you have vegan options?',
        a: "Yes — a full vegan menu with 6 starters and 8 mains, plus a daily chef's special. The pumpkin gnocchi is the team favorite.",
      },
      {
        id: 'dog',
        q: 'Is the patio dog-friendly?',
        a: 'Absolutely. Water bowls at every patio table, and a treat jar at the host stand. We just ask that pups stay on the patio side.',
      },
    ],
    accent: {
      primary: 'bg-amber-600',
      chip: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
      ring: 'ring-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
    },
  },
];

interface Message {
  role: 'agent' | 'customer';
  text: string;
}

const TYPING_DELAY_MS = 900;

export function LandingPlayground() {
  const [activeId, setActiveId] = useState<string>(SCENARIOS[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scenario = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0];

  useEffect(() => {
    setMessages([{ role: 'agent', text: scenario.intro }]);
    setAskedIds(new Set());
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [scenario.id, scenario.intro]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  const handleAsk = useCallback(
    (qa: QA) => {
      if (typing || askedIds.has(qa.id)) return;
      setMessages((m) => [...m, { role: 'customer', text: qa.q }]);
      setAskedIds((s) => {
        const next = new Set(s);
        next.add(qa.id);
        return next;
      });
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setMessages((m) => [...m, { role: 'agent', text: qa.a }]);
        setTyping(false);
        typingTimeoutRef.current = null;
      }, TYPING_DELAY_MS);
    },
    [askedIds, typing]
  );

  const handleRestart = useCallback(() => {
    setMessages([{ role: 'agent', text: scenario.intro }]);
    setAskedIds(new Set());
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [scenario.intro]);

  const remaining = scenario.qa.filter((q) => !askedIds.has(q.id));

  return (
    <section id="try-it" className="relative py-24 lg:py-32 bg-gray-50 overflow-hidden">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-blue-100/40 via-violet-100/30 to-transparent opacity-60 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
        <AnimateOnScroll className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">
            Try it live
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
            See {APP_NAME} in action
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Pick a use case and click any suggested question. Responses below are scripted for the
            demo — in production, your bot answers from your own knowledge base and brand voice.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll>
          {/* Scenario tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {SCENARIOS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'group flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-200',
                    isActive
                      ? `border-transparent bg-white shadow-md ring-2 ${s.accent.ring}`
                      : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isActive ? s.accent.iconBg : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 leading-tight">
                      {s.label}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">{s.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chat panel */}
          <div className="relative rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-900">
                  <AppLogo size={20} className="[&_svg]:text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {scenario.agentName}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    Online · Demo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Restart
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="h-[420px] overflow-y-auto px-5 py-6 space-y-4 bg-gradient-to-b from-white to-gray-50/50"
            >
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} primaryClass={scenario.accent.primary} />
              ))}
              {typing && <TypingBubble />}
            </div>

            {/* Suggested questions */}
            <div className="border-t border-gray-100 bg-white p-4 sm:p-5">
              {remaining.length > 0 ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2.5">
                    Try asking
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {remaining.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleAsk(q)}
                        disabled={typing}
                        className={cn(
                          'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
                          scenario.accent.chip
                        )}
                      >
                        {q.q}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
                  <p className="text-sm text-gray-600">
                    You&apos;ve seen every demo prompt for this scenario. Try another vertical
                    above, or restart this one.
                  </p>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                      scenario.accent.chip
                    )}
                  >
                    Restart this scenario
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            This is a scripted preview. Real bots answer freely from your knowledge base and can
            hand off to a human at any time.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  );
}

function MessageBubble({
  message,
  primaryClass,
}: {
  message: Message;
  primaryClass: string;
}) {
  const isCustomer = message.role === 'customer';
  return (
    <div className={cn('flex', isCustomer ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isCustomer ? `${primaryClass} text-white` : 'bg-gray-100 text-gray-900'
        )}
        style={{ animation: 'lp-msg-appear 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div
      className="flex justify-start"
      style={{ animation: 'lp-msg-appear 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <div className="bg-gray-100 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full bg-gray-500"
            style={{ animation: 'lp-typing-dot 1.2s ease-in-out infinite' }}
          />
          <span
            className="size-1.5 rounded-full bg-gray-500"
            style={{ animation: 'lp-typing-dot 1.2s ease-in-out infinite 0.15s' }}
          />
          <span
            className="size-1.5 rounded-full bg-gray-500"
            style={{ animation: 'lp-typing-dot 1.2s ease-in-out infinite 0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}
