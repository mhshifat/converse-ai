"use client";
// LoginPage: User login form
import React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "../../../utils/trpc";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  // Correct usage: trpc.auth.login.useMutation() since 'auth' is a router in appRouter
  const login = trpc.auth.login.useMutation();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [correlationId, setCorrelationId] = React.useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setCorrelationId(null);
    try {
      const result = await login.mutateAsync(data);
      if (!result.success) {
        setServerError(result.error || "Login failed");
        if (result.correlationId) setCorrelationId(result.correlationId);
        if (result.error?.toLowerCase().includes("permission")) {
          form.setError("email", { message: result.error });
        }
      } else {
        router.push("/dashboard");
      }
    } catch {
      setServerError("Unexpected error. Please try again.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-lg p-8 flex flex-col gap-4">
            <h1 className="text-2xl font-bold mb-2 text-center">Sign in to your account</h1>
            {login.isLoading && (
              <Skeleton className="h-10 w-full mb-2" />
            )}
            {serverError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {serverError}
                  {correlationId && (
                    <span className="ml-2 text-xs text-muted-foreground cursor-pointer" title="Copy correlation ID" onClick={() => navigator.clipboard.writeText(correlationId)}>
                      (Correlation ID: <span className="underline">{correlationId}</span>)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Email" autoComplete="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Password" autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting || login.isLoading} className="w-full">
              {login.isLoading ? "Logging in..." : "Log In"}
            </Button>
            <p className="text-center text-sm mt-2">
              Don&apos;t have an account? <a href="/signup" className="text-blue-600 underline">Sign up</a>
            </p>
          </form>
        </Form>
      </div>
    </main>
  );
}
