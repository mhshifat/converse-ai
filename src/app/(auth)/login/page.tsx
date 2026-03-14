import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { buildMetadata } from '@/lib/seo';
import { LoginForm } from '@/components/modules/auth/login-form';
import { SignupBrandPanel } from '@/components/modules/auth/signup-brand-panel';

export const metadata = buildMetadata({
  path: '/login',
  title: 'Sign In',
  description: 'Sign in to your ConverseAI account.',
  noIndex: true,
});

const LAST_AUTH_PROVIDER_COOKIE = 'last_auth_provider';

function LoginFormFallback() {
  return (
    <div className="w-full max-w-sm mx-auto animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4 mb-4" />
      <div className="h-4 bg-muted rounded w-full mb-6" />
      <div className="h-10 bg-muted rounded w-full mb-4" />
      <div className="h-10 bg-muted rounded w-full" />
    </div>
  );
}

export default async function LoginPage() {
  const cookieStore = await cookies();
  const lastAuthProvider = cookieStore.get(LAST_AUTH_PROVIDER_COOKIE)?.value as 'google' | 'github' | undefined;
  const valid = lastAuthProvider === 'google' || lastAuthProvider === 'github' ? lastAuthProvider : undefined;

  return (
    <div className="flex min-h-screen fixed inset-0 w-full">
      <SignupBrandPanel />
      <main className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10 overflow-auto">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm lastAuthProvider={valid} />
        </Suspense>
      </main>
    </div>
  );
}
