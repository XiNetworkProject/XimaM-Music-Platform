'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Check, X, MessageCircle, UserPlus, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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

interface FollowRequestCardProps {
  request: FollowRequest;
  onUpdate: (requestId: string, status: 'accepted' | 'rejected') => void;
}

export default function FollowRequestCard({ request, onUpdate }: FollowRequestCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!session?.user) return;
    
    setActionLoading('accept');
    try {
      const res = await fetch(`/api/users/${request.from._id}/follow`, {
        method: 'POST',
      });
      
      if (res.ok) {
        onUpdate(request._id, 'accepted');
        toast.success(`Vous suivez maintenant ${request.from.name}`);
      } else {
        toast.error('Erreur lors de l\'acceptation');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      const res = await fetch(`/api/users/follow-requests/${request._id}/reject`, {
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
      setActionLoading(null);
    }
  };

  const handleMessage = async () => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/messages/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: request.from._id }),
      });

      if (res.ok) {
        toast.success('Demande de conversation envoyée');
      } else {
        const data = await res.json();
        if (data.error === 'Conversation déjà existante') {
          if (data.accepted) {
            router.push(`/messages/${data.conversationId}`);
            toast.success('Redirection vers la conversation existante');
          } else {
            toast('Demande de conversation déjà envoyée, en attente d\'acceptation', { icon: 'ℹ️' });
          }
        } else {
          toast.error(data.error || 'Erreur lors de l\'envoi de la demande');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    router.push(`/profile/${request.from.username}`);
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
        {/* Avatar */}
        <div className="flex-shrink-0">
          <button
            onClick={handleViewProfile}
            className="relative group"
          >
            <img
              src={request.from.avatar || '/default-avatar.png'}
              alt={request.from.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/20 group-hover:border-purple-400 transition-colors"
            />
            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <button
              onClick={handleViewProfile}
              className="font-semibold text-white hover:text-purple-400 transition-colors truncate"
            >
              {request.from.name}
            </button>
            <span className="text-white/60 text-sm">@{request.from.username}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-white/60 mb-3">
            <Clock size={14} />
            <span>{formatDate(request.createdAt)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={handleAccept}
              disabled={actionLoading === 'accept'}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {actionLoading === 'accept' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span>Accepter</span>
            </motion.button>

            <motion.button
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {actionLoading === 'reject' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <X size={14} />
              )}
              <span>Refuser</span>
            </motion.button>

            <motion.button
              onClick={handleMessage}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <MessageCircle size={14} />
              )}
              <span>Message</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 