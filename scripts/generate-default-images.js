const fs = require('fs');
const path = require('path');

// Créer les dossiers nécessaires
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Créer un fichier SVG simple pour l'avatar par défaut
const defaultAvatarSVG = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#avatarGradient)"/>
  <circle cx="100" cy="80" r="25" fill="white" opacity="0.9"/>
  <path d="M 50 140 Q 100 120 150 140" stroke="white" stroke-width="8" fill="none" opacity="0.9"/>
</svg>`;

// Créer un fichier SVG simple pour la bannière par défaut
const defaultBannerSVG = `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bannerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="bannerOverlay" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.1" />
    </radialGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#bannerGradient)"/>
  <rect width="1200" height="400" fill="url(#bannerOverlay)"/>
  <circle cx="300" cy="200" r="80" fill="white" opacity="0.1"/>
  <circle cx="900" cy="150" r="60" fill="white" opacity="0.1"/>
  <circle cx="1000" cy="300" r="40" fill="white" opacity="0.1"/>
</svg>`;

// Créer un fichier SVG simple pour la cover par défaut
const defaultCoverSVG = `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#coverGradient)"/>
  <circle cx="200" cy="160" r="40" fill="white" opacity="0.9"/>
  <rect x="120" y="220" width="160" height="8" fill="white" opacity="0.9" rx="4"/>
  <rect x="140" y="240" width="120" height="8" fill="white" opacity="0.7" rx="4"/>
  <rect x="160" y="260" width="80" height="8" fill="white" opacity="0.5" rx="4"/>
</svg>`;

// Écrire les fichiers
fs.writeFileSync(path.join(publicDir, 'default-avatar.svg'), defaultAvatarSVG);
fs.writeFileSync(path.join(publicDir, 'default-banner.svg'), defaultBannerSVG);
fs.writeFileSync(path.join(publicDir, 'default-cover.svg'), defaultCoverSVG);

// Créer aussi des versions PNG simples (placeholders)
fs.writeFileSync(path.join(publicDir, 'default-avatar.png'), '');
fs.writeFileSync(path.join(publicDir, 'default-banner.jpg'), '');
fs.writeFileSync(path.join(publicDir, 'default-cover.jpg'), '');

console.log('✅ Images par défaut générées dans le dossier public/');
console.log('📁 Fichiers créés:');
console.log('   - default-avatar.svg');
console.log('   - default-banner.svg');
console.log('   - default-cover.svg');
console.log('   - default-avatar.png (placeholder)');
console.log('   - default-banner.jpg (placeholder)');
console.log('   - default-cover.jpg (placeholder)'); 