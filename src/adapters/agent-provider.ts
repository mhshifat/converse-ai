// Adapter interface for LLM/chat agent providers (Groq, OpenAI, etc.)

export interface AgentProvider {
  sendMessage(options: {
    prompt: string;
    conversationId: string;
    agentId: string;
    context?: Record<string, unknown>;
  }): Promise<{ response: string }>
}

// Adapter interface for call/chat channel providers
export interface ChannelProvider {
  startSession(options: {
    customerId: string;
    agentId: string;
    channel: 'text' | 'call';
    metadata?: Record<string, unknown>;
  }): Promise<{ sessionId: string }>
}
