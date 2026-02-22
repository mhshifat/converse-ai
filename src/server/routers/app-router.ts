import { authRouter } from './auth-router';
import { protectedExampleRouter } from './protected-example-router';
import { projectsRouter } from './projects-router';
import { agentsRouter } from './agents-router';
import { integrationsRouter } from './integrations-router';
import { widgetRouter } from './widget-router';
import { chatbotRouter } from './chatbot-router';
import { publicProcedure, router } from '@/server/trpc';

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok' })),
  auth: authRouter,
  protectedExample: protectedExampleRouter,
  projects: projectsRouter,
  agents: agentsRouter,
  integrations: integrationsRouter,
  widget: widgetRouter,
  chatbot: chatbotRouter,
});

export type AppRouter = typeof appRouter;
