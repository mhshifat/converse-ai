import * as projectKnowledgeRepo from '../repositories/project-knowledge-repository';

const EXTERNAL_FETCH_TIMEOUT_MS = 8000;
const MAX_EXTERNAL_LENGTH = 15000;

/**
 * Builds the extra context string to inject into the agent's system prompt:
 * - All project knowledge entries from the database (FAQs, product info, etc.)
 * - Optional: content fetched from project's knowledge_base_url (external API/docs)
 */
export async function buildContextForProject(projectId: string): Promise<string> {
  const [dbContext, externalContext] = await Promise.all([
    projectKnowledgeRepo.getContextString(projectId),
    fetchExternalKnowledge(projectId),
  ]);

  const parts: string[] = [];
  if (dbContext.trim()) {
    parts.push('Knowledge from your database:\n' + dbContext);
  }
  if (externalContext.trim()) {
    parts.push('Knowledge from external source:\n' + externalContext);
  }
  if (parts.length === 0) return '';
  return '\n\n--- Use the following when answering. Do not make up facts not stated here. ---\n\n' + parts.join('\n\n');
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
