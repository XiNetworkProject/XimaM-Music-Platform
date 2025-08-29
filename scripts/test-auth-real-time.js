const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Charger manuellement .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        const value = valueParts.join('=').trim();
        if (value) {
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    Object.assign(process.env, envVars);
    console.log('✅ Fichier .env.local chargé manuellement');
  } else {
    console.log('⚠️  Fichier .env.local non trouvé');
  }
}

loadEnvFile();

// Configuration
const config = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  testUser: {
    email: 'test@example.com', // Utilisateur de test depuis Supabase
    password: 'wrong_password' // Mot de passe incorrect pour tester l'erreur
  }
};

console.log('🔧 Configuration de test en temps réel :');
console.log(`📍 URL de base: ${config.baseUrl}`);
console.log(`👤 Utilisateur de test: ${config.testUser.email}`);

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
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
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testNextAuthAPI() {
  console.log('\n🧪 TEST API NEXTAUTH EN TEMPS RÉEL');
  console.log('=====================================');
  
  try {
    // 1. Test de l'endpoint de callback credentials
    console.log('\n1️⃣ Test de l\'endpoint /api/auth/callback/credentials...');
    
    const callbackUrl = `${config.baseUrl}/api/auth/callback/credentials`;
    const postData = JSON.stringify({
      email: config.testUser.email,
      password: config.testUser.password,
      csrfToken: 'test_token',
      callbackUrl: config.baseUrl
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'XimaM-Auth-Test/1.0'
      }
    };
    
    console.log(`📤 Envoi de la requête POST vers: ${callbackUrl}`);
    console.log(`📝 Données envoyées: ${postData}`);
    
    const response = await makeRequest(callbackUrl, options);
    
    console.log(`📊 Réponse reçue:`);
    console.log(`   🔢 Status Code: ${response.statusCode}`);
    console.log(`   📋 Headers:`, response.headers);
    console.log(`   📄 Body: ${response.data.substring(0, 500)}...`);
    
    // Analyser la réponse
    if (response.statusCode === 401) {
      console.log('\n❌ ERREUR 401 DÉTECTÉE !');
      console.log('============================');
      console.log('💡 Analyse de l\'erreur:');
      console.log('• L\'API NextAuth répond avec 401 Unauthorized');
      console.log('• Cela confirme le problème d\'authentification');
      console.log('• Le problème est dans la logique d\'authentification');
    } else if (response.statusCode === 200) {
      console.log('\n✅ SUCCÈS - Pas d\'erreur 401');
      console.log('==============================');
      console.log('💡 L\'API fonctionne correctement');
    } else {
      console.log(`\n⚠️  Réponse inattendue: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
  }
}

async function testAuthEndpoints() {
  console.log('\n🧪 TEST DES ENDPOINTS D\'AUTHENTIFICATION');
  console.log('==========================================');
  
  const endpoints = [
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/providers'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Test de ${endpoint}...`);
      
      const url = `${config.baseUrl}${endpoint}`;
      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'XimaM-Auth-Test/1.0'
        }
      };
      
      const response = await makeRequest(url, options);
      
      console.log(`   📊 Status: ${response.statusCode}`);
      console.log(`   📋 Type: ${response.headers['content-type'] || 'Non défini'}`);
      
      if (response.statusCode === 200) {
        console.log('   ✅ Endpoint accessible');
      } else if (response.statusCode === 404) {
        console.log('   ❌ Endpoint non trouvé');
      } else {
        console.log(`   ⚠️  Status inattendu: ${response.statusCode}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }
}

async function testServerHealth() {
  console.log('\n🏥 TEST DE SANTÉ DU SERVEUR');
  console.log('=============================');
  
  try {
    // Test de la page d'accueil
    console.log('\n1️⃣ Test de la page d\'accueil...');
    
    const homeUrl = `${config.baseUrl}/`;
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Auth-Test/1.0'
      }
    };
    
    const response = await makeRequest(homeUrl, options);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log(`📋 Type: ${response.headers['content-type'] || 'Non défini'}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Serveur Next.js fonctionnel');
      console.log(`📄 Taille de la réponse: ${response.data.length} caractères`);
    } else {
      console.log(`⚠️  Status inattendu: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test de santé:', error.message);
  }
}

async function main() {
  console.log('🚀 TEST D\'AUTHENTIFICATION EN TEMPS RÉEL');
  console.log('==========================================');
  
  try {
    // 1. Test de santé du serveur
    await testServerHealth();
    
    // 2. Test des endpoints d'authentification
    await testAuthEndpoints();
    
    // 3. Test principal de l'API NextAuth
    await testNextAuthAPI();
    
    console.log('\n🎉 TESTS TERMINÉS !');
    console.log('====================');
    console.log('\n💡 ANALYSE DES RÉSULTATS:');
    console.log('• Si vous voyez une erreur 401, le problème est confirmé');
    console.log('• Si pas d\'erreur 401, le problème est ailleurs');
    console.log('• Vérifiez les logs de votre serveur Next.js');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testNextAuthAPI, testAuthEndpoints, testServerHealth };
