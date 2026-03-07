'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '@/components/Avatar';
import {
  MessageCircle,
  Search,
  ArrowRight,
  Check,
  X,
  Image as ImageIcon,
  Video,
  Mic,
  Send,
  UserPlus,
  Clock,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Conversation {
  _id: string;
  name?: string;
  type: string;
  accepted: boolean;
  participants: Array<{ _id: string; name: string; username: string; avatar?: string }>;
  lastMessage?: { _id: string; content: string; type: string; createdAt: string; senderId: string };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MessageRequest {
  _id: string;
  from: { _id: string; name: string; username: string; avatar?: string };
  message?: string;
  status: string;
  createdAt: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'conversations' | 'requests'>('conversations');
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchConversations();
      fetchRequests();
    }
  }, [session]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/messages/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/messages/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {}
  };

  const handleRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingReqId(requestId);
    try {
      const res = await fetch(`/api/messages/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests((prev) => prev.filter((r) => r._id !== requestId));
        if (action === 'accept') {
          toast.success('Demande acceptee');
          if (data.conversationId) {
            await fetchConversations();
            router.push(`/messages/${data.conversationId}`);
          }
        } else {
          toast.success('Demande refusee');
        }
      } else {
        toast.error('Erreur traitement');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setProcessingReqId(null);
    }
  };

  const getOtherParticipant = (conv: Conversation) =>
    conv.participants.find((p) => p._id !== session?.user?.id);

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "A l'instant";
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}j`;
    return new Date(d).toLocaleDateString('fr-FR');
  };

  const getMessagePreview = (msg?: Conversation['lastMessage']) => {
    if (!msg) return 'Nouvelle conversation';
    switch (msg.type) {
      case 'image': return 'Photo';
      case 'video': return 'Video';
      case 'audio': return 'Message vocal';
      default: return msg.content.length > 45 ? msg.content.slice(0, 45) + '...' : msg.content;
    }
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-white/30" />;
      case 'video': return <Video className="w-3.5 h-3.5 text-white/30" />;
      case 'audio': return <Mic className="w-3.5 h-3.5 text-white/30" />;
      default: return null;
    }
  };

  const filteredConvs = conversations.filter((conv) => {
    const other = getOtherParticipant(conv);
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return other?.name.toLowerCase().includes(q) || other?.username.toLowerCase().includes(q);
  });

  if (!session?.user) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0e] flex items-center justify-center text-white">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/[0.07] blur-[130px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Messagerie</h2>
          <p className="text-sm text-white/40">Connectez-vous pour acceder a vos messages</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0e] text-white overflow-hidden pb-32 lg:pb-8">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/[0.07] blur-[130px] animate-[synaura-blob1_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-violet-600/[0.06] blur-[130px] animate-[synaura-blob2_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-14">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 mb-3">
            <Send className="w-3.5 h-3.5" />
            <span>Messagerie</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Messages</h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'conversations'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Conversations
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[10px]">{conversations.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              activeTab === 'requests'
                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Demandes
            {requests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-violet-500 text-white text-[10px] font-bold">{requests.length}</span>
            )}
          </button>
        </div>

        {/* Search (only for conversations) */}
        {activeTab === 'conversations' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
          </motion.div>
        )}

        {/* CONVERSATIONS TAB */}
        {activeTab === 'conversations' && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <p className="text-sm text-white/40">Chargement...</p>
              </div>
            ) : filteredConvs.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <MessageCircle className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-base font-bold mb-2">Aucune conversation</h3>
                <p className="text-sm text-white/35 mb-4 max-w-xs mx-auto">
                  Envoyez une demande de message depuis le profil d&apos;un createur pour commencer a discuter.
                </p>
                <button
                  onClick={() => router.push('/discover')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Decouvrir des createurs
                </button>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredConvs.map((conv, i) => {
                  const other = getOtherParticipant(conv);
                  if (!other) return null;
                  return (
                    <motion.div
                      key={conv._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => router.push(`/messages/${conv._id}`)}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer group"
                    >
                      <div className="relative shrink-0">
                        <Avatar
                          src={other.avatar ? other.avatar.replace('/upload/', '/upload/f_auto,q_auto/') : null}
                          name={other.name}
                          username={other.username}
                          size="lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                            {other.name}
                          </h3>
                          <span className="text-[11px] text-white/25 shrink-0 ml-2">
                            {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getMessageIcon(conv.lastMessage?.type)}
                          <p className="text-xs text-white/35 truncate">{getMessagePreview(conv.lastMessage)}</p>
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{conv.unreadCount}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <Inbox className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-base font-bold mb-2">Aucune demande</h3>
                <p className="text-sm text-white/35 max-w-xs mx-auto">
                  Les demandes de messages que vous recevez apparaitront ici.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {requests.map((req, i) => (
                  <motion.div
                    key={req._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="shrink-0 cursor-pointer"
                        onClick={() => router.push(`/profile/${req.from.username}`)}
                      >
                        <Avatar
                          src={req.from.avatar ? req.from.avatar.replace('/upload/', '/upload/f_auto,q_auto/') : null}
                          name={req.from.name}
                          username={req.from.username}
                          size="lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h3
                              className="text-sm font-semibold text-white cursor-pointer hover:text-indigo-300 transition-colors"
                              onClick={() => router.push(`/profile/${req.from.username}`)}
                            >
                              {req.from.name}
                            </h3>
                            <p className="text-[11px] text-white/30">@{req.from.username}</p>
                          </div>
                          <span className="text-[11px] text-white/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(req.createdAt)}
                          </span>
                        </div>

                        {req.message && (
                          <div className="mt-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] text-xs text-white/50 italic">
                            &ldquo;{req.message}&rdquo;
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleRequest(req._id, 'accept')}
                            disabled={processingReqId === req._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accepter
                          </button>
                          <button
                            onClick={() => handleRequest(req._id, 'reject')}
                            disabled={processingReqId === req._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20 disabled:opacity-40 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            Refuser
                          </button>
                          <button
                            onClick={() => router.push(`/profile/${req.from.username}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-white/40 hover:bg-white/[0.08] transition-all ml-auto"
                          >
                            Voir profil
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
