const fs = require('fs');
const path = require('path');

// Créer le dossier temp s'il n'existe pas
const tempDir = path.join(__dirname, '..', 'public', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Fonction pour créer un fichier WAV simple
function createSimpleWav(filename, duration = 3) {
  const sampleRate = 44100;
  const samples = sampleRate * duration;
  const buffer = Buffer.alloc(44 + samples * 2); // Header WAV + données
  
  // Header WAV
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);
  
  // Générer un son simple (440 Hz)
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }
  
  fs.writeFileSync(path.join(tempDir, filename), buffer);
  console.log(`✅ Fichier créé: ${filename}`);
}

// Créer les fichiers de test
console.log('🎵 Création des fichiers audio de debug...');
createSimpleWav('debug_audio_1.wav', 3);
createSimpleWav('debug_audio_2.wav', 3);

console.log('✅ Fichiers audio de debug créés !');
console.log('📁 Dossier:', tempDir);
