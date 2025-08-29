const http = require('http');

console.log('🧪 TEST DE L\'AFFICHAGE DU PROFIL');
console.log('==================================');

// Test de l'API profil utilisateur
const testProfileAPI = (username) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${username}`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Profile-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
};

// Test de l'API upload pour voir les tracks
const testUploadAPI = (username) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${username}/upload`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Upload-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
};

// Tester avec l'utilisateur ximamoff
async function runTests() {
  console.log('\n🔍 TEST DE L\'AFFICHAGE DU PROFIL');
  console.log('==================================');
  
  try {
    // 1. Test de l'API profil
    console.log('\n🧪 Test de l\'API profil pour: ximamoff');
    
    const profileResponse = await testProfileAPI('ximamoff');
    
    console.log(`   📊 Status: ${profileResponse.statusCode}`);
    console.log(`   📋 Type: ${profileResponse.headers['content-type'] || 'Non défini'}`);
    
    if (profileResponse.statusCode === 200) {
      console.log('   ✅ API profil accessible');
      try {
        const profileData = JSON.parse(profileResponse.data);
        console.log('\n📋 Données du profil:');
        console.log(`   👤 Nom: ${profileData.name}`);
        console.log(`   📧 Email: ${profileData.email}`);
        console.log(`   🎵 Tracks: ${profileData.tracksCount || 'Non défini'}`);
        console.log(`   📚 Playlists: ${profileData.playlistsCount || 'Non défini'}`);
        console.log(`   🖼️  Avatar: ${profileData.avatar || 'Non défini'}`);
        console.log(`   🎨 Bannière: ${profileData.banner || 'Non défini'}`);
        console.log(`   📝 Bio: ${profileData.bio || 'Non défini'}`);
        console.log(`   🎵 Genre: ${JSON.stringify(profileData.genre || [])}`);
        console.log(`   👑 Rôle: ${profileData.role || 'Non défini'}`);
        console.log(`   ✅ Vérifié: ${profileData.isVerified || false}`);
        console.log(`   🎭 Artiste: ${profileData.isArtist || false}`);
        
        // Vérifier si les tracks sont incluses
        if (profileData.tracks && Array.isArray(profileData.tracks)) {
          console.log(`\n🎵 Tracks incluses dans le profil: ${profileData.tracks.length}`);
          if (profileData.tracks.length > 0) {
            const firstTrack = profileData.tracks[0];
            console.log(`   📝 Première track: ${firstTrack.title}`);
            console.log(`   🎵 Genre: ${JSON.stringify(firstTrack.genre)}`);
            console.log(`   📊 Plays: ${firstTrack.plays}`);
            console.log(`   ❤️  Likes: ${firstTrack.likes}`);
          }
        } else {
          console.log('   ⚠️  Aucune track incluse dans le profil');
        }
        
        // Vérifier si les playlists sont incluses
        if (profileData.playlists && Array.isArray(profileData.playlists)) {
          console.log(`\n📚 Playlists incluses dans le profil: ${profileData.playlists.length}`);
        } else {
          console.log('   ⚠️  Aucune playlist incluse dans le profil');
        }
        
      } catch (e) {
        console.log('   ⚠️  Réponse non-JSON');
        console.log(`   📄 Contenu: ${profileResponse.data.substring(0, 200)}...`);
      }
    } else if (profileResponse.statusCode === 404) {
      console.log('   ❌ Profil non trouvé');
    } else {
      console.log(`   ⚠️  Status inattendu: ${profileResponse.statusCode}`);
      console.log(`   📄 Réponse: ${profileResponse.data.substring(0, 200)}...`);
    }
    
    // 2. Test de l'API upload pour comparer
    console.log('\n🧪 Test de l\'API upload pour comparaison');
    
    const uploadResponse = await testUploadAPI('ximamoff');
    
    if (uploadResponse.statusCode === 200) {
      try {
        const uploadData = JSON.parse(uploadResponse.data);
        console.log(`   📁 Tracks via upload API: ${uploadData.count}`);
        if (uploadData.tracks && uploadData.tracks.length > 0) {
          console.log(`   🎵 Première track: ${uploadData.tracks[0].title}`);
        }
      } catch (e) {
        console.log('   ⚠️  Réponse upload non-JSON');
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
  
  console.log('\n💡 ANALYSE:');
  console.log('Si les tracks apparaissent dans l\'API upload mais pas dans l\'API profil,');
  console.log('le problème est dans la route /api/users/[username] qui ne récupère pas les tracks.');
  console.log('Si aucune track n\'apparaît, le problème est dans la base de données ou la migration.');
}

// Exécuter les tests
runTests().catch(console.error);
