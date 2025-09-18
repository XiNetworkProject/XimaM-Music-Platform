const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌐 Configuration du webhook local...');

// Vérifier si ngrok est installé
function checkNgrok() {
  return new Promise((resolve) => {
    const ngrok = spawn('ngrok', ['version']);
    ngrok.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// Démarrer ngrok
function startNgrok() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Démarrage de ngrok...');
    
    const ngrok = spawn('ngrok', ['http', '3000']);
    
    ngrok.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📡 ngrok:', output);
      
      // Chercher l'URL publique
      const match = output.match(/https:\/\/[a-z0-9]+\.ngrok\.io/);
      if (match) {
        const publicUrl = match[0];
        console.log(`\n✅ URL publique: ${publicUrl}`);
        console.log(`🔗 Webhook URL: ${publicUrl}/api/ai/webhook`);
        
        // Mettre à jour .env.local
        updateEnvFile(publicUrl);
        
        resolve(publicUrl);
      }
    });
    
    ngrok.stderr.on('data', (data) => {
      console.error('❌ ngrok error:', data.toString());
    });
    
    ngrok.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ngrok exited with code ${code}`));
      }
    });
  });
}

// Mettre à jour .env.local
function updateEnvFile(publicUrl) {
  const envPath = path.join(__dirname, '..', '.env.local');
  const webhookUrl = `${publicUrl}/api/ai/webhook`;
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Ajouter ou mettre à jour NEXTAUTH_URL
  if (envContent.includes('NEXTAUTH_URL=')) {
    envContent = envContent.replace(/NEXTAUTH_URL=.*/g, `NEXTAUTH_URL=${publicUrl}`);
  } else {
    envContent += `\nNEXTAUTH_URL=${publicUrl}`;
  }
  
  // Ajouter ou mettre à jour SUNO_WEBHOOK_URL
  if (envContent.includes('SUNO_WEBHOOK_URL=')) {
    envContent = envContent.replace(/SUNO_WEBHOOK_URL=.*/g, `SUNO_WEBHOOK_URL=${webhookUrl}`);
  } else {
    envContent += `\nSUNO_WEBHOOK_URL=${webhookUrl}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('📝 .env.local mis à jour');
}

// Test avec webhook
async function testWithWebhook() {
  try {
    const hasNgrok = await checkNgrok();
    if (!hasNgrok) {
      console.log('❌ ngrok non installé. Installez-le avec: npm install -g ngrok');
      return;
    }
    
    const publicUrl = await startNgrok();
    console.log('\n🎵 Test avec webhook configuré...');
    
    // Attendre que l'app soit prête
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test de génération avec webhook
    require('dotenv').config({ path: '.env.local' });
    const SUNO_API_KEY = process.env.SUNO_API_KEY;
    
    const response = await fetch('https://api.sunoapi.org/api/v1/generate', {
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
        callBackUrl: `${publicUrl}/api/ai/webhook`
      }),
    });

    const data = await response.json();
    console.log('📊 Génération:', JSON.stringify(data, null, 2));
    
    console.log('\n⏳ Attente du webhook...');
    console.log('📱 Surveillez la console de l\'app pour voir le webhook arriver');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWithWebhook();
