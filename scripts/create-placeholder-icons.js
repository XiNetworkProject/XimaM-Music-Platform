const fs = require('fs');
const path = require('path');

console.log('🎨 Création des icônes placeholder...');

// Fonction pour créer une image PNG valide (1x1 pixel transparent)
function createValidPNG() {
  // Header PNG minimal valide
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, // bit depth
    0x06, // color type (RGBA)
    0x00, // compression
    0x00, // filter
    0x00, // interlace
    0x37, 0x6E, 0xF9, 0x24, // IHDR CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xE2, 0x21, 0xBC, 0x33, // IDAT CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // IEND CRC
  ]);
  
  return pngHeader;
}

// Fonction pour créer une icône plus grande (192x192 ou 512x512)
function createLargerPNG(size) {
  // Créer un PNG simple avec un fond coloré
  const width = size;
  const height = size;
  
  // Header PNG
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  ]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0); // width
  ihdrData.writeUInt32BE(height, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  
  const ihdrChunk = Buffer.concat([
    Buffer.alloc(4), // placeholder for length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.alloc(4) // placeholder for CRC
  ]);
  
  // IDAT chunk avec des données minimales
  const idatData = Buffer.from([0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
  const idatChunk = Buffer.concat([
    Buffer.alloc(4), // placeholder for length
    Buffer.from('IDAT'),
    idatData,
    Buffer.alloc(4) // placeholder for CRC
  ]);
  
  // IEND chunk
  const iendChunk = Buffer.concat([
    Buffer.alloc(4), // length = 0
    Buffer.from('IEND'),
    Buffer.from([0xAE, 0x42, 0x60, 0x82]) // CRC
  ]);
  
  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

// Créer les icônes
const icons = [
  { name: 'favicon.ico', data: createValidPNG() },
  { name: 'default-avatar.png', data: createValidPNG() },
  { name: 'android-chrome-192x192.png', data: createLargerPNG(192) },
  { name: 'android-chrome-512x512.png', data: createLargerPNG(512) },
  { name: 'apple-touch-icon.png', data: createLargerPNG(180) },
];

// Écrire les fichiers
icons.forEach(icon => {
  const filePath = path.join(__dirname, '..', 'public', icon.name);
  fs.writeFileSync(filePath, icon.data);
  console.log(`✅ Créé: public/${icon.name}`);
});

console.log('\n📝 Instructions pour les vraies icônes:');
console.log('1. Remplacez favicon.ico par un vrai fichier .ico');
console.log('2. Remplacez les fichiers .png par de vraies images');
console.log('3. Utilisez des outils comme:');
console.log('   - https://favicon.io/ pour le favicon');
console.log('   - https://realfavicongenerator.net/ pour les icônes');
console.log('   - https://www.figma.com/ pour créer des icônes personnalisées'); 