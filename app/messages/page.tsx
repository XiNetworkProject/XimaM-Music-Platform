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
  ArrowLeft,
  Eye,
  EyeOff,
  Activity,
  Wifi,
  WifiOff,
  Heart,
  Smile,
  Camera,
  Phone,
  Video as VideoIcon,
  User,
  Volume2,
  Play,
  Pause
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

interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  isTyping: boolean;
}

// Composant pour l'avatar avec statut en ligne
const UserAvatar = ({ user, isOnline = false, isTyping = false }: { 
  user: any; 
  isOnline?: boolean;
  isTyping?: boolean;
}) => (
  <div className="relative">
    <motion.img
      src={user.avatar || '/default-avatar.png'}
      alt={user.name}
      className="w-14 h-14 rounded-full object-cover border-2 border-purple-400 shadow-lg"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    />
    
    {/* Indicateur de statut en ligne */}
    {isOnline && (
      <motion.div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
      />
    )}
    
    {/* Indicateur de frappe */}
    {isTyping && (
      <motion.div
        className="absolute -top-1 -left-1 w-6 h-6 bg-purple-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
      >
        <Activity size={10} className="text-white animate-pulse" />
      </motion.div>
    )}
  </div>
);

// Composant pour l'aperçu du dernier message
const LastMessagePreview = ({ message }: { message?: any }) => {
  if (!message) return <span className="text-sm text-gray-400">Aucun message</span>;

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'image': return '📷';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      default: return '';
    }
  };

  const getMessageText = (type: string, content: string) => {
    switch (type) {
      case 'text':
        return content.length > 40 ? content.substring(0, 40) + '...' : content;
      case 'image': return 'Image';
      case 'video': return 'Vidéo';
      case 'audio': return 'Message vocal';
      default: return 'Nouveau message';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {message.type !== 'text' && (
        <span className="text-sm">{getMessageIcon(message.type)}</span>
      )}
      <span className="text-sm text-gray-300 truncate">
        {getMessageText(message.type, message.content)}
      </span>
    </div>
  );
};

