require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

async function quickTest() {
  try {
    console.log('🎵 Test rapide Suno...');
    
    // 1. Génération
    console.log('\n🚀 Génération...');
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

    const generateData = await generateResponse.json();
    console.log('📊 Génération:', JSON.stringify(generateData, null, 2));
    
    const taskId = generateData.data?.taskId;
    if (!taskId) {
      console.error('❌ Task ID manquant');
      return;
    }

    console.log(`🆔 Task ID: ${taskId}`);

    // 2. Vérification immédiate
    console.log('\n🔍 Vérification immédiate...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s
    
    const statusResponse = await fetch(`https://api.sunoapi.org/api/v1/generate/status/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    });

    console.log('📡 Status:', statusResponse.status, statusResponse.statusText);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 Status:', JSON.stringify(statusData, null, 2));
    } else {
      const errorText = await statusResponse.text();
      console.log('❌ Erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

quickTest();
