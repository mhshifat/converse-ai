/**
 * Embeddings for RAG vector search (768 dimensions).
 * Supports Nomic (recommended) and Groq. Nomic is used when NOMIC_API_KEY is set;
 * otherwise Groq is used when GROQ_API_KEY is set.
 * Note: Groq's embedding model (nomic-embed-text-v1.5) may not be available on all accounts.
 * For reliable RAG, set NOMIC_API_KEY (get a key at atlas.nomic.ai).
 */

const EMBEDDING_DIM = 768;

const NOMIC_EMBED_API = 'https://api-atlas.nomic.ai/v1/embedding/text';
const NOMIC_MODEL = 'nomic-embed-text-v1.5';

const GROQ_EMBED_API = 'https://api.groq.com/openai/v1/embeddings';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

function getNomicKey(): string {
  return process.env.NOMIC_API_KEY ?? '';
}

function getGroqKey(apiKey?: string): string {
  return apiKey ?? process.env.GROQ_API_KEY ?? '';
}

function getGroqModel(): string {
  return process.env.GROQ_EMBEDDING_MODEL ?? 'nomic-embed-text-v1.5';
}

/** Use Nomic when NOMIC_API_KEY is set; otherwise Groq when GROQ_API_KEY is set. */
function preferNomic(): boolean {
  return !!getNomicKey();
}

/**
 * Embed a single text.
 */
export async function embedText(text: string, apiKey?: string): Promise<number[]> {
  const trimmed = text.slice(0, 8192);
  if (preferNomic()) {
    const vecs = await embedTextsNomic([trimmed]);
    const v = vecs[0];
    if (!v) throw new Error('Invalid embedding response from Nomic');
    return v;
  }
  const key = getGroqKey(apiKey);
  if (!key) {
    throw new Error(
      'No embedding API key configured. Set NOMIC_API_KEY (recommended, atlas.nomic.ai) or GROQ_API_KEY.'
    );
  }
  const vecs = await embedTextsGroq([trimmed], key);
  const v = vecs[0];
  if (!v) throw new Error('Invalid embedding response from Groq');
  return v;
}

/**
 * Embed multiple texts in one or more requests.
 */
export async function embedTexts(texts: string[], apiKey?: string): Promise<number[][]> {
  const trimmed = texts.map((t) => t.slice(0, 8192));
  if (preferNomic()) {
    return embedTextsNomic(trimmed);
  }
  const key = getGroqKey(apiKey);
  if (!key) {
    throw new Error(
      'No embedding API key configured. Set NOMIC_API_KEY (recommended, atlas.nomic.ai) or GROQ_API_KEY.'
    );
  }
  return embedTextsGroq(trimmed, key);
}

async function embedTextsNomic(texts: string[]): Promise<number[][]> {
  const key = getNomicKey();
  if (!key) throw new Error('NOMIC_API_KEY is not set.');
  const res = await fetch(NOMIC_EMBED_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: NOMIC_MODEL,
      texts,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nomic embeddings failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { embeddings?: number[][] };
  const list = data.embeddings ?? [];
  if (list.length !== texts.length) {
    throw new Error(`Nomic returned ${list.length} embeddings for ${texts.length} texts`);
  }
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) {
      throw new Error(`Invalid embedding at index ${i} from Nomic`);
    }
  }
  return list as number[][];
}

async function embedTextsGroq(texts: string[], key: string): Promise<number[][]> {
  const model = getGroqModel();
  const res = await fetch(GROQ_EMBED_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: texts.length === 1 ? texts[0] : texts,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    const hint = err.includes('model_not_found') || err.includes('does not exist')
      ? ' Groq embedding model may be unavailable; set NOMIC_API_KEY (atlas.nomic.ai) for RAG embeddings instead.'
      : '';
    throw new Error(`Groq embeddings failed: ${res.status} ${err}${hint}`);
  }
  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const list = (data.data ?? []).map((d) => (d as { embedding?: number[] }).embedding);
  if (list.length !== texts.length) {
    throw new Error(`Groq returned ${list.length} embeddings for ${texts.length} texts`);
  }
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) {
      throw new Error(`Invalid embedding at index ${i} from Groq`);
    }
  }
  return list as number[][];
}

export { EMBEDDING_DIM };
