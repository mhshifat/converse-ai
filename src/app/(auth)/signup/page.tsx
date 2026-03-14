import { buildMetadata } from '@/lib/seo';
import { SignUpForm } from '@/components/modules/auth/sign-up-form';
import { SignupBrandPanel } from '@/components/modules/auth/signup-brand-panel';

export const metadata = buildMetadata({
  path: '/signup',
  title: 'Sign Up',
  description: 'Create your ConverseAI account and start building AI chatbots.',
  noIndex: true,
});

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen fixed inset-0 w-full">
      {/* Left: branded panel (hidden on mobile) */}
      <SignupBrandPanel />

      {/* Right: form area */}
      <main className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10 overflow-auto">
        <SignUpForm />
      </main>
    </div>
  );
}
