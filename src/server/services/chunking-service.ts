/**
 * Simple text chunking for RAG: split by character count with overlap.
 * ~500 chars ≈ ~125 tokens; overlap 50 chars to keep context across boundaries.
 */

const DEFAULT_CHUNK_SIZE = 600;
const DEFAULT_OVERLAP = 80;

export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number }
): string[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= chunkSize) return [trimmed];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    let end = start + chunkSize;
    if (end < trimmed.length) {
      const lastSpace = trimmed.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace + 1;
    }
    chunks.push(trimmed.slice(start, end).trim());
    if (end >= trimmed.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks.filter(Boolean);
}
