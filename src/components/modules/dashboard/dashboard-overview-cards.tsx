import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FolderKanban, Bot, Plug, ArrowRight } from 'lucide-react';

const cards = [
  {
    href: '/dashboard/projects',
    title: 'Projects',
    description: 'Create projects and customize chatbot design, data schema, and embed code.',
    icon: FolderKanban,
    accent: 'text-blue-600',
    gridClass: 'lg:col-span-2',
  },
  {
    href: '/dashboard/agents',
    title: 'Agents',
    description: 'Configure AI agents, system prompts, and provider settings.',
    icon: Bot,
    accent: 'text-emerald-600',
    gridClass: '',
  },
  {
    href: '/dashboard/integrations',
    title: 'Integrations',
    description: 'Email, Discord, and SMS for delivering compiled conversation data.',
    icon: Plug,
    accent: 'text-violet-600',
    gridClass: '',
  },
] as const;

export function DashboardOverviewCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-0">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group block h-full ${item.gridClass}`}
          >
            <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex size-10 items-center justify-center rounded-lg bg-muted ${item.accent}`}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
