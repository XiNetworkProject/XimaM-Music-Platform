import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const appConfig = JSON.parse(read('synaura-app/app.json')).expo;
const packageConfig = JSON.parse(read('synaura-app/package.json'));
const packageLock = JSON.parse(read('synaura-app/package-lock.json'));
const releaseConfig = JSON.parse(read('synaura-app/release.json'));
const publisher = read('scripts/publish-android-release.js');

test('les versions Android restent synchronisees dans les metadonnees suivies', () => {
  assert.equal(packageConfig.version, appConfig.version);
  assert.equal(packageLock.version, appConfig.version);
  assert.equal(packageLock.packages[''].version, appConfig.version);
  assert.match(releaseConfig.title, new RegExp(appConfig.version.replaceAll('.', '\\.')));
  assert.ok(releaseConfig.releaseNotes.length >= 3);
});

test('la publication cible uniquement le stockage media Synaura local', () => {
  assert.equal(appConfig.extra.apiBaseUrl, 'https://synaura.fr');
  assert.equal(appConfig.extra.mobileReleaseManifestUrl, 'https://media.synaura.fr/mobile-releases/latest.json');
  assert.match(publisher, /SYNAURA_MEDIA_ROOT/);
  assert.match(publisher, /https:\/\/media\.synaura\.fr/);
  assert.match(publisher, /mobile-releases/);
  assert.match(publisher, /latest\.json/);
  assert.doesNotMatch(publisher, /supabase|cloudinary|vercel/i);
});
