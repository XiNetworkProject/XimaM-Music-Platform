'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, User, Clock, Heart, Reply, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import InteractiveCounter from './InteractiveCounter';

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  content: string;
  likes: string[];
  createdAt: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  trackId: string;
  initialComments: Comment[];
  onCommentAdded?: (comment: Comment) => void;
  className?: string;
}

export default function CommentSection({ 
  trackId, 
  initialComments, 
  onCommentAdded,
  className = '' 
}: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  // Charger les commentaires au démarrage
  useEffect(() => {
    const loadComments = async () => {
      if (!trackId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tracks/${trackId}/comments`);
        
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        } else {
          console.error('Erreur chargement commentaires');
        }
      } catch (error) {
        console.error('Erreur chargement commentaires:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [trackId]);

  const handleSubmitComment = async () => {
    if (!session?.user?.id || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const { comment } = await response.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
        onCommentAdded?.(comment);
      } else {
        throw new Error('Erreur lors de l\'ajout du commentaire');
      }
    } catch (error) {
      console.error('Erreur:', error);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: replyContent.trim() }),
      });

      if (response.ok) {
        const { reply } = await response.json();
        setComments(prev => prev.map(comment => 
          comment._id === commentId 
            ? { ...comment, replies: [...(comment.replies || []), reply] }
            : comment
        ));
        setReplyContent('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const { isLiked } = await response.json();
        setComments(prev => prev.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              likes: isLiked 
                ? [...comment.likes, session.user.id]
                : comment.likes.filter(id => id !== session.user.id)
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!session?.user?.id || !editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (response.ok) {
        const { comment } = await response.json();
        setComments(prev => prev.map(c => 
          c._id === commentId ? comment : c
        ));
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!session?.user?.id || isSubmitting) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const isLikedByUser = (likes: string[]) => {
    return session?.user?.id ? likes.includes(session.user.id) : false;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle size={20} />
          Commentaires ({comments.length})
        </h3>
      </div>

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-500">Chargement des commentaires...</span>
        </div>
      )}

      {/* Formulaire de commentaire */}
      {session?.user?.id && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
        >
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
              {session.user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-900"
                rows={2}
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/500
                </span>
                <motion.button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Publier
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Liste des commentaires */}
      <div className="space-y-4">
        <AnimatePresence>
          {displayedComments.map((comment, index) => (
            <motion.div
              key={comment._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
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
                  {editingComment === comment._id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded resize-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900"
                        rows={2}
                        maxLength={500}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {editContent.length}/500
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingComment(null);
                              setEditContent('');
                            }}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleEditComment(comment._id)}
                            disabled={!editContent.trim() || isSubmitting}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {comment.content}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <InteractiveCounter
                      type="likes"
                      initialCount={comment.likes.length}
                      isActive={isLikedByUser(comment.likes)}
                      onToggle={() => handleLikeComment(comment._id)}
                      size="sm"
                      className="text-gray-500 hover:text-red-500"
                    />
                    
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                      className="flex items-center gap-1 text-gray-500 hover:text-blue-500 text-sm"
                    >
                      <Reply size={14} />
                      Répondre
                    </button>

                    {/* Boutons de modification/suppression pour le propriétaire */}
                    {session?.user?.id === comment.user._id && (
                      <>
                        <button
                          onClick={() => startEditing(comment)}
                          className="flex items-center gap-1 text-gray-500 hover:text-green-500 text-sm"
                        >
                          <Edit size={14} />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-red-500 text-sm"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>

                  {/* Formulaire de réponse */}
                  <AnimatePresence>
                    {replyingTo === comment._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pl-4 border-l-2 border-purple-200"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Écrire une réponse..."
                          className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded resize-none focus:ring-2 focus:ring-purple-500"
                          rows={2}
                          maxLength={300}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {replyContent.length}/300
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleSubmitReply(comment._id)}
                              disabled={!replyContent.trim() || isSubmitting}
                              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                              Répondre
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Réponses */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <div className="text-sm text-gray-500 font-medium">
                        {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
                      </div>
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="pl-4 border-l-2 border-purple-200 dark:border-purple-600 bg-gray-50 dark:bg-gray-700 rounded-r-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                              {reply.user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="font-semibold text-sm">{reply.user?.name || reply.user?.username || 'Utilisateur'}</span>
                            <span className="text-gray-500 text-xs">@{reply.user.username}</span>
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <Clock size={10} />
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bouton "Voir plus" */}
        {comments.length > 3 && (
          <motion.button
            onClick={() => setShowAllComments(!showAllComments)}
            className="w-full py-2 text-purple-600 hover:text-purple-700 font-medium"
            whileHover={{ scale: 1.02 }}
          >
            {showAllComments ? 'Voir moins' : `Voir ${comments.length - 3} commentaires supplémentaires`}
          </motion.button>
        )}
      </div>
    </div>
  );
} 