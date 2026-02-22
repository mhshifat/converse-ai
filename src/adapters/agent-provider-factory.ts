// Factory to select agent provider (Groq, OpenAI, etc.)
import type { AgentProvider } from './agent-provider';
import { GroqAgentProvider } from './groq-agent-provider';
import { OpenAIAgentProvider } from './openai-agent-provider';

export type AgentProviderType = 'groq' | 'openai';

export interface AgentProviderOptions {
  apiKey?: string;
}

export class AgentProviderFactory {
  static getProvider(
    type: AgentProviderType,
    options?: AgentProviderOptions
  ): AgentProvider {
    switch (type) {
      case 'groq':
        return new GroqAgentProvider(options?.apiKey);
      case 'openai':
        return new OpenAIAgentProvider(options?.apiKey);
      default:
        throw new Error(`Unknown agent provider type: ${type}`);
    }
  }
}
