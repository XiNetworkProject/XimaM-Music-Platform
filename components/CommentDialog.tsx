'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, MessageCircle, User, Clock, Heart, Reply, MoreVertical, 
  Edit, Trash2, X, AlertTriangle, Crown, Filter, Eye, EyeOff 
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import ModerationWarning from './ModerationWarning';
import CreatorModerationActions from './CreatorModerationActions';
import CreatorFilterManager from './CreatorFilterManager';

interface Comment {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  content: string;
  likes: string[]; // Tableau vide pour compatibilité MongoDB
  likesCount: number; // Compteur réel des likes Supabase
  isLiked?: boolean;
  replies?: Comment[];
  isDeleted?: boolean;
  isCreatorFavorite?: boolean;
  customFiltered?: boolean;
  customFilterReason?: string;
  createdAt: string;
  updatedAt?: string;
}

interface CommentDialogProps {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  initialComments: Comment[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function CommentDialog({
  trackId,
  trackTitle,
  trackArtist,
  initialComments,
  isOpen,
  onClose,
  className = ''
}: CommentDialogProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [showModerationWarning, setShowModerationWarning] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [viewMode, setViewMode] = useState<'public' | 'creator' | 'all'>('public');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeFiltered, setIncludeFiltered] = useState(false);
  const [moderationStats, setModerationStats] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Vérifier si l'utilisateur est le créateur
  useEffect(() => {
    if (session?.user?.id && trackId) {
      // Ne pas vérifier le statut de créateur pour la radio ou les pistes IA
      if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-')) {
        setIsCreator(false);
        return;
      }
      
      // Vérifier si l'utilisateur est le créateur de la piste
      const checkCreatorStatus = async () => {
        try {
          const response = await fetch(`/api/tracks/${trackId}/creator-check`);
          if (response.ok) {
            const { isCreator } = await response.json();
            setIsCreator(isCreator);
          }
        } catch (error) {
          console.error('Erreur vérification créateur:', error);
          setIsCreator(false);
        }
      };
      
      checkCreatorStatus();
    }
  }, [session, trackId]);

