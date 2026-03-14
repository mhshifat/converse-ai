import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  path: '/privacy',
  title: 'Privacy Policy',
  description: 'How ConverseAI collects, uses, and protects your personal information.',
});

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Information we collect</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We collect information you provide when you sign up, use our services, or contact us — such as name, email, account and usage data, and conversation content necessary to provide the chatbot and related features.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How we use your information</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We use your information to provide, secure, and improve our services; to communicate with you; and to comply with legal obligations. We do not sell your personal information.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Sharing and disclosure</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We may share information with service providers who assist our operations, when required by law, or to protect rights and safety. We require appropriate safeguards from third parties who process data on our behalf.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data retention and your rights</h2>
            <p className="mt-2 text-sm leading-relaxed">
              We retain data as needed to provide the service and as required by law. You may have rights to access, correct, delete, or port your data depending on your jurisdiction; contact us to exercise them.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Contact</h2>
            <p className="mt-2 text-sm leading-relaxed">
              For privacy-related questions or requests, contact us using the details provided on our website or in your account settings.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
