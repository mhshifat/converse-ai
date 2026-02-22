import { CreateProjectForm } from '@/components/modules/projects/create-project-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewProjectPage() {
  return (
    <div className="p-8 max-w-lg">
      <Link href="/dashboard/projects">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to projects
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">Create project</h1>
      <p className="text-muted-foreground mb-6">
        Add a project to configure a chatbot and embed it on your site.
      </p>
      <CreateProjectForm />
    </div>
  );
}
