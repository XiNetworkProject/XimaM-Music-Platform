'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, ThumbsUp, ThumbsDown, Star, Flame, Smile, 
  Frown, Angry, Zap, Hand, Rocket, Trophy
} from 'lucide-react';

interface Reaction {
  type: string;
  count: number;
  users: string[];
}

interface CommentReactionsProps {
  commentId: string;
  trackId: string;
  initialReactions: Reaction[];
  onReactionChange?: (reactions: Reaction[]) => void;
  className?: string;
}

const REACTION_TYPES = {
  like: { icon: ThumbsUp, color: 'text-blue-500', label: 'J\'aime' },
  love: { icon: Heart, color: 'text-red-500', label: 'J\'adore' },
  laugh: { icon: Smile, color: 'text-yellow-500', label: 'Rigolo' },
  wow: { icon: Zap, color: 'text-purple-500', label: 'Wow' },
  sad: { icon: Frown, color: 'text-gray-500', label: 'Triste' },
  angry: { icon: Angry, color: 'text-red-600', label: 'En colère' },
  fire: { icon: Flame, color: 'text-orange-500', label: 'Feu' },
  star: { icon: Star, color: 'text-yellow-400', label: 'Étoile' },
  clap: { icon: Hand, color: 'text-green-500', label: 'Applaudir' },
  rocket: { icon: Rocket, color: 'text-indigo-500', label: 'Rocket' },
  award: { icon: Trophy, color: 'text-amber-500', label: 'Récompense' }
};

export default function CommentReactions({
  commentId,
  trackId,
  initialReactions,
  onReactionChange,
  className = ''
}: CommentReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReaction = async (reactionType: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactionType }),
      });

      if (response.ok) {
        const { updatedReactions } = await response.json();
        setReactions(updatedReactions);
        onReactionChange?.(updatedReactions);
      }
    } catch (error) {
      console.error('Erreur réaction:', error);
    } finally {
      setIsSubmitting(false);
      setShowReactionPicker(false);
    }
  };

  const getReactionCount = (type: string) => {
    const reaction = reactions.find(r => r.type === type);
    return reaction?.count || 0;
  };

  const hasUserReacted = (type: string) => {
    const reaction = reactions.find(r => r.type === type);
    // Ici vous devriez vérifier si l'utilisateur actuel a réagi
    // Pour l'instant, on simule
    return false;
  };

  const totalReactions = reactions.reduce((sum, reaction) => sum + reaction.count, 0);

  return (
    <div className={`relative ${className}`}>
      {/* Affichage des réactions principales */}
      <div className="flex items-center gap-3">
        {/* Réaction principale (like) */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('like')}
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
            hasUserReacted('like') 
              ? 'bg-blue-500/20 text-blue-500' 
              : 'hover:bg-gray-700 text-gray-400'
          }`}
        >
          <ThumbsUp size={14} />
          {getReactionCount('like') > 0 && (
            <span className="text-xs">{getReactionCount('like')}</span>
          )}
        </motion.button>

        {/* Autres réactions populaires */}
        {reactions
          .filter(r => r.type !== 'like' && r.count > 0)
          .slice(0, 3)
          .map((reaction) => {
            const reactionConfig = REACTION_TYPES[reaction.type as keyof typeof REACTION_TYPES];
            if (!reactionConfig) return null;

            const IconComponent = reactionConfig.icon;
            return (
              <motion.button
                key={reaction.type}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(reaction.type)}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                  hasUserReacted(reaction.type)
                    ? `${reactionConfig.color} bg-opacity-20`
                    : 'hover:bg-gray-700 text-gray-400'
                }`}
              >
                <IconComponent size={14} />
                <span className="text-xs">{reaction.count}</span>
              </motion.button>
            );
          })}

        {/* Bouton pour ouvrir le sélecteur de réactions */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowReactionPicker(!showReactionPicker)}
          className="p-1 hover:bg-gray-700 rounded-full transition-colors text-gray-400"
        >
          <Smile size={16} />
        </motion.button>

        {/* Total des réactions */}
        {totalReactions > 0 && (
          <span className="text-xs text-gray-500">
            {totalReactions} réaction{totalReactions > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Sélecteur de réactions */}
      <AnimatePresence>
        {showReactionPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-0 mb-2 p-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10"
          >
            <div className="grid grid-cols-6 gap-3 p-2">
              {Object.entries(REACTION_TYPES).map(([type, config]) => {
                const IconComponent = config.icon;
                const count = getReactionCount(type);
                const hasReacted = hasUserReacted(type);

                return (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(type)}
                    disabled={isSubmitting}
                    className={`relative p-2 rounded-full transition-colors ${
                      hasReacted
                        ? `${config.color} bg-opacity-20`
                        : 'hover:bg-gray-700 text-gray-400'
                    }`}
                    title={config.label}
                  >
                    <IconComponent size={20} />
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 