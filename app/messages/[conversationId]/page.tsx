'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Flame,
  HeartHandshake,
  Heart,
  Image as ImageIcon,
  Laugh,
  Loader2,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Music2,
  Paperclip,
  Pause,
  Play,
  Send,
  Sparkles,
  Trash2,
  UserMinus,
  UserX,
  X,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { notify } from '@/components/NotificationCenter';

type MessagingProfile = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified?: boolean;
  lastSeen?: string | null;
};

type MessageReaction = { userId: string; reaction: ReactionName };
type ReactionName = 'heart' | 'fire' | 'wow' | 'support' | 'laugh';

type Message = {
  id: string;
  sender: MessagingProfile;
  type: 'text' | 'image' | 'video' | 'audio' | 'track' | 'clip' | 'post' | 'playlist' | 'deleted';
  content: string;
  mediaUrl: string | null;
  sharedEntityType: string | null;
  sharedEntityId: string | null;
  metadata: Record<string, string | number>;
  replyToId: string | null;
  seenBy: string[];
  reactions: MessageReaction[];
  createdAt: string;
  deleted: boolean;
};

type ConversationInfo = {
  id: string;
  type: 'direct' | 'group';
  participants: MessagingProfile[];
  otherUser: MessagingProfile | null;
  canMessage: boolean;
  blocked: boolean;
  muted: boolean;
};

const REACTIONS: Array<{ value: ReactionName; label: string; icon: typeof Heart }> = [
  { value: 'heart', label: 'J’aime', icon: Heart },
  { value: 'fire', label: 'Fort', icon: Flame },
  { value: 'wow', label: 'Waouh', icon: Sparkles },
  { value: 'support', label: 'Soutien', icon: HeartHandshake },
  { value: 'laugh', label: 'Drôle', icon: Laugh },
];

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function mergeMessages(previous: Message[], incoming: Message[]) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((first, second) => (
    new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  ));
}

