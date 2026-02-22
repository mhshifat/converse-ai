// ChannelProvider interface for pluggable communication channels
export interface ChannelProvider {
  startSession(options: {
    customerId: string;
    agentId: string;
    channel: 'text' | 'call';
    metadata?: Record<string, unknown>;
  }): Promise<{ sessionId: string }>;
  sendMessage?(options: {
    sessionId: string;
    message: string;
  }): Promise<void>;
  endSession?(sessionId: string): Promise<void>;
}
