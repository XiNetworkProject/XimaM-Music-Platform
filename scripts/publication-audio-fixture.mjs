import fs from 'node:fs';
import path from 'node:path';
// Generated test tone, never a user's song and never published.
const rate = 44100, samples = rate * 3;
const wav = Buffer.alloc(44 + samples * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(8000 * Math.sin(i / rate * Math.PI * 880)), 44 + i * 2);
const dir = path.resolve('artifacts/publication-20261009');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'test-tone.wav'), wav);
console.log('Generated local test tone: ' + path.join(dir, 'test-tone.wav'));
