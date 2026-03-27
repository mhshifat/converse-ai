/**
 * Widget config shape for chatbot embed and dashboard preview.
 * Stored in chatbot.config and passed to embed script + preview.
 */
export interface BubbleConfig {
  size: number;
  borderRadius: number;
  backgroundColor: string;
  iconColor: string;
  shadow: string;
}

export interface PopupConfig {
  width: number;
  height: number;
  borderRadius: number;
  shadow: string;
  backgroundColor: string;
}

export interface HeaderConfig {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  title: string;
  showCloseButton: boolean;
  /** Company logo URL (optional). If not set, embed can show default/converse logo. */
  logoUrl?: string;
  /** Logo size in px for header */
  logoSize?: number;
  /** Short tagline or subtitle under the title (e.g. "Ask us anything") */
  subtitle?: string;
  /** Status text shown in center of header (e.g. "Online", "Here to help") */
  statusText?: string;
  /** Color for the status dot (e.g. green for online) */
  statusDotColor?: string;
}

export interface FooterConfig {
  backgroundColor: string;
  borderColor: string;
  inputPlaceholder: string;
  inputBackground: string;
  inputTextColor: string;
  inputBorderRadius: number;
  sendButtonBackground: string;
  sendButtonTextColor: string;
  sendButtonBorderRadius: number;
}

export interface MessagesConfig {
  welcomeTextColor: string;
  userBubbleBackground: string;
  userBubbleTextColor: string;
  agentBubbleBackground: string;
  agentBubbleTextColor: string;
  bubbleBorderRadius: number;
  fontSize: number;
}

const WIDGET_INSET_KEYS = [
  'widgetInsetTopPx',
  'widgetInsetRightPx',
  'widgetInsetBottomPx',
  'widgetInsetLeftPx',
] as const;

export type WidgetInsetKey = (typeof WIDGET_INSET_KEYS)[number];

/** Per-path inset overrides; only set fields you want to override for that path. */
export interface WidgetPathInsetRule {
  pathPrefix: string;
  widgetInsetTopPx?: number;
  widgetInsetRightPx?: number;
  widgetInsetBottomPx?: number;
  widgetInsetLeftPx?: number;
}

