import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as projectAgentRepo from '../repositories/project-agent-repository';
import * as agentRepo from '../repositories/agent-repository';

export const projectAgentsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('projectAgents.list', async () => {
        return projectAgentRepo.listProjectAgents(input.projectId, ctx.user.tenantId);
      });
    }),

  assign: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        agentId: z.string().uuid(),
        isDefaultChat: z.boolean().optional(),
        isDefaultVoice: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectAgents.assign', async (correlationId) => {
        const result = await projectAgentRepo.assignAgentToProject(
          input.projectId,
          input.agentId,
          ctx.user.tenantId,
          {
            isDefaultChat: input.isDefaultChat,
            isDefaultVoice: input.isDefaultVoice,
          }
        );
        if (!result) throwNotFoundWithId(correlationId, 'Project or agent not found');
        return result;
      });
    }),

  unassign: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectAgents.unassign', async (correlationId) => {
        const ok = await projectAgentRepo.unassignAgentFromProject(
          input.projectId,
          input.agentId,
          ctx.user.tenantId
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Assignment not found');
        return { success: true };
      });
    }),

  setDefault: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        agentId: z.string().uuid(),
        channel: z.enum(['chat', 'voice']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectAgents.setDefault', async (correlationId) => {
        const ok = await projectAgentRepo.setProjectAgentDefault(
          input.projectId,
          input.agentId,
          input.channel,
          ctx.user.tenantId
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Assignment not found');
        return { success: true };
      });
    }),

  /** List tenant agents not yet assigned to this project (for "Assign existing" dropdown). */
  listAvailableToAssign: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('projectAgents.listAvailableToAssign', async () => {
        const [assigned, allAgents] = await Promise.all([
          projectAgentRepo.listProjectAgents(input.projectId, ctx.user.tenantId),
          agentRepo.getAgentsForTenant(ctx.user.tenantId),
        ]);
        const assignedIds = new Set(assigned.map((a) => a.agentId));
        return allAgents.filter((a) => !assignedIds.has(a.id));
      });
    }),
});
