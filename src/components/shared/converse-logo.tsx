import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ConverseAI logo: conversation (two message shapes) + connection (center node).
 * Modern, geometric mark that reads as chat/dialogue and hints at AI. Uses currentColor.
 */
interface ConverseLogoProps {
  className?: string;
  /** Size in pixels; defaults to 32 */
  size?: number;
  /** When true, the reply bubble and center node have a subtle pulse */
  animated?: boolean;
  /** Show wordmark "Converse" next to the icon */
  withWordmark?: boolean;
}

export function ConverseLogo({
  className = '',
  size = 32,
  animated = false,
  withWordmark = false,
}: ConverseLogoProps) {
  const s = size;
  const viewBox = '0 0 32 32';
  const pulseStyle = animated
    ? ({ animation: 'logo-bubble-pulse 2.5s ease-in-out infinite' } as React.CSSProperties)
    : undefined;

  return (
    <span className={cn('inline-flex items-center gap-2 shrink-0 text-primary', className)}>
      <svg
        width={s}
        height={s}
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="size-full text-inherit"
      >
        {/* Left bubble: main message (pill + tail) */}
        <rect x="4" y="6" width="12" height="8" rx="4" ry="4" fill="currentColor" fillOpacity="0.95" />
        <path d="M7 14.5 L5 18 L9 16 Z" fill="currentColor" fillOpacity="0.95" />
        {/* Center node: connection / AI */}
        <circle cx="16" cy="12" r="2.25" fill="currentColor" fillOpacity="0.9" style={pulseStyle} />
        {/* Right bubble: reply (smaller pill + tail) */}
        <g style={pulseStyle}>
          <rect x="18" y="14" width="10" height="6" rx="3" ry="3" fill="currentColor" fillOpacity="0.85" />
          <path d="M22 14.5 L20 11 L24 13 Z" fill="currentColor" fillOpacity="0.85" />
        </g>
      </svg>
      {withWordmark && (
        <span className="font-semibold text-foreground tracking-tight">Converse</span>
      )}
    </span>
  );
}
