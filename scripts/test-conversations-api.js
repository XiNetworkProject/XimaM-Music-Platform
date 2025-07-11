const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testConversationsAPI() {
  console.log('🧪 Test de l\'API des conversations');
  console.log('📡 URI MongoDB:', process.env.MONGODB_URI ? '✅ Configuré' : '❌ Manquant');
  console.log('🔐 NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Configuré' : '❌ Manquant');
  
  try {
    // Test de connexion MongoDB
    console.log('\n📡 Test de connexion MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB réussie');
    
    // Définition des schémas pour le test
    console.log('\n📋 Test des modèles...');
    
    const UserSchema = new mongoose.Schema({
      name: String,
      username: String,
      email: String,
      avatar: String,
      password: String,
      role: { type: String, default: 'user' },
      isVerified: { type: Boolean, default: false },
      bio: String,
      location: String,
      website: String,
      socialLinks: Object,
    }, { timestamps: true });
    
    const MessageSchema = new mongoose.Schema({
      conversation: {
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
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      duration: Number,
      seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      }],
    }, { timestamps: { createdAt: true, updatedAt: false } });
    
    const ConversationSchema = new mongoose.Schema({
      participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      }],
      accepted: {
        type: Boolean,
        default: false,
      },
      lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    }, { timestamps: true });
    
    // Création des modèles
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
    const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
    
    console.log('✅ Modèles créés');
    
    // Test de récupération des utilisateurs
    console.log('\n👥 Test de récupération des utilisateurs...');
    const users = await User.find().limit(5);
    console.log(`✅ ${users.length} utilisateurs trouvés`);
    
    // Test de récupération des conversations
    console.log('\n💬 Test de récupération des conversations...');
    const conversations = await Conversation.find().limit(5);
    console.log(`✅ ${conversations.length} conversations trouvées`);
    
    // Test de récupération des messages
    console.log('\n📨 Test de récupération des messages...');
    const messages = await Message.find().limit(5);
    console.log(`✅ ${messages.length} messages trouvés`);
    
    // Test avec populate
    console.log('\n🔗 Test avec populate...');
    const conversationsWithPopulate = await Conversation.find()
      .populate('participants', 'name username avatar')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username avatar'
        }
      })
      .limit(1)
      .lean();
    
    console.log('✅ Populate réussi');
    console.log('📊 Données de test:', JSON.stringify(conversationsWithPopulate, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Connexion MongoDB fermée');
  }
}

testConversationsAPI(); 