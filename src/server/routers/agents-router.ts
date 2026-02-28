import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as agentRepo from '../repositories/agent-repository';

export const agentsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(50).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return withCorrelationError('agents.list', async () => {
        return agentRepo.listAgents({
          tenantId: ctx.user.tenantId,
          page: input?.page,
          pageSize: input?.pageSize,
          search: input?.search,
        });
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('agents.getById', async (correlationId) => {
        const agent = await agentRepo.getAgentById(input.id, ctx.user.tenantId);
        if (!agent) throwNotFoundWithId(correlationId, 'Agent not found');
        return agent;
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        systemPrompt: z.string().min(1, 'System prompt is required'),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('agents.create', async () => {
        return agentRepo.createAgent({
          tenantId: ctx.user.tenantId,
          name: input.name,
          systemPrompt: input.systemPrompt,
          settings: input.settings,
        });
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        systemPrompt: z.string().min(1).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('agents.update', async (correlationId) => {
        const { id, ...data } = input;
        const updated = await agentRepo.updateAgent(id, ctx.user.tenantId, data);
        if (!updated) throwNotFoundWithId(correlationId, 'Agent not found');
        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('agents.delete', async (correlationId) => {
        const deleted = await agentRepo.deleteAgent(input.id, ctx.user.tenantId);
        if (!deleted) throwNotFoundWithId(correlationId, 'Agent not found');
        return { success: true };
      });
    }),

  listVersions: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('agents.listVersions', async () => {
        return agentRepo.listAgentVersions(input.agentId, ctx.user.tenantId);
      });
    }),

  rollback: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        version: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('agents.rollback', async (correlationId) => {
        const ok = await agentRepo.rollbackAgentToVersion(
          input.agentId,
          input.version,
          ctx.user.tenantId
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Agent or version not found');
        return { success: true };
      });
    }),
});
