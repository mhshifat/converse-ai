'use client';

import React from 'react';
import { Upload, Cpu, Code, Rocket } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

const STEPS = [
  {
    icon: <Upload className="size-6" />,
    number: '01',
    title: 'Upload Your Knowledge',
    description: 'Feed your chatbot with documents, URLs, PDFs, or spreadsheets. It learns everything about your business.',
    color: 'blue',
  },
  {
    icon: <Cpu className="size-6" />,
    number: '02',
    title: 'Train Your Agent',
    description: 'Configure your AI agent with custom instructions, personality, and conversation flows tailored to your needs.',
    color: 'indigo',
  },
  {
    icon: <Code className="size-6" />,
    number: '03',
    title: 'Embed in One Line',
    description: 'Copy a single script tag and paste it into your website. Your chatbot is live in seconds.',
    color: 'violet',
  },
  {
    icon: <Rocket className="size-6" />,
    number: '04',
    title: 'Engage & Optimize',
    description: 'Watch conversations happen in real-time. Use analytics and feedback to continuously improve performance.',
    color: 'purple',
  },
] as const;

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    line: 'from-blue-400 to-indigo-400',
    ring: 'ring-blue-100',
    numBg: 'bg-blue-600',
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    line: 'from-indigo-400 to-violet-400',
    ring: 'ring-indigo-100',
    numBg: 'bg-indigo-600',
  },
  violet: {
    bg: 'bg-violet-100',
    text: 'text-violet-600',
    line: 'from-violet-400 to-purple-400',
    ring: 'ring-violet-100',
    numBg: 'bg-violet-600',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    line: 'from-purple-400 to-fuchsia-400',
    ring: 'ring-purple-100',
    numBg: 'bg-purple-600',
  },
} as const;

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 bg-gray-50 overflow-hidden">
      {/* Background decoration */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full" style={{ opacity: 0.03 }}>
        <defs>
          <pattern id="hiw-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hiw-grid)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-20">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
            Live in{' '}
            <span className="bg-linear-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              four simple steps
            </span>
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {STEPS.map((step, i) => {
            const colors = COLOR_MAP[step.color];
            return (
              <AnimateOnScroll
                key={step.number}
                delay={Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}
              >
                <div className="relative flex flex-col items-center text-center group">
                  {/* Connector line (desktop) */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px">
                      <div className={`w-full h-full bg-linear-to-r ${colors.line} opacity-30`} />
                      <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${colors.bg}`} />
                    </div>
                  )}

                  {/* Step number + icon */}
                  <div className="relative mb-6">
                    <div
                      className={`w-20 h-20 rounded-2xl ${colors.bg} flex items-center justify-center ${colors.text} ring-4 ${colors.ring} transition-transform duration-300 group-hover:scale-110`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${colors.numBg} text-white text-xs font-bold flex items-center justify-center shadow-md`}
                    >
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                    {step.description}
                  </p>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
