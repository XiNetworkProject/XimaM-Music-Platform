'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, MessageSquare } from 'lucide-react';
import CommentDialog from './CommentDialog';

interface CommentButtonProps {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  commentCount: number;
  className?: string;
  variant?: 'default' | 'minimal' | 'card';
  size?: 'sm' | 'md' | 'lg';
}

export default function CommentButton({
  trackId,
  trackTitle,
  trackArtist,
  commentCount,
  className = '',
  variant = 'default',
  size = 'md'
}: CommentButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };

  const variantClasses = {
    default: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    minimal: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white',
    card: 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30'
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsDialogOpen(true)}
        className={`
          flex items-center justify-center rounded-full transition-all duration-300
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        title="Voir les commentaires"
      >
        <MessageCircle size={iconSizes[size]} />
        {commentCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {commentCount > 99 ? '99+' : commentCount}
          </span>
        )}
      </motion.button>

      <CommentDialog
        trackId={trackId}
        trackTitle={trackTitle}
        trackArtist={trackArtist}
        initialComments={[]}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
} 