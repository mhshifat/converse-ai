import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
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
      return agentRepo.listAgents({
        tenantId: ctx.user.tenantId,
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await agentRepo.getAgentById(input.id, ctx.user.tenantId);
      if (!agent) throw new Error('Agent not found');
      return agent;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        systemPrompt: z.string().min(1, 'System prompt is required'),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return agentRepo.createAgent({
        tenantId: ctx.user.tenantId,
        name: input.name,
        systemPrompt: input.systemPrompt,
        settings: input.settings,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        systemPrompt: z.string().min(1).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updated = await agentRepo.updateAgent(id, ctx.user.tenantId, data);
      if (!updated) throw new Error('Agent not found');
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await agentRepo.deleteAgent(input.id, ctx.user.tenantId);
      if (!deleted) throw new Error('Agent not found');
      return { success: true };
    }),
});
