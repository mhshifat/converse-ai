import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ProjectNotFound() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Background decorative SVGs */}
      <svg
        className="pnf-float-slow pointer-events-none absolute -left-12 -top-8 opacity-[0.06]"
        width="320"
        height="320"
        viewBox="0 0 320 320"
        fill="none"
        aria-hidden
      >
        <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="8 6" />
        <circle cx="160" cy="160" r="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" />
        <circle cx="160" cy="160" r="60" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg
        className="pnf-float-reverse pointer-events-none absolute -bottom-10 -right-16 opacity-[0.05]"
        width="400"
        height="400"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden
      >
        <rect x="50" y="50" width="300" height="300" rx="24" stroke="currentColor" strokeWidth="1" strokeDasharray="12 8" />
        <rect x="100" y="100" width="200" height="200" rx="16" stroke="currentColor" strokeWidth="0.5" strokeDasharray="6 10" />
        <line x1="50" y1="200" x2="350" y2="200" stroke="currentColor" strokeWidth="0.3" strokeDasharray="4 6" />
        <line x1="200" y1="50" x2="200" y2="350" stroke="currentColor" strokeWidth="0.3" strokeDasharray="4 6" />
      </svg>
      <svg
        className="pnf-drift pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 opacity-[0.04]"
        width="240"
        height="240"
        viewBox="0 0 240 240"
        fill="none"
        aria-hidden
      >
        <polygon points="120,20 220,190 20,190" stroke="currentColor" strokeWidth="0.8" fill="none" strokeDasharray="6 4" />
        <polygon points="120,60 180,170 60,170" stroke="currentColor" strokeWidth="0.5" fill="none" />
      </svg>

      {/* Main content */}
      <div className="pnf-fade-in relative z-10 flex flex-col items-center gap-8 text-center">
        {/* 404 illustration */}
        <div className="pnf-icon-enter relative">
          <div className="pnf-pulse absolute inset-0 rounded-3xl bg-primary/5" />
          <div className="relative rounded-3xl border border-border/50 bg-background p-8 shadow-lg shadow-black/3">
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
              className="text-muted-foreground"
              aria-hidden
            >
              <rect x="6" y="22" width="60" height="40" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M6 28V16a6 6 0 0 1 6-6h14l6 8h28a6 6 0 0 1 6 6v4" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="36" cy="50" r="1.5" fill="currentColor" className="pnf-dot-pulse" />
              <path
                d="M30 36a6 6 0 1 1 9 5.2c-1.6 1-3 2.2-3 3.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="pnf-text-slide space-y-3">
          <p className="text-6xl font-bold tracking-tighter text-muted-foreground/20">404</p>
          <h1 className="text-2xl font-semibold tracking-tight">Project not found</h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            The project you&apos;re looking for may have been removed, or you don&apos;t have
            permission to access it.
          </p>
        </div>

        {/* Actions */}
        <div className="pnf-actions-pop flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/projects">
              <ArrowLeft className="size-4" />
              All projects
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProjectNotFound;
