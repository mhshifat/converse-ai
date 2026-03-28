import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError } from '@/server/trpc-error';
import { checkAllServiceDependencies } from '@/lib/dependency-health-checks';

export const systemRouter = router({
  /** For merchants: database, AI, signaling, and optional upload/email/SMS reachability (server-side checks). */
  dependenciesStatus: protectedProcedure.query(async () => {
    return withCorrelationError('system.dependenciesStatus', async () => {
      return checkAllServiceDependencies();
    });
  }),
});
