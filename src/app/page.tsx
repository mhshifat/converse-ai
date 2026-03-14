import React from 'react';
import { getValidatedSessionUser } from '@/server/session-validation';
import { buildMetadata } from '@/lib/seo';
import { LandingHeader } from '@/components/modules/landing/landing-header';
import { LandingHero } from '@/components/modules/landing/landing-hero';
import { LandingLogos } from '@/components/modules/landing/landing-logos';
import { LandingFeatures } from '@/components/modules/landing/landing-features';
import { LandingHowItWorks } from '@/components/modules/landing/landing-how-it-works';
import { LandingStats } from '@/components/modules/landing/landing-stats';
import { LandingCta } from '@/components/modules/landing/landing-cta';
import { LandingFooter } from '@/components/modules/landing/landing-footer';
import { JsonLdWebsite } from '@/components/shared/json-ld-website';

export const metadata = buildMetadata({
  path: '/',
  title: 'Build AI Chatbots That Actually Convert',
  description:
    'Deploy intelligent, voice-enabled AI chatbots that understand your business, engage customers in natural conversation, and seamlessly hand off to human agents when it matters most.',
});

export default async function HomePage() {
  const user = await getValidatedSessionUser();
  const isAuthenticated = !!user;

  return (
    <>
      <JsonLdWebsite />
      <main className="relative min-h-screen overflow-hidden">
        <LandingHeader isAuthenticated={isAuthenticated} />
      <LandingHero />
      <LandingLogos />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingStats />
      <LandingCta />
      <LandingFooter />
      </main>
    </>
  );
}
