// OpenAIAgentProvider implements AgentProvider for OpenAI API
import type { AgentProvider } from './agent-provider';

export class OpenAIAgentProvider implements AgentProvider {
  constructor(_apiKey?: string) {}

  async sendMessage({ prompt, conversationId, agentId, context }: {
    prompt: string;
    conversationId: string;
    agentId: string;
    context?: Record<string, unknown>;
  }): Promise<{ response: string }> {
    // TODO: Integrate OpenAI API here
    // This is a stub for now
    return { response: 'OpenAI response (stub)' };
  }
}
