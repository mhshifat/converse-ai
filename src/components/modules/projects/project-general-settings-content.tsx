'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PROJECT_ICON_KEYS,
  getProjectIcon,
  ProjectIcon,
  type ProjectIconKey,
} from '@/lib/project-icons';
import { cn } from '@/lib/utils';
import { Loader2, Trash2, Upload, X } from 'lucide-react';

interface ProjectGeneralSettingsContentProps {
  projectId: string;
}

export function ProjectGeneralSettingsContent({ projectId }: ProjectGeneralSettingsContentProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading, error } = trpc.projects.getById.useQuery(
    { id: projectId },
    { staleTime: 10_000 }
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<ProjectIconKey>('FolderKanban');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? '');
    const k = project.icon;
    setIcon(
      k && PROJECT_ICON_KEYS.includes(k as ProjectIconKey) ? (k as ProjectIconKey) : 'FolderKanban'
    );
    setLogoUrl(project.logoUrl ?? null);
  }, [project]);

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: async (data) => {
      setServerError(null);
      setCorrelationId(null);
      setName(data.name);
      setDescription(data.description ?? '');
      const k = data.icon;
      setIcon(
        k && PROJECT_ICON_KEYS.includes(k as ProjectIconKey) ? (k as ProjectIconKey) : 'FolderKanban'
      );
      setLogoUrl(data.logoUrl ?? null);
      await utils.projects.getById.invalidate({ id: projectId });
      await utils.projects.list.invalidate();
    },
    onError: (err) => {
      setServerError(err.message);
      setCorrelationId((err as { data?: { correlationId?: string } }).data?.correlationId ?? null);
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: async () => {
      setDeleteOpen(false);
      setDeleteConfirmName('');
      await utils.projects.list.invalidate();
      router.push('/projects');
    },
    onError: (err) => {
      setServerError(err.message);
      setCorrelationId((err as { data?: { correlationId?: string } }).data?.correlationId ?? null);
    },
  });

  const handleSaveProfile = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setServerError('Project name is required.');
      return;
    }
    setServerError(null);
    setCorrelationId(null);
    updateMutation.mutate({
      id: projectId,
      name: trimmed,
      description: description.trim() || null,
      icon,
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
      if (body.url) setLogoUrl(body.url);
    } catch {
      setServerError('Logo upload failed. Check your connection and try again.');
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const deleteNameMatches = project ? deleteConfirmName.trim() === project.name.trim() : false;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading project…
      </div>
    );
  }

  if (error || !project) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load project</AlertTitle>
        <AlertDescription>{error?.message ?? 'Project not found.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {serverError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {serverError}
            {correlationId && (
              <span
                className="ml-2 cursor-pointer text-xs underline underline-offset-2"
                title="Copy correlation ID"
                onClick={() => void navigator.clipboard.writeText(correlationId)}
              >
                (ID: {correlationId})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Project profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Icon, name, and description appear in the sidebar and project list.
        </p>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Icon</Label>
            <p className="text-sm text-muted-foreground">
              Choose a preset or upload a logo (PNG, JPEG, WebP, GIF, or SVG, max 2 MB). A custom logo
              replaces the preset.
            </p>
            <div className="mt-3 space-y-3">
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
                  disabled={uploadingLogo || updateMutation.isPending}
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => setLogoUrl(null)}
                  >
                    <X className="size-4" />
                    Remove logo
                  </Button>
                ) : null}
              </div>
              {logoUrl ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <ProjectIcon logoUrl={logoUrl} iconKey={icon} size={40} className="size-10 rounded-lg" />
                  <span className="text-sm text-muted-foreground">Custom logo in use</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                  <ProjectIcon logoUrl={null} iconKey={icon} size={40} className="size-10 rounded-lg" />
                  <span className="text-sm text-muted-foreground">Preset icon preview</span>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {PROJECT_ICON_KEYS.map((key) => {
                  const Icon = getProjectIcon(key);
                  const selected = icon === key && !logoUrl;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setLogoUrl(null);
                        setIcon(key);
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-settings-name">Project title</Label>
            <Input
              id="project-settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-settings-description">Description</Label>
            <Textarea
              id="project-settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what this project is for"
              rows={3}
              className="resize-y min-h-[80px]"
            />
          </div>

          <Button type="button" onClick={handleSaveProfile} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-destructive">Delete project</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete this project, its chatbots, knowledge, and related data. This cannot be
          undone.
        </p>
        <Separator className="my-4 bg-border/60" />
        <Button
          type="button"
          variant="destructive"
          className="gap-2"
          onClick={() => {
            setDeleteConfirmName('');
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="size-4" />
          Delete project…
        </Button>
      </section>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirmName('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              All chatbots, conversations, knowledge, and settings for{' '}
              <span className="font-medium text-foreground">{project.name}</span> will be removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm-name">Type the project name to confirm</Label>
            <Input
              id="delete-confirm-name"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={project.name}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteNameMatches || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: projectId })}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete project'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