// Composant pour les boutons d'action des demandes
const RequestActions = ({ 
  conversationId, 
  onAccept, 
  onDecline 
}: { 
  conversationId: string; 
  onAccept: (id: string) => void; 
  onDecline: (id: string) => void; 
}) => (
  <motion.div 
    className="flex items-center space-x-2 mt-2"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
  >
    <span className="text-sm text-orange-400 font-medium">Demande en attente</span>
    <div className="flex space-x-2">
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onAccept(conversationId);
        }}
        className="p-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Check size={16} className="text-white" />
      </motion.button>
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onDecline(conversationId);
        }}
        className="p-2 rounded-full bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <X size={16} className="text-white" />
      </motion.button>
    </div>
  </motion.div>
);

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isConnected, sendNotification } = useMessageNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Charger les conversations
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
      
      // Timeout de 10 secondes pour éviter le chargement infini
      const timeout = setTimeout(() => {
        if (loading) {
          setLoading(false);
          setError('Délai d\'attente dépassé. Vérifiez votre connexion.');
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
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
      console.log('🔄 Tentative de chargement des conversations...');
      const response = await fetch('/api/messages/conversations?user=' + (session?.user?.id || 'default-user-id'));
      console.log('📡 Réponse conversations:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('💬 Données conversations reçues:', data);
        
        // Vérifier si la messagerie est en maintenance
        if (data.maintenance || data.error === 'MAINTENANCE') {
          setError('MAINTENANCE');
          setConversations([]);
          return;
        }
        
        setConversations(data.conversations || []);
        setError(null); // Effacer l'erreur précédente
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur lors du chargement des conversations:', response.status, errorText);
        setError('Erreur lors du chargement des conversations');
        toast.error('Erreur lors du chargement des conversations');
      }
    } catch (error) {
      console.error('❌ Erreur réseau pour les conversations:', error);
      setError('Erreur de connexion');
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-purple-400/30 mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MessageCircle size={32} className="text-purple-300" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Connectez-vous</h2>
          <p className="text-gray-400">Pour accéder à vos messages</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black">
      {/* Header moderne */}
      <motion.div 
        className="fixed top-0 left-0 w-full z-30 flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-xl border-b border-purple-400/30 rounded-b-3xl shadow-2xl"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center space-x-3">
          <motion.button
            onClick={() => router.back()}
            className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 shadow-lg border border-purple-400/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={20} className="text-white" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <div className="flex items-center space-x-2 mt-1">
              <motion.div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 2, repeat: isConnected ? Infinity : 0 }}
              />
              <span className="text-xs text-white/60">
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>
        </div>
        <motion.button 
          className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 transition-all duration-300 shadow-lg border border-purple-400/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MoreVertical size={20} className="text-white" />
        </motion.button>
      </motion.div>

      {/* Contenu principal */}
      <div className="pt-24 pb-8 px-4">
        {/* Barre de recherche améliorée */}
        <motion.div 
          className="relative mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300" />
          <motion.input
            type="text"
            placeholder="Rechercher des conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-purple-400/30 rounded-2xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 shadow-lg"
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          />
        </motion.div>

        {/* Liste des conversations */}
        <div className="space-y-4">
          <AnimatePresence>
            {loading ? (
              <motion.div 
                className="flex items-center justify-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-400 border-t-transparent"></div>
                  <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-2 border-indigo-400 border-t-transparent" style={{ animationDelay: '-0.5s' }}></div>
                </div>
              </motion.div>
            ) : error === 'MAINTENANCE' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-400/30">
                  <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-yellow-400">
                  🚧 Messagerie en Maintenance
                </h2>
                <p className="text-lg text-gray-300 mb-6">
                  La messagerie est actuellement indisponible pour une durée indéterminée.
                </p>
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 max-w-md mx-auto">
                  <h3 className="text-xl font-semibold mb-3 text-yellow-300">
                    🔧 Travaux en cours
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Nous travaillons actuellement sur l'amélioration de notre système de messagerie.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span>Maintenance en cours</span>
                  </div>
                </div>
                <div className="mt-8">
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                  >
                    ← Retour à l'accueil
                  </button>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={24} className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-white">Erreur de chargement</h2>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    fetchConversations();
                  }}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Réessayer
                </button>
              </motion.div>
            ) : conversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-16"
              >
                <motion.div
                  className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-purple-400/30 mx-auto mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <MessageCircle size={32} className="text-purple-300" />
                </motion.div>
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
                .map((conversation, index) => {
                  const otherUser = getOtherParticipant(conversation);
                  if (!otherUser) return null;

                  // TODO: Implémenter de vrais statuts en ligne via WebSocket
                  // Pour l'instant, utiliser des valeurs par défaut réalistes
                  const isOnline = false; // Par défaut hors ligne
                  const isTyping = false; // Par défaut pas en train de taper

                  return (
                                          <motion.div
                        key={conversation._id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: index * 0.1,
                          ease: "easeOut"
                        }}
                        className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-purple-400/30 rounded-3xl p-6 hover:from-white/15 hover:to-white/10 transition-all duration-300 cursor-pointer shadow-lg"
                        onClick={() => {
                          if (conversation.accepted) {
                            router.push(`/messages/${conversation._id}`);
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                      >
                      <div className="flex items-center space-x-4">
                        {/* Avatar avec statut */}
                        <UserAvatar 
                          user={otherUser} 
                          isOnline={isOnline}
                          isTyping={isTyping}
                        />

                        {/* Contenu de la conversation */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-white truncate">
                                {otherUser.name}
                              </h3>
                              {isOnline && (
                                <motion.div
                                  className="w-2 h-2 bg-green-500 rounded-full"
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              )}
                            </div>
                            <span className="text-xs text-white/60 font-mono">
                              {formatDate(conversation.updatedAt)}
                            </span>
                          </div>
                          
                          {conversation.accepted ? (
                            <div className="space-y-1">
                              <LastMessagePreview message={conversation.lastMessage} />
                              {isTyping && (
                                <motion.div
                                  className="flex items-center space-x-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                >
                                  <Activity size={12} className="text-purple-400 animate-pulse" />
                                  <span className="text-xs text-purple-400">écrit...</span>
                                </motion.div>
                              )}
                            </div>
                          ) : (
                            <RequestActions
                              conversationId={conversation._id}
                              onAccept={handleAcceptRequest}
                              onDecline={handleDeclineRequest}
                            />
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