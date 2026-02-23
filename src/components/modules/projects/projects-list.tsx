'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { FolderKanban } from 'lucide-react';

export function ProjectsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = trpc.projects.list.useQuery({
    page,
    pageSize: 10,
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error.message}
      </div>
    );
  }

  const isEmpty = !data?.items?.length;
  const totalPages = data?.totalPages ?? 1;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
      </div>
      {isEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <FolderKanban className="h-12 w-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to add a chatbot and customize its design.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/dashboard/projects/new">
              <Button>Create project</Button>
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Chatbots</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {p.description ?? '—'}
                  </TableCell>
                  <TableCell>{p.chatbotCount}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/projects/${p.id}`}>
                      <Button variant="outline" size="sm">
                        Open
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="p-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPrev) setPage((p) => p - 1);
                      }}
                      aria-disabled={!hasPrev}
                      className={!hasPrev ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-2 text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasNext) setPage((p) => p + 1);
                      }}
                      aria-disabled={!hasNext}
                      className={!hasNext ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
