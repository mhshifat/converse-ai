import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as projectKnowledgeRepo from '../repositories/project-knowledge-repository';
import { prisma } from '@/lib/prisma';

export const projectKnowledgeRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.list', async () => {
        return projectKnowledgeRepo.listByProject(input.projectId, ctx.user.tenantId);
      });
    }),

  add: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().optional().nullable(),
        content: z.string().min(1, 'Content is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.add', async (correlationId) => {
        const result = await projectKnowledgeRepo.create(
          input.projectId,
          ctx.user.tenantId,
          { title: input.title ?? null, content: input.content }
        );
        if (!result) throwNotFoundWithId(correlationId, 'Project not found');
        return result;
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        projectId: z.string().uuid(),
        title: z.string().optional().nullable(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.update', async (correlationId) => {
        const result = await projectKnowledgeRepo.update(
          input.id,
          input.projectId,
          ctx.user.tenantId,
          { title: input.title, content: input.content }
        );
        if (!result) throwNotFoundWithId(correlationId, 'Entry not found');
        return result;
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.remove', async (correlationId) => {
        const ok = await projectKnowledgeRepo.remove(
          input.id,
          input.projectId,
          ctx.user.tenantId
        );
        if (!ok) throwNotFoundWithId(correlationId, 'Entry not found');
        return { success: true };
      });
    }),

  getExternalUrl: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.getExternalUrl', async () => {
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, tenant_id: ctx.user.tenantId },
          select: { knowledge_base_url: true },
        });
        return project?.knowledge_base_url ?? null;
      });
    }),

  setExternalUrl: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.setExternalUrl', async (correlationId) => {
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, tenant_id: ctx.user.tenantId },
        });
        if (!project) throwNotFoundWithId(correlationId, 'Project not found');
        await prisma.project.update({
          where: { id: input.projectId },
          data: { knowledge_base_url: (input.url === '' ? null : input.url) ?? null },
        });
        return { success: true };
      });
    }),
});
