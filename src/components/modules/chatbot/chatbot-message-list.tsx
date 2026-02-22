// ChatbotMessageList: Shows chat messages with skeleton loader and empty state
import React from 'react';

interface Message {
  id: string;
  sender: 'customer' | 'agent';
  content: string;
}

interface ChatbotMessageListProps {
  messages: Message[];
  loading?: boolean;
}

export const ChatbotMessageList: React.FC<ChatbotMessageListProps> = ({ messages, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-6 w-3/4 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    );
  }
  if (!messages.length) {
    return <div className="text-center text-gray-400 p-4">No messages yet.</div>;
  }
  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto max-h-60">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`rounded-lg px-3 py-2 max-w-xs ${msg.sender === 'agent' ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}
        >
          {msg.content}
        </div>
      ))}
    </div>
  );
};
