const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration d\'authentification...\n');

// Vérifier les variables d'environnement
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('📋 Variables d\'environnement trouvées :');
  
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('NEXTAUTH_URL') || line.includes('GOOGLE_CLIENT_ID') || line.includes('GOOGLE_CLIENT_SECRET')) {
      const [key, value] = line.split('=');
      if (key && value) {
        console.log(`  ${key.trim()}: ${value.trim()}`);
      }
    }
  });
} else {
  console.log('❌ Fichier .env.local non trouvé');
}

console.log('\n🔗 URIs de redirection à configurer dans Google Cloud Console :');
console.log('  http://localhost:3000/api/auth/callback/google');
console.log('  http://localhost:3000/auth/signin');

console.log('\n📝 Instructions :');
console.log('1. Allez sur https://console.cloud.google.com');
console.log('2. Sélectionnez votre projet');
console.log('3. APIs & Services > Credentials');
console.log('4. Cliquez sur votre OAuth 2.0 Client ID');
console.log('5. Dans "Authorized redirect URIs", ajoutez :');
console.log('   - http://localhost:3000/api/auth/callback/google');
console.log('   - http://localhost:3000/auth/signin');
console.log('6. Cliquez "Save"');
console.log('7. Attendez 5-10 minutes');

console.log('\n⚠️  Note : NextAuth utilise automatiquement l\'URI de callback');
console.log('   basé sur NEXTAUTH_URL + /api/auth/callback/google'); 