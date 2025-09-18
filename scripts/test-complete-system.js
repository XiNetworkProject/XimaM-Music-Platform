#!/usr/bin/env node

/**
 * Test complet du système webhook Suno
 * Usage: node scripts/test-complete-system.js
 */

require('dotenv').config({ path: '.env.local' });

const fetch = require('node-fetch');

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const BASE_URL = 'http://localhost:3000';

async function testCompleteSystem() {
  console.log('🎵 Test Complet du Système Webhook Suno\n');

  // Vérifier la clé API
  if (!SUNO_API_KEY) {
    console.error('❌ Clé API Suno manquante !');
    console.log('📝 Ajoutez SUNO_API_KEY=votre_cle dans .env.local');
    process.exit(1);
  }

  console.log('✅ Clé API Suno trouvée');
  console.log(`🔑 Clé: ${SUNO_API_KEY.substring(0, 8)}...\n`);

  try {
    // 1. Test de génération avec webhook
    console.log('🚀 1. Test de génération avec webhook...');
    
    const generationResponse = await fetch(`${BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=test-session' // Simuler une session
      },
      body: JSON.stringify({
        prompt: 'Une mélodie pop joyeuse avec des guitares acoustiques',
        duration: 30,
        style: 'pop',
        title: 'Test Webhook',
        lyrics: '',
        isInstrumental: false,
        model: 'V3_5',
        customMode: false
      })
    });

    if (!generationResponse.ok) {
      const errorText = await generationResponse.text();
      console.error('❌ Erreur génération:', errorText);
      return;
    }

    const generationData = await generationResponse.json();
    console.log('✅ Génération initiée:', {
      success: generationData.success,
      taskId: generationData.taskId,
      status: generationData.status
    });

    if (generationData.taskId) {
      console.log(`🆔 Task ID: ${generationData.taskId}`);
      
      // 2. Test de suivi du statut
      console.log('\n📊 2. Test de suivi du statut...');
      
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`${BASE_URL}/api/ai/status/${generationData.taskId}`, {
          headers: {
            'Cookie': 'next-auth.session-token=test-session'
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`📊 Status ${attempts + 1}:`, {
            status: statusData.status,
            callbackType: statusData.callbackType,
            audioUrls: statusData.audioUrls?.length || 0
          });

          if (statusData.status === 'completed' && statusData.audioUrls?.length > 0) {
            console.log('🎵 Génération terminée avec succès !');
            console.log(`🔗 URLs audio: ${statusData.audioUrls.join(', ')}`);
            break;
          } else if (statusData.status === 'failed') {
            console.error('❌ Génération échouée:', statusData.error);
            break;
          }
        } else {
          console.error('❌ Erreur vérification statut:', await statusResponse.text());
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.log('⏰ Timeout - Génération trop longue pour le test');
      }
    }

    // 3. Test du webhook avec simulation
    console.log('\n🔄 3. Test du webhook avec simulation...');
    
    const webhookTest = {
      "code": 200,
      "msg": "All generated successfully.",
      "data": {
        "callbackType": "complete",
        "task_id": generationData.taskId || "test_simulation",
        "data": [
          {
            "id": "sim_001",
            "audio_url": "https://example.com/simulated1.mp3",
            "title": "Simulated Music 1",
            "duration": 120.5
          },
          {
            "id": "sim_002",
            "audio_url": "https://example.com/simulated2.mp3", 
            "title": "Simulated Music 2",
            "duration": 118.2
          }
        ]
      }
    };

    const webhookResponse = await fetch(`${BASE_URL}/api/ai/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookTest)
    });

    if (webhookResponse.ok) {
      const webhookResult = await webhookResponse.json();
      console.log('✅ Webhook traité:', webhookResult);
    } else {
      console.error('❌ Erreur webhook:', await webhookResponse.text());
    }

    console.log('\n✅ Test complet terminé !');

  } catch (error) {
    console.error('❌ Erreur test complet:', error.message);
    console.log('\n💡 Assurez-vous que le serveur Next.js est démarré (npm run dev)');
  }
}

// Test de connectivité
async function testConnectivity() {
  console.log('🌐 Test de connectivité...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'connectivity' })
    });
    
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
  await testCompleteSystem();
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Lancer le test
main();
