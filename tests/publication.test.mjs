import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import load from './helpers/load-typescript.cjs';
const { parsePublication, releaseCountError } = load('lib/publication/model.ts');
const { measureSamples, sampleWarnings } = load('lib/publication/audioAnalysis.ts');
const { MUSIC_GENRES, GENRE_CATEGORIES } = load('lib/genres.ts');
const input = () => ({ requestKey: randomUUID(), title: 'Test', releaseType: 'single', visibility: 'public', rightsConfirmed: true, tracks: [{ title: 'Test', publicId: 'local/audio/tracks/test.mp3', url: 'https://media.synaura.fr/audio/tracks/test.mp3' }] });
test('taxonomy is expanded, unique, searchable, and preserves old styles', () => {
  assert.ok(MUSIC_GENRES.length > 300); assert.equal(new Set(MUSIC_GENRES).size, MUSIC_GENRES.length);
  for (const label of ['Pop', 'Rap FR', 'Kompa', 'Classical', 'Néoclassique', 'Liquid Drum & Bass', 'Frenchcore']) assert.ok(MUSIC_GENRES.includes(label));
  assert.equal(GENRE_CATEGORIES.length, 12);
});
test('styles are optional; rights are required; privacy is explicit', () => {
  const parsed = parsePublication(input()); assert.deepEqual(parsed.genres, []); assert.equal(parsed.remixPermissions.remixVisibility, 'disabled');
  assert.throws(() => parsePublication({ ...input(), rightsConfirmed: false }));
  assert.throws(() => parsePublication({ ...input(), visibility: 'unlisted' }));
  assert.throws(() => parsePublication({ ...input(), genres: ['invention'] }));
});
test('release counts, duplicate files and text limits are enforced', () => {
  assert.ok(releaseCountError('single', 2)); assert.ok(releaseCountError('ep', 1)); assert.ok(releaseCountError('ep', 7)); assert.ok(releaseCountError('album', 6)); assert.equal(releaseCountError('album', 7), '');
  const raw = input(); assert.throws(() => parsePublication({ ...raw, releaseType: 'ep', tracks: [raw.tracks[0], raw.tracks[0]] }));
  assert.throws(() => parsePublication({ ...raw, title: 'x'.repeat(201) }));
  assert.throws(() => parsePublication({ ...raw, tracks: [null] }));
});
test('only known metadata is preserved and remix permissions are sanitized', () => {
  const parsed = parsePublication({ ...input(), credits: { author: 'Alice', internal: 'discard' }, mood: 'chill', language: 'fr', isExplicit: true, featuring: [{ id: 'ext_1', name: 'Bob', isExternal: true }], remixPermissions: { allowAudioRemix: true, remixVisibility: 'disabled' } });
  assert.deepEqual(parsed.credits, { author: 'Alice' }); assert.equal(parsed.isExplicit, true); assert.equal(parsed.remixPermissions.allowAudioRemix, false);
});
test('silence produces a warning and finite zero waveform', () => {
  const measures = measureSamples([new Float32Array(44100)], 44100);
  assert.equal(measures.silenceRatio, 1); assert.ok(sampleWarnings(measures).some(x => x.includes('silencieux'))); assert.ok(measures.waveform.every(x => x === 0));
});
test('a normal sine has expected sample peak and RMS without invented warnings', () => {
  const samples = Float32Array.from({ length: 44100 }, (_, i) => .5 * Math.sin(i / 44100 * 2 * Math.PI * 440));
  const measures = measureSamples([samples], 44100); assert.ok(Math.abs(measures.peakDb + 6.02) < .02); assert.ok(Math.abs(measures.rmsDb + 9.03) < .02); assert.deepEqual(sampleWarnings(measures), []);
});
test('clipping and stereo silence are detected across both channels', () => {
  const measures = measureSamples([new Float32Array(44100), new Float32Array(44100).fill(1)], 44100);
  assert.equal(measures.silenceRatio, 0); assert.ok(sampleWarnings(measures).some(x => x.includes('saturation')));
});
test('new publication flow does not call recognition services or delete committed media', () => {
  const code = fs.readFileSync('components/publication/PublicationWorkspace.tsx', 'utf8');
  assert.doesNotMatch(code, /copyright-check|api\.audd|sendBeacon|cleanupLocalMediaUploads/);
  assert.match(code, /submission\.current/); assert.match(code, /setLocked\(true\)/);
  const style = fs.readFileSync('components/publication/publication.css', 'utf8'); assert.match(style, /100dvh/); assert.match(style, /prefers-reduced-motion/);
});
