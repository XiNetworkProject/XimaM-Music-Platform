const { MongoClient } = require('mongodb');

async function testFollowSystem() {
  console.log('🧪 Test du système de suivi...');
  
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

    // Vérifier les utilisateurs
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log('👥 Utilisateurs trouvés:', users.length);
    
    if (users.length > 0) {
      console.log('📋 Exemple d\'utilisateur:');
      console.log('- ID:', users[0]._id);
      console.log('- Nom:', users[0].name);
      console.log('- Username:', users[0].username);
      console.log('- Following:', users[0].following?.length || 0);
      console.log('- Followers:', users[0].followers?.length || 0);
      console.log('- FollowRequests:', users[0].followRequests?.length || 0);
    }

    // Vérifier les conversations
    const conversations = await db.collection('conversations').find({}).limit(5).toArray();
    console.log('💬 Conversations trouvées:', conversations.length);
    
    if (conversations.length > 0) {
      console.log('📋 Exemple de conversation:');
      console.log('- ID:', conversations[0]._id);
      console.log('- Participants:', conversations[0].participants?.length || 0);
      console.log('- Accepted:', conversations[0].accepted);
    }

    // Vérifier les messages
    const messages = await db.collection('messages').find({}).limit(5).toArray();
    console.log('📝 Messages trouvés:', messages.length);

    await client.close();
    console.log('✅ Test terminé');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testFollowSystem(); 