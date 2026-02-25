import { ProjectsList } from '@/components/modules/projects/projects-list';
import { DashboardPageHeader } from '@/components/modules/dashboard/dashboard-page-header';

export default function ProjectsPage() {
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <DashboardPageHeader
        title="Projects"
        description="Create and manage projects, customize chatbot design, and get embed code."
        action={{ label: 'New project', href: '/projects/new' }}
      />
      <ProjectsList />
    </div>
  );
}
