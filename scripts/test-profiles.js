const { MongoClient } = require('mongodb');

async function testProfiles() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xima';
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    const users = db.collection('users');
    
    console.log('🔍 Test des profils utilisateurs...\n');
    
    // Récupérer tous les utilisateurs
    const allUsers = await users.find({}).limit(10).toArray();
    
    if (allUsers.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données');
      return;
    }
    
    console.log(`✅ ${allUsers.length} utilisateurs trouvés:\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Sans nom'} (@${user.username})`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Avatar: ${user.avatar ? '✅' : '❌'}`);
      console.log(`   - Bio: ${user.bio ? '✅' : '❌'}`);
      console.log(`   - Followers: ${user.followers?.length || 0}`);
      console.log(`   - Following: ${user.following?.length || 0}`);
      console.log(`   - Tracks: ${user.tracks?.length || 0}`);
      console.log(`   - Playlists: ${user.playlists?.length || 0}`);
      console.log('');
    });
    
    // Test d'accès à un profil spécifique
    const testUser = allUsers[0];
    if (testUser) {
      console.log(`🧪 Test d'accès au profil: @${testUser.username}`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/users/${testUser.username}`);
        const data = await response.json();
        
        if (response.ok) {
          console.log('✅ Profil accessible via API');
          console.log(`   - Nom: ${data.name}`);
          console.log(`   - Username: ${data.username}`);
          console.log(`   - Track count: ${data.trackCount}`);
          console.log(`   - Follower count: ${data.followerCount}`);
        } else {
          console.log('❌ Erreur API:', data.error);
        }
      } catch (error) {
        console.log('❌ Erreur lors du test API:', error.message);
      }
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
  }
}

// Exécuter le test
testProfiles().catch(console.error); 