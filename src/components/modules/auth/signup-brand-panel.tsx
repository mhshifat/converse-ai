'use client';

import React from 'react';
import { ConverseLogo } from '@/components/shared/converse-logo';

const features = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Chat & voice',
    desc: 'AI-powered text and voice conversations',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Secure & private',
    desc: 'Enterprise-grade encryption and isolation',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    title: 'Smart delivery',
    desc: 'Email, Discord, SMS — auto-formatted',
  },
] as const;

export function SignupBrandPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-foreground text-background p-10 xl:p-14">
      {/* Animated floating orbs */}
      <div
        className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        style={{ animation: 'float 18s ease-in-out infinite' }}
      />
      <div
        className="absolute -right-16 bottom-1/3 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        style={{ animation: 'float-slow 22s ease-in-out infinite' }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top: logo */}
      <div className="relative z-10" style={{ animation: 'signup-fade-in-up 0.6s ease-out forwards' }}>
        <ConverseLogo size={32} animated className="text-primary-foreground" />
      </div>

      {/* Center: headline */}
      <div className="relative z-10 space-y-6" style={{ animation: 'signup-fade-in-up 0.6s ease-out 0.15s both' }}>
        <h1 className="text-3xl font-bold tracking-tight xl:text-4xl leading-tight">
          Build AI conversations<br />
          that just work.
        </h1>
        <p className="text-background/60 max-w-sm text-sm leading-relaxed">
          Create projects, customize agents, embed a chatbot — and get structured data delivered wherever you need it.
        </p>
        <div className="space-y-4 pt-2">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3 group">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-background/80 transition group-hover:bg-background/15">
                {f.icon}
              </span>
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-background/50">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: subtle tagline */}
      <p
        className="relative z-10 text-xs text-background/30"
        style={{ animation: 'signup-fade-in-up 0.6s ease-out 0.3s both' }}
      >
        Trusted by teams building with AI
      </p>
    </div>
  );
}
