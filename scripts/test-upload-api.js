const http = require('http');

console.log('🧪 TEST DE LA ROUTE API UPLOAD');
console.log('================================');

// Test de l'API upload
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
  console.log('\n🔍 TEST DE L\'API UPLOAD');
  console.log('==========================');
  
  try {
    console.log('\n🧪 Test de l\'API upload pour: ximamoff');
    
    const response = await testUploadAPI('ximamoff');
    
    console.log(`   📊 Status: ${response.statusCode}`);
    console.log(`   📋 Type: ${response.headers['content-type'] || 'Non défini'}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ API upload accessible');
      try {
        const uploadData = JSON.parse(response.data);
        console.log(`   📁 Tracks trouvées: ${uploadData.count}`);
        if (uploadData.tracks && uploadData.tracks.length > 0) {
          console.log(`   🎵 Première track: ${uploadData.tracks[0].title}`);
        }
      } catch (e) {
        console.log('   ⚠️  Réponse non-JSON');
      }
    } else if (response.statusCode === 404) {
      console.log('   ❌ API upload non trouvée');
    } else {
      console.log(`   ⚠️  Status inattendu: ${response.statusCode}`);
      console.log(`   📄 Réponse: ${response.data.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
}

// Exécuter les tests
runTests().catch(console.error);
