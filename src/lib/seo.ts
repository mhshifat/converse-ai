import type { Metadata } from 'next';

/**
 * Single source of truth for SEO across the app.
 * Use buildMetadata() in layout/page for consistent titles, descriptions, and OG/Twitter tags.
 */

const siteName = 'ConverseAI';
const defaultTitle = 'ConverseAI – Build AI Chatbots That Actually Convert';
const defaultDescription =
  'Deploy intelligent, voice-enabled AI chatbots that understand your business, engage customers in natural conversation, and seamlessly hand off to human agents.';

/** Base URL for canonical and OG URLs. Set NEXT_PUBLIC_APP_URL in production. */
export function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (typeof process !== 'undefined' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export const seoConfig = {
  siteName,
  defaultTitle,
  defaultDescription,
  getBaseUrl,
  /** Relative path to default OG image (e.g. /og.png). Create and place in public/. */
  defaultOgImagePath: '/og.png',
  /** Twitter @username for the product (optional). */
  twitterHandle: undefined as string | undefined,
  /** Optional keywords for meta keywords (less impactful but some engines use). */
  defaultKeywords: [
    'AI chatbot',
    'customer support chatbot',
    'voice AI',
    'conversational AI',
    'live chat',
    'customer engagement',
    'multi-tenant',
  ],
} as const;

export interface SeoOptions {
  /** Page title (will be combined with siteName in default template). */
  title?: string;
  /** Meta description. */
  description?: string;
  /** Path for canonical and OG url (e.g. '/' or '/login'). */
  path?: string;
  /** Set to true for login/dashboard etc. to avoid indexing. */
  noIndex?: boolean;
  /** Override full title (no site suffix). */
  titleAbsolute?: string;
  /** Relative path to page-specific OG image. */
  ogImagePath?: string;
}

/**
 * Build Next.js Metadata from central SEO config.
 * Use in layout.tsx or page.tsx: export const metadata = buildMetadata({ ... })
 */
export function buildMetadata(options: SeoOptions = {}): Metadata {
  const baseUrl = getBaseUrl();
  const {
    title,
    description = defaultDescription,
    path = '/',
    noIndex = false,
    titleAbsolute,
    ogImagePath = seoConfig.defaultOgImagePath,
  } = options;

  const fullTitle = titleAbsolute ?? (title ? `${title} | ${siteName}` : defaultTitle);
  const canonicalUrl = `${baseUrl}${path === '/' ? '' : path}`;
  const ogImageUrl = ogImagePath.startsWith('http') ? ogImagePath : `${baseUrl}${ogImagePath}`;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: seoConfig.defaultKeywords,
    authors: [{ name: siteName, url: baseUrl }],
    creator: siteName,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: canonicalUrl,
      siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImageUrl],
      ...(seoConfig.twitterHandle && { creator: `@${seoConfig.twitterHandle}` }),
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true },
        },
  };

  return metadata;
}