export default function ConversationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const [muted, setMuted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialScrollDone = useRef(false);
  const nearBottomRef = useRef(true);

  const markSeen = useCallback(async () => {
    if (!conversationId) return;
    await fetch(`/api/messages/${encodeURIComponent(conversationId)}/seen`, { method: 'PUT' }).catch(() => null);
  }, [conversationId]);

  const loadMessages = useCallback(async (options?: { quiet?: boolean; before?: string | null }) => {
    if (!conversationId) return;
    const before = options?.before;
    if (before) setLoadingOlder(true);
    else if (!options?.quiet) setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '50' });
      if (before) query.set('before', before);
      const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}?${query.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Discussion indisponible');
      setConversation(payload.conversation || null);
      setMuted(Boolean(payload.conversation?.muted));
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      setMessages((previous) => before ? mergeMessages(incoming, previous) : mergeMessages(previous, incoming));
      if (!before) {
        setHasMore(Boolean(payload.hasMore));
        setNextCursor(payload.nextCursor || null);
      } else {
        setHasMore(Boolean(payload.hasMore));
        setNextCursor(payload.nextCursor || null);
      }
      const currentUserId = session?.user?.id;
      if (!before && currentUserId && incoming.some((message: Message) => (
        message.sender.id !== currentUserId && !message.seenBy.includes(currentUserId)
      ))) void markSeen();
    } catch (error) {
      if (!options?.quiet) notify.error('Messages', error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setLoading(false);
      setLoadingOlder(false);
    }
  }, [conversationId, markSeen, session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id && conversationId) void loadMessages();
  }, [conversationId, loadMessages, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || !conversationId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages({ quiet: true });
    }, 4_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadMessages({ quiet: true });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [conversationId, loadMessages, session?.user?.id]);

  useEffect(() => {
    const outer = document.querySelector('.app-scroll-container') as HTMLElement | null;
    if (!outer) return;
    const previous = outer.style.overflow;
    outer.style.overflow = 'hidden';
    return () => { outer.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !messages.length) return;
    if (!initialScrollDone.current) {
      container.scrollTop = container.scrollHeight;
      initialScrollDone.current = true;
      return;
    }
    if (nearBottomRef.current) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => () => {
    currentAudioRef.current?.pause();
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const sendPayload = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.message) throw new Error(body?.error || 'Envoi impossible');
    nearBottomRef.current = true;
    setMessages((previous) => mergeMessages(previous, [body.message]));
    return body.message as Message;
  };

  const sendText = async () => {
    const content = draft.trim();
    if (!content || sending || !conversation?.canMessage) return;
    setSending(true);
    setDraft('');
    try {
      await sendPayload({ type: 'text', content });
    } catch (error) {
      setDraft(content);
      notify.error('Message non envoyé', error instanceof Error ? error.message : 'Réessaie dans un instant');
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File, type: 'image' | 'video' | 'audio', duration?: number) => {
    setUploading(true);
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const publicId = `message_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const signatureResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, publicId, type }),
      });
      const signature = await signatureResponse.json().catch(() => null);
      if (!signatureResponse.ok) throw new Error(signature?.error || 'Préparation de l’envoi impossible');

      const form = new FormData();
      form.append('file', file);
      form.append('folder', signature.folder);
      form.append('public_id', signature.publicId);
      form.append('timestamp', String(signature.timestamp));
      form.append('api_key', signature.apiKey);
      form.append('signature', signature.signature);
      if (type === 'audio') form.append('format', 'mp3');
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`, { method: 'POST', body: form });
      const uploaded = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploaded?.secure_url) throw new Error(uploaded?.error?.message || 'Téléversement impossible');
      await sendPayload({
        type,
        mediaUrl: uploaded.secure_url,
        metadata: { duration: Number(uploaded.duration || duration || 0) },
      });
    } catch (error) {
      notify.error('Pièce jointe non envoyée', error instanceof Error ? error.message : 'Réessaie dans un instant');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      notify.error('Fichier trop volumineux', 'La limite est de 25 Mo.');
      return;
    }
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : null;
    if (!type) {
      notify.error('Format non pris en charge', 'Choisis une image, une vidéo ou un fichier audio.');
      return;
    }
    await uploadAndSend(file, type);
  };

  const startRecording = async () => {
    if (isRecording || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) mediaChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size) setRecordingBlob(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(500);
      setRecordingSeconds(0);
      setRecordingBlob(null);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1_000);
    } catch {
      notify.error('Microphone indisponible', 'Autorise l’accès au microphone pour envoyer un message audio.');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  };

  const cancelRecording = () => {
    if (isRecording) stopRecording();
    setRecordingBlob(null);
    setRecordingSeconds(0);
  };

  const sendRecording = async () => {
    if (!recordingBlob) return;
    const file = new File([recordingBlob], `message-audio-${Date.now()}.webm`, { type: recordingBlob.type || 'audio/webm' });
    await uploadAndSend(file, 'audio', recordingSeconds);
    setRecordingBlob(null);
    setRecordingSeconds(0);
  };

  const playAudio = (message: Message) => {
    const source = message.mediaUrl || message.content;
    if (!source) return;
    if (playingMessageId === message.id) {
      currentAudioRef.current?.pause();
      setPlayingMessageId(null);
      return;
    }
    currentAudioRef.current?.pause();
    const audio = new Audio(source);
    currentAudioRef.current = audio;
    setPlayingMessageId(message.id);
    audio.onended = () => setPlayingMessageId(null);
    audio.onerror = () => setPlayingMessageId(null);
    void audio.play().catch(() => {
      setPlayingMessageId(null);
      notify.error('Lecture impossible', 'Ce message audio ne peut pas être lu.');
    });
  };

  const reactToMessage = async (message: Message, reaction: ReactionName) => {
    const existing = message.reactions.find((item) => item.userId === session?.user?.id);
    const remove = existing?.reaction === reaction;
    setReactionPickerId(null);
    setMessages((previous) => previous.map((item) => item.id === message.id ? {
      ...item,
      reactions: remove
        ? item.reactions.filter((entry) => entry.userId !== session?.user?.id)
        : [...item.reactions.filter((entry) => entry.userId !== session?.user?.id), { userId: session!.user!.id!, reaction }],
    } : item));
    try {
      const response = await fetch(`/api/messages/${conversationId}/${message.id}/reactions`, {
        method: remove ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: remove ? undefined : JSON.stringify({ reaction }),
      });
      if (!response.ok) throw new Error();
    } catch {
      void loadMessages({ quiet: true });
      notify.error('Réaction', 'La réaction n’a pas pu être enregistrée.');
    }
  };

  const deleteMessage = async (message: Message) => {
    setMessageMenuId(null);
    try {
      const response = await fetch(`/api/messages/${conversationId}/${message.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, deleted: true, type: 'deleted', content: 'Message supprimé', mediaUrl: null, reactions: [] } : item));
    } catch {
      notify.error('Message', 'Suppression impossible.');
    }
  };

  const updateConversation = async (action: 'archive' | 'mute' | 'unmute') => {
    setConversationMenuOpen(false);
    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Action impossible');
      if (action === 'archive') router.push('/messages');
      else setMuted(action === 'mute');
    } catch (error) {
      notify.error('Discussion', error instanceof Error ? error.message : 'Action impossible');
    }
  };

  const runDangerAction = async () => {
    const other = conversation?.otherUser;
    if (!other || !confirmAction) return;
    try {
      const response = await fetch(confirmAction === 'block' ? '/api/messages/blocks' : '/api/messages/contacts', {
        method: confirmAction === 'block' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: other.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Action impossible');
      setConfirmAction(null);
      router.push('/messages');
    } catch (error) {
      notify.error('Discussion', error instanceof Error ? error.message : 'Action impossible');
    }
  };

  const reactionGroups = useCallback((message: Message) => {
    const groups = new Map<ReactionName, MessageReaction[]>();
    message.reactions.forEach((reaction) => groups.set(reaction.reaction, [...(groups.get(reaction.reaction) || []), reaction]));
    return Array.from(groups.entries());
  }, []);

  const other = conversation?.otherUser;
  const title = other?.name || conversation?.participants?.map((participant) => participant.name).join(', ') || 'Discussion';
  const subtitle = other ? `@${other.username}` : 'Synaura';
  const canSend = Boolean(conversation?.canMessage && !conversation?.blocked);
  const ownId = session?.user?.id;
  const lastOwnMessage = useMemo(() => [...messages].reverse().find((message) => message.sender.id === ownId && !message.deleted), [messages, ownId]);

  if (status === 'loading' || loading) return <ConversationLoading />;
  if (!session?.user) {
    router.replace('/auth/signin');
    return null;
  }

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col bg-syn-background text-syn-textPrimary">
      <header className="relative z-30 shrink-0 border-b border-syn-border bg-syn-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-4xl items-center gap-3 px-3 sm:px-5">
          <button type="button" onClick={() => router.push('/messages')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-syn-surfaceMuted" aria-label="Retour aux messages"><ArrowLeft className="h-5 w-5" /></button>
          {other ? <button type="button" onClick={() => router.push(`/profile/${other.username}`)}><Avatar src={other.avatar} name={other.name} username={other.username} size="md" /></button> : null}
          <button type="button" onClick={() => other && router.push(`/profile/${other.username}`)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-black sm:text-base">{title}</p>
            <p className="truncate text-[11px] font-semibold text-syn-textSecondary">{subtitle}</p>
          </button>
          <div className="relative">
            <button type="button" onClick={() => setConversationMenuOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full border border-syn-border bg-syn-surface hover:bg-syn-surfaceMuted" aria-label="Options de la discussion"><MoreHorizontal className="h-5 w-5" /></button>
            <AnimatePresence>
              {conversationMenuOpen ? (
                <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-syn-border bg-syn-elevatedSurface p-1.5 shadow-2xl">
                  {other ? <MenuButton icon={MessageCircle} label="Voir le profil" onClick={() => router.push(`/profile/${other.username}`)} /> : null}
                  <MenuButton icon={muted ? Bell : BellOff} label={muted ? 'Réactiver les notifications' : 'Mettre en sourdine'} onClick={() => void updateConversation(muted ? 'unmute' : 'mute')} />
                  <MenuButton icon={Archive} label="Archiver la discussion" onClick={() => void updateConversation('archive')} />
                  {other ? <MenuButton icon={UserMinus} label="Retirer de mes amis" danger onClick={() => { setConversationMenuOpen(false); setConfirmAction('remove'); }} /> : null}
                  {other ? <MenuButton icon={UserX} label="Bloquer" danger onClick={() => { setConversationMenuOpen(false); setConfirmAction('block'); }} /> : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const target = event.currentTarget;
          nearBottomRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 140;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end px-3 py-5 sm:px-5">
          {hasMore ? (
            <button type="button" disabled={loadingOlder || !nextCursor} onClick={() => void loadMessages({ before: nextCursor })} className="mx-auto mb-6 rounded-full border border-syn-border bg-syn-surface px-4 py-2 text-xs font-bold text-syn-textSecondary disabled:opacity-50">
              {loadingOlder ? 'Chargement…' : 'Messages précédents'}
            </button>
          ) : null}

          {!messages.length ? (
            <div className="my-auto flex min-h-[380px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-syn-accent/10 text-syn-accent"><MessageCircle className="h-6 w-6" /></div>
              <h1 className="mt-4 text-lg font-black">Une discussion qui commence par la musique</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-syn-textSecondary">Partage un son, un contexte ou simplement ce que tu as envie de dire.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((message, index) => {
                const own = message.sender.id === ownId;
                const previous = messages[index - 1];
                const startsGroup = !previous || previous.sender.id !== message.sender.id || new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > 5 * 60_000;
                const isLastOwn = lastOwnMessage?.id === message.id;
                return (
                  <div key={message.id} className={`group/message flex items-end gap-2 ${own ? 'justify-end' : 'justify-start'} ${startsGroup && index ? 'pt-3' : ''}`}>
                    {!own ? <div className="w-7 shrink-0">{startsGroup ? <Avatar src={message.sender.avatar} name={message.sender.name} username={message.sender.username} size="sm" /> : null}</div> : null}
                    <div className={`relative max-w-[82%] sm:max-w-[68%] ${own ? 'items-end' : 'items-start'} flex flex-col`}>
                      {startsGroup && !own ? <span className="mb-1 px-1 text-[10px] font-bold text-syn-textSecondary">{message.sender.name}</span> : null}
                      <div className="relative flex items-center gap-1">
                        {own && !message.deleted ? <MessageActions message={message} currentUserId={ownId || ''} menuOpen={messageMenuId === message.id} reactionOpen={reactionPickerId === message.id} onMenu={() => { setMessageMenuId(messageMenuId === message.id ? null : message.id); setReactionPickerId(null); }} onReact={() => { setReactionPickerId(reactionPickerId === message.id ? null : message.id); setMessageMenuId(null); }} onDelete={() => void deleteMessage(message)} onPick={(reaction) => void reactToMessage(message, reaction)} /> : null}
                        <MessageBubble message={message} own={own} playing={playingMessageId === message.id} onPlay={() => playAudio(message)} onOpen={(path) => router.push(path)} />
                        {!own && !message.deleted ? <MessageActions message={message} currentUserId={ownId || ''} menuOpen={false} reactionOpen={reactionPickerId === message.id} onMenu={() => {}} onReact={() => setReactionPickerId(reactionPickerId === message.id ? null : message.id)} onDelete={() => {}} onPick={(reaction) => void reactToMessage(message, reaction)} hideMenu /> : null}
                      </div>
                      {reactionGroups(message).length ? (
                        <div className={`mt-1 flex flex-wrap gap-1 ${own ? 'justify-end' : 'justify-start'}`}>
                          {reactionGroups(message).map(([reaction, entries]) => {
                            const definition = REACTIONS.find((item) => item.value === reaction)!;
                            const Icon = definition.icon;
                            const mine = entries.some((entry) => entry.userId === ownId);
                            return <button type="button" key={reaction} onClick={() => void reactToMessage(message, reaction)} className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-black ${mine ? 'border-syn-accent/40 bg-syn-accent/10 text-syn-accent' : 'border-syn-border bg-syn-surface text-syn-textSecondary'}`} aria-label={definition.label}><Icon className="h-3 w-3" />{entries.length}</button>;
                          })}
                        </div>
                      ) : null}
                      <div className={`mt-1 flex items-center gap-1 px-1 text-[9px] font-semibold text-syn-textSecondary ${own ? 'justify-end' : 'justify-start'}`}>
                        <span>{formatClock(message.createdAt)}</span>
                        {own && isLastOwn ? (message.seenBy.some((id) => id !== ownId) ? <CheckCheck className="h-3 w-3 text-syn-accent2" /> : <Check className="h-3 w-3" />) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="relative z-20 shrink-0 border-t border-syn-border bg-syn-background/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto w-full max-w-4xl">
          {!canSend ? (
            <div className="rounded-xl bg-syn-surfaceMuted px-4 py-3 text-center text-xs font-bold text-syn-textSecondary">
              {conversation?.blocked ? 'Cette discussion est bloquée.' : 'Vous devez être amis pour continuer cette discussion.'}
            </div>
          ) : recordingBlob ? (
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-syn-border bg-syn-surface px-3">
              <button type="button" onClick={cancelRecording} className="flex h-9 w-9 items-center justify-center rounded-full text-syn-destructive hover:bg-syn-destructive/10" aria-label="Supprimer l’enregistrement"><Trash2 className="h-4 w-4" /></button>
              <div className="flex-1"><p className="text-xs font-black">Message audio prêt</p><p className="text-[10px] text-syn-textSecondary">{formatDuration(recordingSeconds)}</p></div>
              <button type="button" onClick={() => void sendRecording()} disabled={uploading} className="flex h-10 w-10 items-center justify-center rounded-full bg-syn-textPrimary text-syn-background disabled:opacity-50" aria-label="Envoyer l’enregistrement">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
            </div>
          ) : isRecording ? (
            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-syn-accentCoral/30 bg-syn-accentCoral/10 px-4">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-syn-accentCoral" />
              <p className="flex-1 text-sm font-bold text-syn-accentCoral">Enregistrement · {formatDuration(recordingSeconds)}</p>
              <button type="button" onClick={stopRecording} className="rounded-full bg-syn-textPrimary px-4 py-2 text-xs font-black text-syn-background">Terminer</button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-syn-border bg-syn-surface text-syn-textSecondary hover:text-syn-textPrimary disabled:opacity-40" aria-label="Ajouter un média"><Paperclip className="h-4 w-4" /></button>
              <div className="flex min-h-11 min-w-0 flex-1 items-end rounded-xl border border-syn-border bg-syn-surface px-3 focus-within:border-syn-accent/50 focus-within:ring-2 focus-within:ring-syn-accent/10">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2_000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendText(); } }} rows={1} placeholder="Écrire un message…" className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-syn-textPrimary outline-none placeholder:text-syn-textSecondary/60" />
                <button type="button" onClick={() => void startRecording()} className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-syn-textSecondary hover:bg-syn-surfaceMuted hover:text-syn-textPrimary" aria-label="Enregistrer un message audio"><Mic className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={() => void sendText()} disabled={!draft.trim() || sending || uploading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-syn-textPrimary text-syn-background transition hover:scale-105 disabled:opacity-30" aria-label="Envoyer">{sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" onChange={onFileChange} className="hidden" />
        </div>
      </footer>

      <AnimatePresence>
        {confirmAction && other ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => { if (event.currentTarget === event.target) setConfirmAction(null); }}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="w-full max-w-sm rounded-xl border border-syn-border bg-syn-elevatedSurface p-5">
              <h2 className="text-lg font-black">{confirmAction === 'block' ? `Bloquer ${other.name} ?` : `Retirer ${other.name} de tes amis ?`}</h2>
              <p className="mt-2 text-sm leading-6 text-syn-textSecondary">{confirmAction === 'block' ? 'Cette personne ne pourra plus t’envoyer de demande ni de message.' : 'Vous devrez accepter une nouvelle demande avant de pouvoir vous écrire à nouveau.'}</p>
              <div className="mt-5 flex gap-2"><button type="button" onClick={() => setConfirmAction(null)} className="flex-1 rounded-lg border border-syn-border px-4 py-3 text-sm font-bold">Annuler</button><button type="button" onClick={() => void runDangerAction()} className="flex-1 rounded-lg bg-syn-destructive px-4 py-3 text-sm font-bold text-white">Confirmer</button></div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function MessageBubble({ message, own, playing, onPlay, onOpen }: { message: Message; own: boolean; playing: boolean; onPlay: () => void; onOpen: (path: string) => void }) {
  const base = own ? 'bg-syn-accent text-white rounded-br-sm' : 'border border-syn-border bg-syn-surface text-syn-textPrimary rounded-bl-sm';
  const mediaUrl = message.mediaUrl || message.content;
  if (message.deleted) return <div className={`rounded-xl px-3.5 py-2.5 text-xs italic opacity-60 ${base}`}>Message supprimé</div>;
  if (message.type === 'image') return <a href={mediaUrl} target="_blank" rel="noreferrer" className={`block overflow-hidden rounded-xl p-1 ${base}`}><img src={mediaUrl} alt="Image partagée" loading="lazy" className="max-h-[420px] w-full rounded-lg object-cover" /></a>;
  if (message.type === 'video') return <div className={`overflow-hidden rounded-xl p-1 ${base}`}><video src={mediaUrl} controls playsInline preload="metadata" className="max-h-[420px] w-full rounded-lg" /></div>;
  if (message.type === 'audio') return (
    <button type="button" onClick={onPlay} className={`flex min-w-[210px] items-center gap-3 rounded-xl px-3 py-3 text-left ${base}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${own ? 'bg-white/16' : 'bg-syn-accent/10 text-syn-accent'}`}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-black">Message audio</span><span className={`mt-1 block h-1 overflow-hidden rounded-full ${own ? 'bg-white/20' : 'bg-syn-surfaceMuted'}`}><span className={`block h-full w-1/3 rounded-full ${own ? 'bg-white/70' : 'bg-syn-accent2'}`} /></span></span>
      {Number(message.metadata?.duration || 0) > 0 ? <span className="text-[10px] opacity-65">{formatDuration(Number(message.metadata.duration))}</span> : null}
    </button>
  );
  if (['track', 'clip', 'post', 'playlist'].includes(message.type)) {
    const title = String(message.metadata?.title || (message.type === 'track' ? 'Son partagé' : message.type === 'clip' ? 'Clip partagé' : message.type === 'playlist' ? 'Playlist partagée' : 'Post partagé'));
    const subtitle = String(message.metadata?.artistName || message.metadata?.subtitle || 'Synaura');
    const coverUrl = typeof message.metadata?.coverUrl === 'string' ? message.metadata.coverUrl : '';
    const path = typeof message.metadata?.url === 'string' ? message.metadata.url : message.sharedEntityId ? `/${message.type === 'track' ? 'track' : message.type}/${message.sharedEntityId}` : '';
    return (
      <button type="button" onClick={() => path && onOpen(path)} className={`flex min-w-[250px] max-w-sm items-center gap-3 rounded-xl p-2 text-left ${base}`}>
        {coverUrl ? <img src={coverUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${own ? 'bg-white/14' : 'bg-syn-surfaceMuted'}`}><Music2 className="h-5 w-5" /></span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{title}</span><span className="mt-1 block truncate text-[10px] opacity-65">{subtitle}</span></span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${own ? 'bg-white text-syn-accent' : 'bg-syn-textPrimary text-syn-background'}`}><Play className="h-3.5 w-3.5 fill-current" /></span>
      </button>
    );
  }
  return <div className={`whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-sm leading-5 ${base}`}>{message.content}</div>;
}

function MessageActions({ message, currentUserId, menuOpen, reactionOpen, onMenu, onReact, onDelete, onPick, hideMenu = false }: { message: Message; currentUserId: string; menuOpen: boolean; reactionOpen: boolean; onMenu: () => void; onReact: () => void; onDelete: () => void; onPick: (reaction: ReactionName) => void; hideMenu?: boolean }) {
  return (
    <div className="relative flex opacity-100 transition sm:opacity-0 sm:group-hover/message:opacity-100">
      <button type="button" onClick={onReact} className="flex h-8 w-8 items-center justify-center rounded-full text-syn-textSecondary hover:bg-syn-surfaceMuted hover:text-syn-textPrimary" aria-label="Réagir"><Heart className="h-3.5 w-3.5" /></button>
      {!hideMenu ? <button type="button" onClick={onMenu} className="flex h-8 w-8 items-center justify-center rounded-full text-syn-textSecondary hover:bg-syn-surfaceMuted hover:text-syn-textPrimary" aria-label="Options du message"><MoreHorizontal className="h-4 w-4" /></button> : null}
      <AnimatePresence>
        {reactionOpen ? <motion.div initial={{ opacity: 0, y: 4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} className="absolute bottom-9 right-0 z-40 flex gap-1 rounded-full border border-syn-border bg-syn-elevatedSurface p-1.5 shadow-xl">{REACTIONS.map((reaction) => { const Icon = reaction.icon; const mine = message.reactions.some((entry) => entry.userId === currentUserId && entry.reaction === reaction.value); return <button type="button" key={reaction.value} onClick={() => onPick(reaction.value)} className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-syn-surfaceMuted ${mine ? 'text-syn-accent' : 'text-syn-textSecondary'}`} aria-label={reaction.label}><Icon className="h-4 w-4" /></button>; })}</motion.div> : null}
        {menuOpen ? <motion.div initial={{ opacity: 0, y: 4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} className="absolute bottom-9 right-0 z-40 w-44 rounded-xl border border-syn-border bg-syn-elevatedSurface p-1.5 shadow-xl"><button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-syn-destructive hover:bg-syn-destructive/10"><Trash2 className="h-4 w-4" />Supprimer</button></motion.div> : null}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger = false }: { icon: typeof MessageCircle; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition hover:bg-syn-surfaceMuted ${danger ? 'text-syn-destructive' : 'text-syn-textPrimary'}`}><Icon className="h-4 w-4" />{label}</button>;
}

function ConversationLoading() {
  return <div className="flex h-[100dvh] items-center justify-center bg-syn-background"><Loader2 className="h-7 w-7 animate-spin text-syn-accent" /></div>;
}
