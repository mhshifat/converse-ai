'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mic,
  Send,
  PenLine,
  Sparkles,
  Bot,
  UserRound,
  X,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { clampWidgetPositionOffsetPx, type ChatbotWidgetConfig } from '@/lib/chatbot-widget-config';
import { ConverseLogo } from '@/components/shared/converse-logo';
import { cn } from '@/lib/utils';
import { trpc } from '@/utils/trpc';

interface LiveChatbotPreviewProps {
  config: ChatbotWidgetConfig;
  apiKey: string;
  customerId: string;
  className?: string;
  onConversationInfo?: (info: { agentName: string; conversationId: string }) => void;
  onConversationEnd?: (data: { messages: ChatMessage[]; compiledData: Record<string, unknown> }) => void;
  /** Minutes of no customer activity before showing "any other questions?" warning; then 1 more minute before auto-close. Default 3. */
  inactivityMinutes?: number;
}

interface ChatMessage {
  role: 'customer' | 'agent' | 'human_agent';
  content: string;
  payload?: Record<string, unknown> | null;
}

export type { ChatMessage };

function mixDownToMono(audioBuffer: AudioBuffer): Float32Array {
  const len = audioBuffer.length;
  const out = new Float32Array(len);
  const n = audioBuffer.numberOfChannels;
  for (let i = 0; i < n; i++) {
    const ch = audioBuffer.getChannelData(i)!;
    for (let j = 0; j < len; j++) out[j]! += ch[j]!;
  }
  for (let j = 0; j < len; j++) out[j]! /= n;
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number, numChannels: number): ArrayBuffer {
  const numSamples = samples.length * numChannels;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const setUint32 = (offset: number, value: number) => view.setUint32(offset, value, true);
  let pos = 0;
  const str = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
    pos += s.length;
  };
  str('RIFF');
  setUint32(pos, 36 + dataSize);
  pos += 4;
  str('WAVE');
  str('fmt ');
  setUint32(pos, 16);
  pos += 4;
  view.setUint16(pos, 1, true);
  pos += 2;
  view.setUint16(pos, numChannels, true);
  pos += 2;
  setUint32(pos, sampleRate);
  pos += 4;
  setUint32(pos, sampleRate * numChannels * 2);
  pos += 4;
  view.setUint16(pos, numChannels * 2, true);
  pos += 2;
  view.setUint16(pos, 16, true);
  pos += 2;
  str('data');
  setUint32(pos, dataSize);
  pos += 4;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(pos, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    pos += 2;
  }
  return buffer;
}

