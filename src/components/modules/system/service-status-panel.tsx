'use client';

import React from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ServiceDependencyCheck } from '@/lib/dependency-health-checks';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Radio,
} from 'lucide-react';

type Variant = 'card' | 'inline';

function formatCheckedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function rowSummary(s: ServiceDependencyCheck): { label: string; tone: 'ok' | 'warn' | 'err' } {
  if (!s.configured) return { label: 'Not configured', tone: 'warn' };
  if (s.ok) return { label: `${s.latencyMs} ms`, tone: 'ok' };
  return { label: 'Unreachable', tone: 'err' };
}

function ServiceRowBody({ service }: { service: ServiceDependencyCheck }) {
  if (!service.configured) {
    return (
      <div className="flex flex-wrap items-start gap-2 mt-1">
        <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
        <p className="text-sm text-muted-foreground wrap-break-word">{service.message}</p>
      </div>
    );
  }
  if (service.ok) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-sm text-muted-foreground">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
        <span>Operational</span>
        <span>· {service.latencyMs} ms</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-2 mt-1">
      <XCircle className="size-3.5 shrink-0 text-destructive mt-0.5" />
      <p className="text-sm text-muted-foreground wrap-break-word">
        {service.httpStatus != null ? `HTTP ${service.httpStatus}: ` : ''}
        {service.error}
      </p>
    </div>
  );
}

function ServiceRowInline({ service }: { service: ServiceDependencyCheck }) {
  const { label, tone } = rowSummary(service);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/40 last:border-0 pb-2 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{service.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
      </div>
      <span
        className={cn(
          'text-xs font-medium shrink-0 tabular-nums',
          tone === 'ok' && 'text-emerald-600 dark:text-emerald-500',
          tone === 'warn' && 'text-amber-700 dark:text-amber-500',
          tone === 'err' && 'text-destructive'
        )}
      >
        {label}
      </span>
    </div>
  );
}

interface ServiceStatusPanelProps {
  variant?: Variant;
  className?: string;
}

export function ServiceStatusPanel({ variant = 'card', className }: ServiceStatusPanelProps) {
  const { data, isLoading, isFetching, refetch } = trpc.system.dependenciesStatus.useQuery(undefined, {
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const inline = variant === 'inline';
  const services = data?.services ?? [];
  const operationalCount = services.filter((s) => s.configured && s.ok).length;
  const total = services.length;

  const footer = data?.summaryCheckedAt ? (
    <p className="text-xs text-muted-foreground mt-3">
      Last checked {formatCheckedAt(data.summaryCheckedAt)}
      {isFetching && !isLoading ? ' · refreshing…' : ''}
    </p>
  ) : null;

  const loadingBlock = (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
      <Loader2 className="size-4 shrink-0 animate-spin" />
      Checking services…
    </div>
  );

  if (inline) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/80 bg-card/60 px-4 py-3',
          className
        )}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Radio className="size-4 shrink-0 text-muted-foreground mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">Service status</p>
              {!isLoading && data ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {operationalCount}/{total} operational · checks run from this app
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Checks run from this app (not your browser).</p>
              )}
            </div>
            {isLoading && !data ? loadingBlock : null}
            {!isLoading && data ? (
              <div className="space-y-2 pt-1">
                {services.map((s) => (
                  <ServiceRowInline key={s.id} service={s} />
                ))}
              </div>
            ) : null}
            {!isLoading && !data ? (
              <p className="text-sm text-muted-foreground">Status unavailable.</p>
            ) : null}
            {footer}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card p-5 space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Service status</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            External dependencies for this deployment. Checks run from your app server (not the browser).
          </p>
          {!isLoading && data ? (
            <p className="text-xs text-muted-foreground mt-1.5">
              {operationalCount}/{total} operational
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          Check now
        </Button>
      </div>

      {isLoading && !data ? loadingBlock : null}
      {!isLoading && !data ? <p className="text-sm text-muted-foreground">Status unavailable.</p> : null}

      {!isLoading && data ? (
        <div className="rounded-md border border-border/60 bg-muted/30 divide-y divide-border/50">
          {services.map((service) => (
            <div key={service.id} className="px-4 py-3 space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {service.name}
              </p>
              <p className="text-xs text-muted-foreground">{service.description}</p>
              <ServiceRowBody service={service} />
            </div>
          ))}
        </div>
      ) : null}

      {footer}
    </div>
  );
}
