'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { ConverseLogo } from '@/components/shared/converse-logo';
import { LogoutButton } from '@/components/shared/logout-button';
import {
  FolderKanban,
  Bot,
  Plug,
  LayoutDashboard,
  LogOut,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardBackground } from './dashboard-bg';

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/agents', label: 'Agents', icon: Bot },
] as const;

const configNav = [
  { href: '/integrations', label: 'Integrations', icon: Plug },
] as const;

interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
}

function getInitials(email: string): string {
  return email.split('@')[0]?.slice(0, 2).toUpperCase() ?? '??';
}

export function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);
  }

  function renderNavItem(item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={active}>
          <Link
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150',
              active
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className={cn('size-[18px] shrink-0', active ? 'text-foreground' : 'text-muted-foreground/80')} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        {/* ── Logo ── */}
        <SidebarHeader className="px-5 pt-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group/logo">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <ConverseLogo size={20} className="[&_svg]:text-background" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Converse
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 pt-1">
          {/* ── Main section ── */}
          <SidebarGroup>
            <SidebarGroupLabel className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Main
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {mainNav.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* ── Configuration section ── */}
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Configuration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {configNav.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter className="p-4">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background"
              aria-hidden
            >
              {getInitials(userEmail)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground" title={userEmail}>
                {userEmail}
              </p>
            </div>
            <LogoutButton className="size-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="size-4" />
            </LogoutButton>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-6 backdrop-blur-lg">
          <SidebarTrigger className="-ml-1.5 size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="size-3.5" />
            <span>Search…</span>
            <kbd className="ml-6 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 shadow-sm border border-border/60">
              ⌘K
            </kbd>
          </div>
        </header>

        {/* ── Main content ── */}
        <div className="relative min-h-0 flex-1 overflow-auto dash-content-bg">
          <DashboardBackground />
          <div className="relative z-10">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
