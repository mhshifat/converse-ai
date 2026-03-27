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
import { PROJECT_ICON_KEYS, getProjectIcon, ProjectIcon, type ProjectIconKey } from '@/lib/project-icons';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional().nullable(),
  logoUrl: z.union([z.string().url(), z.null()]).optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateProjectFormProps {
  onSuccess?: () => void;
}

export function CreateProjectForm({ onSuccess }: CreateProjectFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [correlationId, setCorrelationId] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'FolderKanban' as ProjectIconKey,
      logoUrl: null,
    },
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
    const logoUrl = form.getValues('logoUrl') ?? null;
    create.mutate({
      name: data.name,
      description: data.description ?? undefined,
      icon: data.icon ?? undefined,
      logoUrl,
    });
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file || file.size === 0) return;
    setServerError(null);
    setCorrelationId(null);
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setServerError(body.error ?? 'Logo upload failed');
        return;
      }
      if (body.url) form.setValue('logoUrl', body.url);
    } catch {
      setServerError('Logo upload failed. Check your connection and try again.');
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
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
              <p className="text-muted-foreground text-sm mb-2">
                Pick a preset or upload your own logo (PNG, JPEG, WebP, GIF, or SVG, max 2 MB). A custom
                logo replaces the preset in the sidebar and project list.
              </p>
              <FormControl>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      className="sr-only"
                      aria-hidden
                      onChange={(e) => void handleLogoFile(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={uploadingLogo || create.isPending}
                      onClick={() => logoFileInputRef.current?.click()}
                    >
                      <Upload className="size-4" />
                      {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                    </Button>
                    {form.watch('logoUrl') ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground"
                        onClick={() => form.setValue('logoUrl', null)}
                      >
                        <X className="size-4" />
                        Remove logo
                      </Button>
                    ) : null}
                  </div>
                  {form.watch('logoUrl') ? (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <ProjectIcon
                        logoUrl={form.watch('logoUrl')}
                        iconKey={field.value}
                        size={40}
                        className="size-10 rounded-lg"
                      />
                      <span className="text-sm text-muted-foreground">Custom logo selected</span>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {PROJECT_ICON_KEYS.map((key) => {
                      const Icon = getProjectIcon(key);
                      const selected =
                        field.value === key && !form.watch('logoUrl');
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            form.setValue('logoUrl', null);
                            field.onChange(key);
                          }}
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
