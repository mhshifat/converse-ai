// This file defines the main entity types for the app. All types use camelCase for properties.

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'merchant';
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chatbot {
  id: string;
  projectId: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  systemPrompt: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  chatbotId: string;
  customerId: string;
  agentId: string;
  channel: 'text' | 'call';
  status: 'active' | 'closed';
  startedAt: Date;
  endedAt?: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'agent';
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface Integration {
  id: string;
  tenantId: string;
  type: 'email' | 'discord' | 'sms';
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
