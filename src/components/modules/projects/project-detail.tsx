'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, Settings } from 'lucide-react';
import { ProjectChatbotTab } from './project-chatbot-tab';
import { ProjectSettingsTab } from './project-settings-tab';

interface ChatbotConfig {
  id: string;
  projectId: string;
  name: string;
  config: Record<string, unknown>;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectDetailProps {
  project: {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    icon?: string | null;
    dataSchema?: unknown;
    deliveryIntegrationIds?: string[];
    createdAt: Date;
    updatedAt: Date;
    chatbots: ChatbotConfig[];
  };
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const chatbot = project.chatbots[0] ?? null;

  return (
    <div>
      <Link href="/projects">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to projects
        </Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
      {project.description && (
        <p className="text-muted-foreground mb-6">{project.description}</p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="rounded-lg border bg-card p-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Created:</strong>{' '}
              {new Date(project.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Chatbot:</strong>{' '}
              {chatbot ? chatbot.name : 'None — add one in the Chatbot tab.'}
            </p>
          </div>
        </TabsContent>
        <TabsContent value="chatbot" className="mt-6">
          <ProjectChatbotTab
            projectId={project.id}
            initialChatbot={
              chatbot
                ? {
                    id: chatbot.id,
                    name: chatbot.name,
                    config: chatbot.config,
                    apiKey: chatbot.apiKey,
                  }
                : null
            }
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <ProjectSettingsTab
            projectId={project.id}
            dataSchema={project.dataSchema}
            deliveryIntegrationIds={project.deliveryIntegrationIds ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
