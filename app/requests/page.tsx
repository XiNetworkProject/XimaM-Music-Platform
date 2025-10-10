'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  MessageCircle, 
  Bell, 
  Check, 
  X, 
  Clock,
  Users,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BottomNav from '@/components/BottomNav';
import FollowRequestCard from '@/components/FollowRequestCard';
import toast from 'react-hot-toast';
import Avatar from '@/components/Avatar';

interface FollowRequest {
  _id: string;
  from: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface MessageRequest {
  _id: string;
  from: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  conversationId?: string;
}

type TabType = 'follow' | 'messages';

export default function RequestsPage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('follow');
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les demandes
  useEffect(() => {
    if (session?.user) {
      fetchRequests();
    }
  }, [session]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Charger les demandes de suivi
      const followRes = await fetch('/api/users/follow-requests');
      if (followRes.ok) {
        const followData = await followRes.json();
        setFollowRequests(followData.requests || []);
      }

      // Charger les demandes de messagerie
      const messageRes = await fetch('/api/messages/requests');
      if (messageRes.ok) {
        const messageData = await messageRes.json();
        setMessageRequests(messageData.requests || []);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleFollowRequestUpdate = (requestId: string, status: 'accepted' | 'rejected') => {
    setFollowRequests(prev => 
      prev.filter(req => req._id !== requestId)
    );
  };

  const handleMessageRequestUpdate = (requestId: string, status: 'accepted' | 'rejected') => {
    setMessageRequests(prev => 
      prev.filter(req => req._id !== requestId)
    );
  };

  // Affichage si non connecté
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <main className="container mx-auto px-4 pt-16 pb-32">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Bell size={64} className="mx-auto text-purple-400 mb-4" />
              <h1 className="text-3xl font-bold mb-4">Demandes</h1>
              <p className="text-white/60">Vous devez être connecté pour voir vos demandes.</p>
            </div>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Se connecter
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const pendingFollowRequests = followRequests.filter(req => req.status === 'pending');
  const pendingMessageRequests = messageRequests.filter(req => req.status === 'pending');
  const totalPending = pendingFollowRequests.length + pendingMessageRequests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Bell className="text-purple-400" />
                  Demandes
                  {totalPending > 0 && (
                    <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                      {totalPending}
                    </span>
                  )}
                </h1>
                <p className="text-white/60">Gérez vos demandes de suivi et de messagerie</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('follow')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                  activeTab === 'follow'
                    ? 'bg-purple-600 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <UserPlus size={16} />
                <span>Suivis ({pendingFollowRequests.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-purple-600 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <MessageCircle size={16} />
                <span>Messages ({pendingMessageRequests.length})</span>
              </button>
            </div>
          </div>

          {/* Contenu */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/60">Chargement des demandes...</p>
              </motion.div>
            ) : activeTab === 'follow' ? (
              <motion.div
                key="follow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {pendingFollowRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-white/40 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune demande de suivi</h3>
                    <p className="text-white/60">Vous n'avez pas de nouvelles demandes de suivi.</p>
                  </div>
                ) : (
                  pendingFollowRequests.map((request) => (
                    <FollowRequestCard
                      key={request._id}
                      request={request}
                      onUpdate={handleFollowRequestUpdate}
                    />
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {pendingMessageRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={48} className="mx-auto text-white/40 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune demande de message</h3>
                    <p className="text-white/60">Vous n'avez pas de nouvelles demandes de conversation.</p>
                  </div>
                ) : (
                  pendingMessageRequests.map((request) => (
                    <MessageRequestCard
                      key={request._id}
                      request={request}
                      onUpdate={handleMessageRequestUpdate}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton de rafraîchissement */}
          {!loading && (
            <motion.button
              onClick={handleRefresh}
              disabled={refreshing}
              className="fixed bottom-24 right-4 p-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-full shadow-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {refreshing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Settings size={20} className="text-white" />
              )}
            </motion.button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// Composant pour les demandes de message
function MessageRequestCard({ request, onUpdate }: { request: MessageRequest; onUpdate: (id: string, status: 'accepted' | 'rejected') => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/accept/${request._id}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        onUpdate(request._id, 'accepted');
        toast.success('Demande de conversation acceptée');
        if (request.conversationId) {
          router.push(`/messages/${request.conversationId}`);
        }
      } else {
        toast.error('Erreur lors de l\'acceptation');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/reject/${request._id}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        onUpdate(request._id, 'rejected');
        toast.success('Demande refusée');
      } else {
        toast.error('Erreur lors du refus');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return 'Hier';
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-effect rounded-xl p-4 border border-white/10"
    >
      <div className="flex items-start space-x-3">
        <Avatar
          src={request.from.avatar}
          name={request.from.name}
          username={request.from.username}
          size="lg"
        />
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-white">{request.from.name}</span>
            <span className="text-white/60 text-sm">@{request.from.username}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-white/60 mb-3">
            <Clock size={14} />
            <span>{formatDate(request.createdAt)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              onClick={handleAccept}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span>Accepter</span>
            </motion.button>

            <motion.button
              onClick={handleReject}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <X size={14} />
              )}
              <span>Refuser</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 