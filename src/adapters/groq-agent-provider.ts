// GroqAgentProvider implements AgentProvider using Groq Chat Completions API
import type { AgentProvider } from './agent-provider';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

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

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return {
        response: `Sorry, I had trouble responding. (${res.status}: ${err.slice(0, 100)})`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content =
      data.choices?.[0]?.message?.content?.trim() ?? 'I could not generate a response.';
    return { response: content };
  }
}
