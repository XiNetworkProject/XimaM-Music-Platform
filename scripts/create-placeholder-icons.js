const fs = require('fs');
const path = require('path');

console.log('🎨 Création des icônes SVG pour le manifest...');

// Créer une icône SVG simple
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#1db954"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="white"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/8}" fill="#1db954"/>
    <text x="${size/2}" y="${size*0.8}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="bold">X</text>
  </svg>`;
};

// Créer les icônes
const sizes = [192, 512];

sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const svgPath = path.join(__dirname, '..', 'public', `android-chrome-${size}x${size}.svg`);
  
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

console.log('\n🎉 Génération terminée !'); 