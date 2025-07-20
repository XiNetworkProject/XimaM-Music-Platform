'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Activity, Clock, Smartphone, Monitor } from 'lucide-react';

interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  isTyping: boolean;
  typingInConversation?: string;
  lastActivity: Date;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

interface OnlineStatusIndicatorProps {
  status: OnlineStatus | null;
  isConnected: boolean;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function OnlineStatusIndicator({
  status,
  isConnected,
  showDetails = false,
  size = 'md',
  className = ''
}: OnlineStatusIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Calculer le temps écoulé depuis la dernière activité
  useEffect(() => {
    if (!status?.lastSeen) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const lastSeen = new Date(status.lastSeen);
      const diffInSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo('À l\'instant');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimeAgo(`Il y a ${minutes} min`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`Il y a ${hours}h`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimeAgo(`Il y a ${days}j`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Mise à jour toutes les 30 secondes

    return () => clearInterval(interval);
  }, [status?.lastSeen]);

  // Tailles des icônes
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  const iconSize = iconSizes[size];

  // Déterminer le statut
  const getStatusInfo = () => {
    if (!status) {
      return {
        icon: WifiOff,
        color: 'text-gray-400',
        bgColor: 'bg-gray-400',
        text: 'Statut inconnu',
        pulse: false
      };
    }

    if (status.isOnline) {
      return {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-500',
        text: 'En ligne',
        pulse: true
      };
    }

    if (status.isTyping) {
      return {
        icon: Activity,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500',
        text: 'Écrit...',
        pulse: true
      };
    }

    return {
      icon: WifiOff,
      color: 'text-gray-400',
      bgColor: 'bg-gray-400',
      text: `Vu ${timeAgo}`,
      pulse: false
    };
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Indicateur de statut */}
      <div className="relative">
        <motion.div
          className={`w-2 h-2 rounded-full ${statusInfo.bgColor} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Anneau de pulsation pour les utilisateurs en ligne */}
        {statusInfo.pulse && status?.isOnline && (
          <motion.div
            className={`absolute inset-0 w-2 h-2 rounded-full ${statusInfo.bgColor}`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 0, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>

      {/* Texte du statut */}
      <div className="flex items-center gap-1">
        <IconComponent size={iconSize} className={statusInfo.color} />
        <span className={`text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Détails supplémentaires */}
      {showDetails && status && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-1 text-xs text-gray-500"
          >
            {/* Indicateur de plateforme */}
            {status.deviceInfo && (
              <div className="flex items-center gap-1">
                {status.deviceInfo.isMobile ? (
                  <Smartphone size={10} />
                ) : (
                  <Monitor size={10} />
                )}
                <span className="text-xs">
                  {status.deviceInfo.platform}
                </span>
              </div>
            )}

            {/* Dernière activité */}
            {!status.isOnline && (
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>{timeAgo}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Indicateur de connexion */}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 text-xs text-yellow-500"
        >
          <WifiOff size={10} />
          <span>Déconnecté</span>
        </motion.div>
      )}
    </div>
  );
} 