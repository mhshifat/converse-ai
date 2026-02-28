import * as projectKnowledgeRepo from '../repositories/project-knowledge-repository';
import * as knowledgeChunkRepo from '../repositories/knowledge-chunk-repository';
import * as embeddingService from './embedding-service';
import { prisma } from '@/lib/prisma';

const EXTERNAL_FETCH_TIMEOUT_MS = 8000;
const MAX_EXTERNAL_LENGTH = 15000;
const RAG_TOP_K = 10;

/**
 * Builds the extra context string to inject into the agent's system prompt:
 * - If project.use_rag and query is provided: vector search (RAG) with relevant chunks only.
 * - Otherwise: full project knowledge from DB + optional external knowledge_base_url.
 */
export async function buildContextForProject(
  projectId: string,
  options?: { query?: string }
): Promise<string> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { use_rag: true },
  });

  const useRag = project?.use_rag && options?.query?.trim();
  let dbContext = '';

  if (useRag) {
    try {
      const queryEmbedding = await embeddingService.embedText(options!.query!.trim());
      const chunks = await knowledgeChunkRepo.searchSimilar(
        projectId,
        queryEmbedding,
        RAG_TOP_K
      );
      if (chunks.length > 0) {
        dbContext = chunks.map((c) => c.content).join('\n\n---\n\n');
      }
    } catch (err) {
      console.warn('[RAG] Vector search failed, falling back to full context:', err instanceof Error ? err.message : err);
      dbContext = await projectKnowledgeRepo.getContextString(projectId);
    }
  } else {
    dbContext = await projectKnowledgeRepo.getContextString(projectId);
  }

  const externalContext = await fetchExternalKnowledge(projectId);
  const parts: string[] = [];
  if (dbContext.trim()) {
    parts.push('Knowledge from your database:\n' + dbContext);
  }
  if (externalContext.trim()) {
    parts.push('Knowledge from external source:\n' + externalContext);
  }
  if (parts.length === 0) return '';
  return (
    '\n\n--- KNOWLEDGE BASE (use this when answering) ---\n' +
    'You must use the knowledge below to answer the user. Base your answers on this content. ' +
    'If the user asks something that is not covered here, say you do not have that information rather than inventing it. ' +
    'When the knowledge is relevant, use it directly.\n---\n\n' +
    parts.join('\n\n')
  );
}

async function fetchExternalKnowledge(projectId: string): Promise<string> {
  const url = await projectKnowledgeRepo.getProjectKnowledgeBaseUrl(projectId);
  if (!url?.trim()) return '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTERNAL_FETCH_TIMEOUT_MS);
    const res = await fetch(url.trim(), {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return '';

    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();
    if (text.length > MAX_EXTERNAL_LENGTH) {
      return text.slice(0, MAX_EXTERNAL_LENGTH) + '\n[... truncated]';
    }

    if (contentType.includes('application/json')) {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          return data
            .map((item: unknown) => {
              if (item && typeof item === 'object' && 'content' in item && typeof (item as { content: unknown }).content === 'string') {
                return (item as { content: string }).content;
              }
              if (typeof item === 'string') return item;
              return JSON.stringify(item);
            })
            .join('\n\n');
        }
        if (data && typeof data === 'object' && 'content' in data) {
          return String((data as { content: unknown }).content);
        }
        return text;
      } catch {
        return text;
      }
    }
    return text;
  } catch {
    return '';
  }
}
