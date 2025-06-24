const fs = require('fs');
const path = require('path');

console.log('🎨 Création des icônes placeholder...');

// Créer un favicon.ico simple (fichier texte pour l'instant)
const faviconContent = `# Placeholder favicon.ico
# Remplacez par un vrai fichier .ico en production`;

// Créer des placeholders pour les icônes PNG
const pngPlaceholder = `# Placeholder PNG
# Remplacez par une vraie image PNG en production`;

const files = [
  { path: 'public/favicon.ico', content: faviconContent },
  { path: 'public/default-avatar.png', content: pngPlaceholder },
  { path: 'public/android-chrome-192x192.png', content: pngPlaceholder },
  { path: 'public/android-chrome-512x512.png', content: pngPlaceholder },
  { path: 'public/apple-touch-icon.png', content: pngPlaceholder },
];

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file.path);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, file.content);
  console.log(`✅ Créé: ${file.path}`);
});

console.log('\n📝 Instructions pour les vraies icônes:');
console.log('1. Remplacez favicon.ico par un vrai fichier .ico');
console.log('2. Remplacez les fichiers .png par de vraies images');
console.log('3. Utilisez des outils comme:');
console.log('   - https://favicon.io/ pour le favicon');
console.log('   - https://realfavicongenerator.net/ pour les icônes');
console.log('   - https://www.figma.com/ pour créer des icônes personnalisées'); 