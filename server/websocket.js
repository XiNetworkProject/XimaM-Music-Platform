const WebSocket = require('ws');
const http = require('http');
const url = require('url');

class WebSocketServer {
  constructor(port = 3001) {
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket
    this.typingUsers = new Map(); // conversationId -> Set of typing userIds
    this.onlineUsers = new Set(); // Set of online userIds
  }

  start() {
    const server = http.createServer();
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, request) => {
      console.log('🔌 Nouvelle connexion WebSocket');
      
      const { query } = url.parse(request.url, true);
      const userId = query.userId;
      
      if (!userId) {
        console.log('❌ Connexion refusée: userId manquant');
        ws.close();
        return;
      }

      // Enregistrer le client
      this.clients.set(userId, ws);
      this.onlineUsers.add(userId);
      
      console.log(`✅ Utilisateur ${userId} connecté`);

      // Notifier les autres utilisateurs de la présence
      this.broadcastPresence(userId, true);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(userId, message);
        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 Utilisateur ${userId} déconnecté`);
        this.clients.delete(userId);
        this.onlineUsers.delete(userId);
        this.broadcastPresence(userId, false);
      });

      ws.on('error', (error) => {
        console.error(`❌ Erreur WebSocket pour ${userId}:`, error);
        this.clients.delete(userId);
        this.onlineUsers.delete(userId);
      });
    });

    server.listen(this.port, () => {
      console.log(`🚀 Serveur WebSocket démarré sur le port ${this.port}`);
    });
  }

  handleMessage(userId, message) {
    console.log(`📨 Message reçu de ${userId}:`, message.type);

    switch (message.type) {
      case 'typing':
        this.handleTyping(userId, message);
        break;
      case 'stop_typing':
        this.handleStopTyping(userId, message);
        break;
      case 'new_message':
        this.handleNewMessage(userId, message);
        break;
      case 'message_seen':
        this.handleMessageSeen(userId, message);
        break;
      case 'presence':
        this.handlePresence(userId, message);
        break;
      default:
        console.log(`❓ Type de message inconnu: ${message.type}`);
    }
  }

  handleTyping(userId, message) {
    const { conversationId } = message;
    
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    
    this.typingUsers.get(conversationId).add(userId);
    
    // Notifier les autres participants de la conversation
    this.broadcastToConversation(conversationId, userId, {
      type: 'typing',
      userId,
      conversationId,
      isTyping: true
    });
  }

  handleStopTyping(userId, message) {
    const { conversationId } = message;
    
    if (this.typingUsers.has(conversationId)) {
      this.typingUsers.get(conversationId).delete(userId);
    }
    
    // Notifier les autres participants de la conversation
    this.broadcastToConversation(conversationId, userId, {
      type: 'typing',
      userId,
      conversationId,
      isTyping: false
    });
  }

  handleNewMessage(userId, message) {
    const { conversationId, messageData } = message;
    
    // Notifier les autres participants de la conversation
    this.broadcastToConversation(conversationId, userId, {
      type: 'new_message',
      userId,
      conversationId,
      message: messageData
    });
  }

  handleMessageSeen(userId, message) {
    const { conversationId, messageIds } = message;
    
    // Notifier les autres participants de la conversation
    this.broadcastToConversation(conversationId, userId, {
      type: 'message_seen',
      userId,
      conversationId,
      messageIds
    });
  }

  handlePresence(userId, message) {
    const { isOnline } = message;
    
    if (isOnline) {
      this.onlineUsers.add(userId);
    } else {
      this.onlineUsers.delete(userId);
    }
    
    this.broadcastPresence(userId, isOnline);
  }

  broadcastToConversation(conversationId, excludeUserId, message) {
    // En production, vous récupéreriez les participants depuis la base de données
    // Pour l'instant, on simule en envoyant à tous les utilisateurs connectés
    this.clients.forEach((ws, clientUserId) => {
      if (clientUserId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastPresence(userId, isOnline) {
    const message = {
      type: 'presence',
      userId,
      isOnline
    };

    this.clients.forEach((ws, clientUserId) => {
      if (clientUserId !== userId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  // Méthodes utilitaires
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers);
  }

  getTypingUsers(conversationId) {
    return this.typingUsers.has(conversationId) 
      ? Array.from(this.typingUsers.get(conversationId))
      : [];
  }
}

module.exports = WebSocketServer; 