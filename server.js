const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

// Configuration pour la production
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Stockage en mémoire pour les connexions actives
const activeConnections = new Map(); // userId -> socketId
const typingUsers = new Map(); // conversationId -> Set of userIds
const onlineUsers = new Set();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion WebSocket:', socket.id);

    // Authentification de l'utilisateur
    socket.on('authenticate', (userId) => {
      console.log('🔐 Authentification utilisateur:', userId);
      activeConnections.set(userId, socket.id);
      onlineUsers.add(userId);
      
      // Notifier tous les autres utilisateurs
      socket.broadcast.emit('userOnline', { userId, isOnline: true });
      
      // Rejoindre les conversations de l'utilisateur
      socket.emit('authenticated', { success: true });
    });

    // Rejoindre une conversation
    socket.on('joinConversation', (conversationId) => {
      console.log('💬 Rejoindre conversation:', conversationId);
      socket.join(conversationId);
      socket.emit('joinedConversation', { conversationId });
    });

    // Quitter une conversation
    socket.on('leaveConversation', (conversationId) => {
      console.log('👋 Quitter conversation:', conversationId);
      socket.leave(conversationId);
    });

    // Statut de frappe
    socket.on('typing', (data) => {
      console.log('⌨️ Frappe détectée:', data);
      
      if (data.isTyping) {
        // Ajouter l'utilisateur à la liste des frappeurs
        if (!typingUsers.has(data.conversationId)) {
          typingUsers.set(data.conversationId, new Set());
        }
        typingUsers.get(data.conversationId).add(data.userId);
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
    socket.on('newMessage', (message) => {
      console.log('📨 Nouveau message:', message._id);
      
      // Notifier tous les participants de la conversation
      socket.to(message.conversationId).emit('messageReceived', message);
      
      // Arrêter la frappe pour l'expéditeur
      typingUsers.get(message.conversationId)?.delete(message.sender._id);
    });

    // Message vu
    socket.on('messageSeen', (data) => {
      console.log('👁️ Message vu:', data.messageId);
      
      // Notifier les autres participants
      socket.to(data.conversationId).emit('messageSeen', data);
    });

    // Mise à jour du statut en ligne
    socket.on('updateOnlineStatus', (status) => {
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
      let disconnectedUserId = null;
      for (const [userId, socketId] of activeConnections) {
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
    socket.on('heartbeat', (data) => {
      socket.emit('heartbeat', { timestamp: Date.now() });
    });
  });

  server.listen(port, hostname, () => {
    console.log(`🚀 Serveur démarré sur http://${hostname}:${port}`);
    console.log(`🔌 WebSocket disponible sur ws://${hostname}:${port}`);
  });
}); 