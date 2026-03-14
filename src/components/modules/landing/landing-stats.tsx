'use client';

import React from 'react';
import { AnimateOnScroll } from './animate-on-scroll';

const STATS = [
  { value: '10M+', label: 'Messages Handled', suffix: '' },
  { value: '99.9%', label: 'Uptime SLA', suffix: '' },
  { value: '<2s', label: 'Avg Response Time', suffix: '' },
  { value: '4.9/5', label: 'Customer Satisfaction', suffix: '' },
] as const;

export function LandingStats() {
  return (
    <section className="relative py-20 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative rounded-3xl bg-linear-to-br from-gray-900 via-gray-900 to-indigo-950 p-10 lg:p-16 overflow-hidden">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
            />
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
              <defs>
                <pattern id="stat-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stat-dots)" />
            </svg>
          </div>

          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {STATS.map((stat, i) => (
              <AnimateOnScroll
                key={stat.label}
                delay={Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
