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

export function SignUpForm() {
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

          <p className="text-center text-xs text-muted-foreground" {...stagger(6)}>
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
