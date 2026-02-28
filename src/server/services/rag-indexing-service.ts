import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import * as knowledgeChunkRepo from '../repositories/knowledge-chunk-repository';
import * as chunkingService from './chunking-service';
import * as embeddingService from './embedding-service';
import pLimit from 'p-limit';

const limit = pLimit(3);

/**
 * Index one knowledge entry: chunk, embed, store. No-op if project does not use RAG.
 */
export async function indexKnowledgeEntry(
  projectId: string,
  projectKnowledgeId: string,
  content: string,
  _tenantId: string
): Promise<{ chunksCreated: number }> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { use_rag: true },
  });
  if (!project?.use_rag) return { chunksCreated: 0 };

  await knowledgeChunkRepo.deleteByProjectKnowledgeId(projectKnowledgeId);
  const chunks = chunkingService.chunkText(content);
  if (chunks.length === 0) return { chunksCreated: 0 };

  const batchSize = 20;
  let chunksCreated = 0;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await limit(() => embeddingService.embedTexts(batch));
    const items = batch
      .map((content, j) => ({
        id: nanoid(),
        projectId,
        content,
        embedding: embeddings[j],
        projectKnowledgeId,
      }))
      .filter((item): item is typeof item & { embedding: number[] } =>
        Array.isArray(item.embedding) && item.embedding.length === embeddingService.EMBEDDING_DIM
      );
    if (items.length > 0) {
      await knowledgeChunkRepo.insertChunks(items);
      chunksCreated += items.length;
    }
  }
  return { chunksCreated };
}

/**
 * Reindex all knowledge entries for a project (e.g. when turning on RAG).
 * When knowledge_chunk table does not exist (e.g. local DB without pgvector), returns ragUnavailable: true.
 */
export async function reindexProject(
  projectId: string,
  tenantId: string
): Promise<{ chunksCreated: number; ragUnavailable?: boolean }> {
  if (!(await knowledgeChunkRepo.isKnowledgeChunkTableAvailable())) {
    return { chunksCreated: 0, ragUnavailable: true };
  }
  await knowledgeChunkRepo.deleteByProjectId(projectId);
  const rows = await prisma.project_knowledge.findMany({
    where: { project_id: projectId },
    select: { id: true, content: true },
  });
  let total = 0;
  for (const row of rows) {
    const { chunksCreated } = await indexKnowledgeEntry(
      projectId,
      row.id,
      row.content,
      tenantId
    );
    total += chunksCreated;
  }
  return { chunksCreated: total };
}
