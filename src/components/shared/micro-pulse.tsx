// Shared micro animation for icons or CTAs
import React from 'react';

export const MicroPulse: React.FC<{ className?: string }> = ({ className }) => (
  <span className={`inline-block animate-pulse rounded-full bg-blue-400 w-2 h-2 ${className ?? ''}`} />
);
