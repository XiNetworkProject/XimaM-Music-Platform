import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';

interface Notification {
  type: 'new_message' | 'new_request' | 'request_accepted' | 'connected' | 'heartbeat';
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  timestamp: string;
}

export const useMessageNotifications = () => {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectToNotifications = useCallback(() => {
    // Ne pas se connecter si pas de session ou déjà connecté
    if (!session?.user || eventSourceRef.current || status !== 'authenticated') {
      return;
    }

    // En mode développement, on désactive temporairement les SSE pour éviter les erreurs
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Mode développement: notifications SSE désactivées');
      setIsConnected(true);
      return;
    }

    try {
      // Fermer toute connexion existante
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/messages/notifications');
      eventSourceRef.current = es;
      
      es.onopen = () => {
        setIsConnected(true);
        console.log('🔗 Connecté aux notifications de messagerie');
      };

      es.onmessage = (event) => {
        try {
          const data: Notification = JSON.parse(event.data);
          
          // Ignorer les heartbeats
          if (data.type === 'heartbeat') {
            return;
          }
          
          setNotifications(prev => [...prev, data]);

          // Afficher des notifications toast selon le type
          switch (data.type) {
            case 'new_message':
              notify.info('Message', `Nouveau message de ${data.senderName}`);
              break;
            case 'new_request':
              notify.info('Demande', 'Nouvelle demande de conversation');
              break;
            case 'request_accepted':
              notify.success('OK', 'Demande de conversation acceptée');
              break;
          }
        } catch (error) {
          console.error('Erreur parsing notification:', error);
        }
      };

      es.onerror = (error) => {
        console.error('Erreur SSE:', error);
        setIsConnected(false);
        
        // Fermer la connexion actuelle
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        
        // Annuler tout timeout de reconnexion existant
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Reconnecter après 5 secondes seulement si l'utilisateur est toujours connecté
        reconnectTimeoutRef.current = setTimeout(() => {
          if (session?.user && status === 'authenticated') {
            connectToNotifications();
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Erreur connexion notifications:', error);
      setIsConnected(false);
    }
  }, [session?.user, status]);

  const disconnectFromNotifications = useCallback(() => {
    // Annuler le timeout de reconnexion
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fermer la connexion SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Se connecter/déconnecter selon l'état de la session
  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      connectToNotifications();
    } else {
      disconnectFromNotifications();
    }

    return () => {
      disconnectFromNotifications();
    };
  }, [session?.user, status, connectToNotifications, disconnectFromNotifications]);

  // Nettoyer à la fermeture
  useEffect(() => {
    return () => {
      disconnectFromNotifications();
    };
  }, [disconnectFromNotifications]);

  const sendNotification = useCallback(async (type: string, recipientId: string, conversationId: string, message?: string) => {
    try {
      await fetch('/api/messages/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          recipientId,
          conversationId,
          message,
        }),
      });
    } catch (error) {
      console.error('Erreur envoi notification:', error);
    }
  }, []);

  return {
    notifications,
    isConnected,
    sendNotification,
    connectToNotifications,
    disconnectFromNotifications,
  };
}; 