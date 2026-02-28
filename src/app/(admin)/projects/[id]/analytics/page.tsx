import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AnalyticsDashboard } from '@/components/modules/projects/analytics-dashboard';

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <Link href={`/projects/${id}`}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to project
        </Button>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-1 text-muted-foreground">
        Reply time, resolution rate, volume, and CSAT/NPS trends for this project.
      </p>
      <div className="mt-6">
        <AnalyticsDashboard projectId={id} />
      </div>
    </div>
  );
}
