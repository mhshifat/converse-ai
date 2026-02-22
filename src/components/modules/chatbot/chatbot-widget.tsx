// ChatbotWidget: Main chatbot interface (text/call)
import React, { useState } from 'react';
import { MicroPulse } from '../../shared/micro-pulse';

interface ChatbotWidgetProps {
  onStartCall?: () => void;
  onStartText?: () => void;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ onStartCall, onStartText }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-bold text-blue-600 text-lg flex items-center gap-2">
              <MicroPulse /> Chat Assistant
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <span className="text-5xl">💬</span>
            <p className="text-center text-gray-600 mb-2">How would you like to connect?</p>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                onClick={onStartText}
              >
                Text Chat
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition"
                onClick={onStartCall}
              >
                Call
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          className="w-16 h-16 rounded-full bg-blue-600 shadow-xl flex items-center justify-center text-white text-3xl hover:bg-blue-700 transition animate-bounce"
          onClick={() => setOpen(true)}
          aria-label="Open chatbot"
        >
          💬
        </button>
      )}
    </div>
  );
};
