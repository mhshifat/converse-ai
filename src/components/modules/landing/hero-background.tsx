import React from 'react';

export function HeroBackground() {
  return (
    <>
      {/* Gradient mesh orbs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
          animation: 'lp-hero-glow 12s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)',
          animation: 'lp-hero-glow-2 10s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)',
          animation: 'lp-hero-glow 14s ease-in-out infinite 3s',
        }}
      />

      {/* Dot grid pattern */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ animation: 'lp-grid-pulse 8s ease-in-out infinite' }}
      >
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#6366f1" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      {/* Floating geometric accents */}
      <div
        className="pointer-events-none absolute top-32 right-[15%] w-16 h-16 rounded-xl border border-blue-200/40 rotate-12"
        style={{ animation: 'lp-float 6s ease-in-out infinite' }}
      />
      <div
        className="pointer-events-none absolute bottom-32 left-[10%] w-10 h-10 rounded-lg bg-linear-to-br from-indigo-200/30 to-blue-200/30 -rotate-6"
        style={{ animation: 'lp-float-reverse 7s ease-in-out infinite' }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-[5%] w-6 h-6 rounded-full bg-violet-300/20"
        style={{ animation: 'lp-float 5s ease-in-out infinite 1s' }}
      />
      <div
        className="pointer-events-none absolute top-[20%] right-[40%] w-3 h-3 rounded-full bg-blue-400/30"
        style={{ animation: 'lp-float-reverse 4s ease-in-out infinite 0.5s' }}
      />
    </>
  );
}
