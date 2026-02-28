import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError } from '@/server/trpc-error';
import * as analyticsRepo from '../repositories/analytics-repository';

export const analyticsRouter = router({
  getDashboard: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        dateFrom: z.coerce.date(),
        dateTo: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return withCorrelationError('analytics.getDashboard', async () => {
        return analyticsRepo.getAnalyticsDashboard({
          projectId: input.projectId,
          tenantId: ctx.user.tenantId,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        });
      });
    }),
});
