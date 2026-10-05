import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STUDIO_MODELS, studioAvailableModels, studioGenerationModel, studioModelLabel } from '../synaura-app/src/constants/studioModels.ts';
const read = path => fs.readFileSync(new URL('../synaura-app/src/' + path, import.meta.url), 'utf8');

test('native current models match the server contract', () => {
  const server = fs.readFileSync(new URL('../lib/sunoModels.ts', import.meta.url), 'utf8');
  assert.deepEqual(STUDIO_MODELS, [...server.matchAll(/\{ id: '(V[^']+)'/g)].map(match => match[1]));
});
test('free and unknown entitlements never grant a paid model', () => {
  for (const models of [undefined, null, [], ['V4_5'], ['V6_MINI']]) {
    assert.deepEqual(studioAvailableModels(models), ['V6_MINI']);
    assert.equal(studioGenerationModel('V6_WILD', models), 'V6_MINI');
  }
});
test('paid choices remain driven by the server, without mutating entitlements', () => {
  const choices = Object.freeze(['V6', 'V6_WILD', 'V6_MINI']);
  assert.equal(studioGenerationModel('V6_WILD', choices), 'V6_WILD');
  assert.equal(studioGenerationModel('V4_5', choices), 'V6');
  assert.equal(studioGenerationModel('V6', ['V6_MINI']), 'V6_MINI');
  assert.equal(studioGenerationModel('V6_MINI', choices), 'V6_MINI');
});
test('historical model identities are displayed honestly', () => {
  assert.equal(studioModelLabel('V5_5'), 'V5.5');
  assert.equal(studioModelLabel('V4_5PLUS'), 'V4.5+');
  assert.equal(studioModelLabel('old-model'), 'old-model');
  assert.equal(studioModelLabel('V6_MINI'), 'V6 Mini');
});
test('guest composition stays local; paid requests and media repair are authenticated', () => {
  const source = read('screens/AIStudioScreen.tsx');
  for (const name of ['createLyrics', 'generate']) {
    const block = source.slice(source.indexOf(`const ${name} = async`));
    assert.match(block.slice(0, 500), /auth.requireAuth\(\)/);
    assert.match(block.slice(0, 500), /closeComposer\(\)/);
  }
  assert.match(source, /model: studioGenerationModel\(model, quota\?\.availableModels\)/);
  assert.match(source, /if \(!auth.user \|\| !liveTaskId/);
  assert.match(source, /const repairMedia = useCallback\(async[^]*?if \(!auth.requireAuth\(\)\) return/);
  assert.doesNotMatch(source, /useFocusEffect/);
  assert.doesNotMatch(source, /getParent\(\)\?\.navigate\('Login'/);
  assert.match(source, /navigation.navigate\('Login'/);
  assert.match(source, /trackCover: \{ flex: 0/);
  assert.match(source, /animationType=\{motion \? 'slide' : 'none'\}/);
});
test('creation keeps all five real destinations, in a scrollable sheet', () => {
  const hub = read('screens/CreateHubScreen.tsx');
  for (const screen of ['AIStudio', 'Upload', 'ClipComposer', 'CreatePost', 'CreateVariation']) assert.ok(hub.includes(`open('${screen}')`));
  assert.match(read('components/create/CreateMenuSheet.tsx'), /ScrollView/);
  assert.match(read('components/create/CreationLaunchpad.tsx'), /layout.isNarrow \|\| layout.hasLargeText/);
});
test('publication retains the actual API and rights, with guarded upload and a dock outside the scroll', () => {
  const source = read('screens/UploadScreen.tsx');
  assert.match(source, /const publish = async \(\) => \{\s*if \(!auth.requireAuth\(\)\)/);
  assert.ok(source.includes('createUploadedTrack('));
  assert.ok(source.includes('RemixPermissionsSection'));
  assert.match(source, /<\/ScrollView>\s*<View style=\{\[styles.publishDock/);
  assert.match(source, /pointerEvents=\{uploading \|\| success \? 'none' : 'auto'\}/);
});
