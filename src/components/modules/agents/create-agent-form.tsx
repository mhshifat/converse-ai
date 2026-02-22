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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
});

type FormData = z.infer<typeof schema>;

export function CreateAgentForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', systemPrompt: '' },
  });

  const create = trpc.agents.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/agents/${data.id}`);
    },
    onError: (err) => {
      setServerError(err.message);
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    create.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Support Agent" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="You are a helpful assistant for..."
                  className="resize-none min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create agent'}
        </Button>
      </form>
    </Form>
  );
}
