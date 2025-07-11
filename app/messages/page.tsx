'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Users, 
  Search,
  Send,
  Image,
  Video,
  Mic,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  }>;
  accepted: boolean;
  lastMessage?: {
    _id: string;
    type: 'text' | 'image' | 'video' | 'audio';
    content: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isConnected, sendNotification } = useMessageNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Charger les conversations
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  // Recharger les conversations quand on reçoit une notification
  useEffect(() => {
    if (isConnected) {
      fetchConversations();
    }
  }, [isConnected]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();
      
      if (response.ok) {
        setConversations(data.conversations);
      } else {
        toast.error('Erreur lors du chargement des conversations');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (conversationId: string) => {
    try {
      const response = await fetch('/api/messages/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (response.ok) {
        toast.success('Demande acceptée');
        
        // Envoyer une notification
        const conversation = conversations.find(c => c._id === conversationId);
        if (conversation) {
          const otherUser = getOtherParticipant(conversation);
          if (otherUser) {
            await sendNotification('request_accepted', otherUser._id, conversationId);
          }
        }
        
        fetchConversations(); // Recharger les conversations
      } else {
        toast.error('Erreur lors de l\'acceptation');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleDeclineRequest = async (conversationId: string) => {
    // TODO: Implémenter la suppression de la conversation
    toast.success('Demande refusée');
    fetchConversations();
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p._id !== session?.user?.id);
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) return 'Aucun message';
    
    switch (conversation.lastMessage.type) {
      case 'text':
        return conversation.lastMessage.content.length > 50 
          ? conversation.lastMessage.content.substring(0, 50) + '...'
          : conversation.lastMessage.content;
      case 'image':
        return '📷 Image';
      case 'video':
        return '🎥 Vidéo';
      case 'audio':
        return '🎵 Message vocal';
      default:
        return 'Nouveau message';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}j`;
    return date.toLocaleDateString('fr-FR');
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-600">Connectez-vous pour accéder aux messages</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            {/* Indicateur de connexion */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <MoreVertical size={20} className="text-white" />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher des conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Liste des conversations */}
        <div className="space-y-3">
          <AnimatePresence>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : conversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <MessageCircle size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucune conversation</h3>
                <p className="text-gray-400">Commencez à discuter avec d'autres utilisateurs</p>
              </motion.div>
            ) : (
              conversations
                .filter(conv => {
                  const otherUser = getOtherParticipant(conv);
                  return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map((conversation) => {
                  const otherUser = getOtherParticipant(conversation);
                  if (!otherUser) return null;

                  return (
                    <motion.div
                      key={conversation._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all cursor-pointer"
                      onClick={() => {
                        if (conversation.accepted) {
                          router.push(`/messages/${conversation._id}`);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="relative">
                          <img
                            src={otherUser.avatar || '/default-avatar.png'}
                            alt={otherUser.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {!conversation.accepted && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                              <Clock size={12} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white truncate">
                              {otherUser.name}
                            </h3>
                            <span className="text-xs text-gray-400">
                              {formatDate(conversation.updatedAt)}
                            </span>
                          </div>
                          
                          {conversation.accepted ? (
                            <p className="text-sm text-gray-300 truncate">
                              {getLastMessagePreview(conversation)}
                            </p>
                          ) : (
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-orange-400">Demande en attente</span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptRequest(conversation._id);
                                  }}
                                  className="p-1 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                                >
                                  <Check size={14} className="text-white" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeclineRequest(conversation._id);
                                  }}
                                  className="p-1 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                                >
                                  <X size={14} className="text-white" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 