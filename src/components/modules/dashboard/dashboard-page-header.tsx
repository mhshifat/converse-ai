import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function DashboardPageHeader({ title, description, action }: DashboardPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          style={{ animation: 'dash-fade-in 0.4s ease-out both' }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground"
            style={{ animation: 'dash-fade-in 0.4s ease-out 0.04s both' }}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link href={action.href} style={{ animation: 'dash-fade-in 0.4s ease-out 0.08s both' }}>
          <Button size="sm" className="gap-2 rounded-xl shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="size-4" />
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
