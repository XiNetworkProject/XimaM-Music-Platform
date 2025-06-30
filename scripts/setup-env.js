const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Générer des secrets sécurisés
const generateSecret = () => crypto.randomBytes(32).toString('hex');

// Template pour .env.local
const envTemplate = `# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${generateSecret()}

# Google OAuth (à remplir avec vos valeurs)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# MongoDB (à remplir avec votre URI)
# Si MongoDB local: mongodb://localhost:27017/ximam
# Si MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/ximam
MONGODB_URI=mongodb://localhost:27017/ximam

# Cloudinary (à remplir avec vos valeurs)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT Secret
JWT_SECRET=${generateSecret()}

# App Configuration
APP_NAME=XimaM
APP_VERSION=1.0.0
APP_ENVIRONMENT=development

# API Base URL
API_BASE_URL=http://localhost:3000/api

# Update Server
UPDATE_SERVER_URL=http://localhost:3000/api/updates
UPDATE_CHECK_INTERVAL=3600000
`;

// Créer le fichier .env.local
const envPath = path.join(__dirname, '..', '.env.local');

try {
  fs.writeFileSync(envPath, envTemplate);
  // Fichier .env.local créé avec succès !
} catch (error) {
  // Erreur lors de la création du fichier .env.local
}

console.log('=== CONFIGURATION DES VARIABLES D\'ENVIRONNEMENT ===\n');

// Vérifier si .env.local existe
const envLocalPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (fs.existsSync(envLocalPath)) {
  console.log('✅ Fichier .env.local trouvé');
  
  // Lire le contenu
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // Vérifier les variables Cloudinary
  const hasCloudName = envContent.includes('CLOUDINARY_CLOUD_NAME=');
  const hasApiKey = envContent.includes('CLOUDINARY_API_KEY=');
  const hasApiSecret = envContent.includes('CLOUDINARY_API_SECRET=');
  
  console.log('CLOUDINARY_CLOUD_NAME:', hasCloudName ? '✅ Configuré' : '❌ Manquant');
  console.log('CLOUDINARY_API_KEY:', hasApiKey ? '✅ Configuré' : '❌ Manquant');
  console.log('CLOUDINARY_API_SECRET:', hasApiSecret ? '✅ Configuré' : '❌ Manquant');
  
  if (!hasCloudName || !hasApiKey || !hasApiSecret) {
    console.log('\n⚠️  Variables Cloudinary manquantes dans .env.local');
    console.log('Pour configurer Cloudinary :');
    console.log('1. Allez sur https://cloudinary.com/');
    console.log('2. Créez un compte ou connectez-vous');
    console.log('3. Récupérez vos credentials dans Dashboard > Settings > Access Keys');
    console.log('4. Ajoutez-les dans votre fichier .env.local :');
    console.log('');
    console.log('CLOUDINARY_CLOUD_NAME=votre-cloud-name');
    console.log('CLOUDINARY_API_KEY=votre-api-key');
    console.log('CLOUDINARY_API_SECRET=votre-api-secret');
  }
} else {
  console.log('❌ Fichier .env.local non trouvé');
  console.log('\nPour créer le fichier .env.local :');
  console.log('1. Copiez env.example vers .env.local :');
  console.log('   cp env.example .env.local');
  console.log('2. Modifiez .env.local avec vos vraies valeurs');
  console.log('3. Pour Cloudinary, récupérez vos credentials sur https://cloudinary.com/');
}

console.log('\n=== CONFIGURATION VERCEL (PRODUCTION) ===');
console.log('Pour configurer les variables sur Vercel :');
console.log('1. Allez sur https://vercel.com/dashboard');
console.log('2. Sélectionnez votre projet XimaM');
console.log('3. Allez dans Settings > Environment Variables');
console.log('4. Ajoutez les variables Cloudinary :');
console.log('   - CLOUDINARY_CLOUD_NAME');
console.log('   - CLOUDINARY_API_KEY');
console.log('   - CLOUDINARY_API_SECRET');
console.log('5. Redéployez votre application');

console.log('\n=== FIN CONFIGURATION ==='); 