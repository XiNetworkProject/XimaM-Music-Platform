// scripts/test-suno-status-simple.js
const https = require('https');
const fs = require('fs');

const taskId = process.argv[2];

if (!taskId) {
  console.log('❌ Usage: node scripts/test-suno-status-simple.js <taskId>');
  process.exit(1);
}

// Charger les variables d'environnement
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const SUNO_API_KEY = process.env.SUNO_API_KEY;

if (!SUNO_API_KEY) {
  console.log('❌ SUNO_API_KEY manquant');
  process.exit(1);
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

async function testSunoStatus() {
  try {
    console.log(`🔍 Test direct Suno API pour taskId: ${taskId}`);
    
    const url = `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const data = await makeRequest(url, options);
    
    console.log('📊 Réponse brute Suno:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data?.status === 'success') {
      console.log('✅ Statut SUCCESS');
      if (data.data.tracks && data.data.tracks.length > 0) {
        console.log(`🎵 ${data.data.tracks.length} tracks trouvées:`);
        data.data.tracks.forEach((track, index) => {
          console.log(`  ${index + 1}. ${track.title || 'Sans titre'}`);
          console.log(`     Audio: ${track.audioUrl ? '✅' : '❌'}`);
          console.log(`     Stream: ${track.streamAudioUrl ? '✅' : '❌'}`);
          console.log(`     Image: ${track.imageUrl ? '✅' : '❌'}`);
        });
      } else {
        console.log('⚠️ Statut SUCCESS mais tracks vides');
      }
    } else {
      console.log(`📊 Statut: ${data.data?.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSunoStatus();
