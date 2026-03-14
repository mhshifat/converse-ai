'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { AnimateOnScroll } from './animate-on-scroll';

export function LandingCta() {
  return (
    <section id="pricing" className="relative py-24 lg:py-32 bg-linear-to-b from-white to-gray-50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-indigo-600 to-violet-700" />

          {/* Animated mesh */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)',
                animation: 'lp-hero-glow 10s ease-in-out infinite',
              }}
            />
            <div
              className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
                animation: 'lp-hero-glow-2 8s ease-in-out infinite',
              }}
            />
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
              <defs>
                <pattern id="cta-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-grid)" />
            </svg>
          </div>

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 lg:py-24 text-center">
            <AnimateOnScroll>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto">
                Ready to transform your
                <br />
                customer experience?
              </h2>
            </AnimateOnScroll>
            <AnimateOnScroll delay={1}>
              <p className="mt-5 text-lg text-blue-100 max-w-xl mx-auto">
                Join thousands of businesses using ConverseAI to automate support,
                increase conversions, and delight their customers.
              </p>
            </AnimateOnScroll>
            <AnimateOnScroll delay={2}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="bg-white text-blue-700 hover:bg-blue-50 rounded-full px-8 h-12 text-base font-semibold shadow-xl shadow-black/10 transition-all hover:scale-105"
                >
                  <Link href="/signup">
                    Start Your Free Trial
                    <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-full px-8 h-12 text-base bg-transparent"
                >
                  <Link href="/login">Talk to Sales</Link>
                </Button>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={3}>
              <p className="mt-6 text-sm text-blue-200">
                No credit card required &middot; Free 14-day trial &middot; Cancel anytime
              </p>
            </AnimateOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