export interface ChatbotWidgetConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /**
   * Extra inset from each viewport edge (px), added to the default widget margin.
   * Only the pair matching `position` affects layout (e.g. bottom-right → bottom + right); others are kept when switching corner.
   */
  widgetInsetTopPx: number;
  widgetInsetRightPx: number;
  widgetInsetBottomPx: number;
  widgetInsetLeftPx: number;
  welcomeMessage: string;
  voiceEnabled: boolean;
  /** Show "Powered by ConverseAI" link in widget footer. Default true for attribution/marketing. */
  showPoweredBy: boolean;
  /** Rating after conversation: 'thumbs' (up/down) or 'nps' (0-10). */
  defaultRatingType: 'thumbs' | 'nps';
  /** Allow users to attach files (images, PDF, text) in the chat input. */
  attachmentsEnabled: boolean;
  /**
   * URL path prefixes where the embed must not load (e.g. `/checkout`, `/cart`).
   * Matched against `location.pathname` (normalized with a leading `/`).
   * Supports: plain prefix `/docs` (hides `/docs` and `/docs/...`); dynamic segments `/report/:id`
   * (same as `/report/*`); `*` one path segment; `**` multiple segments (e.g. `/app/**/settings`).
   */
  embedHiddenPaths: string[];
  /**
   * Host / subdomain labels where the embed must not load. Compared to `location.hostname` (no port).
   * A line `admin` hides `admin.example.com` and `admin.shop.co.uk`. A line `staging.app` hides
   * `staging.app.example.com`. Exact hostname match also counts (e.g. `shop.example.com`).
   */
  embedHiddenSubdomains: string[];
  /**
   * Optional per-path overrides for the four widget insets. If multiple rules match the current path,
   * the longest matching `pathPrefix` wins (same prefix rules as `embedHiddenPaths`).
   * Omitted inset fields keep the global defaults above.
   */
  widgetPathInsets: WidgetPathInsetRule[];
  /** Show a welcome message bubble on first page visit (session). */
  proactiveWelcomeEnabled?: boolean;
  /** Delay in seconds before showing the first-visit welcome bubble. 0 = immediately. */
  proactiveWelcomeDelaySeconds?: number;
  /** Status line under the greeting (e.g. "Our team is online"). */
  proactiveWelcomeStatus?: string;
  /** CTA button label (e.g. "Chat with us"). Click opens the chat. */
  proactiveWelcomeCtaLabel?: string;
  /** Optional avatar image URL shown on the welcome card (e.g. support agent photo). */
  proactiveWelcomeAvatarUrl?: string;
  bubble: BubbleConfig;
  popup: PopupConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  messages: MessagesConfig;
}

const defaultBubble: BubbleConfig = {
  size: 56,
  borderRadius: 50,
  backgroundColor: '#2563eb',
  iconColor: '#ffffff',
  shadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const defaultPopup: PopupConfig = {
  width: 380,
  height: 420,
  borderRadius: 16,
  shadow: '0 8px 32px rgba(0,0,0,0.12)',
  backgroundColor: '#ffffff',
};

const defaultHeader: HeaderConfig = {
  backgroundColor: '#ffffff',
  textColor: '#111111',
  fontSize: 16,
  title: 'Chat',
  showCloseButton: true,
  logoSize: 28,
  statusText: 'Online',
  statusDotColor: '#22c55e',
};

const defaultFooter: FooterConfig = {
  backgroundColor: '#ffffff',
  borderColor: '#eeeeee',
  inputPlaceholder: 'Type a message...',
  inputBackground: '#ffffff',
  inputTextColor: '#111111',
  inputBorderRadius: 8,
  sendButtonBackground: '#2563eb',
  sendButtonTextColor: '#ffffff',
  sendButtonBorderRadius: 8,
};

const defaultMessages: MessagesConfig = {
  welcomeTextColor: '#666666',
  userBubbleBackground: '#2563eb',
  userBubbleTextColor: '#ffffff',
  agentBubbleBackground: '#f0f0f0',
  agentBubbleTextColor: '#111111',
  bubbleBorderRadius: 12,
  fontSize: 14,
};

export const DEFAULT_WIDGET_CONFIG: ChatbotWidgetConfig = {
  primaryColor: '#2563eb',
  position: 'bottom-right',
  widgetInsetTopPx: 0,
  widgetInsetRightPx: 0,
  widgetInsetBottomPx: 0,
  widgetInsetLeftPx: 0,
  welcomeMessage: 'How can I help you today?',
  voiceEnabled: false,
  showPoweredBy: true,
  defaultRatingType: 'thumbs',
  attachmentsEnabled: false,
  embedHiddenPaths: [],
  embedHiddenSubdomains: [],
  widgetPathInsets: [],
  proactiveWelcomeEnabled: false,
  proactiveWelcomeDelaySeconds: 0,
  proactiveWelcomeStatus: '',
  proactiveWelcomeCtaLabel: 'Chat with us',
  proactiveWelcomeAvatarUrl: undefined,
  bubble: defaultBubble,
  popup: defaultPopup,
  header: defaultHeader,
  footer: defaultFooter,
  messages: defaultMessages,
};

function mergeOffsetPx(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? clampWidgetPositionOffsetPx(n) : fallback;
}

/** Same clamp as the embed script: avoids pushing the widget off-screen. */
export function clampWidgetPositionOffsetPx(px: number): number {
  return Math.max(-80, Math.min(400, Math.round(Number.isFinite(px) ? px : 0)));
}

export const EMBED_HIDDEN_PATHS_MAX = 100;
export const EMBED_HIDDEN_PATH_MAX_LEN = 512;
export const EMBED_HIDDEN_SUBDOMAINS_MAX = 100;
export const EMBED_HIDDEN_SUBDOMAIN_MAX_LEN = 128;
export const WIDGET_PATH_INSETS_MAX = 30;

/** True if `hostname` equals `entry` or is a deeper host under it (e.g. entry `admin` → `admin.site.com`). */
export function hostMatchesHiddenEmbedSubdomain(hostname: string, entry: string): boolean {
  const h = hostname.trim().toLowerCase();
  const e = entry
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\.+$/g, '');
  if (!h || !e) return false;
  if (h === e) return true;
  if (h.startsWith(`${e}.`)) return true;
  return false;
}

function normalizeEmbedHiddenSubdomainEntry(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.includes('/') || trimmed.includes(':')) return null;
  let s = trimmed.replace(/\s+/g, '');
  if (!s) return null;
  s = s.replace(/\.+$/g, '');
  if (!s) return null;
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  if (s.length > EMBED_HIDDEN_SUBDOMAIN_MAX_LEN) s = s.slice(0, EMBED_HIDDEN_SUBDOMAIN_MAX_LEN);
  return s;
}

/** Parse newline-separated host prefixes from the settings textarea. */
export function parseEmbedHiddenSubdomainsFromTextarea(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const p = normalizeEmbedHiddenSubdomainEntry(line);
    if (!p) continue;
    out.push(p);
    if (out.length >= EMBED_HIDDEN_SUBDOMAINS_MAX) break;
  }
  return out;
}

export function mergeEmbedHiddenSubdomainsFromStored(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const p = normalizeEmbedHiddenSubdomainEntry(item);
    if (!p) continue;
    out.push(p);
    if (out.length >= EMBED_HIDDEN_SUBDOMAINS_MAX) break;
  }
  return out;
}

/** Next.js-style `/[param]` as path segment → `/*` for matching. */
function expandEmbedHiddenPathDynamicSegments(p: string): string {
  return p.replace(/\/:[A-Za-z][A-Za-z0-9_]*(?=\/|$)/g, '/*');
}

