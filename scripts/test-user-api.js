const http = require('http');

console.log('🧪 TEST DE LA ROUTE API UTILISATEUR');
console.log('====================================');

// Test de l'API utilisateur
const testUserAPI = (username) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${username}`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-API-Test/1.0'
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

// Tester avec différents utilisateurs
const testUsers = ['ximamoff', 'test', 'evannlagersie30'];

async function runTests() {
  console.log('\n🔍 TESTS DES ROUTES API UTILISATEUR');
  console.log('=====================================');
  
  for (const username of testUsers) {
    try {
      console.log(`\n🧪 Test avec: ${username}`);
      
      const response = await testUserAPI(username);
      
      console.log(`   📊 Status: ${response.statusCode}`);
      console.log(`   📋 Type: ${response.headers['content-type'] || 'Non défini'}`);
      
      if (response.statusCode === 200) {
        console.log('   ✅ Utilisateur trouvé');
        try {
          const userData = JSON.parse(response.data);
          console.log(`   👤 Nom: ${userData.name}`);
          console.log(`   📧 Email: ${userData.email}`);
          console.log(`   🎵 Tracks: ${userData.tracksCount}`);
          console.log(`   📚 Playlists: ${userData.playlistsCount}`);
        } catch (e) {
          console.log('   ⚠️  Réponse non-JSON');
        }
      } else if (response.statusCode === 404) {
        console.log('   ❌ Utilisateur non trouvé');
      } else {
        console.log(`   ⚠️  Status inattendu: ${response.statusCode}`);
        console.log(`   📄 Réponse: ${response.data.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
  
  console.log('\n🎉 TESTS TERMINÉS !');
  console.log('====================');
}

// Exécuter les tests
runTests().catch(console.error);
