const fs = require('fs');
const path = require('path');

// Configuration des assets
const config = {
  icon: {
    source: 'assets/icon.png', // Place ton icône 1024x1024 ici
    sizes: [36, 48, 72, 96, 144, 192, 512]
  },
  splash: {
    source: 'assets/splash.png', // Place ton splash 2732x2732 ici
    sizes: ['hdpi', 'mdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
  }
};

console.log('🎨 Génération des assets Android...');
console.log('📁 Place tes images dans le dossier assets/');
console.log('🔧 Puis lance: npx @capacitor/assets generate --android'); 