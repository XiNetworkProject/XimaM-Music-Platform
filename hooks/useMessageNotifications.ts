import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

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
  
  // Toujours initialiser les états dans le même ordre
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Références pour éviter les fuites mémoire
  const eventSourceRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fonction de connexion avec vérifications robustes
  const connectToNotifications = useCallback(() => {
    // Vérifications de sécurité
    if (!isMountedRef.current || !session?.user || status !== 'authenticated') {
      return;
    }

    // Éviter les connexions multiples
    if (eventSourceRef.current) {
      return;
    }

    // En mode développement, on désactive temporairement les SSE pour éviter les erreurs
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Mode développement: notifications SSE désactivées');
      setIsConnected(true);
      return;
    }

    try {
      const es = new EventSource('/api/messages/notifications');
      eventSourceRef.current = es;
      
      es.onopen = () => {
        if (isMountedRef.current) {
          setIsConnected(true);
          console.log('🔗 Connecté aux notifications de messagerie');
        }
      };

      es.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
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
        
        if (isMountedRef.current) {
          setIsConnected(false);
        }
        
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
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (session?.user && status === 'authenticated' && isMountedRef.current) {
              connectToNotifications();
            }
          }, 5000);
        }
      };

    } catch (error) {
      console.error('Erreur connexion notifications:', error);
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [session?.user, status]);

  // Fonction de déconnexion
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
    
    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  // Gestion de la connexion/déconnexion selon l'état de la session
  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      connectToNotifications();
    } else {
      disconnectFromNotifications();
    }
  }, [session?.user, status, connectToNotifications, disconnectFromNotifications]);

  // Nettoyage au démontage
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      disconnectFromNotifications();
    };
  }, [disconnectFromNotifications]);

  // Fonction d'envoi de notification
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