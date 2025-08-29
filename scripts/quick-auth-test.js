const http = require('http');

console.log('🚀 TEST RAPIDE DE L\'API D\'AUTHENTIFICATION');
console.log('============================================');

// Test simple de l'endpoint callback
const testCallback = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'wrong_password',
      csrfToken: 'test_token',
      callbackUrl: 'http://localhost:3000'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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

    req.write(postData);
    req.end();
  });
};

// Exécuter le test
testCallback()
  .then(response => {
    console.log('\n📊 RÉSULTAT DU TEST:');
    console.log(`🔢 Status Code: ${response.statusCode}`);
    console.log(`📋 Content-Type: ${response.headers['content-type'] || 'Non défini'}`);
    console.log(`📄 Réponse: ${response.data.substring(0, 200)}...`);
    
    if (response.statusCode === 401) {
      console.log('\n❌ ERREUR 401 CONFIRMÉE !');
      console.log('============================');
      console.log('💡 Le problème est dans l\'API NextAuth');
    } else if (response.statusCode === 200) {
      console.log('\n✅ Pas d\'erreur 401 - API fonctionne');
    } else {
      console.log(`\n⚠️  Status inattendu: ${response.statusCode}`);
    }
  })
  .catch(error => {
    console.error('❌ Erreur de connexion:', error.message);
  });
