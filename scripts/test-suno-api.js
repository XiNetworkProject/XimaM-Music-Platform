#!/usr/bin/env node

/**
 * Script de test pour l'API Suno AI
 * Usage: node scripts/test-suno-api.js
 */

require('dotenv').config({ path: '.env.local' });

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_API_URL = 'https://api.sunoapi.org/api/v1/generate';

async function testSunoAPI() {
  console.log('🎵 Test de l\'API Suno AI\n');

  // Vérifier la clé API
  if (!SUNO_API_KEY) {
    console.error('❌ Clé API Suno manquante !');
    console.log('📝 Ajoutez SUNO_API_KEY=votre_cle dans .env.local');
    console.log('🔗 Obtenez votre clé sur https://sunoapi.org');
    process.exit(1);
  }

  console.log('✅ Clé API Suno trouvée');
  console.log(`🔑 Clé: ${SUNO_API_KEY.substring(0, 8)}...`);

  try {
    console.log('\n🚀 Test de génération...');

    // Test de génération
    const response = await fetch(SUNO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
             body: JSON.stringify({
         prompt: 'Une mélodie pop joyeuse avec des guitares acoustiques',
         duration: 30,
         model: 'V3_5',
         instrumental: false,
         customMode: false,
         callBackUrl: 'https://webhook.site/your-unique-url'
       }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erreur API Suno:', errorData);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Génération initiée avec succès');
    console.log('📄 Réponse complète:', JSON.stringify(data, null, 2));
    const taskId = data.data?.taskId || data.data?.id || data.data?.task_id || data.id || data.task_id;
    console.log(`🆔 Task ID: ${taskId}`);

    // Polling pour attendre la génération
    console.log('\n⏳ Attente de la génération...');
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

             const statusResponse = await fetch(`https://api.sunoapi.org/api/v1/generate/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed' && statusData.audio_url) {
          console.log('🎵 Génération terminée avec succès !');
          console.log(`🔗 Audio URL: ${statusData.audio_url}`);
          console.log('\n✅ Test Suno AI réussi !');
          process.exit(0);
        } else if (statusData.status === 'failed') {
          console.error('❌ Génération échouée:', statusData.error);
          process.exit(1);
        }
      }

      attempts++;
      process.stdout.write('.');
    }

    console.log('\n⏰ Timeout - Génération trop longue');
    process.exit(1);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

// Test de connectivité
async function testConnectivity() {
  console.log('🌐 Test de connectivité...');
  
  try {
    const response = await fetch('https://api.sunoapi.org/health');
    if (response.ok) {
      console.log('✅ Connectivité OK');
    } else {
      console.log('⚠️ Connectivité limitée');
    }
  } catch (error) {
    console.error('❌ Problème de connectivité:', error.message);
  }
}

// Fonction principale
async function main() {
  await testConnectivity();
  await testSunoAPI();
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Lancer le test
main();
