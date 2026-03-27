'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { ProjectIcon } from '@/lib/project-icons';
import { CreateProjectDialog } from '@/components/modules/projects/create-project-dialog';
import { ConverseLogo } from '@/components/shared/converse-logo';
import { Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

export function PrimarySidebar() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isLoading } = trpc.projects.list.useQuery(
    { pageSize: 50 },
    { staleTime: 60_000 }
  );

  const projectId = React.useMemo(() => {
    const match = pathname.match(/^\/projects\/([a-f0-9-]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-border/60 bg-muted/30 py-4 md:flex"
        aria-label="Projects"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-foreground text-background shadow-sm transition-colors hover:bg-foreground/90"
              aria-label="Converse home"
            >
              <ConverseLogo size={20} className="[&_svg]:text-background" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Converse
          </TooltipContent>
        </Tooltip>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-10 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 mt-2">
            {(data?.items ?? []).map((project) => {
              const isActive = projectId === project.id;
              return (
                <Tooltip key={project.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/projects/${project.id}`}
                      className={cn(
                        'relative flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
                        isActive
                          ? 'border-foreground bg-foreground text-background shadow-md shadow-foreground/20 ring-2 ring-foreground/10 ring-offset-2 ring-offset-muted/30 scale-105'
                          : 'border-border/60 bg-background hover:bg-muted hover:border-border'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={project.name}
                    >
                      {isActive && (
                        <span
                          className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground"
                          aria-hidden
                        />
                      )}
                      <ProjectIcon
                        iconKey={project.icon ?? undefined}
                        logoUrl={project.logoUrl ?? undefined}
                        size={20}
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {project.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-2 flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/contacts"
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl border border-border/60 transition-colors hover:bg-muted',
                  pathname === '/contacts' ? 'bg-muted border-foreground/20' : 'bg-background'
                )}
                aria-label="Contacts"
              >
                <Users className="size-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Contacts
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 rounded-xl border-border/60"
                onClick={() => setCreateOpen(true)}
                aria-label="Create project"
              >
                <Plus className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Create project
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </TooltipProvider>
  );
}
