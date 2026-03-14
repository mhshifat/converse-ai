import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  path: '/cookies',
  title: 'Cookie Policy',
  description: 'How ConverseAI uses cookies and similar technologies.',
});

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Cookie Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. What are cookies</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Cookies are small text files stored on your device when you visit our website or use our services. They help us provide, secure, and improve your experience.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How we use cookies</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We use cookies for authentication, preferences, analytics, and security. You can control cookie settings in your browser or through our consent tools where applicable.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Types of cookies we use</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed">
              <li>Strictly necessary — required for the service to function</li>
              <li>Functional — remember your preferences</li>
              <li>Analytics — understand how the service is used</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Your choices</h2>
            <p className="mt-2 text-sm leading-relaxed">
              You can block or delete cookies via your browser settings. Some features may not work correctly if you disable certain cookies.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Contact</h2>
            <p className="mt-2 text-sm leading-relaxed">
              For questions about this Cookie Policy, contact us at the address or email provided in our Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
