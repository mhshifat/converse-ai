import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  path: '/security',
  title: 'Security',
  description: 'How ConverseAI protects your data and our security practices.',
});

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Security</h1>
        <p className="mt-2 text-sm text-muted-foreground">How we protect your data</p>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Data protection</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We use industry-standard measures to protect your data in transit and at rest, including encryption and secure access controls.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Authentication & access</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Account access is protected with secure authentication. We support email verification and recommend strong passwords and, where available, multi-factor authentication.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Infrastructure & compliance</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Our systems are hosted on secure infrastructure. We follow security best practices and work to meet applicable compliance requirements for the regions we serve.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Reporting security issues</h2>
            <p className="mt-2 text-sm leading-relaxed">
              If you believe you have found a security vulnerability, please report it to us responsibly. We will acknowledge and address valid reports in accordance with our security process.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2 text-sm leading-relaxed">
              For security-related questions or to report an issue, contact us using the details in our Privacy Policy or on our contact page.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
