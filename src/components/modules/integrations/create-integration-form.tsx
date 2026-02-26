'use client';

import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const typeSchema = z.enum(['email', 'discord', 'sms']);

const emailConfigSchema = z.object({
  type: z.literal('email'),
});

const discordConfigSchema = z.object({
  type: z.literal('discord'),
  webhookUrl: z.string().url('Valid URL required'),
});

const smsConfigSchema = z.object({
  type: z.literal('sms'),
  to: z.string().optional(),
  from: z.string().optional(),
});

interface CreateIntegrationFormProps {
  /** Redirect here after creating (e.g. /projects/123/integrations). If not set, redirects to /integrations */
  returnTo?: string;
}

export function CreateIntegrationForm({ returnTo }: CreateIntegrationFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [type, setType] = useState<'email' | 'discord' | 'sms'>('discord');

  const form = useForm({
    resolver: zodResolver(
      type === 'email'
        ? emailConfigSchema
        : type === 'discord'
          ? discordConfigSchema
          : smsConfigSchema
    ),
    defaultValues: {
      type: 'discord' as const,
      webhookUrl: '',
      to: '',
      from: '',
    },
  });

  const create = trpc.integrations.create.useMutation({
    onSuccess: () => {
      router.push(returnTo ?? '/integrations');
    },
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = form.handleSubmit((data) => {
    setServerError(null);
    if (type === 'email') {
      create.mutate({ type: 'email', config: {} });
    } else if (type === 'discord') {
      create.mutate({
        type: 'discord',
        config: { webhookUrl: data.webhookUrl },
      });
    } else {
      create.mutate({
        type: 'sms',
        config: {
          to: data.to || undefined,
          from: data.from || undefined,
        },
      });
    }
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
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setType(v as 'email' | 'discord' | 'sms');
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
          <p className="text-muted-foreground text-sm">
            Email sending uses system configuration (SMTP via env). Add this integration to enable
            email delivery for a project. Recipients and sender are configured in your environment.
          </p>
        )}
        {type === 'sms' && (
          <>
            <p className="text-muted-foreground text-sm">
              SMS sending uses system configuration (e.g. Twilio via env). Add this integration to
              enable delivery for a project; optionally set the destination number.
            </p>
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Send to (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
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
                  <FormLabel>From number (optional override)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting || create.isPending}>
          {create.isPending ? 'Adding…' : 'Add integration'}
        </Button>
      </form>
    </Form>
  );
}
