'use client';

import React from 'react';
import {
  Bot,
  Mic,
  Users,
  BookOpen,
  BarChart3,
  Globe,
  Shield,
  Palette,
} from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
  span?: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: <Bot className="size-6" />,
    title: 'AI-Powered Conversations',
    description:
      'Deploy chatbots trained on your data that understand context, handle complex queries, and deliver human-like responses around the clock.',
    gradient: 'from-blue-50 to-indigo-50',
    iconBg: 'bg-blue-100 text-blue-600',
    span: 'md:col-span-2',
  },
  {
    icon: <Mic className="size-6" />,
    title: 'Voice Integration',
    description:
      'Let customers speak naturally with built-in speech recognition and AI voice responses. Barge-in support for real-time interruption.',
    gradient: 'from-violet-50 to-purple-50',
    iconBg: 'bg-violet-100 text-violet-600',
  },
  {
    icon: <Users className="size-6" />,
    title: 'Live Agent Handoff',
    description:
      'Seamlessly escalate to human agents when the conversation needs a personal touch, with full context preserved.',
    gradient: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: <BookOpen className="size-6" />,
    title: 'Knowledge Base',
    description:
      'Train your bot on documents, URLs, PDFs, and spreadsheets. It learns your business inside out.',
    gradient: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100 text-amber-600',
    span: 'md:col-span-2',
  },
  {
    icon: <BarChart3 className="size-6" />,
    title: 'Real-Time Analytics',
    description:
      'Track conversations, satisfaction scores, response times, and engagement trends with beautiful dashboards.',
    gradient: 'from-cyan-50 to-sky-50',
    iconBg: 'bg-cyan-100 text-cyan-600',
    span: 'md:col-span-2',
  },
  {
    icon: <Globe className="size-6" />,
    title: 'Embed Anywhere',
    description:
      'One script tag. That\'s all it takes to add your chatbot to any website, app, or platform.',
    gradient: 'from-rose-50 to-pink-50',
    iconBg: 'bg-rose-100 text-rose-600',
  },
  {
    icon: <Shield className="size-6" />,
    title: 'Enterprise Security',
    description:
      'Multi-tenant architecture, role-based access, encrypted data at rest and in transit.',
    gradient: 'from-slate-50 to-gray-100',
    iconBg: 'bg-slate-200 text-slate-600',
  },
  {
    icon: <Palette className="size-6" />,
    title: 'Fully Customizable',
    description:
      'Match your brand perfectly. Customize colors, avatars, messages, behavior, and every pixel of the widget.',
    gradient: 'from-fuchsia-50 to-pink-50',
    iconBg: 'bg-fuchsia-100 text-fuchsia-600',
    span: 'md:col-span-2',
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="relative py-24 lg:py-32 bg-white overflow-hidden">
      {/* Decorative bg */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-linear-to-br from-blue-50 to-violet-50 opacity-50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <AnimateOnScroll className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
            Everything you need to{' '}
            <span className="bg-linear-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              automate support
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            A complete platform to build, deploy, and manage intelligent chatbots
            that delight your customers.
          </p>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <AnimateOnScroll
              key={feature.title}
              delay={Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}
              className={feature.span ?? ''}
            >
              <div
                className={`group relative h-full rounded-2xl bg-linear-to-br ${feature.gradient} border border-gray-100 p-6 lg:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[lp-shine_0.8s_ease-in-out] bg-linear-to-r from-transparent via-white/40 to-transparent" />
                </div>

                <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.iconBg} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="relative text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="relative text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
