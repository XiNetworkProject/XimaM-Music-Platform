require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

async function testWithDocs() {
  try {
    console.log('🎵 Test selon documentation Suno...');
    
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

    // 2. Test selon documentation officielle
    console.log('\n🔍 Test URLs selon documentation...');
    
    // Selon la documentation, l'URL de statut pourrait être différente
    const testUrls = [
      `https://api.sunoapi.org/api/v1/generate/status/${taskId}`,
      `https://api.sunoapi.org/api/v1/status/${taskId}`,
      `https://api.sunoapi.org/api/v1/task/${taskId}`,
      `https://api.sunoapi.org/api/v1/generate/${taskId}`,
      `https://api.sunoapi.org/api/v1/query/${taskId}`,
      `https://api.sunoapi.org/api/v1/result/${taskId}`
    ];
    
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      console.log(`\n🔗 Test ${i+1}: ${url}`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
          },
        });
        
        console.log(`📡 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Réponse:', JSON.stringify(data, null, 2));
          console.log('✅ URL fonctionnelle trouvée !');
          return;
        } else {
          const errorText = await response.text();
          console.log(`❌ Erreur: ${errorText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`❌ Erreur réseau: ${error.message}`);
      }
      
      // Attendre un peu entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n❌ Aucune URL fonctionnelle trouvée');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testWithDocs();
