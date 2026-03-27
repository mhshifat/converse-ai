// GroqAgentProvider implements AgentProvider using Groq Chat Completions API
import type { AgentProvider } from './agent-provider';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const MAX_RETRIES = 3;

function retryDelay(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = parseFloat(retryAfterHeader);
    if (!isNaN(seconds) && seconds > 0 && seconds <= 60) return seconds * 1000;
  }
  return Math.min(1000 * 2 ** attempt, 15000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GroqAgentProvider implements AgentProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.GROQ_API_KEY ?? '';
  }

  async sendMessage({
    prompt,
    agentId,
    context,
  }: {
    prompt: string;
    conversationId: string;
    agentId: string;
    context?: Record<string, unknown>;
  }): Promise<{ response: string }> {
    if (!this.apiKey) {
      return { response: 'Groq API key is not configured. Set GROQ_API_KEY.' };
    }

    const history = (context?.history as Array<{ role: string; content: string }>) ?? [];
    const systemPrompt =
      (context?.systemPrompt as string) ?? 'You are a helpful assistant.';
    const model = (context?.model as string) ?? DEFAULT_MODEL;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: prompt },
    ];

    const body = JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content =
          data.choices?.[0]?.message?.content?.trim() ?? 'I could not generate a response.';
        return { response: content };
      }

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const wait = retryDelay(attempt, res.headers.get('retry-after'));
        console.warn(`[Groq] Rate limited (429). Retrying in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await sleep(wait);
        continue;
      }

      const err = await res.text();
      console.error(`[Groq] API error ${res.status}:`, err);
      return {
        response: 'Sorry, I had trouble responding. Please try again in a moment.',
      };
    }

    return { response: 'Sorry, I had trouble responding. Please try again in a moment.' };
  }

  /**
   * Streams assistant content chunks (OpenAI-compatible SSE). Falls back to a single error chunk on failure.
   */
  async *sendMessageStream({
    prompt,
    context,
  }: {
    prompt: string;
    conversationId: string;
    agentId: string;
    context?: Record<string, unknown>;
  }): AsyncGenerator<string, void, undefined> {
    if (!this.apiKey) {
      yield 'Groq API key is not configured. Set GROQ_API_KEY.';
      return;
    }

    const history = (context?.history as Array<{ role: string; content: string }>) ?? [];
    const systemPrompt =
      (context?.systemPrompt as string) ?? 'You are a helpful assistant.';
    const model = (context?.model as string) ?? DEFAULT_MODEL;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: prompt },
    ];

    const body = JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    });

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    });

    if (!res.ok || !res.body) {
      const err = await res.text().catch(() => '');
      console.error(`[Groq] Stream API error ${res.status}:`, err);
      yield 'Sorry, I had trouble responding. Please try again in a moment.';
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const lines = carry.split('\n');
        carry = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string | null } }>;
            };
            const piece = json.choices?.[0]?.delta?.content;
            if (typeof piece === 'string' && piece.length > 0) yield piece;
          } catch {
            /* incomplete JSON line — ignore */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
