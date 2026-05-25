/**
 * Single source of truth for the app's display name and related branding strings.
 * Override at deploy time via NEXT_PUBLIC_APP_NAME — keep this isomorphic so it
 * works in server components, client components, route handlers, and the embed.
 */

const DEFAULT_APP_NAME = 'Chatpoto';

export const APP_NAME: string =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_NAME?.trim()) || DEFAULT_APP_NAME;

/** Lowercase slug for cookies, DOM ids, folders, user-agents, session keys. */
export const APP_SLUG: string = APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Homepage URL surfaced in "Powered by" links etc. Defaults to the app URL. */
export const APP_HOMEPAGE_URL: string =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_HOMEPAGE_URL?.trim()) ||
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL?.trim()) ||
  `https://${APP_SLUG}.com`;
