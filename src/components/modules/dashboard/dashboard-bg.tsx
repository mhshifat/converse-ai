'use client';

import React from 'react';

/**
 * Animated mesh-gradient + geometric SVG background for the dashboard content area.
 */
export function DashboardBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Gradient orbs */}
      <div
        className="absolute -left-32 -top-16 h-[480px] w-[480px] rounded-full opacity-[0.09] blur-[100px]"
        style={{
          background: 'radial-gradient(circle, oklch(0.55 0.22 265), transparent 65%)',
          animation: 'dash-mesh 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -bottom-20 -right-28 h-[400px] w-[400px] rounded-full opacity-[0.07] blur-[100px]"
        style={{
          background: 'radial-gradient(circle, oklch(0.6 0.18 310), transparent 60%)',
          animation: 'dash-mesh 24s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full opacity-[0.05] blur-[80px]"
        style={{
          background: 'radial-gradient(circle, oklch(0.5 0.16 170), transparent 70%)',
          animation: 'dash-orb-drift 18s ease-in-out infinite',
        }}
      />

      {/* Geometric grid — tilted fine lines */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035]">
        <defs>
          <pattern
            id="dash-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(12)"
          >
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dash-grid)" />
      </svg>
    </div>
  );
}
