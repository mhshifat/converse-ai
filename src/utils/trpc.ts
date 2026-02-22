import { createFlatProxy } from '@trpc/server/unstable-core-do-not-import';
import { useMemo } from 'react';
import { createReactDecoration, createReactQueryUtils } from '@trpc/react-query/shared';
import type { AppRouter } from '../server/routers/app-router';
import { trpcHooks } from '@/lib/trpc-hooks';

const decoration = createReactDecoration(trpcHooks);

export const trpc = createFlatProxy((key) => {
  if (key === 'useUtils' || key === 'useContext') {
    return () => {
      const context = trpcHooks.useUtils();
      return useMemo(() => createReactQueryUtils(context), [context]);
    };
  }
  if (key === 'useQueries') return trpcHooks.useQueries;
  if (key === 'useSuspenseQueries') return trpcHooks.useSuspenseQueries;
  if (key === 'Provider') return trpcHooks.Provider;
  return decoration[key as keyof typeof decoration];
});
