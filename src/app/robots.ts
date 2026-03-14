import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

/**
 * Served at /robots.txt. Tells crawlers what to index and where the sitemap is.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/embed.js'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/embed.js'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
