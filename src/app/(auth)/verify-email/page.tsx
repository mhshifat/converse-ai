"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../../../utils/trpc";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyEmail = trpc.auth.verifyEmail.useMutation();

  React.useEffect(() => {
    if (!token) {
      router.replace("/login?error=missing_token");
      return;
    }
    verifyEmail.mutate(
      { token },
      {
        onSuccess: (data) => {
          if (data.success) {
            router.replace("/login?verified=success");
          } else {
            router.replace(`/login?error=${encodeURIComponent(data.error ?? "invalid")}`);
          }
        },
        onError: () => {
          router.replace("/login?error=verification_failed");
        },
      }
    );
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps -- run once when token is available

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
        <div className="w-full max-w-md p-8">
          <Alert variant="destructive">
            <AlertTitle>Invalid link</AlertTitle>
            <AlertDescription>No verification token provided. Redirecting to login…</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (verifyEmail.isPending || verifyEmail.isIdle) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
          <h1 className="text-xl font-semibold mb-2">Verifying your email…</h1>
          <p className="text-muted-foreground text-sm">Please wait.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        {verifyEmail.data?.success ? (
          <>
            <Alert>
              <AlertTitle>Email verified</AlertTitle>
              <AlertDescription>Redirecting to login…</AlertDescription>
            </Alert>
          </>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTitle>Verification failed</AlertTitle>
              <AlertDescription>{verifyEmail.data?.error ?? "Something went wrong."}</AlertDescription>
            </Alert>
            <Button asChild className="mt-4 w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
