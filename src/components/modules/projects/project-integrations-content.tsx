'use client';

import React from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Globe, Send } from 'lucide-react';
import { ChatbotEmbedSection } from './chatbot-embed-section';
import { ProjectDeliveryIntegrations } from './project-delivery-integrations';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectIntegrationsContentProps {
  projectId: string;
}

export function ProjectIntegrationsContent({ projectId }: ProjectIntegrationsContentProps) {
  const { data: project, isLoading, isError } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Project not found or you don’t have access.
      </div>
    );
  }

  const deliveryIntegrationIds = project.deliveryIntegrationIds ?? [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="website" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="website" className="gap-2">
            <Globe className="size-4" />
            Website integration
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Send className="size-4" />
            Delivery integrations
          </TabsTrigger>
        </TabsList>
        <TabsContent value="website" className="mt-6">
          <p className="text-muted-foreground text-sm mb-4">
            Embed the chat widget on your website. Copy the snippet and paste it before{' '}
            <code className="rounded bg-muted px-1">&lt;/body&gt;</code> on your site.
          </p>
          <ChatbotEmbedSection projectId={projectId} />
        </TabsContent>
        <TabsContent value="delivery" className="mt-6">
          <ProjectDeliveryIntegrations
            projectId={projectId}
            deliveryIntegrationIds={deliveryIntegrationIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
