'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MessageSquare, Bot, Plug, Sparkles } from 'lucide-react';
import { ProjectChatbotTab } from './project-chatbot-tab';
import { ProjectSettingsTab } from './project-settings-tab';
import { cn } from '@/lib/utils';

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
    conversationMode?: 'human_only' | 'ai_only' | 'both';
    createdAt: Date;
    updatedAt: Date;
    chatbots: ChatbotConfig[];
  };
}

function ProjectOverviewContent({
  project,
  chatbot,
  onOpenChatbotTab,
}: {
  project: ProjectDetailProps['project'];
  chatbot: ChatbotConfig | null;
  onOpenChatbotTab: () => void;
}) {
  const createdDate = new Date(project.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statCards = [
    {
      label: 'Created',
      value: createdDate,
      icon: Calendar,
      gradient: 'from-sky-500 to-blue-600',
      delay: 0,
    },
    {
      label: 'Chatbot',
      value: chatbot ? chatbot.name : 'Not set up',
      icon: MessageSquare,
      gradient: chatbot ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-500',
      delay: 1,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md"
              style={{ animation: `overview-fade-in 0.4s ease-out ${card.delay * 0.08}s both` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'flex size-11 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
                    card.gradient
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-foreground">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <Link
          href={`/projects/${project.id}/agents`}
          className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
          style={{ animation: 'overview-fade-in 0.4s ease-out 0.16s both' }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-sm">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Agents
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">Configure AI agents</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main status / get started card */}
      <div
        className={cn(
          'overflow-hidden rounded-2xl border bg-card shadow-sm',
          chatbot ? 'border-border/50' : 'border-amber-200/60 bg-linear-to-br from-amber-50/80 to-orange-50/50 dark:border-amber-900/30 dark:from-amber-950/20 dark:to-orange-950/20'
        )}
        style={{ animation: 'overview-fade-in 0.45s ease-out 0.12s both' }}
      >
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="shrink-0">
            {chatbot ? (
              <div className="relative">
                <div
                  className="flex size-24 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg"
                  style={{ animation: 'overview-float 4s ease-in-out infinite' }}
                >
                  <MessageSquare className="size-12" />
                </div>
                <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow">
                  ✓
                </span>
              </div>
            ) : (
              <div
                className="flex size-24 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-500/10 dark:to-orange-500/10"
                style={{ animation: 'overview-float 4s ease-in-out infinite' }}
              >
                <ChatbotEmptyIllustration />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {chatbot ? (
              <>
                <h3 className="text-lg font-semibold text-foreground">Chatbot ready</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <strong>{chatbot.name}</strong> is configured. Embed it on your site or open the
                  Chatbot tab to edit.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onOpenChatbotTab}
                >
                  Open Chatbot tab
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground">Add your first chatbot</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a chatbot for this project to start conversations. Configure design,
                  behavior, and get an embed code.
                </p>
                <Button
                  size="sm"
                  className="mt-4 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                  onClick={onOpenChatbotTab}
                >
                  <Sparkles className="size-4 mr-2" />
                  Add chatbot
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div
        className="rounded-2xl border border-border/50 bg-muted/30 p-5"
        style={{ animation: 'overview-fade-in 0.4s ease-out 0.2s both' }}
      >
        <h4 className="text-sm font-medium text-foreground">Quick links</h4>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/projects/${project.id}/agents`} className="gap-2">
              <Bot className="size-4" />
              Agents
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/projects/${project.id}/integrations`} className="gap-2">
              <Plug className="size-4" />
              Integrations
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenChatbotTab} className="gap-2">
            <MessageSquare className="size-4" />
            Chatbot
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatbotEmptyIllustration() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-amber-600/70 dark:text-amber-400/50"
      style={{ animation: 'overview-pulse-soft 2.5s ease-in-out infinite' }}
    >
      <path
        d="M14 22c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"
        fill="currentColor"
      />
      <path
        d="M30 22c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"
        fill="currentColor"
      />
      <path
        d="M12 28h24c2.2 0 4 1.8 4 4v4H8v-4c0-2.2 1.8-4 4-4z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <path
        d="M20 14l4-6 4 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
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
          <ProjectOverviewContent
            project={project}
            chatbot={chatbot}
            onOpenChatbotTab={() => setActiveTab('chatbot')}
          />
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
            conversationMode={project.conversationMode ?? 'both'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
