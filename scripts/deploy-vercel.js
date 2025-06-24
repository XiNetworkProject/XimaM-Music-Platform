const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Déploiement sur Vercel...');

// Vérifier si Vercel CLI est installé
try {
  execSync('vercel --version', { stdio: 'pipe' });
} catch (error) {
  console.log('📦 Installation de Vercel CLI...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
}

// Vérifier si le projet est déjà configuré
const vercelConfigPath = path.join(process.cwd(), '.vercel');
if (!fs.existsSync(vercelConfigPath)) {
  console.log('⚙️ Configuration initiale de Vercel...');
  console.log('⚠️  Tu vas devoir :');
  console.log('   1. Te connecter avec ton compte GitHub/Google');
  console.log('   2. Choisir "Link to existing project"');
  console.log('   3. Créer un nouveau projet');
  console.log('   4. Configurer les variables d\'environnement');
  
  execSync('vercel', { stdio: 'inherit' });
} else {
  console.log('🔄 Déploiement...');
  execSync('vercel --prod', { stdio: 'inherit' });
}

console.log('✅ Déploiement terminé !');
console.log('🌐 Ton app sera disponible sur : https://ximam-music.vercel.app');
console.log('');
console.log('📱 Pour l\'app mobile, synchronise Capacitor :');
console.log('   npx cap sync android');
console.log('');
console.log('🔧 N\'oublie pas de configurer les variables d\'environnement dans Vercel :');
console.log('   - MONGODB_URI');
console.log('   - NEXTAUTH_SECRET');
console.log('   - NEXTAUTH_URL (https://ximam-music.vercel.app)');
console.log('   - GOOGLE_CLIENT_ID');
console.log('   - GOOGLE_CLIENT_SECRET');
console.log('   - CLOUDINARY_*'); 