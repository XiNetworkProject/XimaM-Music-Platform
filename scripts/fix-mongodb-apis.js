const fs = require('fs');
const path = require('path');

// Fonction pour améliorer une API MongoDB
function improveMongoDBAPI(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si le fichier utilise déjà dbConnect
    if (!content.includes('dbConnect')) {
      console.log(`⏭️  ${filePath} - Pas d'utilisation de MongoDB`);
      return;
    }
    
    // Vérifier si isConnected est déjà importé
    if (content.includes('isConnected')) {
      console.log(`✅ ${filePath} - Déjà amélioré`);
      return;
    }
    
    // Ajouter l'import isConnected
    if (content.includes("import dbConnect from '@/lib/db';")) {
      content = content.replace(
        "import dbConnect from '@/lib/db';",
        "import dbConnect, { isConnected } from '@/lib/db';"
      );
    }
    
    // Ajouter la vérification de connexion après dbConnect()
    if (content.includes('await dbConnect();')) {
      const dbConnectPattern = /await dbConnect\(\);/g;
      content = content.replace(dbConnectPattern, (match) => {
        return `${match}
    
    // Vérifier que la connexion est active
    if (!isConnected()) {
      console.warn('⚠️ MongoDB non connecté, tentative de reconnexion...');
      await dbConnect();
    }`;
      });
    }
    
    // Écrire le fichier modifié
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath} - Amélioré`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'amélioration de ${filePath}:`, error.message);
  }
}

// Fonction pour parcourir récursivement les dossiers
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file === 'route.ts' && filePath.includes('/api/')) {
      improveMongoDBAPI(filePath);
    }
  });
}

// Démarrer l'amélioration
console.log('🔧 Amélioration des APIs MongoDB...\n');
walkDir('app/api');
console.log('\n✅ Amélioration terminée !'); 