import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface WebSocketMessage {
  type: 'typing' | 'stop_typing' | 'new_message' | 'message_seen' | 'presence';
  userId: string;
  conversationId?: string;
  isTyping?: boolean;
  message?: any;
  messageIds?: string[];
  isOnline?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  sendNewMessage: (conversationId: string, messageData: any) => void;
  sendMessageSeen: (conversationId: string, messageIds: string[]) => void;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
  onTyping: (callback: (userId: string, conversationId: string, isTyping: boolean) => void) => void;
  onNewMessage: (callback: (userId: string, conversationId: string, message: any) => void) => void;
  onMessageSeen: (callback: (userId: string, conversationId: string, messageIds: string[]) => void) => void;
  onPresence: (callback: (userId: string, isOnline: boolean) => void) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  
  // Callbacks pour les différents types de messages
  const messageCallbacks = useRef<((message: WebSocketMessage) => void)[]>([]);
  const typingCallbacks = useRef<((userId: string, conversationId: string, isTyping: boolean) => void)[]>([]);
  const newMessageCallbacks = useRef<((userId: string, conversationId: string, message: any) => void)[]>([]);
  const messageSeenCallbacks = useRef<((userId: string, conversationId: string, messageIds: string[]) => void)[]>([]);
  const presenceCallbacks = useRef<((userId: string, isOnline: boolean) => void)[]>([]);

  // Fonction pour se connecter au WebSocket
  const connect = useCallback(() => {
    if (!session?.user?.id) return;

    try {
      const wsUrl = `ws://localhost:3001?userId=${session.user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 WebSocket connecté');
        setIsConnected(true);
        
        // Démarrer le heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Message WebSocket reçu:', message);

          // Appeler tous les callbacks de message générique
          messageCallbacks.current.forEach(callback => callback(message));

          // Appeler les callbacks spécifiques selon le type
          switch (message.type) {
            case 'typing':
            case 'stop_typing':
              typingCallbacks.current.forEach(callback => 
                callback(message.userId, message.conversationId!, message.isTyping!)
              );
              break;
            case 'new_message':
              newMessageCallbacks.current.forEach(callback => 
                callback(message.userId, message.conversationId!, message.message!)
              );
              break;
            case 'message_seen':
              messageSeenCallbacks.current.forEach(callback => 
                callback(message.userId, message.conversationId!, message.messageIds!)
              );
              break;
            case 'presence':
              presenceCallbacks.current.forEach(callback => 
                callback(message.userId, message.isOnline!)
              );
              break;
          }
        } catch (error) {
          console.error('❌ Erreur parsing message WebSocket:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket déconnecté');
        setIsConnected(false);
        
        // Nettoyer le heartbeat
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }

        // Tentative de reconnexion après 3 secondes
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Tentative de reconnexion WebSocket...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Erreur connexion WebSocket:', error);
    }
  }, [session?.user?.id]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Fonction pour envoyer le statut de frappe
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    sendMessage({
      type: isTyping ? 'typing' : 'stop_typing',
      userId: session?.user?.id || '',
      conversationId,
      isTyping
    });
  }, [sendMessage, session?.user?.id]);

  // Fonction pour envoyer un nouveau message
  const sendNewMessage = useCallback((conversationId: string, messageData: any) => {
    sendMessage({
      type: 'new_message',
      userId: session?.user?.id || '',
      conversationId,
      message: messageData
    });
  }, [sendMessage, session?.user?.id]);

  // Fonction pour envoyer le statut de lecture
  const sendMessageSeen = useCallback((conversationId: string, messageIds: string[]) => {
    sendMessage({
      type: 'message_seen',
      userId: session?.user?.id || '',
      conversationId,
      messageIds
    });
  }, [sendMessage, session?.user?.id]);

  // Fonctions pour enregistrer les callbacks
  const onMessage = useCallback((callback: (message: WebSocketMessage) => void) => {
    messageCallbacks.current.push(callback);
  }, []);

  const onTyping = useCallback((callback: (userId: string, conversationId: string, isTyping: boolean) => void) => {
    typingCallbacks.current.push(callback);
  }, []);

  const onNewMessage = useCallback((callback: (userId: string, conversationId: string, message: any) => void) => {
    newMessageCallbacks.current.push(callback);
  }, []);

  const onMessageSeen = useCallback((callback: (userId: string, conversationId: string, messageIds: string[]) => void) => {
    messageSeenCallbacks.current.push(callback);
  }, []);

  const onPresence = useCallback((callback: (userId: string, isOnline: boolean) => void) => {
    presenceCallbacks.current.push(callback);
  }, []);

  // Se connecter au montage et se déconnecter au démontage
  useEffect(() => {
    if (session?.user?.id) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [session?.user?.id, connect]);

  return {
    isConnected,
    sendMessage,
    sendTyping,
    sendNewMessage,
    sendMessageSeen,
    onMessage,
    onTyping,
    onNewMessage,
    onMessageSeen,
    onPresence
  };
}; 