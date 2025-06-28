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