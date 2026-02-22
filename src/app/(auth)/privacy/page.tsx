import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">
        This page will contain the Privacy Policy. You can customize it for your application.
      </p>
      <Link href="/signup" className="mt-6 inline-block text-sm text-primary underline underline-offset-4">
        Back to sign up
      </Link>
    </main>
  );
}
