'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';
import { APP_NAME } from '@/lib/app-branding';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: 'How is my data and my customers’ data protected?',
    answer: (
      <>
        Conversations are stored in a multi-tenant database with row-level isolation per
        workspace. Data is encrypted in transit (TLS) and at rest. The widget API key
        embedded on your site is public and scoped to a single chatbot — it cannot
        read other tenants’ data or perform admin actions.
      </>
    ),
  },
  {
    question: 'How customizable is the widget?',
    answer: (
      <>
        Every visible element of the widget can be themed: primary color, bubble shape and
        size, position and inset, header logo and copy, message bubble colors, input
        styling, welcome message, and a path-based show/hide list so the widget only
        appears where you want it. No CSS overrides on your side.
      </>
    ),
  },
  {
    question: 'What can I train the chatbot on?',
    answer: (
      <>
        Upload documents (PDF, DOCX, TXT), spreadsheets (XLSX, CSV), or point it at
        URLs. The platform extracts the main content, chunks it, and indexes it for
        retrieval-augmented responses. Re-ingestion is one click when source data
        changes.
      </>
    ),
  },
  {
    question: 'How does the human handoff work?',
    answer: (
      <>
        When the bot detects an escalation (explicit ask, frustration, or an unanswered
        critical question), it routes the conversation to a human agent in your
        dashboard with the full transcript preserved. Voice handoff uses WebRTC for
        real-time audio with the customer.
      </>
    ),
  },
  {
    question: 'Where does the compiled conversation data go?',
    answer: (
      <>
        After each conversation, {APP_NAME} compiles structured data (contact details,
        intent, summary) and delivers it via the integrations you enable: email,
        Discord webhook, or SMS. You define the data schema per project so the output
        matches your CRM or workflow.
      </>
    ),
  },
  {
    question: 'How do I add the widget to my site?',
    answer: (
      <>
        One <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-800">&lt;script&gt;</code> tag.
        Copy it from the project’s Chatbot tab and paste before <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-800">&lt;/body&gt;</code> on
        every page where you want the widget. It works on any platform that lets you
        inject HTML (Webflow, Shopify, WordPress, custom apps, etc.).
      </>
    ),
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 lg:py-32 bg-white overflow-hidden">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <AnimateOnScroll className="text-center mb-14">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Everything teams ask before they ship {APP_NAME}.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll>
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <li key={faq.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-gray-700"
                  >
                    <span className="text-base sm:text-lg font-semibold text-gray-900">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-5 shrink-0 text-gray-400 transition-transform duration-200',
                        isOpen && 'rotate-180 text-blue-600'
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-all duration-200',
                      isOpen ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
