require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

async function generateAndTrack() {
  try {
    console.log('🎵 Test de génération Suno en temps réel...');
    
    // 1. Initier la génération
    console.log('\n🚀 Initiation de la génération...');
    const generateResponse = await fetch(SUNO_API_URL, {
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
    console.log('📊 Réponse génération:', JSON.stringify(generateData, null, 2));
    
    const taskId = generateData.data?.taskId;
    if (!taskId) {
      console.error('❌ Task ID manquant');
      return;
    }

    console.log(`🆔 Task ID: ${taskId}`);

    // 2. Suivre le statut en temps réel
    console.log('\n⏳ Suivi du statut en temps réel...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`\n📡 Tentative ${attempts}/${maxAttempts}...`);
      
      try {
        const statusResponse = await fetch(`${SUNO_API_URL}/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('📊 Status:', JSON.stringify(statusData, null, 2));
          
          const status = statusData.data?.status || statusData.status;
          const audioUrls = statusData.data?.data?.map(item => item.audio_url) || [];
          
          console.log(`🎵 Statut: ${status}`);
          console.log(`🎵 URLs audio: ${audioUrls.length}`);
          
          if (audioUrls.length > 0) {
            audioUrls.forEach((url, i) => console.log(`  ${i+1}. ${url}`));
          }
          
          if (status === 'completed' || audioUrls.length > 0) {
            console.log('\n✅ Génération terminée !');
            return;
          }
        } else {
          console.log(`⚠️ Status ${statusResponse.status}: ${statusResponse.statusText}`);
        }
      } catch (error) {
        console.log('❌ Erreur réseau:', error.message);
      }
      
      // Attendre 10 secondes
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('\n⏰ Timeout - Génération trop longue');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

generateAndTrack();
