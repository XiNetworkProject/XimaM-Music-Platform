'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, Heart, MessageCircle, Share2, Clock, Headphones, 
  Users, Calendar, Music, User, Tag, FileText, ExternalLink, Copy,
  Facebook, Twitter, Instagram, Link
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useAudioPlayer } from '@/app/providers';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  createdAt: string;
  genre?: string[];
  description?: string;
  lyrics?: string;
  isLiked?: boolean;
}

interface Comment {
  _id: string;
  content: string;
  user: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

interface TrackModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TrackModal({ track, isOpen, onClose }: TrackModalProps) {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { audioState, playTrack, handleLike } = useAudioPlayer();
  
  const [activeTab, setActiveTab] = useState<'info' | 'lyrics' | 'comments'>('info');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const isCurrentTrack = currentTrack?._id === track?._id;
  const isPlaying = isCurrentTrack && audioState.isPlaying;

  // Charger les commentaires quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && track) {
      fetchComments();
    }
  }, [isOpen, track]);

  const fetchComments = async () => {
    if (!track) return;
    
    try {
      const response = await fetch(`/api/tracks/${track._id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      } else {
        console.error('Erreur chargement commentaires:', response.status);
        setComments([]);
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
      setComments([]);
    }
  };

  const handleLikeTrack = async () => {
    if (!session || !track) return;

    try {
      const response = await fetch(`/api/tracks/${track._id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        // Mettre à jour l'état local
        if (track) {
          track.isLiked = data.isLiked;
          track.likes = data.isLiked 
            ? [...track.likes, user?.id || '']
            : track.likes.filter(id => id !== user?.id);
        }
      }
    } catch (error) {
      console.error('Erreur like/unlike:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!session || !track || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tracks/${track._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async (platform?: string) => {
    if (!track) return;

    const url = `${window.location.origin}/track/${track._id}`;
    const text = `Écoute "${track.title}" par ${track.artist.name} sur XimaM`;

    switch (platform) {
      case 'copy':
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
        break;
      default:
        setShowShareMenu(!showShareMenu);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!track) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-48 sm:h-64 bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900 flex-shrink-0">
              {/* Image de fond */}
              <div className="absolute inset-0">
                <img
                  src={track.coverUrl || '/default-cover.jpg'}
                  alt={track.title}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
              </div>

              {/* Contenu header */}
              <div className="relative h-full flex items-end p-4 sm:p-6">
                <div className="flex items-end space-x-3 sm:space-x-6 w-full">
                  {/* Cover */}
                  <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 truncate">
                      {track.title}
                    </h1>
                    <p className="text-sm sm:text-xl text-gray-300 mb-2 sm:mb-4">
                      {track.artist.name}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm text-gray-300">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Headphones size={12} className="sm:w-4 sm:h-4" />
                        <span>{formatNumber(track.plays)} écoutes</span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Users size={12} className="sm:w-4 sm:h-4" />
                        <span>{formatNumber(track.likes.length)} likes</span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Clock size={12} className="sm:w-4 sm:h-4" />
                        <span>{formatDuration(track.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton fermer */}
                  <button
                    onClick={onClose}
                    className="absolute top-2 right-2 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X size={16} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenu principal - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
                {/* Actions principales */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => playTrack(track._id)}
                    className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-sm sm:text-base"
                  >
                    {isPlaying ? <Pause size={16} className="sm:w-5 sm:h-5" /> : <Play size={16} className="sm:w-5 sm:h-5" />}
                    <span>{isPlaying ? 'Pause' : 'Écouter'}</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLikeTrack}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-full font-semibold transition-all duration-300 text-sm sm:text-base ${
                      track.isLiked
                        ? 'text-red-500 bg-red-500/20 border border-red-500/30'
                        : 'text-gray-400 bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <Heart size={14} className="sm:w-4 sm:h-4" fill={track.isLiked ? 'currentColor' : 'none'} />
                    <span>J'aime</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('comments')}
                    className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 text-gray-400 bg-gray-800 rounded-full font-semibold hover:bg-gray-700 transition-all duration-300 text-sm sm:text-base"
                  >
                    <MessageCircle size={14} className="sm:w-4 sm:h-4" />
                    <span>Commenter</span>
                  </motion.button>

                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleShare()}
                      className="flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 text-gray-400 bg-gray-800 rounded-full font-semibold hover:bg-gray-700 transition-all duration-300 text-sm sm:text-base"
                    >
                      <Share2 size={14} className="sm:w-4 sm:h-4" />
                      <span>Partager</span>
                    </motion.button>

                    {/* Menu partage */}
                    <AnimatePresence>
                      {showShareMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-2 z-10 min-w-[150px]"
                        >
                          <button
                            onClick={() => handleShare('copy')}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-sm"
                          >
                            <Copy size={14} />
                            <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
                          </button>
                          <button
                            onClick={() => handleShare('facebook')}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-sm"
                          >
                            <Facebook size={14} />
                            <span>Facebook</span>
                          </button>
                          <button
                            onClick={() => handleShare('twitter')}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors text-sm"
                          >
                            <Twitter size={14} />
                            <span>Twitter</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Onglets */}
                <div className="flex space-x-1 mb-4 sm:mb-6 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all duration-300 text-xs sm:text-sm ${
                      activeTab === 'info'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Informations
                  </button>
                  {track.lyrics && (
                    <button
                      onClick={() => setActiveTab('lyrics')}
                      className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all duration-300 text-xs sm:text-sm ${
                        activeTab === 'lyrics'
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Paroles
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all duration-300 text-xs sm:text-sm ${
                      activeTab === 'comments'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Commentaires ({comments.length})
                  </button>
                </div>

                {/* Contenu des onglets */}
                <div className="min-h-[200px] sm:min-h-[300px]">
                  {activeTab === 'info' && (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Description */}
                      {track.description && (
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Description</h3>
                          <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{track.description}</p>
                        </div>
                      )}

                      {/* Détails */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Détails</h3>
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300 text-sm sm:text-base">
                              <Calendar size={14} className="sm:w-4 sm:h-4" />
                              <span>Sortie le {formatDate(track.createdAt)}</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300 text-sm sm:text-base">
                              <Clock size={14} className="sm:w-4 sm:h-4" />
                              <span>Durée {formatDuration(track.duration)}</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300 text-sm sm:text-base">
                              <Headphones size={14} className="sm:w-4 sm:h-4" />
                              <span>{formatNumber(track.plays)} écoutes</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300 text-sm sm:text-base">
                              <Heart size={14} className="sm:w-4 sm:h-4" />
                              <span>{formatNumber(track.likes.length)} likes</span>
                            </div>
                          </div>
                        </div>

                        {/* Artiste */}
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Artiste</h3>
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <img
                              src={track.artist.avatar || '/default-avatar.png'}
                              alt={track.artist.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium text-white text-sm sm:text-base">{track.artist.name}</p>
                              <p className="text-gray-400 text-xs sm:text-sm">@{track.artist.username}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Genres */}
                      {track.genre && track.genre.length > 0 && (
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Genres</h3>
                          <div className="flex flex-wrap gap-2">
                            {track.genre.map((genre, index) => (
                              <span
                                key={index}
                                className="px-2 sm:px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs sm:text-sm border border-purple-600/30"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'lyrics' && track.lyrics && (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Paroles</h3>
                      <div className="bg-gray-800 rounded-lg p-3 sm:p-4 max-h-60 sm:max-h-96 overflow-y-auto">
                        <pre className="text-gray-300 whitespace-pre-wrap font-sans leading-relaxed text-sm sm:text-base">
                          {track.lyrics}
                        </pre>
                      </div>
                    </div>
                  )}

                  {activeTab === 'comments' && (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Ajouter un commentaire */}
                      {session && (
                        <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Ajouter un commentaire..."
                            className="w-full bg-gray-700 text-white rounded-lg p-2 sm:p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                            rows={3}
                          />
                          <div className="flex justify-end mt-2 sm:mt-3">
                            <button
                              onClick={handleSubmitComment}
                              disabled={!newComment.trim() || isSubmittingComment}
                              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                            >
                              {isSubmittingComment ? 'Envoi...' : 'Commenter'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Liste des commentaires */}
                      <div className="space-y-3 sm:space-y-4">
                        {comments.length === 0 ? (
                          <p className="text-gray-400 text-center py-6 sm:py-8 text-sm sm:text-base">
                            Aucun commentaire pour le moment. Soyez le premier !
                          </p>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment._id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start space-x-2 sm:space-x-3">
                                <img
                                  src={comment.user.avatar || '/default-avatar.png'}
                                  alt={comment.user.name}
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <p className="font-medium text-white text-sm sm:text-base">{comment.user.name}</p>
                                    <p className="text-gray-400 text-xs sm:text-sm">@{comment.user.username}</p>
                                  </div>
                                  <p className="text-gray-300 mb-2 text-sm sm:text-base">{comment.content}</p>
                                  <p className="text-gray-500 text-xs sm:text-sm">
                                    {formatDate(comment.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 