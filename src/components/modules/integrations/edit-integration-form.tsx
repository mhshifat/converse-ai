'use client';

import React from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const discordSchema = z.object({ webhookUrl: z.string().url() });
const emailSchema = z.object({
  from: z.string().email().optional(),
  domain: z.string().optional(),
  apiKey: z.string().optional(),
});
const smsSchema = z.object({
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  from: z.string().optional(),
});

interface EditIntegrationFormProps {
  integrationId: string;
  type: 'email' | 'discord' | 'sms';
  defaultConfig: Record<string, unknown>;
  onDeleted?: () => void;
}

export function EditIntegrationForm({
  integrationId,
  type,
  defaultConfig,
  onDeleted,
}: EditIntegrationFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const schema =
    type === 'discord'
      ? discordSchema
      : type === 'email'
        ? emailSchema
        : smsSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      webhookUrl: (defaultConfig.webhookUrl as string) ?? '',
      from: (defaultConfig.from as string) ?? '',
      domain: (defaultConfig.domain as string) ?? '',
      apiKey: '',
      accountSid: (defaultConfig.accountSid as string) ?? '',
      authToken: '',
      ...defaultConfig,
    },
  });

  const update = trpc.integrations.update.useMutation({
    onSuccess: () => {
      trpc.useUtils().integrations.list.invalidate();
    },
    onError: (err) => setServerError(err.message),
  });

  const deleteMutation = trpc.integrations.delete.useMutation({
    onSuccess: () => onDeleted?.(),
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = form.handleSubmit((data) => {
    setServerError(null);
    const config: Record<string, unknown> =
      type === 'discord'
        ? { webhookUrl: data.webhookUrl }
        : type === 'email'
          ? { from: data.from, domain: data.domain, apiKey: data.apiKey || undefined }
          : {
              accountSid: data.accountSid,
              authToken: data.authToken || undefined,
              from: data.from,
            };
    update.mutate({ id: integrationId, config });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        {type === 'discord' && (
          <FormField
            control={form.control}
            name="webhookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://discord.com/api/webhooks/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {type === 'email' && (
          <>
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API key (leave blank to keep existing)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        {type === 'sms' && (
          <>
            <FormField
              control={form.control}
              name="accountSid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account SID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth token (leave blank to keep existing)</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete integration?</AlertDialogTitle>
                <AlertDialogDescription>
                  Projects using this integration will no longer send data here.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate({ id: integrationId })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </Form>
  );
}
