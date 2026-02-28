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

export interface ChatbotWidgetConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  welcomeMessage: string;
  voiceEnabled: boolean;
  /** Show "Powered by ConverseAI" link in widget footer. Default true for attribution/marketing. */
  showPoweredBy: boolean;
  /** Rating after conversation: 'thumbs' (up/down) or 'nps' (0-10). */
  defaultRatingType: 'thumbs' | 'nps';
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
  welcomeMessage: 'How can I help you today?',
  voiceEnabled: false,
  showPoweredBy: true,
  defaultRatingType: 'thumbs',
  bubble: defaultBubble,
  popup: defaultPopup,
  header: defaultHeader,
  footer: defaultFooter,
  messages: defaultMessages,
};

/** Merge partial config from DB with defaults */
export function mergeWidgetConfig(
  stored: Record<string, unknown> | null | undefined
): ChatbotWidgetConfig {
  const c = stored ?? {};
  return {
    primaryColor: (c.primaryColor as string) ?? DEFAULT_WIDGET_CONFIG.primaryColor,
    position: (c.position as ChatbotWidgetConfig['position']) ?? DEFAULT_WIDGET_CONFIG.position,
    welcomeMessage: (c.welcomeMessage as string) ?? DEFAULT_WIDGET_CONFIG.welcomeMessage,
    voiceEnabled: (c.voiceEnabled as boolean) ?? DEFAULT_WIDGET_CONFIG.voiceEnabled,
    showPoweredBy: (c.showPoweredBy as boolean) ?? DEFAULT_WIDGET_CONFIG.showPoweredBy,
    defaultRatingType: (c.defaultRatingType as 'thumbs' | 'nps') ?? DEFAULT_WIDGET_CONFIG.defaultRatingType,
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
    welcomeMessage: config.welcomeMessage,
    voiceEnabled: config.voiceEnabled,
    showPoweredBy: config.showPoweredBy,
    defaultRatingType: config.defaultRatingType,
    bubble: config.bubble,
    popup: config.popup,
    header: config.header,
    footer: config.footer,
    messages: config.messages,
  };
}