function escapeRegexPathChars(s: string): string {
  return s.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
}

/**
 * True if pathname is hidden by a single rule (prefix, `/a/:id`, `/a/*`, `/a/**`, etc.).
 */
export function pathMatchesEmbedHiddenPattern(pathname: string, pattern: string): boolean {
  const path = pathname || '/';
  const p = pattern;
  if (!p) return false;
  if (!p.includes('*')) {
    if (path === p) return true;
    if (p !== '/' && path.startsWith(`${p}/`)) return true;
    return false;
  }
  if (p.length >= 3 && p.slice(-3) === '/**') {
    const pref = p.slice(0, -3);
    if (!pref.includes('*')) {
      return new RegExp(`^${escapeRegexPathChars(pref)}(?:/.*)?$`).test(path);
    }
  }
  const chunks = p.split('**');
  let body = '';
  for (let ci = 0; ci < chunks.length; ci++) {
    if (ci > 0) body += '.*';
    const bits = chunks[ci].split('*');
    for (let cj = 0; cj < bits.length; cj++) {
      if (cj > 0) body += '[^/]+';
      body += escapeRegexPathChars(bits[cj]);
    }
  }
  return new RegExp(`^${body}$`).test(path);
}

function normalizeEmbedHiddenPathSegment(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let p = trimmed.replace(/\s+/g, '');
  if (!p) return null;
  if (!p.startsWith('/')) p = `/${p.replace(/^\/+/, '')}`;
  p = expandEmbedHiddenPathDynamicSegments(p);
  p = p.replace(/\/+$/, '') || '/';
  if (p.length > EMBED_HIDDEN_PATH_MAX_LEN) p = p.slice(0, EMBED_HIDDEN_PATH_MAX_LEN);
  return p;
}

/** Parse newline-separated paths from the settings textarea. */
export function parseEmbedHiddenPathsFromTextarea(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const p = normalizeEmbedHiddenPathSegment(line);
    if (!p) continue;
    out.push(p);
    if (out.length >= EMBED_HIDDEN_PATHS_MAX) break;
  }
  return out;
}

/** Normalize paths loaded from stored JSON. */
export function mergeEmbedHiddenPathsFromStored(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const p = normalizeEmbedHiddenPathSegment(item);
    if (!p) continue;
    out.push(p);
    if (out.length >= EMBED_HIDDEN_PATHS_MAX) break;
  }
  return out;
}

