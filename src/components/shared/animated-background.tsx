// Shared SVG background animation for visual appeal
import React from 'react';

export const AnimatedBackground: React.FC = () => (
  <svg className="absolute inset-0 w-full h-full z-0 animate-pulse" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a1c4fd" />
        <stop offset="100%" stopColor="#c2e9fb" />
      </linearGradient>
    </defs>
    <path fill="url(#bg-gradient)" fillOpacity="0.5" d="M0,160L60,170.7C120,181,240,203,360,197.3C480,192,600,160,720,133.3C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
  </svg>
);
