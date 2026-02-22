import { createRootHooks } from '@trpc/react-query/shared';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers/app-router';
import { getTrpcClientConfig } from '@/lib/trpc-config';

export const trpcHooks = createRootHooks<AppRouter, unknown>({
  config: () => getTrpcClientConfig(),
  transformer: superjson,
});
