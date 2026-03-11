'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowLeft,
  Paperclip,
  Mic,
  Play,
  Pause,
  Volume2,
  MessageCircle,
  Check,
  CheckCheck,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import Avatar from '@/components/Avatar';
import { useAudioPlayer } from '@/app/providers';

interface Message {
  _id: string;
  sender: { _id: string; name: string; username: string; avatar?: string };
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
  duration?: number;
  seenBy: string[];
  createdAt: string;
}

export default function ConversationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { audioState } = useAudioPlayer();
  const playerVisible = audioState.showPlayer && audioState.tracks.length > 0;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (session?.user && conversationId) {
      fetchMessages();
      fetchConversationInfo();
    }
  }, [session, conversationId]);

  useEffect(() => {
    if (!session?.user || !conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => {
            const newMsgs = (data.messages || []).filter(
              (m: Message) => !prev.some((p) => p._id === m._id),
            );
            return newMsgs.length > 0 ? data.messages : prev;
          });
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [session?.user, conversationId]);

  // Scroll le conteneur interne directement (evite que le scroll externe descende la page)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [messages.length]);

  // Bloque le scroll du conteneur externe pendant la conversation
  useEffect(() => {
    const outer = document.querySelector('.app-scroll-container') as HTMLElement | null;
    if (outer) {
      const prev = outer.style.overflow;
      outer.style.overflow = 'hidden';
      return () => { outer.style.overflow = prev; };
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      notify.error('Erreur', 'Erreur chargement messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationInfo = async () => {
    try {
      const res = await fetch('/api/messages/conversations');
      if (res.ok) {
        const data = await res.json();
        const conv = (data.conversations || []).find((c: any) => c._id === conversationId);
        if (conv) {
          const other = conv.participants.find((p: any) => p._id !== session?.user?.id);
          setOtherUser(other);
        }
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage('');
      } else {
        notify.error('Erreur', 'Erreur envoi');
      }
    } catch {
      notify.error('Erreur', 'Erreur de connexion');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let type: 'image' | 'video' | 'audio';
    if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) type = 'image';
    else if (file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) type = 'video';
    else if (file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) type = 'audio';
    else { notify.error('Erreur', 'Format non supporte'); return; }

    await uploadAndSend(file, type);
  };

  const uploadAndSend = async (file: File, type: 'image' | 'video' | 'audio') => {
    setUploading(true);
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const publicId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const sigRes = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, publicId, type }),
      });

      if (!sigRes.ok) throw new Error('Signature error');
      const { signature, apiKey, cloudName, resourceType } = await sigRes.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `messages/${session?.user?.id}`);
      formData.append('public_id', publicId);
      formData.append('resource_type', resourceType);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('signature', signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        { method: 'POST', body: formData },
      );

      if (!uploadRes.ok) throw new Error('Upload failed');
      const result = await uploadRes.json();

      const msgRes = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: result.secure_url, duration: result.duration }),
      });

      if (msgRes.ok) {
        const data = await msgRes.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      notify.error('Erreur', 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordingPreview(URL.createObjectURL(blob));
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      const start = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } catch {
      notify.error('Erreur', 'Microphone inaccessible');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const sendRecording = async () => {
    if (!recordingPreview) return;
    try {
      const res = await fetch(recordingPreview);
      const blob = await res.blob();
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      await uploadAndSend(file, 'audio');
      setRecordingPreview(null);
      setRecordingDuration(0);
    } catch {
      notify.error('Erreur', 'Erreur envoi vocal');
    }
  };

  const cancelRecording = () => {
    setRecordingPreview(null);
    setRecordingDuration(0);
  };

  const playAudio = (url: string, id: string) => {
    if (playingAudio === id) {
      currentAudioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    currentAudioRef.current?.pause();
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    setPlayingAudio(id);
    audio.onended = () => { setPlayingAudio(null); currentAudioRef.current = null; };
    audio.play().catch(() => { setPlayingAudio(null); notify.error('Erreur', 'Erreur lecture'); });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const formatMsgTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center text-white">
        <p className="text-white/40">Connectez-vous pour acceder aux messages</p>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-[#0a0a0e] text-white flex flex-col ${
        playerVisible
          ? 'h-[calc(100dvh-120px)] lg:h-[calc(100dvh-60px)]'
          : 'h-[calc(100dvh-56px)] lg:h-[100dvh]'
      }`}
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/[0.04] blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-violet-600/[0.04] blur-[130px]" />
      </div>

      {/* Header */}
      <div className="relative z-20 shrink-0 bg-[#0a0a0e]/80 backdrop-blur-xl border-b border-white/[0.06]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/messages')}
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          {otherUser ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar
                src={otherUser.avatar ? otherUser.avatar.replace('/upload/', '/upload/f_auto,q_auto/') : null}
                name={otherUser.name}
                username={otherUser.username}
                size="md"
              />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">{otherUser.name}</h2>
                <p className="text-[11px] text-white/30">@{otherUser.username}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/[0.04]" />
              <div className="h-4 w-24 rounded bg-white/[0.04]" />
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-sm text-white/30">Commencez la discussion</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender._id === session.user?.id;
              const othersSeen = msg.seenBy.filter((id) => id !== msg.sender._id);
              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] sm:max-w-md`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? 'bg-indigo-500 text-white rounded-br-md'
                          : 'bg-white/[0.06] text-white rounded-bl-md border border-white/[0.06]'
                      }`}
                    >
                      {msg.type === 'text' && (
                        <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      )}
                      {msg.type === 'image' && (
                        <img
                          src={msg.content.replace('/upload/', '/upload/f_auto,q_auto,w_400/')}
                          alt="Image"
                          className="rounded-xl max-w-full"
                          loading="lazy"
                        />
                      )}
                      {msg.type === 'video' && (
                        <video src={msg.content} controls className="rounded-xl max-w-full" />
                      )}
                      {msg.type === 'audio' && (
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <button
                            onClick={() => playAudio(msg.content, msg._id)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              playingAudio === msg._id
                                ? 'bg-white/20'
                                : isOwn ? 'bg-white/15' : 'bg-indigo-500/20'
                            }`}
                          >
                            {playingAudio === msg._id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-0.5">
                              {[...Array(12)].map((_, i) => (
                                <div key={i} className={`w-1 rounded-full ${isOwn ? 'bg-white/30' : 'bg-white/15'}`} style={{ height: `${Math.random() * 14 + 4}px` }} />
                              ))}
                            </div>
                            <span className="text-[10px] opacity-50">
                              {msg.duration ? formatTime(msg.duration) : 'Vocal'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-white/20">{formatMsgTime(msg.createdAt)}</span>
                      {isOwn && (
                        othersSeen.length > 0
                          ? <CheckCheck className="w-3 h-3 text-indigo-400" />
                          : <Check className="w-3 h-3 text-white/20" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="relative z-20 shrink-0 bg-[#0a0a0e]/80 backdrop-blur-xl border-t border-white/[0.06]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          {recordingPreview ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">{formatTime(recordingDuration)} enregistre</span>
              <div className="flex-1" />
              <button onClick={cancelRecording} className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                <X className="w-4 h-4 text-red-400" />
              </button>
              <button onClick={sendRecording} className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors">
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          ) : isRecording ? (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-400">Enregistrement... {formatTime(recordingDuration)}</span>
              <div className="flex-1" />
              <button onClick={stopRecording} className="px-4 py-2 rounded-full bg-white/[0.06] text-sm text-white/70 font-medium hover:bg-white/[0.1] transition-colors">
                Arreter
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-9 h-9 shrink-0 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors disabled:opacity-30"
              >
                <Paperclip className="w-4 h-4 text-white/40" />
              </button>
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => { if (isRecording) stopRecording(); }}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={uploading}
                className="w-9 h-9 shrink-0 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors disabled:opacity-30"
              >
                <Mic className="w-4 h-4 text-white/40" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Votre message..."
                disabled={uploading}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition-all disabled:opacity-30"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!newMessage.trim() || sending || uploading}
                className="w-9 h-9 shrink-0 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 text-black" />
              </motion.button>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <span className="text-xs text-white/30">Envoi en cours...</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.webp,.heic,.mp4,.mov,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
