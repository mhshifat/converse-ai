'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { toastTrpcError } from '@/lib/toast-error';

const SEARCH_DEBOUNCE_MS = 250;

export function ContactsContent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const { data: projects } = trpc.projects.list.useQuery({ pageSize: 100 });
  const { data, isLoading, isError, error, refetch } = trpc.contacts.list.useQuery({
    page,
    pageSize: 20,
    projectId: projectId ?? undefined,
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      refetch();
      toast.success('Contact created');
    },
    onError: (e) => toastTrpcError(e),
  });
  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      setEditId(null);
      refetch();
      toast.success('Contact updated');
    },
    onError: (e) => toastTrpcError(e),
  });
  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Contact deleted');
    },
    onError: (e) => toastTrpcError(e),
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error.message}
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name, email, or external ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={projectId ?? 'all'}
          onValueChange={(v) => setProjectId(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projects?.items ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add contact
        </Button>
      </div>
      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isEmpty ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia>
              <Users className="size-10 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No contacts</EmptyTitle>
            <EmptyDescription>
              Add contacts for CRM-style views. Use external ID to match widget customer_id.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add contact
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>External ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.externalId}</TableCell>
                  <TableCell>{c.name ?? '—'}</TableCell>
                  <TableCell>{c.email ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => setEditId(c.id)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Delete this contact?')) deleteMutation.mutate({ id: c.id });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="p-2 flex justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <CreateContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        projects={projects?.items ?? []}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isPending={createMutation.isPending}
      />
      {editId && (
        <EditContactDialog
          contactId={editId}
          open={!!editId}
          onOpenChange={(open) => !open && setEditId(null)}
          contact={items.find((c) => c.id === editId)}
          onSubmit={(payload) => updateMutation.mutate({ id: editId, ...payload })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateContactDialog({
  open,
  onOpenChange,
  projectId,
  projects,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projects: { id: string; name: string }[];
  onSubmit: (v: {
    projectId: string | null;
    externalId: string;
    name?: string | null;
    email?: string | null;
  }) => void;
  isPending: boolean;
}) {
  const [externalId, setExternalId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId);

  React.useEffect(() => {
    if (open) {
      setExternalId('');
      setName('');
      setEmail('');
      setSelectedProjectId(projectId);
    }
  }, [open, projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalId.trim()) return;
    onSubmit({
      projectId: selectedProjectId,
      externalId: externalId.trim(),
      name: name.trim() || null,
      email: email.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>External ID (e.g. widget customer_id) *</Label>
            <Input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="cv_abc123"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Project (optional)</Label>
            <Select
              value={selectedProjectId ?? 'none'}
              onValueChange={(v) => setSelectedProjectId(v === 'none' ? null : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tenant-wide</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !externalId.trim()}>
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditContactDialog({
  contactId,
  open,
  onOpenChange,
  contact,
  onSubmit,
  isPending,
}: {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: { id: string; externalId: string; name: string | null; email: string | null };
  onSubmit: (v: { name?: string | null; email?: string | null }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');

  React.useEffect(() => {
    if (contact) {
      setName(contact.name ?? '');
      setEmail(contact.email ?? '');
    }
  }, [contact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.trim() || null, email: email.trim() || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
        </DialogHeader>
        {contact && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground font-mono">{contact.externalId}</p>
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
