// scripts/test-suno-status.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const taskId = process.argv[2];

if (!taskId) {
  console.log('❌ Usage: node scripts/test-suno-status.js <taskId>');
  process.exit(1);
}

async function testSunoStatus() {
  const SUNO_API_KEY = process.env.SUNO_API_KEY;
  const BASE = "https://api.sunoapi.org";

  if (!SUNO_API_KEY) {
    console.log('❌ SUNO_API_KEY manquant');
    process.exit(1);
  }

  try {
    console.log(`🔍 Test direct Suno API pour taskId: ${taskId}`);
    
    const response = await fetch(`${BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
    });

    const data = await response.json();
    
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
