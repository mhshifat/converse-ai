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

export default async function LoginPage() {
  const cookieStore = await cookies();
  const lastAuthProvider = cookieStore.get(LAST_AUTH_PROVIDER_COOKIE)?.value as 'google' | 'github' | undefined;
  const valid = lastAuthProvider === 'google' || lastAuthProvider === 'github' ? lastAuthProvider : undefined;

  return (
    <div className="flex min-h-screen fixed inset-0 w-full">
      <SignupBrandPanel />
      <main className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10 overflow-auto">
        <LoginForm lastAuthProvider={valid} />
      </main>
    </div>
  );
}
