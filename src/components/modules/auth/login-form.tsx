'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ConverseLogo } from '@/components/shared/converse-logo';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationSent = searchParams.get('verification') === 'sent';
  const verifiedSuccess = searchParams.get('verified') === 'success';
  const verifyError = searchParams.get('error');

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [correlationId, setCorrelationId] = React.useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const login = trpc.auth.login.useMutation();
  const resendVerification = trpc.auth.resendVerification.useMutation();

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setCorrelationId(null);
    setEmailNotVerified(false);
    setResendMessage(null);
    try {
      const result = await login.mutateAsync(data);
      if (!result.success) {
        if (result.emailNotVerified) {
          setEmailNotVerified(true);
          setServerError('Your account is not activated. Please verify your email first.');
        } else {
          setServerError(result.error ?? 'Login failed');
        }
        if (result.correlationId) setCorrelationId(result.correlationId);
        if (result.error?.toLowerCase().includes('permission')) {
          form.setError('email', { message: result.error });
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setServerError('Something went wrong. Please try again.');
      const errData =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { correlationId?: string } }).data
          : undefined;
      setCorrelationId(errData?.correlationId ?? null);
    }
  };

  const onResendVerification = async () => {
    const email = form.getValues('email');
    if (!email) return;
    setResendMessage(null);
    try {
      const result = await resendVerification.mutateAsync({ email });
      if (result.success) {
        setResendMessage(
          result.alreadyVerified
            ? 'This account is already verified. You can log in.'
            : 'Verification email sent. Check your inbox.'
        );
      } else {
        setResendMessage(result.error ?? 'Failed to send verification email.');
      }
    } catch {
      setResendMessage('Failed to send verification email.');
    }
  };

  const copyCorrelationId = () => {
    if (correlationId) navigator.clipboard.writeText(correlationId);
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
      <div className="flex justify-center mb-6 lg:hidden">
        <ConverseLogo size={36} animated />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-center lg:text-left">
        Sign in to your account
      </h2>
      <p className="mt-1 mb-6 text-sm text-muted-foreground text-center lg:text-left">
        Enter your credentials to continue.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {verificationSent && (
            <Alert className="animate-in fade-in-0">
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                We sent a verification link. Click the link to activate your account, then sign in below.
              </AlertDescription>
            </Alert>
          )}
          {verifiedSuccess && (
            <Alert className="animate-in fade-in-0">
              <AlertTitle>Email verified</AlertTitle>
              <AlertDescription>Your account is activated. You can sign in below.</AlertDescription>
            </Alert>
          )}
          {verifyError && (
            <Alert variant="destructive" className="animate-in fade-in-0">
              <AlertTitle>Verification issue</AlertTitle>
              <AlertDescription>
                {verifyError === 'missing_token'
                  ? 'Invalid verification link.'
                  : verifyError === 'invalid' || verifyError === 'verification_failed'
                    ? 'Verification link expired or invalid. Request a new one from the form below.'
                    : decodeURIComponent(verifyError)}
              </AlertDescription>
            </Alert>
          )}

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
                        title="Click to copy. Share this ID with customer support."
                      >
                        {correlationId}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={copyCorrelationId}
                        title="Copy correlation ID"
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
                    title="Copy error details for support"
                  >
                    Copy details
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {emailNotVerified && (
            <Alert className="animate-in fade-in-0">
              <AlertTitle>Account not activated</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>
                  We sent a verification link when you signed up. Click the link to activate your account, then try again.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resendVerification.isPending}
                  onClick={onResendVerification}
                >
                  {resendVerification.isPending ? 'Sending…' : 'Resend verification email'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {resendMessage && !serverError && (
            <Alert
              variant={resendMessage.startsWith('Verification') ? 'default' : 'destructive'}
              className="animate-in fade-in-0"
            >
              <AlertDescription>{resendMessage}</AlertDescription>
            </Alert>
          )}

          <div {...stagger(0)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-9 transition-shadow focus-visible:ring-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(1)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-9 transition-shadow focus-visible:ring-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div {...stagger(2)}>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || login.isPending}
              className="w-full h-9 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground" {...stagger(3)}>
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
