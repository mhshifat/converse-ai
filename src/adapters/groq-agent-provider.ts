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
}
