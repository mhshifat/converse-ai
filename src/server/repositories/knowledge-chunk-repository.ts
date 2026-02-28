import { prisma } from '@/lib/prisma';

const TABLE = 'knowledge_chunk';

/**
 * True if the knowledge_chunk table exists (e.g. pgvector migration ran).
 * When false, RAG operations no-op (local DB without pgvector).
 */
export async function isKnowledgeChunkTableAvailable(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    TABLE
  );
  return rows[0]?.exists === true;
}

/**
 * Insert a chunk with embedding. Uses raw SQL because Prisma has no vector type.
 * No-op if knowledge_chunk table does not exist (e.g. local without pgvector).
 */
export async function insertChunk(
  id: string,
  projectId: string,
  content: string,
  embedding: number[],
  projectKnowledgeId?: string | null
): Promise<void> {
  if (!(await isKnowledgeChunkTableAvailable())) return;
  const vecStr = `[${embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${TABLE} (id, project_id, project_knowledge_id, content, embedding, created_at)
     VALUES ($1, $2, $3, $4, $5::vector, CURRENT_TIMESTAMP)`,
    id,
    projectId,
    projectKnowledgeId ?? null,
    content,
    vecStr
  );
}

/**
 * Insert multiple chunks in a transaction (e.g. after chunking one document).
 */
export async function insertChunks(
  items: Array<{
    id: string;
    projectId: string;
    content: string;
    embedding: number[];
    projectKnowledgeId?: string | null;
  }>
): Promise<void> {
  if (items.length === 0 || !(await isKnowledgeChunkTableAvailable())) return;
  await prisma.$transaction(
    items.map((item) => {
      const vecStr = `[${item.embedding.join(',')}]`;
      return prisma.$executeRawUnsafe(
        `INSERT INTO ${TABLE} (id, project_id, project_knowledge_id, content, embedding, created_at)
         VALUES ($1, $2, $3, $4, $5::vector, CURRENT_TIMESTAMP)`,
        item.id,
        item.projectId,
        item.projectKnowledgeId ?? null,
        item.content,
        vecStr
      );
    })
  );
}

/**
 * Cosine similarity search: return top-k chunks for the given embedding.
 */
export async function searchSimilar(
  projectId: string,
  queryEmbedding: number[],
  topK: number = 8
): Promise<{ id: string; content: string; similarity: number }[]> {
  if (!(await isKnowledgeChunkTableAvailable())) return [];
  const vecStr = `[${queryEmbedding.join(',')}]`;
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; content: string; similarity: string }>
  >(
    `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
     FROM ${TABLE}
     WHERE project_id = $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vecStr,
    projectId,
    topK
  );
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}

/**
 * Delete all chunks for a project knowledge entry (when entry is updated or removed).
 */
export async function deleteByProjectKnowledgeId(projectKnowledgeId: string): Promise<number> {
  if (!(await isKnowledgeChunkTableAvailable())) return 0;
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM ${TABLE} WHERE project_knowledge_id = $1`,
    projectKnowledgeId
  );
  return Number(result);
}

/**
 * Delete all chunks for a project (when turning off RAG or clearing).
 */
export async function deleteByProjectId(projectId: string): Promise<number> {
  if (!(await isKnowledgeChunkTableAvailable())) return 0;
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM ${TABLE} WHERE project_id = $1`,
    projectId
  );
  return Number(result);
}
