import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as projectRepo from '../repositories/project-repository';
import * as conversationService from '../services/conversation-service';

export const projectsRouter = router({
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
      return withCorrelationError('projects.list', async () => {
        return projectRepo.listProjects({
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
      return withCorrelationError('projects.getById', async (correlationId) => {
        const project = await projectRepo.getProjectById(input.id, ctx.user.tenantId);
        if (!project) throwNotFoundWithId(correlationId, 'Project not found');
        return project;
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        icon: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projects.create', async () => {
        return projectRepo.createProject({
          tenantId: ctx.user.tenantId,
          name: input.name,
          description: input.description,
          icon: input.icon ?? null,
        });
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        icon: z.string().optional().nullable(),
        dataSchema: z.unknown().optional(),
        deliveryIntegrationIds: z.array(z.string().uuid()).optional(),
        conversationMode: z.enum(['human_only', 'ai_only', 'both']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projects.update', async (correlationId) => {
        const { id, ...data } = input;
        const updated = await projectRepo.updateProject(id, ctx.user.tenantId, data);
        if (!updated) throwNotFoundWithId(correlationId, 'Project not found');
        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projects.delete', async (correlationId) => {
        const deleted = await projectRepo.deleteProject(input.id, ctx.user.tenantId);
        if (!deleted) throwNotFoundWithId(correlationId, 'Project not found');
        return { success: true };
      });
    }),

  sendTestDelivery: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projects.sendTestDelivery', async (correlationId) => {
        const result = await conversationService.sendTestDelivery(
          input.projectId,
          ctx.user.tenantId
        );
        if (!result.success) {
          const err = new Error(result.error);
          (err as Error & { correlationId?: string }).correlationId = correlationId;
          throw err;
        }
        return { success: true, sentTo: result.sentTo };
      });
    }),
});
