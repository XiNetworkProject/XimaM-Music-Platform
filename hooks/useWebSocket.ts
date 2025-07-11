import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export interface TypingStatus {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface MessageStatus {
  messageId: string;
  conversationId: string;
  seenBy: string[];
  seenAt: Date;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface NewMessage {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
  duration?: number;
  seenBy: string[];
  createdAt: string;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTypingStatus: (conversationId: string, isTyping: boolean) => void;
  sendNewMessage: (message: NewMessage) => void;
  sendMessageSeen: (messageId: string, conversationId: string, seenBy: string[]) => void;
  updateOnlineStatus: (status: OnlineStatus) => void;
  onMessageReceived: (callback: (message: NewMessage) => void) => void;
  onUserTyping: (callback: (data: TypingStatus) => void) => void;
  onMessageSeen: (callback: (data: MessageStatus) => void) => void;
  onOnlineStatusChanged: (callback: (status: OnlineStatus) => void) => void;
  onUserOnline: (callback: (data: { userId: string; isOnline: boolean }) => void) => void;
  onUserOffline: (callback: (data: { userId: string; isOnline: boolean }) => void) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const callbacksRef = useRef<{
    messageReceived?: (message: NewMessage) => void;
    userTyping?: (data: TypingStatus) => void;
    messageSeen?: (data: MessageStatus) => void;
    onlineStatusChanged?: (status: OnlineStatus) => void;
    userOnline?: (data: { userId: string; isOnline: boolean }) => void;
    userOffline?: (data: { userId: string; isOnline: boolean }) => void;
  }>({});

  // Initialiser la connexion WebSocket
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    console.log('🔌 Initialisation de la connexion WebSocket...');
    
    const socket = io(process.env.NEXTAUTH_URL || 'http://localhost:3000', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connecté:', socket.id);
      setIsConnected(true);
      
      // Authentifier l'utilisateur si connecté
      if (session?.user?.id) {
        socket.emit('authenticate', session.user.id);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket déconnecté');
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socket.on('authenticated', (data: { success: boolean }) => {
      console.log('🔐 Utilisateur authentifié sur WebSocket');
      setIsAuthenticated(true);
    });

    socket.on('messageReceived', (message: NewMessage) => {
      console.log('📨 Nouveau message reçu:', message._id);
      callbacksRef.current.messageReceived?.(message);
    });

    socket.on('userTyping', (data: TypingStatus) => {
      console.log('⌨️ Frappe détectée:', data);
      callbacksRef.current.userTyping?.(data);
    });

    socket.on('messageSeen', (data: MessageStatus) => {
      console.log('👁️ Message vu:', data.messageId);
      callbacksRef.current.messageSeen?.(data);
    });

    socket.on('onlineStatusChanged', (status: OnlineStatus) => {
      console.log('🟢 Statut en ligne changé:', status);
      callbacksRef.current.onlineStatusChanged?.(status);
    });

    socket.on('userOnline', (data: { userId: string; isOnline: boolean }) => {
      console.log('🟢 Utilisateur en ligne:', data.userId);
      callbacksRef.current.userOnline?.(data);
    });

    socket.on('userOffline', (data: { userId: string; isOnline: boolean }) => {
      console.log('🔴 Utilisateur hors ligne:', data.userId);
      callbacksRef.current.userOffline?.(data);
    });

    socket.on('heartbeat', (data: { timestamp: number }) => {
      // Répondre au heartbeat pour maintenir la connexion
      socket.emit('heartbeat', { timestamp: Date.now() });
    });

    socketRef.current = socket;
  }, [session?.user?.id]);

  // Initialiser la connexion au montage seulement si la session est chargée
  useEffect(() => {
    if (status === 'loading') return; // Attendre que la session soit chargée
    
    if (session?.user?.id) {
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Fermeture de la connexion WebSocket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session?.user?.id, status, initializeSocket]);

  // Réauthentifier quand la session change
  useEffect(() => {
    if (status === 'loading') return; // Attendre que la session soit chargée
    
    if (socketRef.current?.connected && session?.user?.id && !isAuthenticated) {
      socketRef.current.emit('authenticate', session.user.id);
    }
  }, [session?.user?.id, isAuthenticated, status]);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log('💬 Rejoindre conversation:', conversationId);
      socketRef.current.emit('joinConversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log('👋 Quitter conversation:', conversationId);
      socketRef.current.emit('leaveConversation', conversationId);
    }
  }, []);

  const sendTypingStatus = useCallback((conversationId: string, isTyping: boolean) => {
    if (socketRef.current?.connected && session?.user?.id) {
      console.log('⌨️ Envoyer statut de frappe:', { conversationId, isTyping });
      socketRef.current.emit('typing', {
        userId: session.user.id,
        conversationId,
        isTyping
      });
    }
  }, [session?.user?.id]);

  const sendNewMessage = useCallback((message: NewMessage) => {
    if (socketRef.current?.connected) {
      console.log('📨 Envoyer nouveau message:', message._id);
      socketRef.current.emit('newMessage', message);
    }
  }, []);

  const sendMessageSeen = useCallback((messageId: string, conversationId: string, seenBy: string[]) => {
    if (socketRef.current?.connected) {
      console.log('👁️ Envoyer message vu:', messageId);
      socketRef.current.emit('messageSeen', {
        messageId,
        conversationId,
        seenBy,
        seenAt: new Date()
      });
    }
  }, []);

  const updateOnlineStatus = useCallback((status: OnlineStatus) => {
    if (socketRef.current?.connected) {
      console.log('🟢 Mettre à jour statut en ligne:', status.userId);
      socketRef.current.emit('updateOnlineStatus', status);
    }
  }, []);

  const onMessageReceived = useCallback((callback: (message: NewMessage) => void) => {
    callbacksRef.current.messageReceived = callback;
  }, []);

  const onUserTyping = useCallback((callback: (data: TypingStatus) => void) => {
    callbacksRef.current.userTyping = callback;
  }, []);

  const onMessageSeen = useCallback((callback: (data: MessageStatus) => void) => {
    callbacksRef.current.messageSeen = callback;
  }, []);

  const onOnlineStatusChanged = useCallback((callback: (status: OnlineStatus) => void) => {
    callbacksRef.current.onlineStatusChanged = callback;
  }, []);

  const onUserOnline = useCallback((callback: (data: { userId: string; isOnline: boolean }) => void) => {
    callbacksRef.current.userOnline = callback;
  }, []);

  const onUserOffline = useCallback((callback: (data: { userId: string; isOnline: boolean }) => void) => {
    callbacksRef.current.userOffline = callback;
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticated,
    joinConversation,
    leaveConversation,
    sendTypingStatus,
    sendNewMessage,
    sendMessageSeen,
    updateOnlineStatus,
    onMessageReceived,
    onUserTyping,
    onMessageSeen,
    onOnlineStatusChanged,
    onUserOnline,
    onUserOffline,
  };
}; 