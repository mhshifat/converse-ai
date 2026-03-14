import React from 'react';
import { getBaseUrl, seoConfig } from '@/lib/seo';

/**
 * Renders JSON-LD structured data for the WebSite and Organization.
 * Use on the landing page to help search engines understand the site and improve rich results.
 */
export function JsonLdWebsite() {
  const baseUrl = getBaseUrl();
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: seoConfig.siteName,
        description: seoConfig.defaultDescription,
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: seoConfig.siteName,
        url: baseUrl,
        description: seoConfig.defaultDescription,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
