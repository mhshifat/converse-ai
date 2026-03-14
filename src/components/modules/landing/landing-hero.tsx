'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { HeroBackground } from './hero-background';
import { HeroChatMockup } from './hero-chat-mockup';

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#fafbff]">
      <HeroBackground />

      <div className="relative z-10 mx-auto max-w-7xl w-full px-6 lg:px-8 pt-28 pb-20 lg:pt-32 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-xs font-semibold text-blue-700 mb-6"
              style={{ animation: 'lp-fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) both' }}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
              </span>
              Now with Voice AI &mdash; Talk to Your Chatbot
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]"
              style={{ animation: 'lp-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}
            >
              Build AI Chatbots
              <br />
              <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                That Actually Convert
              </span>
            </h1>

            <p
              className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg"
              style={{ animation: 'lp-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}
            >
              Deploy intelligent, voice-enabled AI chatbots that understand your business,
              engage customers in natural conversation, and seamlessly hand off to human agents
              when it matters most.
            </p>

            <div
              className="mt-8 flex flex-wrap gap-4"
              style={{ animation: 'lp-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}
            >
              <Button
                size="lg"
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-7 h-12 text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all"
              >
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full px-7 h-12 text-base border-gray-300 hover:border-gray-400"
              >
                <a href="#how-it-works">
                  <Play className="size-4 mr-1 fill-current" />
                  See How It Works
                </a>
              </Button>
            </div>

            <div
              className="mt-10 flex items-center gap-6 text-sm text-gray-500"
              style={{ animation: 'lp-fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both' }}
            >
              <div className="flex items-center gap-2">
                <svg className="size-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="size-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                5-minute setup
              </div>
            </div>
          </div>

          {/* Right: Chat mockup */}
          <div
            className="relative flex justify-center lg:justify-end"
            style={{ animation: 'lp-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}
          >
            <HeroChatMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
