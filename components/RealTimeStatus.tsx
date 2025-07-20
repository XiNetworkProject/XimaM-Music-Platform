'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Activity, Clock } from 'lucide-react';

interface RealTimeStatusProps {
  userId: string;
  showDebug?: boolean;
}

export default function RealTimeStatus({ userId, showDebug = false }: RealTimeStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/online-status?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError('Erreur récupération statut');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur fetch statut:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStatus();
      
      // Polling toutes les 5 secondes
      const interval = setInterval(fetchStatus, 5000);
      
      return () => clearInterval(interval);
    }
  }, [userId]);

  const formatLastSeen = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (!dateObj || isNaN(dateObj.getTime())) {
        return 'Statut inconnu';
      }
      
      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return 'À l\'instant';
      if (minutes < 60) return `Il y a ${minutes} min`;
      if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`;
      return `Il y a ${Math.floor(minutes / 1440)}j`;
    } catch (error) {
      return 'Statut inconnu';
    }
  };

  const getStatusInfo = () => {
    if (!status) return { isOnline: false, text: 'Chargement...', color: 'text-gray-400' };

    const now = new Date();
    const lastActivity = new Date(status.lastActivity);
    const timeAgo = Math.floor((now.getTime() - lastActivity.getTime()) / 60000);
    
    // En ligne si activité récente (< 5 minutes)
    const isActuallyOnline = status.isOnline && timeAgo < 5;

    if (isActuallyOnline) {
      return {
        isOnline: true,
        text: 'En ligne',
        color: 'text-green-400'
      };
    } else {
      return {
        isOnline: false,
        text: `Vu ${formatLastSeen(status.lastSeen)}`,
        color: 'text-gray-400'
      };
    }
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-xs text-gray-400">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-red-400 rounded-full" />
        <span className="text-xs text-red-400">Erreur</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Indicateur de statut */}
      <motion.div
        className={`w-2 h-2 rounded-full ${statusInfo.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
        animate={statusInfo.isOnline ? { scale: [1, 1.2, 1] } : {}}
        transition={statusInfo.isOnline ? { duration: 2, repeat: Infinity } : {}}
      />
      
      {/* Texte du statut */}
      <span className={`text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>

      {/* Indicateur de frappe */}
      {status?.isTyping && (
        <motion.div
          className="flex items-center space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Activity size={10} className="text-purple-400 animate-pulse" />
          <span className="text-xs text-purple-400">écrit...</span>
        </motion.div>
      )}

      {/* Debug info */}
      {showDebug && status && (
        <div className="ml-4 p-2 bg-gray-800 rounded text-xs text-gray-300">
          <div><strong>Debug Info:</strong></div>
          <div>DB Online: {status.isOnline ? 'Oui' : 'Non'}</div>
          <div>Dernière activité: {new Date(status.lastActivity).toLocaleTimeString('fr-FR')}</div>
          <div>Dernière vue: {new Date(status.lastSeen).toLocaleTimeString('fr-FR')}</div>
          <div>Plateforme: {status.deviceInfo?.platform || 'Inconnue'}</div>
          <div>Mobile: {status.deviceInfo?.isMobile ? 'Oui' : 'Non'}</div>
          <div>Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}</div>
        </div>
      )}
    </div>
  );
} 