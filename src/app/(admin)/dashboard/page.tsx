import { DashboardOverviewCards } from '@/components/modules/dashboard/dashboard-overview-cards';
import { MicroPulse } from '@/components/shared/micro-pulse';

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Overview
          <MicroPulse className="text-primary" aria-hidden />
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage projects, agents, and integrations. Get started by creating a project and embedding your chatbot.
        </p>
      </section>

      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="sr-only">
          Quick links
        </h2>
        <DashboardOverviewCards />
      </section>
    </div>
  );
}
