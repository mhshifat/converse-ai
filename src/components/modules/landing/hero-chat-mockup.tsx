'use client';

import React from 'react';
import { Bot, User } from 'lucide-react';

const MESSAGES = [
  { role: 'agent', text: "Hi! I'm your AI assistant. How can I help you today?", delay: '0.6s' },
  { role: 'user', text: 'I want to know about your pricing plans.', delay: '1.4s' },
  { role: 'agent', text: "We have three plans! Let me pull up the details for you...", delay: '2.2s' },
] as const;

export function HeroChatMockup() {
  return (
    <div className="relative w-full max-w-md">
      {/* Glow behind card */}
      <div className="absolute inset-0 -m-4 rounded-3xl bg-linear-to-br from-blue-400/20 via-indigo-400/20 to-violet-400/20 blur-2xl" />

      <div className="relative rounded-2xl border border-gray-200/60 bg-white shadow-2xl shadow-gray-900/8 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs font-medium text-gray-500">ConverseAI Chat</span>
          </div>
          <div className="w-12" />
        </div>

        {/* Chat messages */}
        <div className="p-5 space-y-4 min-h-[280px]">
          {MESSAGES.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              style={{
                animation: `lp-msg-appear 0.5s cubic-bezier(0.22,1,0.36,1) ${msg.delay} both`,
              }}
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  msg.role === 'agent'
                    ? 'bg-linear-to-br from-blue-500 to-indigo-600'
                    : 'bg-gray-200'
                }`}
              >
                {msg.role === 'agent' ? (
                  <Bot className="size-3.5 text-white" />
                ) : (
                  <User className="size-3.5 text-gray-600" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[80%] ${
                  msg.role === 'agent'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          <div
            className="flex gap-2.5"
            style={{ animation: 'lp-msg-appear 0.5s cubic-bezier(0.22,1,0.36,1) 3s both' }}
          >
            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-linear-to-br from-blue-500 to-indigo-600">
              <Bot className="size-3.5 text-white" />
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400"
                  style={{
                    animation: `lp-typing-dot 1.4s ease-in-out infinite ${dot * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex-1 h-9 rounded-full bg-white border border-gray-200 px-4 flex items-center">
            <span className="text-xs text-gray-400">Type a message...</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Floating voice badge */}
      <div
        className="absolute -bottom-3 -left-3 flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-3.5 py-2"
        style={{ animation: 'lp-float 4s ease-in-out infinite' }}
      >
        <div className="w-6 h-6 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-3.07z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-gray-700">Voice AI</span>
        {/* Sound wave bars */}
        <div className="flex items-center gap-[2px] h-4">
          {[0.4, 0.7, 1, 0.6, 0.3].map((scale, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-violet-400"
              style={{
                height: `${scale * 14}px`,
                animation: `logo-wave-bar 1.2s ease-in-out infinite ${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating analytics badge */}
      <div
        className="absolute -top-2 -right-2 flex items-center gap-2 rounded-xl bg-white border border-gray-200 shadow-lg px-3.5 py-2"
        style={{ animation: 'lp-float-reverse 5s ease-in-out infinite' }}
      >
        <div className="flex items-end gap-[3px] h-5">
          {[40, 65, 50, 80, 60].map((h, i) => (
            <span
              key={i}
              className="w-[5px] rounded-sm bg-linear-to-t from-blue-400 to-blue-600"
              style={{ height: `${(h / 100) * 20}px` }}
            />
          ))}
        </div>
        <div className="text-xs">
          <span className="font-bold text-gray-900">98%</span>
          <span className="text-gray-500 ml-1">CSAT</span>
        </div>
      </div>
    </div>
  );
}
