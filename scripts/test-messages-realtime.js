const mongoose = require('mongoose');
require('dotenv').config();

// Modèle Message
const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio'],
    default: 'text',
  },
  content: {
    type: String,
    required: true,
  },
  duration: Number,
  seenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// Modèle Conversation
const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  accepted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);

async function testMessagesRealtime() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer les utilisateurs existants
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const users = await User.find({}).limit(2).lean();
    
    if (users.length < 2) {
      console.log('❌ Il faut au moins 2 utilisateurs pour tester');
      return;
    }

    const [user1, user2] = users;
    console.log(`👥 Utilisateurs de test: ${user1.name || user1.username} et ${user2.name || user2.username}`);

    // Créer ou récupérer une conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [user1._id, user2._id] }
    });

    if (!conversation) {
      console.log('💬 Création d\'une nouvelle conversation...');
      conversation = await Conversation.create({
        participants: [user1._id, user2._id],
        accepted: true
      });
      console.log('✅ Conversation créée:', conversation._id);
    } else {
      console.log('✅ Conversation existante trouvée:', conversation._id);
    }

    // Supprimer les anciens messages de test
    await Message.deleteMany({ conversationId: conversation._id });
    console.log('🧹 Anciens messages de test supprimés');

    // Créer des messages de test
    const testMessages = [
      {
        conversationId: conversation._id,
        sender: user1._id,
        type: 'text',
        content: 'Salut ! Comment ça va ?',
        seenBy: [user1._id]
      },
      {
        conversationId: conversation._id,
        sender: user2._id,
        type: 'text',
        content: 'Ça va bien, merci ! Et toi ?',
        seenBy: [user1._id, user2._id]
      },
      {
        conversationId: conversation._id,
        sender: user1._id,
        type: 'text',
        content: 'Très bien ! Tu as écouté ma nouvelle musique ?',
        seenBy: [user1._id]
      }
    ];

    console.log('📝 Création des messages de test...');
    const createdMessages = await Message.insertMany(testMessages);
    console.log(`✅ ${createdMessages.length} messages créés`);

    // Afficher les messages
    console.log('\n📋 Messages dans la conversation:');
    const messages = await Message.find({ conversationId: conversation._id })
      .populate('sender', 'name username')
      .populate('seenBy', 'name username')
      .sort('createdAt')
      .lean();

    messages.forEach((msg, index) => {
      console.log(`\n${index + 1}. ${msg.sender.name || msg.sender.username}:`);
      console.log(`   Message: "${msg.content}"`);
      console.log(`   Type: ${msg.type}`);
      console.log(`   Vu par: ${msg.seenBy.map(u => u.name || u.username).join(', ')}`);
      console.log(`   Date: ${new Date(msg.createdAt).toLocaleString('fr-FR')}`);
    });

    console.log('\n🎯 Instructions de test:');
    console.log('1. Ouvrez la conversation dans l\'application');
    console.log('2. Vérifiez que les messages s\'affichent');
    console.log('3. Envoyez un nouveau message');
    console.log('4. Vérifiez que le scroll automatique fonctionne');
    console.log('5. Vérifiez que les statuts "vu" se mettent à jour');

    // Simulation d'envoi de nouveaux messages
    console.log('\n🔄 Simulation d\'envoi de nouveaux messages...');
    
    let messageCount = 4;
    const simulateNewMessage = async () => {
      const newMessage = {
        conversationId: conversation._id,
        sender: messageCount % 2 === 0 ? user1._id : user2._id,
        type: 'text',
        content: `Message automatique #${messageCount} - ${new Date().toLocaleTimeString('fr-FR')}`,
        seenBy: [messageCount % 2 === 0 ? user1._id : user2._id]
      };

      const created = await Message.create(newMessage);
      console.log(`📤 Nouveau message envoyé: "${newMessage.content}"`);
      messageCount++;
    };

    // Envoyer un nouveau message toutes les 10 secondes
    const interval = setInterval(simulateNewMessage, 10000);

    // Arrêter après 1 minute
    setTimeout(() => {
      clearInterval(interval);
      console.log('\n⏰ Simulation terminée');
      process.exit(0);
    }, 60000);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testMessagesRealtime(); 