'use client';

import React from 'react';
import Link from 'next/link';
import { FolderKanban, Bot, Plug, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BentoCard {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  span: string;
  delay: number;
}

const cards: BentoCard[] = [
  {
    href: '/dashboard/projects',
    title: 'Projects',
    description: 'Create projects, customize chatbot design, data schema, and generate embed code.',
    icon: FolderKanban,
    gradient: 'from-blue-500 to-indigo-500',
    span: 'md:col-span-2',
    delay: 0,
  },
  {
    href: '/dashboard/agents',
    title: 'Agents',
    description: 'Configure AI agents, system prompts, and provider settings.',
    icon: Bot,
    gradient: 'from-emerald-500 to-teal-500',
    span: '',
    delay: 1,
  },
  {
    href: '/dashboard/integrations',
    title: 'Integrations',
    description: 'Email, Discord, and SMS for delivering conversation data.',
    icon: Plug,
    gradient: 'from-violet-500 to-purple-500',
    span: '',
    delay: 2,
  },
];

export function DashboardOverviewCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.href}
            href={card.href}
            className={cn(
              'group relative block rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              card.span
            )}
            style={{ animation: `dash-fade-in 0.45s ease-out ${card.delay * 0.08}s both` }}
          >
            {/* Gradient top bar */}
            <span
              className={cn('absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-linear-to-r opacity-80', card.gradient)}
              aria-hidden
            />
            <div className="flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn('flex size-11 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm', card.gradient)}
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {card.title}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <span className="mt-3 inline-flex text-xs font-medium text-foreground/50 transition-colors group-hover:text-foreground">
                Open &rarr;
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
