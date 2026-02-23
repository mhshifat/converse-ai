import { DashboardOverviewCards } from '@/components/modules/dashboard/dashboard-overview-cards';

export default function DashboardPage() {
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      {/* Hero */}
      <section className="mb-10">
        <p
          className="text-sm font-medium text-muted-foreground"
          style={{ animation: 'dash-fade-in 0.4s ease-out both' }}
        >
          Welcome back
        </p>
        <h1
          className="mt-1.5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          style={{ animation: 'dash-fade-in 0.4s ease-out 0.04s both' }}
        >
          Dashboard
        </h1>
        <p
          className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted-foreground"
          style={{ animation: 'dash-fade-in 0.4s ease-out 0.08s both' }}
        >
          Manage your projects, agents, and integrations. Create a project and embed your chatbot to get started.
        </p>
      </section>

      {/* Bento cards */}
      <section aria-label="Quick links">
        <DashboardOverviewCards />
      </section>
    </div>
  );
}