function pickInsetOverridesFromRecord(rec: Record<string, unknown>): Partial<Pick<WidgetPathInsetRule, WidgetInsetKey>> {
  const out: Partial<Pick<WidgetPathInsetRule, WidgetInsetKey>> = {};
  for (const k of WIDGET_INSET_KEYS) {
    if (rec[k] == null || rec[k] === '') continue;
    const raw = rec[k];
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(n)) continue;
    (out as Record<string, number>)[k] = clampWidgetPositionOffsetPx(n);
  }
  return out;
}

export function mergeWidgetPathInsetsFromStored(v: unknown): WidgetPathInsetRule[] {
  if (!Array.isArray(v)) return [];
  const out: WidgetPathInsetRule[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const pathPrefix = normalizeEmbedHiddenPathSegment(String(rec.pathPrefix ?? ''));
    if (!pathPrefix) continue;
    const overrides = pickInsetOverridesFromRecord(rec);
    if (Object.keys(overrides).length === 0) continue;
    out.push({ pathPrefix, ...overrides });
    if (out.length >= WIDGET_PATH_INSETS_MAX) break;
  }
  return out;
}

function mergeWidgetInsetsFromStored(
  c: Record<string, unknown>,
  position: ChatbotWidgetConfig['position']
): Pick<
  ChatbotWidgetConfig,
  'widgetInsetTopPx' | 'widgetInsetRightPx' | 'widgetInsetBottomPx' | 'widgetInsetLeftPx'
> {
  const hasNewInset =
    c.widgetInsetTopPx != null ||
    c.widgetInsetRightPx != null ||
    c.widgetInsetBottomPx != null ||
    c.widgetInsetLeftPx != null;

  if (hasNewInset) {
    return {
      widgetInsetTopPx: mergeOffsetPx(c.widgetInsetTopPx, 0),
      widgetInsetRightPx: mergeOffsetPx(c.widgetInsetRightPx, 0),
      widgetInsetBottomPx: mergeOffsetPx(c.widgetInsetBottomPx, 0),
      widgetInsetLeftPx: mergeOffsetPx(c.widgetInsetLeftPx, 0),
    };
  }

  const lx = mergeOffsetPx(c.positionOffsetXPx, 0);
  const ly = mergeOffsetPx(c.positionOffsetYPx, 0);
  if (lx === 0 && ly === 0) {
    return {
      widgetInsetTopPx: 0,
      widgetInsetRightPx: 0,
      widgetInsetBottomPx: 0,
      widgetInsetLeftPx: 0,
    };
  }
  switch (position) {
    case 'bottom-right':
      return { widgetInsetTopPx: 0, widgetInsetRightPx: lx, widgetInsetBottomPx: ly, widgetInsetLeftPx: 0 };
    case 'bottom-left':
      return { widgetInsetTopPx: 0, widgetInsetRightPx: 0, widgetInsetBottomPx: ly, widgetInsetLeftPx: lx };
    case 'top-right':
      return { widgetInsetTopPx: ly, widgetInsetRightPx: lx, widgetInsetBottomPx: 0, widgetInsetLeftPx: 0 };
    case 'top-left':
      return { widgetInsetTopPx: ly, widgetInsetRightPx: 0, widgetInsetBottomPx: 0, widgetInsetLeftPx: lx };
    default:
      return {
        widgetInsetTopPx: 0,
        widgetInsetRightPx: 0,
        widgetInsetBottomPx: 0,
        widgetInsetLeftPx: 0,
      };
  }
}

