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
  from: z.string().email().optional(),
  apiKey: z.string().optional(),
  domain: z.string().optional(),
});

const discordConfigSchema = z.object({
  type: z.literal('discord'),
  webhookUrl: z.string().url('Valid URL required'),
});

const smsConfigSchema = z.object({
  type: z.literal('sms'),
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  from: z.string().optional(),
});

export function CreateIntegrationForm() {
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
      from: '',
      apiKey: '',
      domain: '',
      accountSid: '',
      authToken: '',
    },
  });

  const create = trpc.integrations.create.useMutation({
    onSuccess: () => {
      router.push('/dashboard/integrations');
    },
    onError: (err) => setServerError(err.message),
  });

  const onSubmit = form.handleSubmit((data) => {
    setServerError(null);
    if (type === 'email') {
      create.mutate({
        type: 'email',
        config: {
          from: data.from || undefined,
          apiKey: data.apiKey || undefined,
          domain: data.domain || undefined,
        },
      });
    } else if (type === 'discord') {
      create.mutate({
        type: 'discord',
        config: { webhookUrl: data.webhookUrl },
      });
    } else {
      create.mutate({
        type: 'sms',
        config: {
          accountSid: data.accountSid || undefined,
          authToken: data.authToken || undefined,
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
          <>
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="noreply@example.com" {...field} />
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
                  <FormLabel>Domain (e.g. for Mailgun)</FormLabel>
                  <FormControl>
                    <Input placeholder="mg.example.com" {...field} />
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
                  <FormLabel>API key (store securely)</FormLabel>
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
                  <FormLabel>Account SID (Twilio)</FormLabel>
                  <FormControl>
                    <Input placeholder="AC..." {...field} />
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
                  <FormLabel>Auth token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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
