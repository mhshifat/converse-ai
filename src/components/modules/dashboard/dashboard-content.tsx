'use client';

import React from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardOverviewCards } from './dashboard-overview-cards';
import { Plus, FolderPlus, MessageSquare, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardContent() {
  const { data, isLoading } = trpc.projects.list.useQuery(
    { page: 1, pageSize: 1 },
    { staleTime: 30_000 }
  );

  const projectCount = data?.total ?? 0;
  const hasProjects = projectCount > 0;

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="h-32 w-full max-w-xl rounded-2xl bg-muted/30" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {!hasProjects ? (
        /* Onboarding: no projects yet */
        <>
          <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-b from-primary/12 via-primary/6 to-transparent px-5 pb-12 pt-8 sm:px-6 md:px-8 md:pt-10 lg:px-10">
            <div className="relative">
              <p className="text-sm font-medium text-primary">Get started</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Create your first project
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                Everything in Converse lives in a project: your chatbot, agents, integrations, and analytics. Create a project to add a chatbot and embed it on your site.
              </p>

              {/* Steps */}
              <ol className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    step: 1,
                    icon: FolderPlus,
                    title: 'Create a project',
                    desc: 'Give it a name and optional description.',
                  },
                  {
                    step: 2,
                    icon: MessageSquare,
                    title: 'Add a chatbot',
                    desc: 'Customize design, welcome message, and embed code.',
                  },
                  {
                    step: 3,
                    icon: Code2,
                    title: 'Embed on your site',
                    desc: 'Copy the snippet and add it to your website.',
                  },
                ].map(({ step, icon: Icon, title, desc }) => (
                  <li
                    key={step}
                    className={cn(
                      'flex gap-4 rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm',
                      'transition-shadow hover:shadow-md'
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Step {step}</span>
                      <p className="mt-0.5 font-semibold text-foreground">{title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-10">
                <Link href="/projects/new">
                  <Button
                    size="lg"
                    className="gap-2 rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                  >
                    <Plus className="size-5" />
                    Create your first project
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Still show quick links below for context */}
          <div className="px-5 pt-8 sm:px-6 md:px-8 lg:px-10">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              From a project you can manage
            </p>
            <DashboardOverviewCards variant="compact" firstProjectId={null} />
          </div>
        </>
      ) : (
        /* Has projects: welcome back + dashboard */
        <>
          <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-b from-primary/8 via-primary/4 to-transparent px-5 pb-10 pt-8 sm:px-6 sm:pb-12 md:px-8 md:pt-10 lg:px-10">
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
                <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Dashboard
                </h1>
                <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                  Manage your projects, agents, and integrations. Most things live inside a project—open one to get started.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You have {projectCount} project{projectCount !== 1 ? 's' : ''}.
                </p>
              </div>
              <Link href="/projects/new" className="shrink-0">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                >
                  <Plus className="size-5" />
                  New project
                </Button>
              </Link>
            </div>
          </div>

          <div className="px-5 -mt-2 pb-10 sm:px-6 md:px-8 lg:px-10">
            <DashboardOverviewCards firstProjectId={data?.items?.[0]?.id ?? null} />
          </div>
        </>
      )}
    </div>
  );
}
