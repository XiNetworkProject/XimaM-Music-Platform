import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface Notification {
  type: 'new_message' | 'new_request' | 'request_accepted' | 'connected';
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  timestamp: string;
}

export const useMessageNotifications = () => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connectToNotifications = useCallback(() => {
    if (!session?.user) return;

    try {
      const es = new EventSource('/api/messages/notifications');
      
      es.onopen = () => {
        setIsConnected(true);
        console.log('🔗 Connecté aux notifications de messagerie');
      };

      es.onmessage = (event) => {
        try {
          const data: Notification = JSON.parse(event.data);
          
          setNotifications(prev => [...prev, data]);

          // Afficher des notifications toast selon le type
          switch (data.type) {
            case 'new_message':
              toast.success(`Nouveau message de ${data.senderName}`, {
                icon: '💬',
                duration: 4000,
              });
              break;
            case 'new_request':
              toast.success('Nouvelle demande de conversation', {
                icon: '👋',
                duration: 4000,
              });
              break;
            case 'request_accepted':
              toast.success('Demande de conversation acceptée', {
                icon: '✅',
                duration: 4000,
              });
              break;
          }
        } catch (error) {
          console.error('Erreur parsing notification:', error);
        }
      };

      es.onerror = (error) => {
        console.error('Erreur SSE:', error);
        setIsConnected(false);
        es.close();
        
        // Reconnecter après 5 secondes
        setTimeout(() => {
          connectToNotifications();
        }, 5000);
      };

      setEventSource(es);
    } catch (error) {
      console.error('Erreur connexion notifications:', error);
    }
  }, [session?.user]);

  const disconnectFromNotifications = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
    }
  }, [eventSource]);

  // Se connecter/déconnecter selon l'état de la session
  useEffect(() => {
    if (session?.user) {
      connectToNotifications();
    } else {
      disconnectFromNotifications();
    }

    return () => {
      disconnectFromNotifications();
    };
  }, [session?.user, connectToNotifications, disconnectFromNotifications]);

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