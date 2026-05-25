import React from 'react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/app-branding';

/**
 * Chatpoto logo: a chat bubble (with tail) framing the two large round eyes
 * and stubby beak of a potoo bird — the bird the app is named after.
 * Uses currentColor so the mark inherits the parent text color.
 */
interface AppLogoProps {
  className?: string;
  /** Size in pixels; defaults to 32 */
  size?: number;
  /** When true, the eyes blink subtly */
  animated?: boolean;
  /** Show the app wordmark next to the icon */
  withWordmark?: boolean;
}

export function AppLogo({
  className = '',
  size = 32,
  animated = false,
  withWordmark = false,
}: AppLogoProps) {
  const s = size;
  const blinkStyle = animated
    ? ({ animation: 'logo-eye-blink 4s ease-in-out infinite' } as React.CSSProperties)
    : undefined;

  return (
    <span className={cn('inline-flex items-center gap-2 shrink-0 text-primary', className)}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="size-full text-inherit"
      >
        {/* Chat bubble body */}
        <path
          d="M5 6 H27 A3 3 0 0 1 30 9 V21 A3 3 0 0 1 27 24 H13 L7 29 V24 H5 A3 3 0 0 1 2 21 V9 A3 3 0 0 1 5 6 Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        {/* Left eye (potoo) — white sclera with dark pupil */}
        <circle cx="12" cy="14" r="3.6" fill="#ffffff" />
        <circle cx="12" cy="14" r="1.5" fill="#111111" style={blinkStyle} />
        {/* Right eye (potoo) */}
        <circle cx="22" cy="14" r="3.6" fill="#ffffff" />
        <circle cx="22" cy="14" r="1.5" fill="#111111" style={blinkStyle} />
        {/* Beak — small triangle between the eyes */}
        <path d="M17 18 L15.5 20.5 L18.5 20.5 Z" fill="#f59e0b" />
      </svg>
      {withWordmark && (
        <span className="font-semibold text-foreground tracking-tight">{APP_NAME}</span>
      )}
    </span>
  );
}
