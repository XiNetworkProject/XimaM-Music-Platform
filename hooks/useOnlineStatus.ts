import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  isTyping: boolean;
  typingInConversation?: string;
  lastActivity: Date;
}

interface UseOnlineStatusOptions {
  userId?: string;
  conversationId?: string;
  autoConnect?: boolean;
  pollingInterval?: number;
}

export const useOnlineStatus = (options: UseOnlineStatusOptions = {}) => {
  const { data: session } = useSession();
  const [status, setStatus] = useState<OnlineStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const { userId, conversationId, autoConnect = true, pollingInterval = 10000 } = options;

  // Fonction pour récupérer le statut
  const fetchStatus = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/users/online-status?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setStatus(data.status);
      } else {
        setError(data.error || 'Erreur récupération statut');
      }
    } catch (err) {
      console.error('Erreur fetch statut:', err);
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fonction pour mettre à jour le statut local
  const updateLocalStatus = useCallback((updates: Partial<OnlineStatus>) => {
    setStatus(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Fonction pour envoyer le statut de frappe
  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/users/typing-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTyping,
          conversationId
        }),
      });

      if (response.ok) {
        updateLocalStatus({ isTyping });
      }
    } catch (error) {
      console.error('Erreur envoi statut frappe:', error);
    }
  }, [session?.user?.id, conversationId, updateLocalStatus]);

  // Fonction pour se connecter
  const connect = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsConnected(true);
      setError(null);

      // Marquer comme en ligne
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      };

      const response = await fetch('/api/users/online-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceInfo }),
      });

      if (!response.ok) {
        throw new Error('Erreur connexion');
      }

      // Démarrer le polling
      if (userId) {
        await fetchStatus();
        
        pollingRef.current = setInterval(() => {
          fetchStatus();
        }, pollingInterval);
      }

      // Heartbeat pour maintenir la connexion
      heartbeatRef.current = setInterval(async () => {
        try {
          await fetch('/api/users/online-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isOnline: true }),
          });
        } catch (error) {
          console.error('Erreur heartbeat:', error);
        }
      }, 30000); // Toutes les 30 secondes

    } catch (error) {
      console.error('Erreur connexion:', error);
      setError('Erreur de connexion');
      setIsConnected(false);
    }
  }, [session?.user?.id, userId, fetchStatus, pollingInterval]);

  // Fonction pour se déconnecter
  const disconnect = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Marquer comme hors ligne
      await fetch('/api/users/online-status', {
        method: 'DELETE',
      });

      // Arrêter le statut de frappe
      await sendTypingStatus(false);

      // Nettoyer les intervalles
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      setIsConnected(false);
      setStatus(null);

    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  }, [session?.user?.id, sendTypingStatus]);

  // Connexion automatique
  useEffect(() => {
    if (autoConnect && session?.user?.id) {
      connect();
    }

    return () => {
      if (session?.user?.id) {
        disconnect();
      }
    };
  }, [autoConnect, session?.user?.id, connect, disconnect]);

  // Nettoyage à la fermeture
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session?.user?.id) {
        // Envoyer une requête synchrone pour marquer comme hors ligne
        navigator.sendBeacon('/api/users/online-status', JSON.stringify({ isOnline: false }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session?.user?.id]);

  // Nettoyage des intervalles
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return {
    status,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    sendTypingStatus,
    updateLocalStatus,
    refetch: fetchStatus,
  };
}; 