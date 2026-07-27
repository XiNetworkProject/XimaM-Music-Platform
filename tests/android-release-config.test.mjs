import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const appConfig = JSON.parse(read('synaura-app/app.json')).expo;
const packageConfig = JSON.parse(read('synaura-app/package.json'));
const packageLock = JSON.parse(read('synaura-app/package-lock.json'));
const releaseConfig = JSON.parse(read('synaura-app/release.json'));
const publisher = read('scripts/publish-android-release.js');

test('Android release versions stay synchronized across tracked metadata', () => {
  assert.equal(packageConfig.version, appConfig.version);
  assert.equal(packageLock.version, appConfig.version);
  assert.equal(packageLock.packages[''].version, appConfig.version);
  assert.match(releaseConfig.title, new RegExp(appConfig.version.replaceAll('.', '\\.')));
  assert.ok(releaseConfig.releaseNotes.length >= 3);
});

test('the publisher releases the APK on GitHub before switching the Supabase manifest', () => {
  const githubPublish = publisher.indexOf('publishGithubApk(apk, versionName, versionCode)');
  const versionManifestUpload = publisher.indexOf('`manifests/${versionName}-${versionCode}.json`');
  const latestManifestUpload = publisher.indexOf("'latest.json'");

  assert.match(publisher, /uploads\.github\.com/);
  assert.match(publisher, /browser_download_url/);
  assert.match(publisher, /allowedMimeTypes: \['application\/json'\]/);
  assert.ok(githubPublish > 0);
  assert.ok(latestManifestUpload > githubPublish);
  assert.ok(versionManifestUpload > githubPublish);
});
