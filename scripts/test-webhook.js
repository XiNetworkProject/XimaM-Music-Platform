#!/usr/bin/env node

/**
 * Script de test pour l'endpoint webhook
 * Usage: node scripts/test-webhook.js
 */

const fetch = require('node-fetch');

async function testWebhook() {
  console.log('🎵 Test de l\'endpoint webhook\n');

  const webhookUrl = 'http://localhost:3000/api/ai/webhook';
  
  // Simuler un callback Suno réussi
  const successCallback = {
    "code": 200,
    "msg": "All generated successfully.",
    "data": {
      "callbackType": "complete",
      "task_id": "test_task_123456",
      "data": [
        {
          "id": "audio_001",
          "audio_url": "https://example.com/audio1.mp3",
          "title": "Test Music 1",
          "duration": 120.5
        },
        {
          "id": "audio_002", 
          "audio_url": "https://example.com/audio2.mp3",
          "title": "Test Music 2",
          "duration": 118.2
        }
      ]
    }
  };

  // Simuler un callback d'erreur
  const errorCallback = {
    "code": 400,
    "msg": "Parameter error",
    "data": {
      "callbackType": "error",
      "task_id": "test_task_error",
      "error": "Invalid prompt"
    }
  };

  try {
    console.log('✅ Test callback réussi...');
    const successResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(successCallback)
    });

    if (successResponse.ok) {
      const result = await successResponse.json();
      console.log('✅ Webhook réussi:', result);
    } else {
      console.error('❌ Erreur webhook:', await successResponse.text());
    }

    console.log('\n❌ Test callback d\'erreur...');
    const errorResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorCallback)
    });

    if (errorResponse.ok) {
      const result = await errorResponse.json();
      console.log('✅ Webhook erreur traité:', result);
    } else {
      console.error('❌ Erreur webhook:', await errorResponse.text());
    }

  } catch (error) {
    console.error('❌ Erreur test webhook:', error.message);
    console.log('\n💡 Assurez-vous que le serveur Next.js est démarré (npm run dev)');
  }
}

// Test de connectivité
async function testConnectivity() {
  console.log('🌐 Test de connectivité...');
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'connectivity' })
    });
    
    console.log('✅ Connectivité OK');
  } catch (error) {
    console.error('❌ Problème de connectivité:', error.message);
  }
}

// Fonction principale
async function main() {
  await testConnectivity();
  await testWebhook();
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Lancer le test
main();
