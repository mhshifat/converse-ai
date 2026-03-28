import { authRouter } from './auth-router';
import { protectedExampleRouter } from './protected-example-router';
import { projectsRouter } from './projects-router';
import { agentsRouter } from './agents-router';
import { projectAgentsRouter } from './project-agents-router';
import { projectKnowledgeRouter } from './project-knowledge-router';
import { integrationsRouter } from './integrations-router';
import { widgetRouter } from './widget-router';
import { chatbotRouter } from './chatbot-router';
import { conversationsRouter } from './conversations-router';
import { liveChatRouter } from './live-chat-router';
import { humanAgentsRouter } from './human-agents-router';
import { cannedResponseRouter } from './canned-response-router';
import { analyticsRouter } from './analytics-router';
import { contactsRouter } from './contacts-router';
import { systemRouter } from './system-router';
import { publicProcedure, router } from '@/server/trpc';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),
  system: systemRouter,
  auth: authRouter,
  protectedExample: protectedExampleRouter,
  projects: projectsRouter,
  agents: agentsRouter,
  projectAgents: projectAgentsRouter,
  projectKnowledge: projectKnowledgeRouter,
  integrations: integrationsRouter,
  contacts: contactsRouter,
  widget: widgetRouter,
  chatbot: chatbotRouter,
  conversations: conversationsRouter,
  liveChat: liveChatRouter,
  humanAgents: humanAgentsRouter,
  cannedResponse: cannedResponseRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
