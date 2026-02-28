'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MessageSquare, User, Send, Loader2, XCircle, ChevronDown, MessageCircle, ArrowRightLeft, Mic, Square, Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveChatContentProps {
  projectId?: string;
}

export function LiveChatContent({ projectId }: LiveChatContentProps = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [internalNotesOpen, setInternalNotesOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [liveVoiceJoined, setLiveVoiceJoined] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceSignalingWsRef = useRef<WebSocket | null>(null);
  const voicePeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const voiceLocalStreamRef = useRef<MediaStream | null>(null);
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
  const endConversationMutation = trpc.liveChat.endConversation.useMutation({
    onSuccess: (_, variables) => {
      if (selectedId === variables.conversationId) {
        setSelectedId(null);
        setInput('');
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
      if (selectedId) setSelectedId(null);
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

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  const all = [...unassigned, ...myAssigned];
  const selected = selectedId ? all.find((c) => c.id === selectedId) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Waiting for agent</h2>
          {unassigned.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ul className="space-y-1">
              {unassigned.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedId === c.id ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="font-medium truncate block">{c.chatbotName}</span>
                    <span className="text-muted-foreground text-xs">{c.messageCount} messages</span>
                  </button>
                  <div className="mt-1 flex gap-1">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        assignMutation.mutate({ conversationId: c.id });
                        setSelectedId(c.id);
                      }}
                      disabled={assignMutation.isPending}
                    >
                      Take
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        endConversationMutation.mutate({ conversationId: c.id });
                        if (selectedId === c.id) setSelectedId(null);
                      }}
                      disabled={endConversationMutation.isPending}
                      aria-label="Close conversation"
                    >
                      <XCircle className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">My conversations</h2>
          {myAssigned.length === 0 ? (
            <p className="text-muted-foreground text-sm">None</p>
          ) : (
            <ul className="space-y-1">
              {myAssigned.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedId === c.id ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="font-medium truncate block">{c.chatbotName}</span>
                    <span className="text-muted-foreground text-xs">{c.messageCount} messages</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden">
        {!selectedId ? (
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare className="text-muted-foreground size-12" />
              </EmptyMedia>
              <EmptyTitle>Select a conversation</EmptyTitle>
              <EmptyDescription>
                Pick one from &quot;Waiting for agent&quot; and click Take, or open one from &quot;My conversations&quot; to reply.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="p-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
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
            {isAssigned && conversation && (
              <Collapsible open={internalNotesOpen} onOpenChange={setInternalNotesOpen} className="border-b border-border/60">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between rounded-none h-9">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="size-3.5" />
                      Internal notes (agent-only)
                    </span>
                    <ChevronDown className={cn('size-4 transition-transform', internalNotesOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 space-y-2 bg-muted/30">
                    <Label className="sr-only">Internal notes</Label>
                    <Textarea
                      placeholder="Private notes about this conversation..."
                      className="min-h-[80px] resize-y"
                      defaultValue={conversation.internalNotes ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (selectedId && v !== (conversation.internalNotes ?? null))
                          updateNotesMutation.mutate({ conversationId: selectedId, internalNotes: v });
                      }}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {loadingConv ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                conversation?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex gap-2',
                      m.senderType === 'customer' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl px-4 py-2 text-sm',
                        m.senderType === 'customer'
                          ? 'bg-primary text-primary-foreground'
                          : m.senderType === 'human_agent'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-muted text-foreground'
                      )}
                    >
                      {m.senderType === 'human_agent' && (
                        <span className="text-xs font-medium opacity-80 block mb-0.5">You</span>
                      )}
                      {m.payload?.type === 'audio' && typeof m.payload?.url === 'string' ? (
                        <audio controls src={m.payload.url} className="max-w-full h-9 mt-1" />
                      ) : null}
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            {isAssigned && (
              <div className="p-3 border-t border-border/60 flex flex-col gap-2">
                {cannedList && cannedList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cannedList.map((c) => (
                      <Button
                        key={c.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-normal"
                        onClick={() => setInput((prev) => (prev ? `${prev} ${c.content}` : c.content))}
                      >
                        {c.shortcut}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={isRecordingVoice ? stopVoiceRecordingAndSend : startVoiceRecording}
                    disabled={voiceUploading || sendMutation.isPending}
                    title={isRecordingVoice ? 'Stop and send voice message' : 'Record voice message'}
                    aria-label={isRecordingVoice ? 'Stop recording' : 'Record voice'}
                  >
                    {voiceUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isRecordingVoice ? (
                      <Square className="size-4 text-destructive fill-destructive" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a reply or record voice..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (input.trim()) {
                          sendMutation.mutate({ conversationId: selectedId, content: input.trim() });
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (input.trim())
                        sendMutation.mutate({ conversationId: selectedId, content: input.trim() });
                    }}
                    disabled={!input.trim() || sendMutation.isPending}
                  >
                    {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit text-muted-foreground hover:text-destructive"
                  onClick={() => endConversationMutation.mutate({ conversationId: selectedId })}
                  disabled={endConversationMutation.isPending}
                >
                  <XCircle className="size-3.5 mr-1" />
                  Close conversation
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
