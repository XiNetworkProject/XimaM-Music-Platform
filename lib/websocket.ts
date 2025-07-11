import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { NextApiResponse } from 'next';

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

// Stockage en mémoire pour les connexions actives
const activeConnections = new Map<string, string>(); // userId -> socketId
const typingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds
const onlineUsers = new Set<string>();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket.server.io) {
    console.log('Socket déjà initialisé');
    res.end();
    return;
  }

  console.log('Initialisation du serveur Socket.IO...');
  const httpServer: NetServer = res.socket.server as any;
  const io = new ServerIO(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion WebSocket:', socket.id);

    // Authentification de l'utilisateur
    socket.on('authenticate', (userId: string) => {
      console.log('🔐 Authentification utilisateur:', userId);
      activeConnections.set(userId, socket.id);
      onlineUsers.add(userId);
      
      // Notifier tous les autres utilisateurs
      socket.broadcast.emit('userOnline', { userId, isOnline: true });
      
      // Rejoindre les conversations de l'utilisateur
      socket.emit('authenticated', { success: true });
    });

    // Rejoindre une conversation
    socket.on('joinConversation', (conversationId: string) => {
      console.log('💬 Rejoindre conversation:', conversationId);
      socket.join(conversationId);
      socket.emit('joinedConversation', { conversationId });
    });

    // Quitter une conversation
    socket.on('leaveConversation', (conversationId: string) => {
      console.log('👋 Quitter conversation:', conversationId);
      socket.leave(conversationId);
    });

    // Statut de frappe
    socket.on('typing', (data: TypingStatus) => {
      console.log('⌨️ Frappe détectée:', data);
      
      if (data.isTyping) {
        // Ajouter l'utilisateur à la liste des frappeurs
        if (!typingUsers.has(data.conversationId)) {
          typingUsers.set(data.conversationId, new Set());
        }
        typingUsers.get(data.conversationId)?.add(data.userId);
      } else {
        // Retirer l'utilisateur de la liste des frappeurs
        typingUsers.get(data.conversationId)?.delete(data.userId);
        if (typingUsers.get(data.conversationId)?.size === 0) {
          typingUsers.delete(data.conversationId);
        }
      }

      // Notifier les autres participants de la conversation
      socket.to(data.conversationId).emit('userTyping', {
        userId: data.userId,
        isTyping: data.isTyping,
        conversationId: data.conversationId
      });
    });

    // Nouveau message
    socket.on('newMessage', (message: NewMessage) => {
      console.log('📨 Nouveau message:', message._id);
      
      // Notifier tous les participants de la conversation
      socket.to(message.conversationId).emit('messageReceived', message);
      
      // Arrêter la frappe pour l'expéditeur
      typingUsers.get(message.conversationId)?.delete(message.sender._id);
    });

    // Message vu
    socket.on('messageSeen', (data: MessageStatus) => {
      console.log('👁️ Message vu:', data.messageId);
      
      // Notifier les autres participants
      socket.to(data.conversationId).emit('messageSeen', data);
    });

    // Mise à jour du statut en ligne
    socket.on('updateOnlineStatus', (status: OnlineStatus) => {
      console.log('🟢 Mise à jour statut en ligne:', status.userId);
      
      if (status.isOnline) {
        onlineUsers.add(status.userId);
      } else {
        onlineUsers.delete(status.userId);
      }
      
      // Notifier tous les autres utilisateurs
      socket.broadcast.emit('onlineStatusChanged', status);
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log('🔌 Déconnexion WebSocket:', socket.id);
      
      // Trouver l'utilisateur associé à ce socket
      let disconnectedUserId: string | null = null;
      for (const [userId, socketId] of activeConnections.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }
      
      if (disconnectedUserId) {
        activeConnections.delete(disconnectedUserId);
        onlineUsers.delete(disconnectedUserId);
        
        // Notifier les autres utilisateurs
        socket.broadcast.emit('userOffline', { 
          userId: disconnectedUserId, 
          isOnline: false 
        });
      }
    });

    // Heartbeat pour maintenir la connexion
    socket.on('heartbeat', () => {
      socket.emit('heartbeat', { timestamp: Date.now() });
    });
  });

  res.socket.server.io = io;
  res.end();
}

// Fonctions utilitaires pour le serveur
export const getActiveConnections = () => activeConnections;
export const getTypingUsers = () => typingUsers;
export const getOnlineUsers = () => onlineUsers; 