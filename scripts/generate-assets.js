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

// Génération des assets Android
// Place tes images dans le dossier assets/
// Puis lance: npx @capacitor/assets generate --android

// Créer des icônes SVG simples pour le manifest
const createSVGIcon = (size) => {
  const color = '#1db954'; // Couleur verte de Spotify
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${color}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="white"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/8}" fill="${color}"/>
    <text x="${size/2}" y="${size*0.8}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="bold">X</text>
  </svg>`;
};

// Convertir SVG en PNG (simulation avec un canvas HTML)
const createPNGFromSVG = (svgContent, size) => {
  // Pour simplifier, on va créer un fichier SVG et le renommer en PNG
  // En production, vous devriez utiliser une vraie conversion SVG vers PNG
  return svgContent;
};

// Créer les icônes
const sizes = [192, 512];

// Génération des icônes pour le manifest
console.log('🎨 Génération des icônes pour le manifest...');

sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const pngPath = path.join(__dirname, '..', 'public', `android-chrome-${size}x${size}.png`);
  
  // Créer un fichier SVG temporaire
  const svgPath = pngPath.replace('.png', '.svg');
  fs.writeFileSync(svgPath, svgContent);
  
  console.log(`✅ Icône ${size}x${size} créée: ${svgPath}`);
});

// Créer aussi une icône apple-touch-icon
const appleIcon = createSVGIcon(180);
const appleIconPath = path.join(__dirname, '..', 'public', 'apple-touch-icon.svg');
fs.writeFileSync(appleIconPath, appleIcon);
console.log(`✅ Icône Apple Touch créée: ${appleIconPath}`);

// Mettre à jour le manifest pour utiliser les SVG
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.icons = [
  {
    "src": "/android-chrome-192x192.svg",
    "sizes": "192x192",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  },
  {
    "src": "/android-chrome-512x512.svg",
    "sizes": "512x512",
    "type": "image/svg+xml",
    "purpose": "any maskable"
  }
];

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ Manifest mis à jour avec les icônes SVG');

// Génération terminée !
// Note: Les icônes sont maintenant en SVG. Pour une meilleure compatibilité,
// vous devriez convertir ces SVG en PNG avec un outil comme ImageMagick ou
// utiliser un service en ligne de conversion SVG vers PNG. 