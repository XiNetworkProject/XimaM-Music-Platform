const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xima';
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    const users = db.collection('users');
    
    console.log('🔧 Création d\'utilisateurs de test...\n');
    
    // Vérifier si des utilisateurs existent déjà
    const existingUsers = await users.find({}).limit(1).toArray();
    if (existingUsers.length > 0) {
      console.log('✅ Des utilisateurs existent déjà dans la base de données');
      return;
    }
    
    // Créer des utilisateurs de test
    const testUsers = [
      {
        name: 'Luna Nova',
        email: 'luna@test.com',
        username: 'luna_nova',
        password: await bcrypt.hash('password123', 10),
        avatar: '/default-avatar.png',
        bio: 'Artiste électronique passionnée par les sons futuristes',
        location: 'Paris, France',
        isArtist: true,
        artistName: 'Luna Nova',
        genre: ['Electronic', 'Ambient', 'Synthwave'],
        followers: [],
        following: [],
        tracks: [],
        playlists: [],
        likes: [],
        isVerified: true,
        totalPlays: 0,
        totalLikes: 0,
        preferences: {
          theme: 'dark',
          language: 'fr',
          notifications: {
            email: true,
            push: true,
            newFollowers: true,
            newLikes: true,
            newComments: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: new Date()
      },
      {
        name: 'Beat Master',
        email: 'beat@test.com',
        username: 'beat_master',
        password: await bcrypt.hash('password123', 10),
        avatar: '/default-avatar.png',
        bio: 'Producteur de hip-hop et beats urbains',
        location: 'Lyon, France',
        isArtist: true,
        artistName: 'Beat Master',
        genre: ['Hip-Hop', 'Trap', 'R&B'],
        followers: [],
        following: [],
        tracks: [],
        playlists: [],
        likes: [],
        isVerified: false,
        totalPlays: 0,
        totalLikes: 0,
        preferences: {
          theme: 'dark',
          language: 'fr',
          notifications: {
            email: true,
            push: true,
            newFollowers: true,
            newLikes: true,
            newComments: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: new Date()
      },
      {
        name: 'Chill Vibes',
        email: 'chill@test.com',
        username: 'chill_vibes',
        password: await bcrypt.hash('password123', 10),
        avatar: '/default-avatar.png',
        bio: 'Créateur de musiques relaxantes et ambiantes',
        location: 'Bordeaux, France',
        isArtist: true,
        artistName: 'Chill Vibes',
        genre: ['Chill', 'Ambient', 'Lo-Fi'],
        followers: [],
        following: [],
        tracks: [],
        playlists: [],
        likes: [],
        isVerified: false,
        totalPlays: 0,
        totalLikes: 0,
        preferences: {
          theme: 'dark',
          language: 'fr',
          notifications: {
            email: true,
            push: true,
            newFollowers: true,
            newLikes: true,
            newComments: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSeen: new Date()
      }
    ];
    
    // Insérer les utilisateurs
    const result = await users.insertMany(testUsers);
    
    console.log(`✅ ${result.insertedCount} utilisateurs créés avec succès:\n`);
    
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username})`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Artiste: ${user.isArtist ? '✅' : '❌'}`);
      console.log(`   - Vérifié: ${user.isVerified ? '✅' : '❌'}`);
      console.log(`   - Genres: ${user.genre.join(', ')}`);
      console.log('');
    });
    
    console.log('🔗 URLs de test:');
    testUsers.forEach(user => {
      console.log(`   - http://localhost:3000/profile/${user.username}`);
    });
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des utilisateurs:', error);
  }
}

// Exécuter le script
createTestUsers().catch(console.error); 