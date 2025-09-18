// scripts/test-suno-integration.js
require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_BASE = process.env.SUNO_API_BASE || 'https://api.sunoapi.org';

async function testSunoIntegration() {
  try {
    console.log('🎵 Test d\'intégration Suno complet...');
    console.log('🔑 Clé API:', SUNO_API_KEY ? '✅ Présente' : '❌ Manquante');
    console.log('🌐 Base URL:', SUNO_API_BASE);

    if (!SUNO_API_KEY) {
      console.error('❌ SUNO_API_KEY manquante dans .env.local');
      return;
    }

    // 1. Test de génération
    console.log('\n🚀 Test de génération...');
    const generateResponse = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'une musique électro française',
        model: 'V4_5PLUS',
        instrumental: false,
        customMode: false,
        duration: 30,
        callBackUrl: 'https://webhook.site/your-unique-url'
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('❌ Erreur génération:', errorText);
      return;
    }

    const generateData = await generateResponse.json();
    console.log('📊 Génération:', JSON.stringify(generateData, null, 2));
    
    const taskId = generateData.data?.taskId;
    if (!taskId) {
      console.error('❌ Task ID manquant');
      return;
    }

    console.log(`🆔 Task ID: ${taskId}`);

    // 2. Test de polling
    console.log('\n🔍 Test de polling...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre 5s

    const statusResponse = await fetch(`${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    });

    console.log('📡 Status:', statusResponse.status, statusResponse.statusText);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 Status:', JSON.stringify(statusData, null, 2));
      
      const status = statusData.data?.status;
      const tracks = statusData.data?.response?.sunoData || [];
      
      console.log(`🎵 Statut: ${status}`);
      console.log(`🎵 Tracks: ${tracks.length}`);
      
      if (tracks.length > 0) {
        tracks.forEach((track, i) => {
          console.log(`  ${i+1}. ${track.title || 'Sans titre'}`);
          console.log(`     Audio: ${track.audioUrl || track.audio_url || 'N/A'}`);
          console.log(`     Stream: ${track.streamAudioUrl || track.stream_audio_url || 'N/A'}`);
          console.log(`     Image: ${track.imageUrl || track.image_url || 'N/A'}`);
        });
      }
    } else {
      const errorText = await statusResponse.text();
      console.log('❌ Erreur status:', errorText);
    }

    console.log('\n✅ Test d\'intégration terminé !');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Allez sur http://localhost:3000/ai-generator');
    console.log('2. Connectez-vous avec votre compte');
    console.log('3. Générez une musique');
    console.log('4. Surveillez les logs de l\'app pour voir les webhooks');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSunoIntegration();
