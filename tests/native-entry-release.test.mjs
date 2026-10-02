import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { selectEntryTrack } from '../synaura-app/src/components/entry/liveEntryModel.ts';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const config = JSON.parse(read('synaura-app/app.json')).expo;

test('Android updates keep the published identity, scheme and a higher version code', () => {
  assert.equal(config.android.package, 'com.synaura.music');
  assert.equal(config.scheme, 'synaura');
  assert.ok(config.android.versionCode > 82);
  assert.equal(config.extra.mobileReleaseManifestUrl, 'https://media.synaura.fr/mobile-releases/latest.json');
  assert.equal(JSON.parse(read('synaura-app/release.json')).mandatory, false);
});
test('the entry resumes an existing playable feed track, never an unrelated current track', () => {
  const a = { _id: 'a', audioUrl: '/a.mp3' }, b = { _id: 'b', audioUrl: '/b.mp3' };
  assert.equal(selectEntryTrack([a,b], 'b'), b);
  assert.equal(selectEntryTrack([a,b], 'elsewhere'), a);
  assert.equal(selectEntryTrack([{ _id:'silent' },b]), b);
  assert.equal(selectEntryTrack([]), null);
  assert.equal(selectEntryTrack([{ _id:'silent' }]), null);
});
test('presentation is horizontal, skippable and preserves existing completion key', () => {
  const source = read('synaura-app/src/screens/WelcomeScreen.tsx');
  assert.match(source, /horizontal pagingEnabled/);
  assert.match(source, /Explorer sans compte/);
  assert.match(source, /navigation\.navigate\(target\)/);
  assert.match(source, /splitLayout/);
  assert.match(read('synaura-app/src/onboarding/welcomeState.ts'), /synaura\.welcome\.completed\.v1/);
});
test('ambient motion respects visibility, OS reduced motion and data saving', () => {
  const source = read('synaura-app/src/components/entry/EntryAtmosphere.tsx');
  for (const token of ['AppState.addEventListener', 'reduceMotionChanged', "addListener('blur'", 'settings.reducedMotion', 'settings.dataSaver', 'isInteraction: false', 'loop.stop()']) assert.ok(source.includes(token), token);
});
test('the boot transition cannot hold the interface indefinitely', () => {
  const source = read('synaura-app/src/components/AnimatedBootSplash.tsx');
  assert.match(source, /setTimeout\(\(\) => setVisible\(false\), 1600\)/);
  assert.match(source, /sequence\?\.stop\(\)/);
  assert.match(source, /isReduceMotionEnabled/);
});

test('notification prompts never interrupt account completion or security gates', () => {
  const source = read('synaura-app/src/notifications/NativeNotificationNudge.tsx');
  for (const guard of ['!auth.loading', '!auth.mfaRequired', '!auth.biometricLocked', 'auth.user.profileComplete !== false', "'PhoneAuth'"]) assert.ok(source.includes(guard), guard);
});
