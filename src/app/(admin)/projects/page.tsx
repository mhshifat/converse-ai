import Link from 'next/link';
import { ProjectsList } from '@/components/modules/projects/projects-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="min-h-full">
      {/* Hero-style header with subtle gradient */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-b from-primary/8 via-primary/4 to-transparent px-5 pb-10 pt-8 sm:px-6 sm:pb-12 md:px-8 md:pt-10 lg:px-10">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Projects
            </h1>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
              Create and manage projects, customize chatbot design, and get embed code.
            </p>
          </div>
          <Link href="/projects/new" className="shrink-0">
            <Button
              size="lg"
              className="gap-2 rounded-xl shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            >
              <Plus className="size-5" />
              New project
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-5 sm:px-6 md:px-8 lg:px-10 -mt-2 pb-10">
        <ProjectsList />
      </div>
    </div>
  );
}
