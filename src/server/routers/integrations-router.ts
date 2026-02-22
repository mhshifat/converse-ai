import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as integrationRepo from '../repositories/integration-repository';

const configByType = {
  email: z.object({
    from: z.string().email().optional(),
    to: z.string().email().optional(),
    apiKey: z.string().optional(),
    domain: z.string().optional(),
    host: z.string().optional(),
    port: z.number().int().optional(),
    user: z.string().optional(),
    pass: z.string().optional(),
    secure: z.boolean().optional(),
  }),
  discord: z.object({
    webhookUrl: z.string().url(),
  }),
  sms: z.object({
    accountSid: z.string().optional(),
    authToken: z.string().optional(),
    from: z.string().optional(),
  }),
};

export const integrationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return integrationRepo.listIntegrations(ctx.user.tenantId);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const integration = await integrationRepo.getIntegrationById(
        input.id,
        ctx.user.tenantId
      );
      if (!integration) throw new Error('Integration not found');
      return integration;
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['email', 'discord', 'sms']),
        config: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const parsed = configByType[input.type].safeParse(input.config);
      if (!parsed.success) throw new Error('Invalid config for integration type');
      return integrationRepo.createIntegration({
        tenantId: ctx.user.tenantId,
        type: input.type,
        config: parsed.data as Record<string, unknown>,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        config: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await integrationRepo.getIntegrationById(
        input.id,
        ctx.user.tenantId
      );
      if (!existing) throw new Error('Integration not found');
      const parsed = configByType[existing.type].safeParse(input.config);
      if (!parsed.success) throw new Error('Invalid config for integration type');
      const updated = await integrationRepo.updateIntegration(
        input.id,
        ctx.user.tenantId,
        { config: parsed.data as Record<string, unknown> }
      );
      if (!updated) throw new Error('Integration not found');
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await integrationRepo.deleteIntegration(
        input.id,
        ctx.user.tenantId
      );
      if (!deleted) throw new Error('Integration not found');
      return { success: true };
    }),
});
