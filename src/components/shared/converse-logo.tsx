import React from 'react';

/**
 * Converse app logo: two speech bubbles suggesting conversation.
 * Uses currentColor so it respects theme (primary/foreground).
 * Shared across auth, dashboard, and embed for a single source of truth.
 */
interface ConverseLogoProps {
  className?: string;
  /** Size in pixels; defaults to 32 */
  size?: number;
  /** When true, the right bubble has a subtle pulse animation */
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
  const pulseStyle = animated ? { animation: 'logo-bubble-pulse 2.5s ease-in-out infinite' } as React.CSSProperties : undefined;

  return (
    <span className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      <svg
        width={s}
        height={s}
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="text-primary"
      >
        {/* Left speech bubble: circle + tail */}
        <circle cx="10" cy="10" r="5" fill="currentColor" fillOpacity="0.95" />
        <path d="M7 14l2 4 2-2-2-2H7z" fill="currentColor" fillOpacity="0.95" />
        {/* Right speech bubble: circle + tail (subtle pulse when animated) */}
        <g style={pulseStyle}>
          <circle cx="21" cy="11" r="4" fill="currentColor" fillOpacity="0.8" />
          <path d="M18.5 14.5l2 3 1.5-1.5-1.5-1.5h-2z" fill="currentColor" fillOpacity="0.8" />
        </g>
      </svg>
      {withWordmark && (
        <span className="font-semibold text-foreground tracking-tight">Converse</span>
      )}
    </span>
  );
}