export function LiveChatbotPreview({
  config,
  apiKey,
  customerId,
  className,
  onConversationInfo,
  onConversationEnd,
  inactivityMinutes = 3,
}: LiveChatbotPreviewProps) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [endedConversationId, setEndedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [ended, setEnded] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const handoffRequestedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAgentAudio, setIsPlayingAgentAudio] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const endConversationMutateRef = useRef<(input: { conversationId: string }) => void>(() => {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<'chat' | 'voice'>(mode);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardChunksRef = useRef(false);
  const restartRecorderRef = useRef<() => void>(() => {});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSpeechRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const isPlayingAgentAudioRef = useRef(false);
  const lastHandoffMessageCountRef = useRef(0);
  const handoffMessagesSyncRef = useRef<string | null>(null);
  const handoffTtsInitializedRef = useRef(false);
  type PendingVoiceItem = { type: 'tts'; text: string } | { type: 'audio'; url: string };
  const pendingTtsQueueRef = useRef<PendingVoiceItem[]>([]);
  const onTtsPlaybackEndRef = useRef<() => void>(() => {});
  const voiceSignalingWsRef = useRef<WebSocket | null>(null);
  const voicePeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const voiceRemoteAudioRef = useRef<HTMLAudioElement | null>(null);
  /** Mic opened only for WebRTC handoff (not shared with MediaRecorder); stopped on teardown. */
  const voiceHandoffLocalStreamRef = useRef<MediaStream | null>(null);
  const [liveVoiceConnected, setLiveVoiceConnected] = useState(false);
  const liveVoiceConnectedRef = useRef(false);
  const endedRef = useRef(false);
  const lastTtsTextRef = useRef('');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopAllAudioRef = useRef<() => void>(() => {});
  conversationIdRef.current = conversationId;
  modeRef.current = mode;
  isPlayingAgentAudioRef.current = isPlayingAgentAudio;
  endedRef.current = ended;
  liveVoiceConnectedRef.current = liveVoiceConnected;
  handoffRequestedRef.current = handoffRequested;

  const { bubble, popup, header, footer, messages: msgCfg } = config;
  const logoSize = header.logoSize ?? 28;
  const primary = config.primaryColor ?? '#2563eb';
  const bubbleBg = bubble.backgroundColor || primary;
  const userBubbleBg = msgCfg.userBubbleBackground || primary;
  const sendBtnBg = footer.sendButtonBackground || primary;

  const sendFirstMessage = trpc.widget.sendFirstMessage.useMutation({
    onSuccess: (data) => {
      if (data && 'unavailable' in data) {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: (data as { message?: string }).message || 'We are unable to take your message at the moment.' },
        ]);
        return;
      }
      if (data?.conversationId) {
        setConversationId(data.conversationId);
        setEnded(false);
        setEndedConversationId(null);
        setRatingSubmitted(false);
        onConversationInfo?.({ conversationId: data.conversationId, agentName: 'Unknown' });
      }
      if (data?.response != null) {
        setMessages((prev) => [...prev, { role: 'agent', content: data.response }]);
        startInactivityTimersAfterSend();
        if (modeRef.current === 'voice') {
          speakAgent(data.response);
        }
      }
      if (data?.handoffRequested) setHandoffRequested(true);
      if (data?.conversationEnded) {
        setEndedConversationId(data.conversationId);
        setConversationId(null);
        setEnded(true);
        setRatingSubmitted(false);
        const endedMessages = (data as { messages?: ChatMessage[] }).messages ?? [];
        const compiled = (data as { compiledData?: Record<string, unknown> }).compiledData ?? {};
        onConversationEnd?.({ messages: endedMessages, compiledData: compiled });
      }
    },
  });

  const sendMessage = trpc.widget.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data?.response != null) {
        setMessages((prev) => [...prev, { role: 'agent', content: data.response }]);
        startInactivityTimersAfterSend();
        if (modeRef.current === 'voice') {
          speakAgent(data.response);
        }
      }
      if (data?.handoffRequested) {
        setHandoffRequested(true);
      }
      if (data?.conversationEnded) {
        setEndedConversationId(conversationId);
        setConversationId(null);
        setEnded(true);
        setRatingSubmitted(false);
        const endedMessages = (data as { messages?: ChatMessage[] }).messages ?? [];
        const compiled = (data as { compiledData?: Record<string, unknown> }).compiledData ?? {};
        onConversationEnd?.({ messages: endedMessages, compiledData: compiled });
      }
    },
  });

  const endConversation = trpc.widget.endConversation.useMutation({
    onSuccess: (data, variables) => {
      const compiled = (data as { compiledData?: Record<string, unknown> })?.compiledData ?? {};
      setEndedConversationId(variables.conversationId);
      setConversationId(null);
      setHandoffRequested(false);
      setEnded(true);
      setRatingSubmitted(false);
      onConversationEnd?.({ messages, compiledData: compiled });
    },
  });

  const submitRating = trpc.widget.submitRating.useMutation({
    onSuccess: () => setRatingSubmitted(true),
  });
  endConversationMutateRef.current = endConversation.mutate;

  const transcribeVoice = trpc.widget.transcribeVoice.useMutation();
  const synthesizeSpeech = trpc.widget.synthesizeSpeech.useMutation({
    onSuccess: (data) => {
      // Restart recorder so echo from TTS is discarded and next chunks start with a fresh init segment
      restartRecorderRef.current();
      const blob = new Blob(
        [Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0))],
        { type: 'audio/wav' }
      );
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setIsPlayingAgentAudio(true);
      audio.onended = () => {
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        setIsPlayingAgentAudio(false);
        onTtsPlaybackEndRef.current?.();
      };
      audio.onerror = () => {
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
        setIsPlayingAgentAudio(false);
        onTtsPlaybackEndRef.current?.();
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          setIsPlayingAgentAudio(false);
          onTtsPlaybackEndRef.current?.();
          console.warn('TTS playback blocked or failed:', err);
        });
      }
    },
    onError: (err) => {
      console.warn('TTS synthesis failed, falling back to browser TTS:', err.message);
      restartRecorderRef.current();
      if (typeof window !== 'undefined' && window.speechSynthesis && lastTtsTextRef.current) {
        const utterance = new SpeechSynthesisUtterance(lastTtsTextRef.current);
        utterance.rate = 1;
        utterance.pitch = 1;
        setIsPlayingAgentAudio(true);
        utterance.onend = () => {
          setIsPlayingAgentAudio(false);
          onTtsPlaybackEndRef.current?.();
        };
        utterance.onerror = () => {
          setIsPlayingAgentAudio(false);
          onTtsPlaybackEndRef.current?.();
        };
        window.speechSynthesis.speak(utterance);
      }
    },
  });

  const speakAgent = useCallback((text: string) => {
    lastTtsTextRef.current = text;
    synthesizeSpeech.mutate({ apiKey, text });
  }, [apiKey, synthesizeSpeech]);

  const HANDOFF_MESSAGE = 'Connecting you with a support agent. Please wait.';

  const requestHumanHandoff = trpc.widget.requestHumanHandoff.useMutation({
    onSuccess: () => {
      setHandoffRequested(true);
      setMessages((prev) => [...prev, { role: 'agent', content: HANDOFF_MESSAGE }]);
      if (modeRef.current === 'voice') {
        speakAgent(HANDOFF_MESSAGE);
      }
    },
  });

  const { data: handoffMessages } = trpc.widget.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId && handoffRequested, refetchInterval: 3500 }
  );

  const processTtsQueue = useCallback(() => {
    if (isPlayingAgentAudioRef.current) return;
    while (pendingTtsQueueRef.current.length > 0) {
      const item = pendingTtsQueueRef.current.shift();
      if (!item) continue;
      if (item.type === 'audio') {
        const audio = new Audio(item.url);
        setIsPlayingAgentAudio(true);
        audio.onended = () => {
          setIsPlayingAgentAudio(false);
          onTtsPlaybackEndRef.current?.();
        };
        audio.onerror = () => {
          setIsPlayingAgentAudio(false);
          onTtsPlaybackEndRef.current?.();
        };
        audio.play().catch(() => {
          setIsPlayingAgentAudio(false);
          onTtsPlaybackEndRef.current?.();
        });
        return;
      }
      if (item.type === 'tts' && item.text.trim()) {
        speakAgent(item.text);
        return;
      }
    }
  }, [speakAgent]);

  useEffect(() => {
    onTtsPlaybackEndRef.current = processTtsQueue;
  }, [processTtsQueue]);

  useEffect(() => {
    if (!handoffRequested) {
      lastHandoffMessageCountRef.current = 0;
      handoffMessagesSyncRef.current = null;
      handoffTtsInitializedRef.current = false;
      pendingTtsQueueRef.current = [];
    }
  }, [handoffRequested]);

  useEffect(() => {
    if (!handoffRequested || !handoffMessages?.messages) return;
    const list = handoffMessages.messages;
    const signature = list.length + '|' + list.map((m) => m.content).join('\0');
    if (handoffMessagesSyncRef.current === signature) return;
    handoffMessagesSyncRef.current = signature;
    setMessages(
      list.map((m) => ({
        role: m.senderType === 'customer' ? 'customer' : ('agent' as 'agent'),
        content: m.content,
        payload: m.payload ?? undefined,
      }))
    );
    const len = list.length;
    if (!handoffTtsInitializedRef.current) {
      lastHandoffMessageCountRef.current = len;
      handoffTtsInitializedRef.current = true;
    } else if (len > lastHandoffMessageCountRef.current) {
      const newMessages = list.slice(lastHandoffMessageCountRef.current);
      for (const m of newMessages) {
        if (m.senderType === 'customer') continue;
        const payload = m.payload as { type?: string; url?: string } | null | undefined;
        if (payload?.type === 'audio' && typeof payload?.url === 'string') {
          pendingTtsQueueRef.current.push({ type: 'audio', url: payload.url });
        } else if (m.content?.trim()) {
          pendingTtsQueueRef.current.push({ type: 'tts', text: m.content });
        }
      }
      lastHandoffMessageCountRef.current = len;
      if (modeRef.current === 'voice' && !liveVoiceConnectedRef.current) processTtsQueue();
    }
  }, [handoffRequested, handoffMessages, processTtsQueue]);

  const signalingUrl =
    typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_VOICE_SIGNALING_WS_URL as string | undefined) : undefined;

  useEffect(() => {
    if (!signalingUrl || !conversationId || !handoffRequested || mode !== 'voice') {
      setLiveVoiceConnected(false);
      return;
    }
    const url =
      signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')
        ? signalingUrl
        : `wss://${signalingUrl}`;
    const ws = new WebSocket(url);
    voiceSignalingWsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', conversationId, role: 'customer' }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
          from?: string;
        };
        if (data.type === 'joined') {
          return;
        }
        if (data.type === 'error') {
          return;
        }
        if (data.type === 'offer' && data.sdp) {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          voicePeerConnectionRef.current = pc;
          const audio = document.createElement('audio');
          audio.autoplay = true;
          voiceRemoteAudioRef.current = audio;
          pc.ontrack = (e) => {
            if (e.streams[0]) {
              audio.srcObject = e.streams[0];
              setLiveVoiceConnected(true);
            }
          };
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const recStream = streamRef.current;
          let micStream: MediaStream;
          if (
            isRecordingRef.current &&
            recStream?.getAudioTracks().some((t) => t.readyState === 'live')
          ) {
            micStream = recStream;
            voiceHandoffLocalStreamRef.current = null;
          } else {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceHandoffLocalStreamRef.current = micStream;
          }
          micStream.getAudioTracks().forEach((track) => pc.addTrack(track, micStream));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
          pc.onicecandidate = (e) => {
            if (e.candidate) ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate }));
          };
          return;
        }
        if (data.type === 'ice-candidate' && data.candidate) {
          const pc = voicePeerConnectionRef.current;
          if (pc) pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
      } catch (_) {
        // ignore parse/handling errors
      }
    };

    ws.onclose = () => {
      setLiveVoiceConnected(false);
      voicePeerConnectionRef.current?.close();
      voicePeerConnectionRef.current = null;
      voiceHandoffLocalStreamRef.current?.getTracks().forEach((t) => t.stop());
      voiceHandoffLocalStreamRef.current = null;
      voiceRemoteAudioRef.current?.remove();
      voiceRemoteAudioRef.current = null;
    };

    return () => {
      ws.close();
      voiceSignalingWsRef.current = null;
      voicePeerConnectionRef.current?.close();
      voicePeerConnectionRef.current = null;
      voiceHandoffLocalStreamRef.current?.getTracks().forEach((t) => t.stop());
      voiceHandoffLocalStreamRef.current = null;
      voiceRemoteAudioRef.current?.remove();
      voiceRemoteAudioRef.current = null;
      setLiveVoiceConnected(false);
    };
  }, [signalingUrl, conversationId, handoffRequested, mode]);

  const clearInactivityTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setShowInactivityWarning(false);
  }, []);

  const hasUserSentMessage = messages.some((m) => m.role === 'customer');

  useEffect(() => {
    if (!conversationId || ended) {
      clearInactivityTimers();
      return;
    }
    if (!hasUserSentMessage) {
      clearInactivityTimers();
      return;
    }
    clearInactivityTimers();
    const warningMs = Math.max(1, inactivityMinutes - 1) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowInactivityWarning(true);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        const cid = conversationIdRef.current;
        if (cid) {
          endConversationMutateRef.current({ conversationId: cid });
        }
      }, 60 * 1000);
    }, warningMs);
    return () => clearInactivityTimers();
  }, [conversationId, ended, hasUserSentMessage, inactivityMinutes, clearInactivityTimers]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        silenceCheckIntervalRef.current && clearInterval(silenceCheckIntervalRef.current);
        mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        audioContextRef.current?.close();
      }
    };
  }, []);

  const startInactivityTimersAfterSend = useCallback(() => {
    clearInactivityTimers();
    if (!conversationIdRef.current || ended) return;
    const warningMs = Math.max(1, inactivityMinutes - 1) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowInactivityWarning(true);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        const cid = conversationIdRef.current;
        if (cid) {
          endConversationMutateRef.current({ conversationId: cid });
        }
      }, 60 * 1000);
    }, warningMs);
  }, [ended, inactivityMinutes, clearInactivityTimers]);

  const handleSend = useCallback(
    (attachmentUrl?: string) => {
      const text = input.trim() || (attachmentUrl ? '(attachment)' : '');
      if (!text) return;
      if (conversationId) {
        if (sendMessage.isPending) return;
      } else {
        if (!apiKey || sendFirstMessage.isPending) return;
      }
      const channel = mode === 'voice' ? 'call' : 'text';
      setInput('');
      setMessages((prev) => [...prev, { role: 'customer', content: text }]);
      if (conversationId) {
        sendMessage.mutate({ conversationId, content: text, attachmentUrl });
      } else {
        sendFirstMessage.mutate({ apiKey, customerId, channel, content: text, attachmentUrl });
      }
      startInactivityTimersAfterSend();
    },
    [
      input,
      conversationId,
      apiKey,
      customerId,
      mode,
      sendMessage,
      sendFirstMessage,
      startInactivityTimersAfterSend,
    ]
  );


  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !apiKey) return;
      try {
        const form = new FormData();
        form.set('apiKey', apiKey);
        form.set('file', file);
        const res = await fetch('/api/widget/upload', { method: 'POST', body: form });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          console.error(data.error ?? 'Upload failed');
          return;
        }
        if (data.url) handleSend(data.url);
      } catch (err) {
        console.error('Upload failed', err);
      }
      e.target.value = '';
    },
    [apiKey, handleSend]
  );

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64 ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  /** Decode WebM/recording blob to WAV so Groq Whisper accepts it reliably. */
  const recordingToWav = useCallback(async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const numChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const channel = audioBuffer.numberOfChannels > 1
      ? mixDownToMono(audioBuffer)
      : audioBuffer.getChannelData(0)!;
    const wavBuffer = encodeWav(channel, sampleRate, numChannels);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }, []);

  const processRecordedAudio = useCallback(
    async (blob: Blob) => {
      if (!apiKey || endedRef.current) return;
      if (handoffRequestedRef.current && liveVoiceConnectedRef.current) return;
      try {
        let payloadBlob: Blob;
        let contentType: string;
        try {
          payloadBlob = await recordingToWav(blob);
          contentType = 'audio/wav';
        } catch {
          payloadBlob = blob;
          contentType = blob.type || 'audio/webm';
        }
        const audioBase64 = await blobToBase64(payloadBlob);
        const { text } = await transcribeVoice.mutateAsync({
          apiKey,
          audioBase64,
          contentType,
        });
        const content = text?.trim() || '(no speech detected)';
        setMessages((prev) => [...prev, { role: 'customer', content }]);
        startInactivityTimersAfterSend();
        if (conversationIdRef.current) {
          sendMessage.mutate({ conversationId: conversationIdRef.current, content });
        } else {
          sendFirstMessage.mutate({
            apiKey,
            customerId,
            channel: 'call',
            content,
          });
        }
      } catch (err) {
        console.error('Voice: transcribe or send failed', err);
      }
    },
    [
      apiKey,
      customerId,
      recordingToWav,
      transcribeVoice,
      sendMessage,
      sendFirstMessage,
      startInactivityTimersAfterSend,
    ]
  );

  const VOICE_SILENCE_MS = 800;
  const VOICE_CHECK_MS = 150;
  const VOICE_VOLUME_THRESHOLD = 0.01;
  const RECORDER_TIMESLICE_MS = 300;

  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAgentAudio(false);
    pendingTtsQueueRef.current = [];
  }, []);

  useEffect(() => {
    stopAllAudioRef.current = stopAllAudio;
  }, [stopAllAudio]);

  const endVoiceCall = useCallback(() => {
    stopAllAudio();
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
    hasSpeechRef.current = false;
    silenceStartRef.current = null;
    isRecordingRef.current = false;
    setIsRecording(false);
  }, [stopAllAudio]);

  useEffect(() => {
    if ((mode === 'chat' || ended) && isRecording) endVoiceCall();
    if (ended) stopAllAudio();
  }, [mode, ended, isRecording, endVoiceCall, stopAllAudio]);

  const startVoiceCall = useCallback(async () => {
    if (isRecordingRef.current) return;
    try {
      // Unlock audio for TTS playback (browser autoplay policy requires play() from user gesture)
      const silentWav =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAA==';
      const unlock = new Audio(silentWav);
      unlock.volume = 0;
      void unlock.play().catch(() => {});

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      hasSpeechRef.current = false;
      silenceStartRef.current = null;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const onDataAvailable = (e: BlobEvent) => {
        if (discardChunksRef.current) return;
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      /** Stop current recorder and start a fresh one so subsequent chunks have a valid WebM init segment. */
      const doRestartRecorder = () => {
        const s = streamRef.current;
        const oldRec = mediaRecorderRef.current;
        if (!s) return;
        discardChunksRef.current = true;
        if (oldRec && oldRec.state !== 'inactive') {
          try { oldRec.stop(); } catch {}
        }
        audioChunksRef.current = [];
        hasSpeechRef.current = false;
        silenceStartRef.current = null;
        const fresh = new MediaRecorder(s);
        fresh.ondataavailable = onDataAvailable;
        fresh.start(RECORDER_TIMESLICE_MS);
        mediaRecorderRef.current = fresh;
        setTimeout(() => { discardChunksRef.current = false; }, 0);
      };
      restartRecorderRef.current = doRestartRecorder;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = onDataAvailable;
      recorder.start(RECORDER_TIMESLICE_MS);
      mediaRecorderRef.current = recorder;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      silenceCheckIntervalRef.current = setInterval(() => {
        const rec = mediaRecorderRef.current;
        const anal = analyserRef.current;
        if (!rec || rec.state !== 'recording' || !anal) return;

        anal.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const n = (dataArray[i]! - 128) / 128;
          sum += n * n;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Barge-in: when user starts speaking while agent is playing, stop agent and listen
        if (rms > VOICE_VOLUME_THRESHOLD && isPlayingAgentAudioRef.current) {
          stopAllAudioRef.current();
          hasSpeechRef.current = true;
          silenceStartRef.current = null;
          doRestartRecorder();
          return;
        }
        if (isPlayingAgentAudioRef.current) return;

        if (rms > VOICE_VOLUME_THRESHOLD) {
          hasSpeechRef.current = true;
          silenceStartRef.current = null;
          return;
        }
        if (!hasSpeechRef.current || audioChunksRef.current.length === 0) return;

        const now = Date.now();
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
          return;
        }
        if (now - silenceStartRef.current < VOICE_SILENCE_MS) return;

        const chunks = [...audioChunksRef.current];
        if (chunks.length === 0) return;
        audioChunksRef.current = [];
        hasSpeechRef.current = false;
        silenceStartRef.current = null;

        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size > 0) processRecordedAudio(blob);

        doRestartRecorder();
      }, VOICE_CHECK_MS);

      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access failed', err);
    }
  }, [processRecordedAudio]);

  const handleClose = useCallback(() => {
    stopAllAudio();
    if (isRecording) endVoiceCall();
    setOpen(false);
    if (conversationId) {
      endConversation.mutate({ conversationId });
    }
  }, [conversationId, endConversation, stopAllAudio, isRecording, endVoiceCall]);

  const handleStayInChat = useCallback(() => {
    clearInactivityTimers();
    if (!conversationIdRef.current || ended) return;
    const warningMs = Math.max(1, inactivityMinutes - 1) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      setShowInactivityWarning(true);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        const cid = conversationIdRef.current;
        if (cid) {
          endConversationMutateRef.current({ conversationId: cid });
        }
      }, 60 * 1000);
    }, warningMs);
  }, [ended, inactivityMinutes, clearInactivityTimers]);

  const viewportPosition = {
    'bottom-right': 'items-end justify-end',
    'bottom-left': 'items-end justify-start',
    'top-right': 'items-start justify-end',
    'top-left': 'items-start justify-start',
  };
  const it = clampWidgetPositionOffsetPx(Number(config.widgetInsetTopPx ?? 0));
  const ir = clampWidgetPositionOffsetPx(Number(config.widgetInsetRightPx ?? 0));
  const ib = clampWidgetPositionOffsetPx(Number(config.widgetInsetBottomPx ?? 0));
  const il = clampWidgetPositionOffsetPx(Number(config.widgetInsetLeftPx ?? 0));
  const edge = 16;
  const widgetAnchorStyle =
    config.position === 'bottom-right'
      ? { bottom: edge + ib, right: edge + ir }
      : config.position === 'bottom-left'
        ? { bottom: edge + ib, left: edge + il }
        : config.position === 'top-right'
          ? { top: edge + it, right: edge + ir }
          : { top: edge + it, left: edge + il };

  return (
    <div
      className={cn('relative h-full min-h-[480px] rounded-xl border border-border/60 bg-muted/20', className)}
      style={{ minHeight: popup.height + 100 }}
    >
      <p className="absolute left-3 top-3 text-xs font-medium text-muted-foreground">
        Live preview — test as your customer
      </p>
      <div className={cn('absolute inset-0 flex p-6', viewportPosition[config.position])}>
        <div className="absolute" style={widgetAnchorStyle}>
          {/* Bubble */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.borderRadius,
              backgroundColor: bubbleBg,
              color: bubble.iconColor,
              boxShadow: bubble.shadow,
            }}
            aria-label="Toggle chat"
          >
            <MessageSquare className="size-6" />
          </button>

          {/* Popup */}
          {open && (
            <div
              className="absolute flex flex-col overflow-hidden animate-[chat-pop-in_0.25s_ease-out]"
              style={{
                width: popup.width,
                height: popup.height,
                borderRadius: popup.borderRadius,
                boxShadow: popup.shadow,
                backgroundColor: popup.backgroundColor,
                ...(config.position.includes('bottom')
                  ? { bottom: bubble.size + 12, right: config.position === 'bottom-right' ? 0 : undefined, left: config.position === 'bottom-left' ? 0 : undefined }
                  : { top: bubble.size + 12, right: config.position === 'top-right' ? 0 : undefined, left: config.position === 'top-left' ? 0 : undefined }),
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                style={{
                  backgroundColor: header.backgroundColor,
                  color: header.textColor,
                  borderBottom: `1px solid ${footer.borderColor}`,
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {header.logoUrl ? (
                    <img
                      src={header.logoUrl}
                      alt=""
                      className="shrink-0 rounded object-contain"
                      style={{ width: logoSize, height: logoSize }}
                    />
                  ) : (
                    <span
                      className="flex shrink-0 items-center justify-center rounded bg-foreground text-background"
                      style={{ width: logoSize, height: logoSize }}
                    >
                      <ConverseLogo size={logoSize * 0.6} className="[&_svg]:text-background" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate font-semibold" style={{ fontSize: header.fontSize }}>
                      {header.title}
                    </span>
                    {header.subtitle && (
                      <span className="block truncate text-xs opacity-70" style={{ color: header.textColor }}>
                        {header.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                {header.statusText && (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1">
                    <span
                      className="size-2 rounded-full animate-[chat-status-pulse_2s_ease-in-out_infinite]"
                      style={{ backgroundColor: header.statusDotColor ?? '#22c55e' }}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {header.statusText}
                    </span>
                  </div>
                )}
                {header.showCloseButton && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground active:scale-95"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Messages area */}
              <div
                ref={listRef}
                className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
                style={{ backgroundColor: popup.backgroundColor }}
              >
                {/* Welcome */}
                <div
                  className="flex items-start gap-2 animate-[chat-welcome-in_0.35s_ease-out]"
                  style={{
                    color: msgCfg.welcomeTextColor,
                    fontSize: msgCfg.fontSize,
                  }}
                >
                  <span
                    className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-muted/80 p-1.5"
                    style={{ color: msgCfg.welcomeTextColor }}
                  >
                    <Sparkles className="size-3.5" />
                  </span>
                  <span className="leading-snug">{config.welcomeMessage}</span>
                </div>

                {/* Real messages */}
                {messages.map((msg, i) =>
                  msg.role === 'customer' ? (
                    <div key={i} className="flex items-end justify-end gap-2 animate-[chat-msg-in-user_0.3s_ease-out_both]">
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm space-y-1"
                        style={{
                          backgroundColor: userBubbleBg,
                          color: msgCfg.userBubbleTextColor,
                          fontSize: msgCfg.fontSize,
                          borderRadius: msgCfg.bubbleBorderRadius,
                        }}
                      >
                        {msg.payload?.type === 'file' && typeof msg.payload?.url === 'string' && (
                          msg.payload.url.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                            <img
                              src={msg.payload.url}
                              alt="Attachment"
                              className="rounded-lg max-h-40 object-cover"
                            />
                          ) : (
                            <a
                              href={msg.payload.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline break-all text-xs"
                              style={{ color: msgCfg.userBubbleTextColor }}
                            >
                              View attachment
                            </a>
                          )
                        )}
                        {msg.content !== '(attachment)' && msg.content}
                      </div>
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
                        style={{
                          backgroundColor: userBubbleBg,
                          borderColor: userBubbleBg,
                          color: msgCfg.userBubbleTextColor,
                        }}
                      >
                        <UserRound className="size-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div key={i} className="flex items-end justify-start gap-2 animate-[chat-msg-in-agent_0.3s_ease-out_both]">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                        style={{
                          backgroundColor: msgCfg.agentBubbleBackground,
                          color: msgCfg.agentBubbleTextColor,
                        }}
                      >
                        <Bot className="size-3.5" />
                      </span>
                      <div
                        className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm"
                        style={{
                          backgroundColor: msgCfg.agentBubbleBackground,
                          color: msgCfg.agentBubbleTextColor,
                          fontSize: msgCfg.fontSize,
                          borderRadius: msgCfg.bubbleBorderRadius,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                )}

                {/* Typing indicator */}
                {(sendMessage.isPending || sendFirstMessage.isPending) && (
                  <div className="flex items-end justify-start gap-2">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full shadow-sm"
                      style={{
                        backgroundColor: msgCfg.agentBubbleBackground,
                        color: msgCfg.agentBubbleTextColor,
                      }}
                    >
                      <Bot className="size-3.5" />
                    </span>
                    <div
                      className="flex flex-col gap-1 rounded-2xl px-4 py-3 shadow-sm"
                      style={{
                        backgroundColor: msgCfg.agentBubbleBackground,
                        borderRadius: msgCfg.bubbleBorderRadius,
                      }}
                    >
                      <span className="text-xs font-medium opacity-80" style={{ color: msgCfg.agentBubbleTextColor }}>
                        Agent is typing…
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0ms]" style={{ color: msgCfg.agentBubbleTextColor }} />
                        <span className="size-2 rounded-full bg-current opacity-40 animate-bounce [animation-delay:150ms]" style={{ color: msgCfg.agentBubbleTextColor }} />
                        <span className="size-2 rounded-full bg-current opacity-40 animate-bounce [animation-delay:300ms]" style={{ color: msgCfg.agentBubbleTextColor }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Inactivity warning: "Do you have any other questions?" */}
                {showInactivityWarning && !ended && (
                  <div
                    className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2.5 text-left"
                  >
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Do you have any other questions? This chat will close in 1 minute due to inactivity.
                    </p>
                  </div>
                )}

                {ended && (
                  <div className="space-y-3">
                    {endedConversationId && !ratingSubmitted && (
                      <div
                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 p-3"
                        style={{ color: msgCfg.welcomeTextColor }}
                      >
                        <p className="text-sm font-medium">
                          {config.defaultRatingType === 'nps'
                            ? 'How likely are you to recommend us? (0 = not at all, 10 = extremely)'
                            : 'How was your experience?'}
                        </p>
                        {config.defaultRatingType === 'nps' ? (
                          <div className="flex flex-wrap gap-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() =>
                                  submitRating.mutate({
                                    conversationId: endedConversationId,
                                    ratingType: 'nps',
                                    ratingValue: score,
                                  })
                                }
                                disabled={submitRating.isPending}
                                className="flex size-9 items-center justify-center rounded-md border border-border/60 bg-background text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                                aria-label={`Score ${score}`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                submitRating.mutate({
                                  conversationId: endedConversationId,
                                  ratingType: 'thumbs',
                                  ratingValue: 1,
                                })
                              }
                              disabled={submitRating.isPending}
                              className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-muted"
                              aria-label="Good"
                            >
                              <ThumbsUp className="size-5 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                submitRating.mutate({
                                  conversationId: endedConversationId,
                                  ratingType: 'thumbs',
                                  ratingValue: -1,
                                })
                              }
                              disabled={submitRating.isPending}
                              className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-muted"
                              aria-label="Bad"
                            >
                              <ThumbsDown className="size-5 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {ratingSubmitted && (
                      <p className="text-xs text-muted-foreground text-center">Thanks for your feedback.</p>
                    )}
                    <div className="text-center text-xs text-muted-foreground py-2 px-2 rounded-md bg-muted/50">
                      This conversation has ended. Send a new message below to start a new conversation.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer: mode switch + input or stay in chat */}
              <div
                className="flex flex-col gap-2 p-3"
                style={{
                  backgroundColor: footer.backgroundColor,
                  borderTop: `1px solid ${footer.borderColor}`,
                }}
              >
                {config.voiceEnabled && (
                  <div className="flex rounded-lg p-0.5" style={{ backgroundColor: footer.borderColor + '40' }}>
                    <button
                      type="button"
                      onClick={() => setMode('chat')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all duration-200',
                        mode === 'chat'
                          ? 'text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      style={
                        mode === 'chat'
                          ? { backgroundColor: sendBtnBg, color: footer.sendButtonTextColor }
                          : undefined
                      }
                    >
                      <MessageSquare className="size-3.5" />
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all duration-200',
                        mode === 'voice'
                          ? 'text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      style={
                        mode === 'voice'
                          ? { backgroundColor: sendBtnBg, color: footer.sendButtonTextColor }
                          : undefined
                      }
                    >
                      <Mic className="size-3.5" />
                      Voice
                    </button>
                  </div>
                )}

                {mode === 'chat' ? (
                  <div className="flex flex-col gap-2">
                    {showInactivityWarning && !ended && (
                      <button
                        type="button"
                        onClick={handleStayInChat}
                        className="w-full rounded-md py-2 text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: sendBtnBg,
                          color: footer.sendButtonTextColor,
                        }}
                      >
                        Stay in chat
                      </button>
                    )}
                    <div className="flex gap-2">
                      {config.attachmentsEnabled && (
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf,.txt"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={!apiKey}
                        />
                      )}
                      <div
                        className="flex flex-1 items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-1"
                        style={{
                          backgroundColor: footer.inputBackground,
                          borderColor: footer.borderColor,
                          borderRadius: footer.inputBorderRadius * 2,
                        }}
                      >
                        {config.attachmentsEnabled && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!apiKey}
                            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 disabled:opacity-40"
                            style={{ color: msgCfg.welcomeTextColor }}
                            aria-label="Attach file"
                          >
                            <Paperclip className="size-4" />
                          </button>
                        )}
                        <PenLine
                          className="size-4 shrink-0"
                          style={{ color: msgCfg.welcomeTextColor }}
                        />
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          disabled={!apiKey}
                          placeholder={footer.inputPlaceholder}
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-70 disabled:opacity-50"
                          style={{ color: footer.inputTextColor }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || (conversationId ? sendMessage.isPending : !apiKey || sendFirstMessage.isPending)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 hover:opacity-90 disabled:opacity-50"
                        style={{
                          backgroundColor: sendBtnBg,
                          color: footer.sendButtonTextColor,
                          borderRadius: footer.sendButtonBorderRadius * 2,
                          boxShadow: `0 2px 8px ${sendBtnBg}40`,
                        }}
                        aria-label="Send"
                      >
                        <Send className="size-4" />
                      </button>
                    </div>
                    {handoffRequested && (
                      <p
                        className="mt-2 text-center text-xs"
                        style={{ color: msgCfg.welcomeTextColor }}
                      >
                        {liveVoiceConnected
                          ? 'Agent is speaking live'
                          : handoffMessages?.assignedHumanAgentId
                            ? 'Connected to support agent'
                            : 'Looking for an agent... Please hold.'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-xl py-3"
                    style={{
                      backgroundColor: footer.borderColor + '30',
                      borderRadius: footer.inputBorderRadius,
                    }}
                  >
                    <button
                      type="button"
                      onClick={isRecording ? endVoiceCall : startVoiceCall}
                      disabled={!apiKey}
                      className={cn(
                        'flex size-14 items-center justify-center rounded-full transition-transform active:scale-95 hover:opacity-90 disabled:opacity-50',
                        isRecording && !isPlayingAgentAudio && 'animate-pulse'
                      )}
                      style={{
                        backgroundColor: isRecording ? '#dc2626' : sendBtnBg,
                        color: footer.sendButtonTextColor,
                        boxShadow: `0 2px 12px ${isRecording ? '#dc262650' : sendBtnBg}50`,
                      }}
                      aria-label={isRecording ? 'End call' : 'Start voice call'}
                    >
                      {isRecording ? (
                        <PhoneOff className="size-6" />
                      ) : (
                        <Phone className="size-6" />
                      )}
                    </button>
                    <span
                      className="text-xs font-medium text-center max-w-[180px]"
                      style={{ color: msgCfg.welcomeTextColor }}
                    >
                      {!isRecording
                        ? 'Start call — speak naturally, agent replies when you pause'
                        : isPlayingAgentAudio
                          ? 'Agent speaking…'
                          : transcribeVoice.isPending || sendMessage.isPending || sendFirstMessage.isPending
                            ? 'Sending…'
                            : 'Listening… speak, then pause to get a reply'}
                    </span>
                  </div>
                )}
                {config.showPoweredBy && (
                  <p className="mt-2 text-center">
                    <a
                      href="https://converseai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Powered by ConverseAI
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
