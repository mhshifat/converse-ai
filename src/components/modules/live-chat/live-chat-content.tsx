'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  User,
  XCircle,
  MessageCircle,
  ArrowRightLeft,
  Phone,
  PhoneOff,
  Info,
  Search,
  Headphones,
  Sparkles,
  Copy,
  Check,
  Bot,
  Hash,
  Radio,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  LiveChatMessageRow,
  type LiveChatMessageBubble,
} from '@/components/modules/live-chat/live-chat-message-row';
import { LiveChatComposer } from '@/components/modules/live-chat/live-chat-composer';

function chatbotInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

interface LiveChatContentProps {
  projectId?: string;
}

export function LiveChatContent({ projectId }: LiveChatContentProps = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [input, setInput] = useState('');
  const selectConversation = useCallback((id: string | null) => {
    setInput('');
    setSelectedId(id);
  }, []);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [liveVoiceJoined, setLiveVoiceJoined] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceSignalingWsRef = useRef<WebSocket | null>(null);
  const voicePeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const voiceLocalStreamRef = useRef<MediaStream | null>(null);
  const voiceRemoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalingUrl =
    typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_VOICE_SIGNALING_WS_URL as string | undefined) : undefined;

  const { data: handoff, isLoading } = trpc.liveChat.listHandoffConversations.useQuery(
    projectId ? { projectId } : undefined,
    { refetchInterval: 5000, staleTime: 3000 }
  );
  const unassigned = handoff?.unassigned ?? [];
  const myAssigned = handoff?.myAssigned ?? [];
  const isAssignedToSelected =
    !!selectedId && myAssigned.some((c) => c.id === selectedId);
  const isAssigned = !!selectedId && myAssigned.some((c) => c.id === selectedId);
  const { data: conversation, isLoading: loadingConv } = trpc.liveChat.getConversation.useQuery(
    { conversationId: selectedId! },
    {
      enabled: !!selectedId,
      refetchInterval: isAssignedToSelected ? 3000 : false,
      staleTime: isAssignedToSelected ? 2000 : 10_000,
    }
  );
  const isVoiceChannel = conversation?.channel === 'call';
  const utils = trpc.useUtils();
  const assignMutation = trpc.liveChat.assignToMe.useMutation({
    onSuccess: () => {
      void utils.liveChat.listHandoffConversations.invalidate();
      if (selectedId) void utils.liveChat.getConversation.invalidate({ conversationId: selectedId });
    },
  });
  const sendMutation = trpc.liveChat.sendMessage.useMutation({
    onSuccess: () => {
      setInput('');
      void utils.liveChat.getConversation.invalidate({ conversationId: selectedId! });
    },
  });
  const setHumanTypingMutation = trpc.liveChat.setHumanTyping.useMutation();
  const draftActive = input.trim().length > 0;

  useEffect(() => {
    if (!selectedId || !isAssigned) return;
    const cid = selectedId;
    if (!draftActive) {
      setHumanTypingMutation.mutate({ conversationId: cid, typing: false });
      return;
    }
    setHumanTypingMutation.mutate({ conversationId: cid, typing: true });
    const iv = setInterval(() => {
      setHumanTypingMutation.mutate({ conversationId: cid, typing: true });
    }, 2000);
    return () => {
      clearInterval(iv);
      setHumanTypingMutation.mutate({ conversationId: cid, typing: false });
    };
  }, [selectedId, isAssigned, draftActive]);

  const startVoiceRecording = useCallback(async () => {
    if (!selectedId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
    } catch (err) {
      console.error('Microphone access failed', err);
    }
  }, [selectedId]);

  const stopVoiceRecordingAndSend = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    rec.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecordingVoice(false);
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    if (blob.size === 0 || !selectedId) return;
    setVoiceUploading(true);
    try {
      const form = new FormData();
      form.set('file', blob, 'voice.webm');
      const res = await fetch('/api/upload/voice', { method: 'POST', body: form, credentials: 'include' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        console.error(data.error ?? 'Upload failed');
        setVoiceUploading(false);
        return;
      }
      if (data.url) {
        sendMutation.mutate({
          conversationId: selectedId,
          content: '(Voice message)',
          payload: { type: 'audio', url: data.url },
        });
      }
    } catch (err) {
      console.error('Voice upload failed', err);
    }
    setVoiceUploading(false);
  }, [selectedId, sendMutation]);

  const leaveLiveVoice = useCallback(() => {
    voiceSignalingWsRef.current?.close();
    voiceSignalingWsRef.current = null;
    voicePeerConnectionRef.current?.close();
    voicePeerConnectionRef.current = null;
    voiceLocalStreamRef.current?.getTracks().forEach((t) => t.stop());
    voiceLocalStreamRef.current = null;
    const remoteEl = voiceRemoteAudioRef.current;
    if (remoteEl) {
      remoteEl.pause();
      remoteEl.srcObject = null;
      remoteEl.remove();
      voiceRemoteAudioRef.current = null;
    }
    setLiveVoiceJoined(false);
  }, []);

  const joinLiveVoice = useCallback(async () => {
    if (!selectedId || !signalingUrl) return;
    const url =
      signalingUrl.startsWith('ws://') || signalingUrl.startsWith('wss://')
        ? signalingUrl
        : `wss://${signalingUrl}`;
    const ws = new WebSocket(url);
    voiceSignalingWsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', conversationId: selectedId, role: 'human' }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          sdp?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        };
        if (data.type === 'joined') {
          return;
        }
        if (data.type === 'create-offer') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          voiceLocalStreamRef.current = stream;
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          voicePeerConnectionRef.current = pc;
          pc.ontrack = (e) => {
            if (!e.streams[0]) return;
            let el = voiceRemoteAudioRef.current;
            if (!el) {
              el = document.createElement('audio');
              el.autoplay = true;
              el.setAttribute('playsinline', 'true');
              el.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
              document.body.appendChild(el);
              voiceRemoteAudioRef.current = el;
            }
            el.srcObject = e.streams[0];
          };
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
          pc.onicecandidate = (e) => {
            if (e.candidate) ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate }));
          };
          setLiveVoiceJoined(true);
          return;
        }
        if (data.type === 'answer' && data.sdp) {
          const pc = voicePeerConnectionRef.current;
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          return;
        }
        if (data.type === 'ice-candidate' && data.candidate) {
          const pc = voicePeerConnectionRef.current;
          if (pc) pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
      } catch (err) {
        console.error('Live voice error', err);
        leaveLiveVoice();
      }
    };

    ws.onclose = () => leaveLiveVoice();
    ws.onerror = () => leaveLiveVoice();
  }, [selectedId, signalingUrl, leaveLiveVoice]);

  useEffect(() => {
    if (!selectedId || !isAssigned) leaveLiveVoice();
  }, [selectedId, isAssigned, leaveLiveVoice]);

  useEffect(() => {
    setCopiedId(false);
  }, [selectedId]);

  const endConversationMutation = trpc.liveChat.endConversation.useMutation({
    onSuccess: (_, variables) => {
      if (selectedId === variables.conversationId) {
        selectConversation(null);
      }
      void utils.liveChat.listHandoffConversations.invalidate();
    },
  });
  const updateNotesMutation = trpc.liveChat.updateInternalNotes.useMutation({
    onSuccess: () => {
      if (selectedId) void utils.liveChat.getConversation.invalidate({ conversationId: selectedId });
    },
  });
  const transferMutation = trpc.liveChat.transferToAgent.useMutation({
    onSuccess: () => {
      void utils.liveChat.listHandoffConversations.invalidate();
      if (selectedId) selectConversation(null);
    },
  });

  const { data: cannedList } = trpc.cannedResponse.list.useQuery(
    { projectId: projectId ?? null },
    { enabled: !!selectedId && isAssigned }
  );
  const { data: humanAgentsList } = trpc.humanAgents.list.useQuery(undefined, {
    enabled: !!selectedId && isAssigned,
  });
  const otherAgents = humanAgentsList ?? [];

  const filteredUnassigned = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter(
      (c) =>
        c.chatbotName.toLowerCase().includes(q) ||
        c.customerId.toLowerCase().includes(q) ||
        c.agentName.toLowerCase().includes(q)
    );
  }, [unassigned, listQuery]);

  const filteredMine = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return myAssigned;
    return myAssigned.filter(
      (c) =>
        c.chatbotName.toLowerCase().includes(q) ||
        c.customerId.toLowerCase().includes(q) ||
        c.agentName.toLowerCase().includes(q)
    );
  }, [myAssigned, listQuery]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  const showNotAgentBanner =
    Boolean(projectId) && handoff != null && handoff.viewerIsHumanAgent === false;

  const all = [...unassigned, ...myAssigned];
  const selected = selectedId ? all.find((c) => c.id === selectedId) : null;

  return (
    <div className="flex flex-col gap-4">
      {showNotAgentBanner ? (
        <Alert className="border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40">
          <Info className="size-4 text-amber-800 dark:text-amber-200" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Your account is not a human agent
          </AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90 space-y-3">
            <p>
              The waiting list and <strong>Take</strong> only show for people added under Human agents.
              Customers can still request a human; add yourself (or ask an admin) so those chats appear
              here.
            </p>
            <Button variant="outline" size="sm" className="border-amber-300 bg-background" asChild>
              <Link href={`/projects/${projectId}/human-agents`}>Open Human agents</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex h-[min(72vh,calc(100svh-10.5rem))] min-h-[360px] max-h-[calc(100svh-6rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm xl:h-[min(780px,calc(100svh-9rem))]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
          {/* Left: inbox + waiting queue */}
          <aside className="flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border/60 bg-muted/20 xl:h-full xl:max-h-full xl:w-[340px] xl:max-w-[340px] xl:shrink-0 xl:border-b-0 xl:border-r">
            <div className="shrink-0 space-y-3 border-b border-border/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Inbox</h2>
                <Badge variant="secondary" className="font-normal tabular-nums">
                  {unassigned.length + myAssigned.length} open
                </Badge>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Search by chatbot, visitor id…"
                  className="h-10 bg-background pl-9"
                />
              </div>
              {unassigned.length > 0 ? (
                <div className="relative overflow-hidden rounded-xl border border-amber-200/70 bg-linear-to-br from-amber-50 via-orange-50/90 to-rose-50/80 p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-rose-950/30">
                  <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-amber-400/25 blur-3xl dark:bg-amber-500/15" />
                  <div className="pointer-events-none absolute -bottom-6 -left-6 size-28 rounded-full bg-rose-400/20 blur-2xl dark:bg-rose-600/10" />
                  <div className="relative flex gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 ring-2 ring-white/60 dark:ring-white/10">
                      <Headphones className="size-6" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                          Needs you
                        </span>
                        <Sparkles className="size-3.5 text-amber-600 dark:text-amber-300" />
                      </div>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                        {unassigned.length}
                        <span className="ml-1.5 text-base font-semibold text-muted-foreground">
                          waiting
                        </span>
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-950/80 dark:text-amber-100/85">
                        Someone asked for a real person. Open a chat and tap <strong>Take</strong> to
                        claim it — customers see you as soon as you reply.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-emerald-200/80 bg-linear-to-br from-emerald-50/90 to-teal-50/50 px-4 py-6 text-center dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Inbox className="size-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">Queue is clear</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No one is waiting for an agent. New handoffs appear here instantly.
                  </p>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {unassigned.length > 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Pick up next
                  </p>
                  {listQuery.trim() && filteredUnassigned.length === 0 ? (
                    <p className="px-1 text-sm text-muted-foreground">No waiting chats match your search.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredUnassigned.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => selectConversation(c.id)}
                            className={cn(
                              'w-full rounded-xl border p-3 text-left transition-all',
                              selectedId === c.id
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-border/60 bg-card hover:border-amber-300/60 hover:shadow-sm dark:hover:border-amber-800/50'
                            )}
                          >
                            <div className="flex gap-3">
                              <div
                                className={cn(
                                  'flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white shadow-sm',
                                  selectedId === c.id
                                    ? 'from-primary to-violet-600'
                                    : 'from-amber-500 to-orange-600'
                                )}
                              >
                                {chatbotInitials(c.chatbotName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium leading-tight text-foreground">
                                    {c.chatbotName}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(c.handoffRequestedAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {c.messageCount} messages · Visitor{' '}
                                  <span className="font-mono">{c.customerId.slice(0, 14)}</span>
                                  {c.customerId.length > 14 ? '…' : ''}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="h-8 gap-1 bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      assignMutation.mutate({ conversationId: c.id });
                                      selectConversation(c.id);
                                    }}
                                    disabled={assignMutation.isPending}
                                  >
                                    Take chat
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-muted-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      endConversationMutation.mutate({ conversationId: c.id });
                                      if (selectedId === c.id) selectConversation(null);
                                    }}
                                    disabled={endConversationMutation.isPending}
                                  >
                                    <XCircle className="mr-1 size-3.5" />
                                    Close
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {myAssigned.length > 0 && (
                <div className="space-y-2">
                  <Separator className="bg-border/60" />
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    My chats
                  </p>
                  {listQuery.trim() && filteredMine.length === 0 ? (
                    <p className="px-1 text-sm text-muted-foreground">No assigned chats match your search.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredMine.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => selectConversation(c.id)}
                            className={cn(
                              'flex w-full gap-3 rounded-xl border p-3 text-left transition-all',
                              selectedId === c.id
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-border/60 bg-card hover:border-border hover:shadow-sm'
                            )}
                          >
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white shadow-sm">
                              {chatbotInitials(c.chatbotName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">{c.chatbotName}</span>
                              <p className="text-xs text-muted-foreground">
                                {c.messageCount} messages · Yours
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background xl:h-full">
        {!selectedId ? (
          <Empty className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare className="text-muted-foreground size-12" />
              </EmptyMedia>
              <EmptyTitle>Select a conversation</EmptyTitle>
              <EmptyDescription>
                Choose a chat from the left — use <strong>Take chat</strong> on the queue to claim it, or open one
                under My chats to continue.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border/60 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{selected?.chatbotName}</span>
                {!isAssigned && (
                  <Button
                    size="sm"
                    onClick={() => assignMutation.mutate({ conversationId: selectedId })}
                    disabled={assignMutation.isPending}
                  >
                    Take
                  </Button>
                )}
              </div>
              {isAssigned && (
                <div className="flex items-center gap-1.5">
                  {signalingUrl && isVoiceChannel && (
                    <Button
                      size="sm"
                      variant={liveVoiceJoined ? 'default' : 'outline'}
                      className="shrink-0 gap-1.5"
                      onClick={liveVoiceJoined ? leaveLiveVoice : joinLiveVoice}
                      title={liveVoiceJoined ? 'Leave live voice' : 'Speak to customer live (WebRTC)'}
                    >
                      {liveVoiceJoined ? (
                        <>
                          <PhoneOff className="size-3.5" />
                          Leave voice
                        </>
                      ) : (
                        <>
                          <Phone className="size-3.5" />
                          Join voice
                        </>
                      )}
                    </Button>
                  )}
                  {otherAgents.length > 0 && (
                    <Select
                      onValueChange={(targetUserId) => {
                        if (targetUserId && selectedId)
                          transferMutation.mutate({ conversationId: selectedId, targetUserId });
                      }}
                      disabled={transferMutation.isPending}
                    >
                      <SelectTrigger className="w-[140px] h-8 gap-1">
                        <ArrowRightLeft className="size-3.5" />
                        <SelectValue placeholder="Transfer to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherAgents.map((a) => (
                          <SelectItem key={a.id} value={a.userId}>
                            {a.displayName || a.userName || a.userEmail}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive"
                    onClick={() => endConversationMutation.mutate({ conversationId: selectedId })}
                    disabled={endConversationMutation.isPending}
                  >
                    <XCircle className="size-3.5" />
                    Close
                  </Button>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain p-4">
              {loadingConv ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                conversation?.messages.map((m) => (
                  <LiveChatMessageRow
                    key={m.id}
                    message={{
                      id: m.id,
                      senderType: m.senderType,
                      content: m.content,
                      payload: m.payload as LiveChatMessageBubble['payload'],
                    }}
                  />
                ))
              )}
            </div>
            {isAssigned && (
              <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 p-3">
                <LiveChatComposer
                  value={input}
                  onChange={setInput}
                  onSend={() => {
                    if (!selectedId || !input.trim()) return;
                    sendMutation.mutate({ conversationId: selectedId, content: input.trim() });
                  }}
                  placeholder="Type a reply or record voice…"
                  disabled={sendMutation.isPending}
                  sending={sendMutation.isPending}
                  cannedList={cannedList ?? undefined}
                  onCannedPick={(content) => setInput((prev) => (prev ? `${prev} ${content}` : content))}
                  isRecordingVoice={isRecordingVoice}
                  voiceUploading={voiceUploading}
                  onVoiceToggle={() =>
                    isRecordingVoice ? void stopVoiceRecordingAndSend() : void startVoiceRecording()
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit text-muted-foreground hover:text-destructive"
                  onClick={() => endConversationMutation.mutate({ conversationId: selectedId })}
                  disabled={endConversationMutation.isPending}
                >
                  <XCircle className="mr-1 size-3.5" />
                  Close conversation
                </Button>
              </div>
            )}
          </div>
        )}
          </div>

          {selectedId && selected ? (
            <aside className="flex max-h-[38vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-border/60 bg-muted/15 xl:h-full xl:max-h-full xl:w-[320px] xl:max-w-[320px] xl:shrink-0 xl:border-l xl:border-t-0">
              <div className="shrink-0 border-b border-border/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-600 text-lg font-bold text-white shadow-md">
                    {chatbotInitials(selected.chatbotName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight text-foreground">{selected.chatbotName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isAssigned ? 'Assigned to you — you can reply.' : 'Waiting in queue — take the chat to reply.'}
                    </p>
                    {conversation && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="font-normal">
                          <Hash className="mr-1 size-3" />
                          {conversation.channel === 'call' ? 'Voice' : 'Chat'}
                        </Badge>
                        {conversation.status === 'closed' ? (
                          <Badge variant="secondary">Closed</Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal">
                            Active
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain p-4">
                {loadingConv || !conversation ? (
                  <Skeleton className="h-40 w-full rounded-lg" />
                ) : (
                  <>
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Visitor
                      </p>
                      <div className="rounded-xl border border-border/60 bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <code className="truncate text-xs font-mono text-foreground">{conversation.customerId}</code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => {
                              void navigator.clipboard.writeText(conversation.customerId);
                              setCopiedId(true);
                              window.setTimeout(() => setCopiedId(false), 2000);
                            }}
                            aria-label="Copy visitor id"
                          >
                            {copiedId ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2 text-muted-foreground">
                        <Radio className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Started</p>
                          <p className="text-xs">
                            {formatDistanceToNow(new Date(conversation.startedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {conversation.handoffRequestedAt ? (
                        <div className="flex gap-2 text-muted-foreground">
                          <Headphones className="mt-0.5 size-4 shrink-0 text-amber-600" />
                          <div>
                            <p className="text-xs font-medium text-foreground">Asked for human</p>
                            <p className="text-xs">
                              {formatDistanceToNow(new Date(conversation.handoffRequestedAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex gap-2 text-muted-foreground">
                        <Bot className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">AI agent</p>
                          <p className="text-xs">{conversation.agentName}</p>
                        </div>
                      </div>
                    </div>
                    {conversation.compiledData && Object.keys(conversation.compiledData).length > 0 ? (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Collected data
                          </p>
                          <pre className="max-h-40 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-[11px] leading-relaxed">
                            {JSON.stringify(conversation.compiledData, null, 2)}
                          </pre>
                        </div>
                      </>
                    ) : null}
                    {isAssigned ? (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label htmlFor={`live-chat-notes-${selectedId}`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <MessageCircle className="size-3.5" />
                            Internal notes
                          </Label>
                          <p className="text-[11px] text-muted-foreground">Only visible to your team.</p>
                          <Textarea
                            id={`live-chat-notes-${selectedId}`}
                            key={selectedId}
                            placeholder="Private notes about this conversation…"
                            className="min-h-[100px] resize-y text-sm"
                            defaultValue={conversation.internalNotes ?? ''}
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (selectedId && v !== (conversation.internalNotes ?? null))
                                updateNotesMutation.mutate({ conversationId: selectedId, internalNotes: v });
                            }}
                          />
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
