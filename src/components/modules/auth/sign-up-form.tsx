'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { trpc } from '@/utils/trpc';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ConverseLogo } from '@/components/shared/converse-logo';
import Link from 'next/link';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    passwordConfirm: z.string().min(1, 'Please retype your password'),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: 'You must accept the Privacy Policy and Terms to sign up',
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

type FormData = z.infer<typeof schema>;

export type LastAuthProvider = 'google' | 'github';

interface SignUpFormProps {
  lastAuthProvider?: LastAuthProvider;
}

export function SignUpForm({ lastAuthProvider }: SignUpFormProps = {}) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [correlationId, setCorrelationId] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '', acceptTerms: false },
  });

  const signup = trpc.auth.signup.useMutation();

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setCorrelationId(null);
    try {
      const result = await signup.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      if (!result.success) {
        setServerError(result.error ?? 'Signup failed');
        if (result.correlationId) setCorrelationId(result.correlationId);
        if (result.error?.toLowerCase().includes('email')) {
          form.setError('email', { message: result.error });
        }
      } else {
        if (result.requiresVerification) {
          router.push('/login?verification=sent');
        } else {
          router.push('/login');
        }
      }
    } catch (err: unknown) {
      setServerError('An unexpected error occurred. Please try again.');
      const errData = err && typeof err === 'object' && 'data' in err ? (err as { data?: { correlationId?: string } }).data : undefined;
      setCorrelationId(errData?.correlationId ?? null);
    }
  };

  const copyCorrelationId = () => {
    if (!correlationId) return;
    navigator.clipboard.writeText(correlationId);
  };

  const copyErrorDetails = () => {
    const text = correlationId
      ? `Error: ${serverError}\nCorrelation ID: ${correlationId}`
      : `Error: ${serverError}`;
    navigator.clipboard.writeText(text);
  };

  const stagger = (i: number) => ({
    style: { animation: `signup-fade-in-up 0.5s ease-out ${0.1 + i * 0.05}s both` } as React.CSSProperties,
  });

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo — visible only on mobile (brand panel hidden) */}
      <div className="flex justify-center mb-6 lg:hidden">
        <ConverseLogo size={36} animated />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-center lg:text-left">
        Create your account
      </h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground text-center lg:text-left">
        Enter your details to get started.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive" className="animate-in fade-in-0">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="space-y-2">
                  <p>{serverError}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-destructive/20">
                    {correlationId ? (
                      <>
                        <span className="text-xs text-muted-foreground">
                          Correlation ID (share with support):
                        </span>
                        <code
                          className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 font-mono break-all"
                          title="Click to copy. Share this ID with customer support to help them find your request."
                        >
                          {correlationId}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={copyCorrelationId}
                          title="Copy correlation ID to share with customer support"
                        >
                          Copy ID
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No correlation ID. When contacting support, describe what you were doing.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={copyErrorDetails}
                      title="Copy error message and correlation ID (if any) for support"
                    >
                      Copy details
                    </Button>
                  </div>
              </AlertDescription>
            </Alert>
          )}

          <div {...stagger(0)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jane Doe" autoComplete="name" className="h-9 transition-shadow focus-visible:ring-2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(1)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="you@example.com" autoComplete="email" className="h-9 transition-shadow focus-visible:ring-2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(2)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="At least 6 characters" autoComplete="new-password" className="h-9 transition-shadow focus-visible:ring-2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(3)}>
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retype password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Retype your password" autoComplete="new-password" className="h-9 transition-shadow focus-visible:ring-2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(4)}>
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="acceptTerms"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-describedby="terms-desc"
                    />
                  </FormControl>
                  <div className="grid gap-1.5 leading-none">
                    <FormLabel
                      htmlFor="acceptTerms"
                      id="terms-desc"
                      className="text-sm font-normal cursor-pointer leading-relaxed"
                    >
                      I agree to the{' '}
                      <Link href="/privacy" className="underline underline-offset-4 hover:no-underline" onClick={(e) => e.stopPropagation()}>
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link href="/terms" className="underline underline-offset-4 hover:no-underline" onClick={(e) => e.stopPropagation()}>
                        Terms of Service
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(5)}>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || signup.isPending}
              className="w-full h-9 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {signup.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </div>

          <div {...stagger(6)} className="relative flex items-center gap-2">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <div {...stagger(7)} className="grid grid-cols-2 gap-2">
            <div className="relative">
              {lastAuthProvider === 'google' && (
                <span
                  className="absolute -top-1.5 right-1.5 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                  aria-hidden
                >
                  Last used
                </span>
              )}
              <Button type="button" variant="outline" className="h-9 w-full" asChild>
                <a href="/api/auth/google">
                  <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </a>
              </Button>
            </div>
            <div className="relative">
              {lastAuthProvider === 'github' && (
                <span
                  className="absolute -top-1.5 right-1.5 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                  aria-hidden
                >
                  Last used
                </span>
              )}
              <Button type="button" variant="outline" className="h-9 w-full" asChild>
                <a href="/api/auth/github">
                  <svg className="size-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground" {...stagger(8)}>
            Already have an account?{' '}
            <a href="/login" className="text-foreground font-medium underline underline-offset-4 hover:no-underline">
              Log in
            </a>
          </p>
        </form>
      </Form>
    </div>
  );
}
