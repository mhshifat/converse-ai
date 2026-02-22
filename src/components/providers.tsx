'use client';

import React, { useState } from 'react';
import { getQueryClient } from '@trpc/react-query/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpcHooks } from '@/lib/trpc-hooks';
import { getTrpcClientConfig } from '@/lib/trpc-config';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient(getTrpcClientConfig()));
  const [trpcClient] = useState(() => trpcHooks.createClient(getTrpcClientConfig()));

  return (
    <trpcHooks.Provider
      client={trpcClient}
      queryClient={queryClient}
      ssrState={false}
      ssrContext={null}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpcHooks.Provider>
  );
}