  // Charger les commentaires avec modération
  const loadComments = async () => {
    try {
      // Ne pas charger les commentaires pour la radio ou les pistes IA
      if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-')) {
        setComments([]);
        setModerationStats(null);
        setPermissions(null);
        return;
      }
      
      const params = new URLSearchParams();
      if (isCreator) {
        params.append('includeDeleted', includeDeleted.toString());
        params.append('includeFiltered', includeFiltered.toString());
        params.append('includeStats', 'true');
        params.append('view', viewMode);
      }

      const response = await fetch(`/api/tracks/${trackId}/comments/moderation?${params}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
        setModerationStats(data.stats);
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, isCreator, includeDeleted, includeFiltered, viewMode]);

  // Scroll vers le bas quand de nouveaux commentaires arrivent
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `il y a ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `il y a ${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  const handleSubmitComment = async () => {
    if (!session?.user?.id || !newComment.trim() || isSubmitting) return;

    // Vérifier la modération
    if (moderationResult && !moderationResult.isClean) {
      setShowModerationWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const { comment } = await response.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
        setModerationResult(null);
        setShowModerationWarning(false);
      } else {
        const error = await response.json();
        if (error.details) {
          setModerationResult(error.details);
          setShowModerationWarning(true);
        }
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!session?.user?.id || !replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      if (response.ok) {
        const { reply } = await response.json();
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, replies: [...(comment.replies || []), reply] }
            : comment
        ));
        setReplyContent('');
        setReplyTo(null);
      }
    } catch (error) {
      console.error('Erreur ajout réponse:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (response.ok) {
        const { comment } = await response.json();
        setComments(prev => prev.map(c => 
          c.id === commentId ? comment : c
        ));
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Erreur modification commentaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModerationAction = async (action: string, data?: any) => {
    try {
      const { commentId, reason } = data || {};
      if (!commentId) {
        console.error('CommentId manquant pour l\'action de modération');
        return;
      }

      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        await loadComments(); // Recharger les commentaires
      } else {
        const errorData = await response.json();
        console.error('Erreur API modération:', errorData);
      }
    } catch (error) {
      console.error('Erreur action modération:', error);
      throw error;
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const { isLiked, likesCount } = await response.json();
        
        // Mettre à jour l'état local optimistiquement
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                isLiked: !!isLiked,
                likesCount: likesCount
              }
            : comment
        ));
      } else {
        console.error('Erreur like commentaire:', await response.text());
      }
    } catch (error) {
      console.error('Erreur like commentaire:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[220] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Commentaires
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {trackTitle} • {trackArtist}
            </p>
          </div>
          
          {/* Actions créateur */}
          {isCreator && (
            <div className="flex items-center gap-2">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="public">Vue publique</option>
                <option value="creator">Vue créateur</option>
                <option value="all">Tout voir</option>
              </select>
              
              {viewMode !== 'public' && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={includeDeleted}
                      onChange={(e) => setIncludeDeleted(e.target.checked)}
                      className="rounded"
                    />
                    Supprimés
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={includeFiltered}
                      onChange={(e) => setIncludeFiltered(e.target.checked)}
                      className="rounded"
                    />
                    Filtrés
                  </label>
                </div>
              )}
              
              {/* Gestionnaire de filtres personnalisés */}
              <CreatorFilterManager />
            </div>
          )}
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statistiques créateur */}
        {isCreator && moderationStats && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-sm">
              <span>Total: {moderationStats.totalComments}</span>
              <span className="text-red-600">Supprimés: {moderationStats.deletedComments}</span>
              <span className="text-yellow-600">Filtrés: {moderationStats.filteredComments}</span>
              <span className="text-red-500">Adorés: {moderationStats.favoriteComments}</span>
            </div>
          </div>
        )}

        {/* Zone de saisie */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={1000}
              />
              
              {/* Avertissement de modération */}
              <ModerationWarning
                content={newComment}
                onModerationChange={setModerationResult}
                className="mt-2"
              />
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-500">
                  {newComment.length}/1000
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting || (moderationResult && !moderationResult.isClean)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des commentaires */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
                            {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border ${
                  comment.isDeleted 
                    ? 'border-red-200 dark:border-red-800 opacity-60' 
                    : comment.customFiltered 
                    ? 'border-yellow-200 dark:border-yellow-800' 
                    : comment.isCreatorFavorite 
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Indicateurs de statut */}
                <div className="flex items-center gap-2 mb-2">
                  {comment.isCreatorFavorite && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <Crown className="w-3 h-3" />
                      <span>Adoré par le créateur</span>
                    </div>
                  )}
                  {comment.customFiltered && (
                    <div className="flex items-center gap-1 text-yellow-500 text-xs">
                      <Filter className="w-3 h-3" />
                      <span>Filtré: {comment.customFilterReason}</span>
                    </div>
                  )}
                  {comment.isDeleted && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <Trash2 className="w-3 h-3" />
                      <span>Commentaire supprimé</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {comment.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{comment.user?.name || comment.user?.username || 'Utilisateur'}</span>
                      <span className="text-gray-500 text-sm">@{comment.user.username}</span>
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    
                    {/* Contenu du commentaire */}
                    {editingComment === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => {
                              setEditingComment(null);
                              setEditContent('');
                            }}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {comment.content}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Like */}
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                            comment.isLiked
                              ? 'bg-red-500 text-white'
                              : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{comment.likesCount || 0}</span>
                        </button>

                        {/* Répondre */}
                        <button
                          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        >
                          <Reply className="w-4 h-4" />
                          <span className="text-sm">Répondre</span>
                        </button>

                        {/* Actions utilisateur */}
                        {session?.user?.id === comment.user.id && !comment.isDeleted && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingComment(comment.id);
                                setEditContent(comment.content);
                              }}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Actions créateur */}
                        {isCreator && (
                          <CreatorModerationActions
                            commentId={comment.id}
                            trackId={trackId}
                            isCreator={isCreator}
                            isCreatorFavorite={comment.isCreatorFavorite || false}
                            isDeleted={comment.isDeleted || false}
                            isFiltered={comment.customFiltered || false}
                            onAction={handleModerationAction}
                          />
                        )}
                      </div>
                    </div>

                    {/* Zone de réponse */}
                    {replyTo === comment.id && (
                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="flex gap-2">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Écrire une réponse..."
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                            rows={2}
                          />
                          <button
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={!replyContent.trim() || isSubmitting}
                            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting ? '...' : 'Répondre'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Réponses */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="ml-6 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm">{reply.user?.name || reply.user?.username}</span>
                              <span className="text-gray-500 text-xs">@{reply.user.username}</span>
                              <span className="text-gray-400 text-xs">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={commentsEndRef} />
        </div>
      </motion.div>
    </motion.div>
  );
} 