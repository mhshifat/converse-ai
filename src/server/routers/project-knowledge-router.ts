import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId } from '@/server/trpc-error';
import * as projectKnowledgeRepo from '../repositories/project-knowledge-repository';
import * as knowledgeIngestService from '../services/knowledge-ingest-service';
import * as ragIndexingService from '../services/rag-indexing-service';
import * as knowledgeChunkRepo from '../repositories/knowledge-chunk-repository';
import { prisma } from '@/lib/prisma';

export const projectKnowledgeRouter = router({
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.get', async (correlationId) => {
        const entry = await projectKnowledgeRepo.getById(
          input.id,
          input.projectId,
          ctx.user.tenantId
        );
        if (!entry) throwNotFoundWithId(correlationId, 'Entry not found');
        return entry;
      });
    }),

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
          {
            title: input.title ?? null,
            content: input.content,
            sourceType: 'manual',
            sourceRef: null,
          }
        );
        if (!result) throwNotFoundWithId(correlationId, 'Project not found');
        void ragIndexingService.indexKnowledgeEntry(
          input.projectId,
          result.id,
          result.content,
          ctx.user.tenantId
        ).catch((err) => console.warn('[RAG] Index after add failed:', err instanceof Error ? err.message : err));
        return result;
      });
    }),

  reIngest: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        projectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.reIngest', async () => {
        const result = await knowledgeIngestService.reIngestById(
          input.id,
          input.projectId,
          ctx.user.tenantId
        );
        if (!result.success && result.error) {
          throw new Error(result.error);
        }
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
        await knowledgeChunkRepo.deleteByProjectKnowledgeId(input.id);
        void ragIndexingService.indexKnowledgeEntry(
          input.projectId,
          input.id,
          result.content,
          ctx.user.tenantId
        ).catch((err) => console.warn('[RAG] Index after update failed:', err instanceof Error ? err.message : err));
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
        await knowledgeChunkRepo.deleteByProjectKnowledgeId(input.id);
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

  reindexRag: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('projectKnowledge.reindexRag', async (correlationId) => {
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, tenant_id: ctx.user.tenantId },
        });
        if (!project) throwNotFoundWithId(correlationId, 'Project not found');
        const result = await ragIndexingService.reindexProject(input.projectId, ctx.user.tenantId);
        return result;
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
