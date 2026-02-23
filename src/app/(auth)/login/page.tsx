import { LoginForm } from '@/components/modules/auth/login-form';
import { SignupBrandPanel } from '@/components/modules/auth/signup-brand-panel';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen fixed inset-0 w-full">
      {/* Left: branded panel (hidden on mobile) — same as signup */}
      <SignupBrandPanel />

      {/* Right: form area */}
      <main className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10 overflow-auto">
        <LoginForm />
      </main>
    </div>
  );
}
