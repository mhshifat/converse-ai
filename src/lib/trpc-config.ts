import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { CreateTRPCClientOptions } from '@trpc/client';
import type { AppRouter } from '@/server/routers/app-router';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
}

export function getTrpcClientConfig(): CreateTRPCClientOptions<AppRouter> {
  const url = `${getBaseUrl()}/api/trpc`;
  return {
    links: [
      httpBatchLink({
        url,
        transformer: superjson,
      }),
    ],
  };
}

export { getBaseUrl };
