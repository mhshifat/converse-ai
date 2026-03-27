'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import Link from 'next/link';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { FolderKanban, Search, MessageSquare, ArrowRight } from 'lucide-react';
import { ProjectIcon } from '@/lib/project-icons';
import { cn } from '@/lib/utils';

const SEARCH_DEBOUNCE_MS = 250;

export function ProjectsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, isError, error } = trpc.projects.list.useQuery({
    page,
    pageSize: 10,
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Skeleton className="h-11 w-full max-w-md rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        {error.message}
      </div>
    );
  }

  const isEmpty = !data?.items?.length;
  const totalPages = data?.totalPages ?? 1;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-xl border-border/80 bg-muted/30 pl-10 pr-4 transition-colors focus:bg-background"
        />
      </div>

      {isEmpty ? (
        <Empty className="rounded-2xl border border-dashed bg-muted/20 py-16">
          <EmptyHeader>
            <EmptyMedia>
              <FolderKanban className="size-14 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to add a chatbot and customize its design.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/projects/new">
              <Button size="lg" className="rounded-xl">
                Create project
              </Button>
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={cn(
                  'group relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm',
                  'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-xl',
                      'bg-primary/10 text-primary transition-colors group-hover:bg-primary/15'
                    )}
                  >
                    <ProjectIcon
                      iconKey={p.icon ?? undefined}
                      logoUrl={p.logoUrl ?? undefined}
                      className="size-6"
                      size={24}
                    />
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      'bg-muted/80 text-muted-foreground'
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                    {p.chatbotCount}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-foreground line-clamp-1 group-hover:text-primary">
                  {p.name}
                </h3>
                <p className="mt-1 min-h-10 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {p.description?.trim() || 'No description'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                  <span>Open</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center pt-4">
              <Pagination>
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasPrev) setPage((p) => p - 1);
                      }}
                      aria-disabled={!hasPrev}
                      className={cn(
                        'rounded-lg',
                        !hasPrev && 'pointer-events-none opacity-50'
                      )}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-3 text-sm text-muted-foreground">
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
                      className={cn(
                        'rounded-lg',
                        !hasNext && 'pointer-events-none opacity-50'
                      )}
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
