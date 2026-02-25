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
import { PROJECT_ICON_KEYS, getProjectIcon, type ProjectIconKey } from '@/lib/project-icons';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface CreateProjectFormProps {
  onSuccess?: () => void;
}

export function CreateProjectForm({ onSuccess }: CreateProjectFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [correlationId, setCorrelationId] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', icon: 'FolderKanban' as ProjectIconKey },
  });

  const utils = trpc.useUtils();
  const create = trpc.projects.create.useMutation({
    onSuccess: async (data) => {
      await utils.projects.list.invalidate();
      onSuccess?.();
      router.push(`/projects/${data.id}`);
    },
    onError: (err) => {
      setServerError(err.message);
      setCorrelationId(err.data?.correlationId ?? null);
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    setCorrelationId(null);
    create.mutate({
      name: data.name,
      description: data.description ?? undefined,
      icon: data.icon ?? undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {serverError}
              {correlationId && (
                <span
                  className="ml-2 text-xs cursor-pointer"
                  title="Copy correlation ID"
                  onClick={() => navigator.clipboard.writeText(correlationId)}
                >
                  (ID: {correlationId})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Hospital Website" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {PROJECT_ICON_KEYS.map((key) => {
                    const Icon = getProjectIcon(key);
                    const selected = field.value === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => field.onChange(key)}
                        className={cn(
                          'flex size-10 items-center justify-center rounded-lg border transition-colors',
                          selected
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-muted/50 hover:bg-muted'
                        )}
                        title={key}
                      >
                        <Icon className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of this project"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting || create.isPending}>
          {create.isPending ? 'Creating…' : 'Create project'}
        </Button>
      </form>
    </Form>
  );
}
