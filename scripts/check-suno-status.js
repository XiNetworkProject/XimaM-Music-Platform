require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

async function checkStatus(taskId) {
  try {
    console.log(`🔍 Vérification du statut pour: ${taskId}`);
    
    // Essayer différentes URLs selon la documentation
    const urls = [
      `https://api.sunoapi.org/api/v1/generate/status/${taskId}`,
      `${SUNO_API_URL}/${taskId}`,
      `https://api.sunoapi.org/api/v1/status/${taskId}`,
      `https://api.sunoapi.org/api/v1/task/${taskId}`
    ];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n🔗 Test URL ${i+1}: ${url}`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${SUNO_API_KEY}`,
          },
        });

        console.log('📡 Status:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Réponse complète:', JSON.stringify(data, null, 2));
          
          const status = data.data?.status || data.status;
          const audioUrls = data.data?.data?.map(item => item.audio_url) || [];
          
          console.log(`\n🎵 Statut: ${status}`);
          console.log(`🎵 URLs audio: ${audioUrls.length}`);
          audioUrls.forEach((url, i) => console.log(`  ${i+1}. ${url}`));
          
          console.log(`\n✅ URL fonctionnelle trouvée: ${url}`);
          return;
        } else {
          const errorText = await response.text();
          console.log('❌ Erreur:', errorText.substring(0, 100) + '...');
        }
      } catch (error) {
        console.log('❌ Erreur réseau:', error.message);
      }
    }
    
    console.log('\n❌ Aucune URL fonctionnelle trouvée');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Vérifier le taskId de la génération précédente
const taskId = '340e6d7e681514572d18cc9a06218522';
checkStatus(taskId);
