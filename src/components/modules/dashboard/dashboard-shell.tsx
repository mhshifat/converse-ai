'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PrimarySidebar } from '@/components/modules/dashboard/primary-sidebar';
import { ProjectIcon } from '@/lib/project-icons';
import { trpc } from '@/utils/trpc';
import {
  Bot,
  BookOpen,
  Plug,
  LogOut,
  Search,
  Home,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardBackground } from './dashboard-bg';


interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
}

function getInitials(email: string): string {
  return email.split('@')[0]?.slice(0, 2).toUpperCase() ?? '??';
}

export function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => router.push('/login'),
  });

  const userBlock = (
    <div className="flex w-full items-center gap-2.5 rounded-full border border-border/70 bg-muted/50 px-1.5 py-1.5 shadow-sm transition-colors hover:bg-muted/70">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-medium text-white dark:bg-neutral-600"
        aria-hidden
      >
        {getInitials(userEmail)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground max-w-[100px] text-ellipsis overflow-hidden whitespace-nowrap" title={userEmail}>
        {userEmail}
      </span>
      <ChevronDown className="size-4 shrink-0 text-foreground/70" />
    </div>
  );

  const projectId = React.useMemo(() => {
    const m = pathname.match(/^\/projects\/([a-f0-9-]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const { data: currentProject } = trpc.projects.getById.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href.startsWith('/projects/') && projectId) {
      const exactProjectRoot = `/projects/${projectId}`;
      if (href === exactProjectRoot) return pathname === exactProjectRoot || pathname === `${exactProjectRoot}/`;
      return pathname.startsWith(href);
    }
    return pathname.startsWith(href);
  }

  const projectSubNav = projectId
    ? [
        { href: `/projects/${projectId}`, label: 'Overview', icon: Home },
        { href: `/projects/${projectId}/agents`, label: 'Agents', icon: Bot },
        { href: `/projects/${projectId}/knowledge`, label: 'Knowledge', icon: BookOpen },
        { href: `/projects/${projectId}/integrations`, label: 'Integrations', icon: Plug },
      ]
    : null;

  const mainContent = (
    <>
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-6 backdrop-blur-lg">
        {projectId ? (
          <SidebarTrigger className="-ml-1.5 size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
        ) : null}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
          <Search className="size-3.5" />
          <span>Search...</span>
          <kbd className="ml-6 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 shadow-sm border border-border/60">
            ⌘K
          </kbd>
        </div>
        <div className="ml-auto flex w-auto items-center self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="w-full shrink-0 text-left outline-none rounded-full [&>div]:h-auto">
                {userBlock}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut className="size-4" />
                {logout.isPending ? 'Logging out…' : 'Log out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-auto dash-content-bg">
        <DashboardBackground />
        <div className="relative z-10">{children}</div>
      </div>
    </>
  );

  return (
    <div className="dashboard-with-primary-sidebar flex min-h-svh w-full">
      <PrimarySidebar />
      {projectId ? (
        <SidebarProvider className="md:ml-16 flex-1 min-w-0">
          <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="px-5 pt-6 pb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 group/header outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm">
                      <ProjectIcon iconKey={currentProject?.icon ?? undefined} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
                        {currentProject?.name ?? 'Project'}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">Converse</span>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground opacity-60 group-hover/header:opacity-100" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px]" sideOffset={4}>
                  <DropdownMenuItem asChild>
                    <Link href={`/projects/${projectId}`} className="flex cursor-pointer items-center gap-2">
                      <Home className="size-4" />
                      Overview
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/projects" className="flex cursor-pointer items-center gap-2">
                      <ArrowLeft className="size-4" />
                      All projects
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarHeader>
            <SidebarContent className="px-3 pt-1">
              <SidebarGroup>
                <SidebarGroupLabel className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {currentProject ? currentProject.name : 'Project'}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    <SidebarMenuItem className="border-t border-border/50 pt-2 mt-1">
                      <SidebarMenuButton asChild>
                        <Link
                          href="/projects"
                          className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border/50"
                        >
                          <ArrowLeft className="size-[18px] shrink-0" />
                          <span>All projects</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {projectSubNav?.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={active}>
                            <Link
                              href={item.href}
                              className={cn(
                                'relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                                active
                                  ? 'bg-foreground! text-background! shadow-sm data-[active=true]:bg-foreground! data-[active=true]:text-background!'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'size-[18px] shrink-0',
                                  active ? 'opacity-100' : 'text-muted-foreground'
                                )}
                                style={active ? { color: 'hsl(var(--background))' } : undefined}
                              />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>{mainContent}</SidebarInset>
        </SidebarProvider>
      ) : (
        <main className="md:ml-16 flex-1 min-w-0 flex flex-col">
          {mainContent}
        </main>
      )}
    </div>
  );
}
