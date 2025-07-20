'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Eye, Clock } from 'lucide-react';

interface MessageReadStatusProps {
  messageId: string;
  seenBy: string[];
  currentUserId: string;
  isOwnMessage: boolean;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MessageReadStatus({
  messageId,
  seenBy,
  currentUserId,
  isOwnMessage,
  showDetails = false,
  size = 'md',
  className = ''
}: MessageReadStatusProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Tailles des icônes
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const iconSize = iconSizes[size];

  // Déterminer le statut de lecture
  const getReadStatus = () => {
    if (!isOwnMessage) {
      return {
        icon: null,
        color: '',
        text: '',
        show: false
      };
    }

    const hasBeenSeen = seenBy.length > 0;
    const hasBeenSeenByCurrentUser = seenBy.includes(currentUserId);

    if (hasBeenSeen) {
      return {
        icon: CheckCheck,
        color: 'text-blue-500',
        text: 'Vu',
        show: true
      };
    }

    return {
      icon: Check,
      color: 'text-gray-400',
      text: 'Envoyé',
      show: true
    };
  };

  const readStatus = getReadStatus();

  if (!readStatus.show) {
    return null;
  }

  const IconComponent = readStatus.icon;

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icône de statut */}
      {IconComponent && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <IconComponent 
            size={iconSize} 
            className={readStatus.color}
          />
        </motion.div>
      )}

      {/* Détails au survol */}
      <AnimatePresence>
        {isHovered && showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
          >
            <div className="flex items-center gap-1">
              <Eye size={10} />
              <span>{readStatus.text}</span>
            </div>
            
            {seenBy.length > 0 && (
              <div className="mt-1 text-xs text-gray-300">
                Vu par {seenBy.length} personne{seenBy.length > 1 ? 's' : ''}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Texte du statut (optionnel) */}
      {showDetails && (
        <span className={`text-xs ${readStatus.color}`}>
          {readStatus.text}
        </span>
      )}
    </div>
  );
}

// Composant pour afficher les statuts de lecture multiples
export function MessageReadStatusList({
  messages,
  currentUserId,
  showDetails = false,
  className = ''
}: {
  messages: Array<{
    _id: string;
    seenBy: string[];
    sender: { _id: string };
  }>;
  currentUserId: string;
  showDetails?: boolean;
  className?: string;
}) {
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  // Grouper les messages par statut
  const groupedMessages = messages.reduce((acc, message) => {
    const isOwnMessage = message.sender._id === currentUserId;
    const hasBeenSeen = message.seenBy.length > 0;
    
    if (!isOwnMessage) return acc;

    if (hasBeenSeen) {
      acc.read.push(message);
    } else {
      acc.sent.push(message);
    }
    
    return acc;
  }, { sent: [], read: [] } as { sent: any[], read: any[] });

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Messages envoyés non lus */}
      {groupedMessages.sent.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Check size={12} />
          <span>{groupedMessages.sent.length} message{groupedMessages.sent.length > 1 ? 's' : ''} envoyé{groupedMessages.sent.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Messages lus */}
      {groupedMessages.read.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-blue-500">
          <CheckCheck size={12} />
          <span>{groupedMessages.read.length} message{groupedMessages.read.length > 1 ? 's' : ''} vu{groupedMessages.read.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Détails des messages lus */}
      {showDetails && groupedMessages.read.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 space-y-1"
        >
          {groupedMessages.read.slice(0, 3).map((message) => (
            <div
              key={message._id}
              className="flex items-center justify-between text-xs text-gray-500 p-1 rounded hover:bg-gray-100 cursor-pointer"
              onClick={() => setExpandedMessage(expandedMessage === message._id ? null : message._id)}
            >
              <span>Message lu</span>
              <CheckCheck size={10} className="text-blue-500" />
            </div>
          ))}
          
          {groupedMessages.read.length > 3 && (
            <div className="text-xs text-gray-400 text-center">
              +{groupedMessages.read.length - 3} autre{groupedMessages.read.length - 3 > 1 ? 's' : ''}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
} 