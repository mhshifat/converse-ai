'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { toastTrpcError } from '@/lib/toast-error';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { BookOpen, FileUp, Plus, Trash2, Link as LinkIcon, Globe, RefreshCw, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ProjectKnowledgeContentProps {
  projectId: string;
}

type ViewEntry = { id: string; title: string | null; content: string };

export function ProjectKnowledgeContent({ projectId }: ProjectKnowledgeContentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<ViewEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: items, isLoading } = trpc.projectKnowledge.list.useQuery({ projectId });
  const { data: currentUrl } = trpc.projectKnowledge.getExternalUrl.useQuery({ projectId });

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => void utils.projects.getById.invalidate({ id: projectId }),
  });
  const reindexRagMutation = trpc.projectKnowledge.reindexRag.useMutation({
    onSuccess: (data) => {
      if (data.ragUnavailable) {
        toast.info(
          'RAG is not available in this environment (pgvector / knowledge_chunk table is required). Use Neon or install pgvector locally.'
        );
      } else {
        toast.success(`RAG reindexed. ${data.chunksCreated} chunks created.`);
      }
    },
    onError: (err) => toastTrpcError(err),
  });

  useEffect(() => {
    if (currentUrl !== undefined) setExternalUrl(currentUrl ?? '');
  }, [currentUrl]);

  const addMutation = trpc.projectKnowledge.add.useMutation({
    onSuccess: () => {
      utils.projectKnowledge.list.invalidate({ projectId });
      setTitle('');
      setContent('');
      setDialogOpen(false);
    },
  });
  const removeMutation = trpc.projectKnowledge.remove.useMutation({
    onSuccess: () => utils.projectKnowledge.list.invalidate({ projectId }),
  });
  const reIngestMutation = trpc.projectKnowledge.reIngest.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Re-ingested successfully');
        utils.projectKnowledge.list.invalidate({ projectId });
      }
    },
    onError: (err) => toastTrpcError(err),
  });
  const setUrlMutation = trpc.projectKnowledge.setExternalUrl.useMutation({
    onSuccess: () => {
      utils.projectKnowledge.getExternalUrl.invalidate({ projectId });
    },
  });

  const handleAdd = () => {
    if (!content.trim()) return;
    addMutation.mutate({ projectId, title: title.trim() || undefined, content: content.trim() });
  };

  const handleSaveUrl = () => {
    setUrlMutation.mutate({ projectId, url: externalUrl.trim() || null });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngesting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/projects/${projectId}/knowledge/ingest`, {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as { success?: boolean; error?: string; entriesCreated?: number };
      if (!res.ok) {
        toast.error(data.error ?? 'Import failed');
        return;
      }
      if (data.success) {
        toast.success(`Imported "${file.name}". 1 knowledge entry added.`);
        utils.projectKnowledge.list.invalidate({ projectId });
      } else {
        toast.error(data.error ?? 'Import failed');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setIngesting(false);
      e.target.value = '';
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return;
    setIngesting(true);
    try {
      const form = new FormData();
      form.append('url', importUrl.trim());
      const res = await fetch(`/api/projects/${projectId}/knowledge/ingest`, {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as { success?: boolean; error?: string; entriesCreated?: number };
      if (!res.ok) {
        toast.error(data.error ?? 'Import failed');
        return;
      }
      if (data.success) {
        toast.success(`Imported from website. 1 knowledge entry added.`);
        setImportUrl('');
        utils.projectKnowledge.list.invalidate({ projectId });
      } else {
        toast.error(data.error ?? 'Import failed');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setIngesting(false);
    }
  };

  const isEmpty = !isLoading && (!items || items.length === 0) && !currentUrl;

  return (
    <div className="space-y-8">
      {/* RAG / vector search */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="size-4" />
          Vector search (RAG)
        </h3>
        <p className="text-muted-foreground text-sm max-w-2xl mb-4">
          When enabled, the agent uses Groq embeddings to find only the most relevant knowledge chunks for each message instead of loading all entries. Best for large knowledge bases.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="use-rag"
              checked={project?.useRag ?? false}
              onCheckedChange={(checked) => {
                updateProjectMutation.mutate({ id: projectId, useRag: checked });
              }}
              disabled={updateProjectMutation.isPending}
            />
            <Label htmlFor="use-rag" className="cursor-pointer">Use RAG / vector search</Label>
          </div>
          {(project?.useRag ?? false) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reindexRagMutation.mutate({ projectId })}
              disabled={reindexRagMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={reindexRagMutation.isPending ? 'size-4 animate-spin' : 'size-4'} />
              {reindexRagMutation.isPending ? 'Reindexing…' : 'Reindex all for RAG'}
            </Button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-foreground mb-2">How knowledge is used</h2>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Everything you add here is injected into the agent&apos;s context when a customer chats or
          calls. The agent will use this data to answer questions—FAQs, product info, policies, etc.
          You can add entries manually, import from PDF/DOCX/Excel/CSV/TXT/HTML or a website URL, or point
          to an external API URL that returns JSON or plain text at reply time.
        </p>
      </div>

      {/* Import from file or website */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <FileUp className="size-4" />
          Import from file or website
        </h3>
        <p className="text-muted-foreground text-xs mb-4">
          Upload a PDF, Word doc, Excel, CSV, TXT, or HTML file—or paste a webpage URL. Text will be extracted
          and added as a knowledge entry (max 15 MB per file).
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.html,.htm"
              className="hidden"
              onChange={handleImportFile}
              disabled={ingesting}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={ingesting}
              className="gap-2"
            >
              <FileUp className="size-4" />
              {ingesting ? 'Importing…' : 'Upload file'}
            </Button>
          </div>
          <div className="flex-1 min-w-[200px] flex gap-2">
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="font-mono text-sm"
              disabled={ingesting}
            />
            <Button
              variant="outline"
              onClick={handleImportFromUrl}
              disabled={ingesting || !importUrl.trim()}
              className="gap-2 shrink-0"
            >
              <Globe className="size-4" />
              Import from URL
            </Button>
          </div>
        </div>
      </div>

      {/* External knowledge URL */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <LinkIcon className="size-4" />
          External knowledge URL
        </h3>
        <p className="text-muted-foreground text-xs mb-3">
          Optional. GET this URL at reply time; response is injected as context. Use JSON array of{' '}
          <code className="rounded bg-muted px-1">{`{ "content": "..." }`}</code> or plain text.
        </p>
        <div className="flex gap-2">
          <Input
            value={externalUrl || (currentUrl ?? '')}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://api.example.com/knowledge"
            className="font-mono text-sm"
          />
          <Button
            variant="secondary"
            onClick={handleSaveUrl}
            disabled={
              setUrlMutation.isPending ||
              (externalUrl || '') === (currentUrl ?? '')
            }
          >
            {setUrlMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Knowledge entries from database */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">Knowledge entries</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Add entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add knowledge</DialogTitle>
                <DialogDescription>
                  This text will be available to the agent when answering customers (e.g. FAQ,
                  product description).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 min-h-0 overflow-y-auto">
                <div>
                  <Label>Title (optional)</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Shipping policy"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste or type the content the agent should use when answering..."
                    rows={6}
                    className="mt-1 min-h-[120px] max-h-[40vh] resize-y overflow-y-auto"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!content.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? 'Adding…' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
            <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
          </div>
        ) : !items?.length && !currentUrl ? (
          <Empty className="rounded-xl border border-dashed border-border/60 bg-muted/10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen className="text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No knowledge yet</EmptyTitle>
              <EmptyDescription>
                Add entries or an external URL so the agent can answer using your data.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Add entry
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
          <div className="space-y-3">
            {items?.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/50 bg-card p-4 flex flex-wrap items-start justify-between gap-4"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg -m-1 p-1"
                  onClick={() => setViewEntry({ id: item.id, title: item.title, content: item.content })}
                >
                  {item.title && (
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                  )}
                  <p className="text-muted-foreground text-sm mt-0.5 line-clamp-3">
                    {item.content}
                  </p>
                  {(item.sourceType === 'url' || item.sourceType === 'file') && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Source: {item.sourceType === 'url' ? 'URL' : 'File'}
                      {item.sourceRef && ` · ${item.sourceRef}`}
                    </p>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {item.sourceType === 'url' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        reIngestMutation.mutate({ projectId, id: item.id });
                      }}
                      disabled={reIngestMutation.isPending}
                      title="Re-fetch URL and update content"
                    >
                      <RefreshCw className={reIngestMutation.isPending ? 'size-4 animate-spin' : 'size-4'} />
                    </Button>
                  )}
                  {item.sourceType === 'file' && (
                    <span
                      className="text-muted-foreground text-xs px-2"
                      title="Re-upload the file to refresh"
                    >
                      Re-upload to refresh
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMutation.mutate({ projectId, id: item.id });
                    }}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={!!viewEntry} onOpenChange={(open) => !open && setViewEntry(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="pr-8">
                  {viewEntry?.title ?? 'Knowledge entry'}
                </DialogTitle>
                <DialogDescription>
                  Full content of this knowledge entry. The agent uses this when answering.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                  {viewEntry?.content ?? ''}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
