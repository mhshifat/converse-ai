import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  path: '/terms',
  title: 'Terms of Service',
  description: 'Terms and conditions for using ConverseAI services.',
});

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
            <p className="mt-2 text-sm leading-relaxed">
              By accessing or using ConverseAI, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use our services.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Use of the service</h2>
            <p className="mt-2 text-sm leading-relaxed">
              You must use the service in compliance with applicable laws and not for illegal, harmful, or abusive purposes. You are responsible for your account and for content you create or transmit through the service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Account and payment</h2>
            <p className="mt-2 text-sm leading-relaxed">
              You must provide accurate information when registering. Paid plans are subject to the pricing and billing terms in effect at the time of subscription. We may suspend or terminate accounts for breach of these terms.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Intellectual property and data</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We retain rights in our platform and branding. You retain rights in your content. You grant us a license to use your content as needed to provide and improve the service. See our Privacy Policy for how we handle data.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Limitation of liability and contact</h2>
            <p className="mt-2 text-sm leading-relaxed">
              The service is provided “as is” to the extent permitted by law. Our liability is limited as set out in your agreement and applicable law. For questions about these terms, contact us via the details on our website.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
