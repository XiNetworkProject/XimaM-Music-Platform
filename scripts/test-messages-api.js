const { MongoClient } = require('mongodb');

async function testMessagesAPI() {
  console.log('🧪 Test des routes API de messagerie...');
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI non définie');
    return;
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connexion MongoDB réussie');

    const db = client.db();
    
    // Vérifier les collections
    const collections = await db.listCollections().toArray();
    console.log('📚 Collections disponibles:', collections.map(c => c.name));

    // Vérifier les conversations
    const conversations = await db.collection('conversations').find({}).limit(5).toArray();
    console.log('💬 Conversations trouvées:', conversations.length);

    // Vérifier les messages
    const messages = await db.collection('messages').find({}).limit(5).toArray();
    console.log('📝 Messages trouvés:', messages.length);

    // Vérifier les utilisateurs
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log('👥 Utilisateurs trouvés:', users.length);

    await client.close();
    console.log('✅ Test terminé');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testMessagesAPI(); 