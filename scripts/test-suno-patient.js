require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

async function patientTest() {
  try {
    console.log('🎵 Test patient Suno...');
    
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

    // 2. Attendre et vérifier avec patience
    console.log('\n⏳ Attente patiente...');
    
    for (let i = 1; i <= 12; i++) { // 2 minutes max
      console.log(`\n📡 Tentative ${i}/12 (${i*10}s)...`);
      
      try {
        // Essayer l'URL de statut
        const statusResponse = await fetch(`https://api.sunoapi.org/api/v1/generate/status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
          },
        });

        console.log(`📡 Status: ${statusResponse.status} ${statusResponse.statusText}`);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('📊 Réponse:', JSON.stringify(statusData, null, 2));
          
          const status = statusData.data?.status || statusData.status;
          const audioUrls = statusData.data?.data?.map(item => item.audio_url) || [];
          
          console.log(`🎵 Statut: ${status}`);
          console.log(`🎵 URLs audio: ${audioUrls.length}`);
          
          if (audioUrls.length > 0) {
            audioUrls.forEach((url, i) => console.log(`  ${i+1}. ${url}`));
            console.log('\n✅ Génération terminée !');
            return;
          }
        } else if (statusResponse.status === 404) {
          console.log('⏳ Génération encore en cours...');
        } else {
          const errorText = await statusResponse.text();
          console.log(`⚠️ Erreur: ${errorText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`❌ Erreur réseau: ${error.message}`);
      }
      
      // Attendre 10 secondes
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('\n⏰ Timeout - Génération trop longue');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

patientTest();