/** Merge partial config from DB with defaults */
export function mergeWidgetConfig(
  stored: Record<string, unknown> | null | undefined
): ChatbotWidgetConfig {
  const c = stored ?? {};
  const position =
    (c.position as ChatbotWidgetConfig['position']) ?? DEFAULT_WIDGET_CONFIG.position;
  const insets = mergeWidgetInsetsFromStored(c, position);
  return {
    primaryColor: (c.primaryColor as string) ?? DEFAULT_WIDGET_CONFIG.primaryColor,
    position,
    ...insets,
    welcomeMessage: (c.welcomeMessage as string) ?? DEFAULT_WIDGET_CONFIG.welcomeMessage,
    voiceEnabled: (c.voiceEnabled as boolean) ?? DEFAULT_WIDGET_CONFIG.voiceEnabled,
    showPoweredBy: (c.showPoweredBy as boolean) ?? DEFAULT_WIDGET_CONFIG.showPoweredBy,
    defaultRatingType: (c.defaultRatingType as 'thumbs' | 'nps') ?? DEFAULT_WIDGET_CONFIG.defaultRatingType,
    attachmentsEnabled: (c.attachmentsEnabled as boolean) ?? DEFAULT_WIDGET_CONFIG.attachmentsEnabled,
    embedHiddenPaths: mergeEmbedHiddenPathsFromStored(c.embedHiddenPaths),
    embedHiddenSubdomains: mergeEmbedHiddenSubdomainsFromStored(c.embedHiddenSubdomains),
    widgetPathInsets: mergeWidgetPathInsetsFromStored(c.widgetPathInsets),
    proactiveWelcomeEnabled: (c.proactiveWelcomeEnabled as boolean) ?? DEFAULT_WIDGET_CONFIG.proactiveWelcomeEnabled,
    proactiveWelcomeDelaySeconds: (c.proactiveWelcomeDelaySeconds as number) ?? DEFAULT_WIDGET_CONFIG.proactiveWelcomeDelaySeconds,
    proactiveWelcomeStatus: (c.proactiveWelcomeStatus as string) ?? DEFAULT_WIDGET_CONFIG.proactiveWelcomeStatus,
    proactiveWelcomeCtaLabel: (c.proactiveWelcomeCtaLabel as string) ?? DEFAULT_WIDGET_CONFIG.proactiveWelcomeCtaLabel,
    proactiveWelcomeAvatarUrl: (c.proactiveWelcomeAvatarUrl as string | undefined) ?? DEFAULT_WIDGET_CONFIG.proactiveWelcomeAvatarUrl,
    bubble: { ...defaultBubble, ...(c.bubble as Partial<BubbleConfig>) },
    popup: { ...defaultPopup, ...(c.popup as Partial<PopupConfig>) },
    header: { ...defaultHeader, ...(c.header as Partial<HeaderConfig>) },
    footer: { ...defaultFooter, ...(c.footer as Partial<FooterConfig>) },
    messages: { ...defaultMessages, ...(c.messages as Partial<MessagesConfig>) },
  };
}

/** Flatten config for storage (nested objects as-is for JSON) */
export function widgetConfigToStorage(config: ChatbotWidgetConfig): Record<string, unknown> {
  return {
    primaryColor: config.primaryColor,
    position: config.position,
    widgetInsetTopPx: config.widgetInsetTopPx ?? 0,
    widgetInsetRightPx: config.widgetInsetRightPx ?? 0,
    widgetInsetBottomPx: config.widgetInsetBottomPx ?? 0,
    widgetInsetLeftPx: config.widgetInsetLeftPx ?? 0,
    welcomeMessage: config.welcomeMessage,
    voiceEnabled: config.voiceEnabled,
    showPoweredBy: config.showPoweredBy,
    defaultRatingType: config.defaultRatingType,
    attachmentsEnabled: config.attachmentsEnabled,
    embedHiddenPaths: config.embedHiddenPaths ?? [],
    embedHiddenSubdomains: mergeEmbedHiddenSubdomainsFromStored(config.embedHiddenSubdomains ?? []),
    widgetPathInsets: mergeWidgetPathInsetsFromStored(config.widgetPathInsets ?? []),
    proactiveWelcomeEnabled: config.proactiveWelcomeEnabled,
    proactiveWelcomeDelaySeconds: config.proactiveWelcomeDelaySeconds,
    proactiveWelcomeStatus: config.proactiveWelcomeStatus,
    proactiveWelcomeCtaLabel: config.proactiveWelcomeCtaLabel,
    proactiveWelcomeAvatarUrl: config.proactiveWelcomeAvatarUrl,
    bubble: config.bubble,
    popup: config.popup,
    header: config.header,
    footer: config.footer,
    messages: config.messages,
  };
}
