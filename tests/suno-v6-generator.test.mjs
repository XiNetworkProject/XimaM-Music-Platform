import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const source = readFileSync(path, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (id) => load(resolve(dirname(path), `${id}.ts`)) }, { filename: path });
  cache.set(path, module.exports);
  return module.exports;
}
const { buildSunoGeneratorPayload: build, restoreGeneratorDuration: restoreDuration } = load('lib/sunoGeneratorForm.ts');
const { validateSunoGenerationInput: validateBackend } = load('lib/sunoValidation.ts');
const base = {
  model: 'V6', allowedModels: ['V6', 'V6_WILD', 'V6_MINI'], customMode: false, instrumental: false,
  description: '  Une chanson calme\navec une basse ronde.  ', title: 'Une chanson', style: 'piano, soul', lyrics: '',
  selectedTags: [], duration: 120, styleInfluence: 50, weirdness: 50, audioWeight: 50, negativeTags: '', vocalGender: '',
};

test('simple generation preserves the description and never injects duration or editorial text', () => {
  const payload = build(base);
  assert.equal(payload.prompt, base.description);
  assert.equal(payload.model, 'V6');
  assert.equal('duration' in payload, false);
  assert.equal('durationHint' in payload, false);
  assert.equal('style' in payload, false);
});

test('custom generation sends numeric duration and preserves lyrics including whitespace', () => {
  const lyrics = '  [Verse]\nUne ligne.\n\n[Chorus]\nEncore.  ';
  const payload = build({ ...base, customMode: true, lyrics, duration: 237 });
  assert.equal(payload.prompt, lyrics);
  assert.equal(payload.duration, 237);
  assert.equal('durationHint' in payload, false);
  assert.equal(build({ ...base, duration: 237 }).duration, undefined);
});

test('instrumental custom generation omits lyrics while preserving style and explicit tags', () => {
  const payload = build({ ...base, customMode: true, instrumental: true, selectedTags: ['jazz'], lyrics: 'unused' });
  assert.equal(payload.prompt, undefined);
  assert.equal(payload.style, 'piano, soul, jazz');
  assert.equal(payload.duration, 120);
});

test('stale models migrate for new requests and paid variants respect the entitlement list', () => {
  assert.equal(build({ ...base, model: 'V5_5' }).model, 'V6');
  assert.equal(build({ ...base, model: 'V6_WILD', allowedModels: ['V6_MINI'] }).model, 'V6_MINI');
  assert.equal(build({ ...base, model: 'V6_WILD' }).model, 'V6_WILD');
  assert.equal(build({ ...base, model: 'V6_MINI' }).model, 'V6_MINI');
});

test('restored duration accepts the full custom range and recovers invalid old preferences', () => {
  for (const duration of [10, 60, 120, 237, 360]) assert.equal(restoreDuration(String(duration)), duration);
  for (const invalid of [0, 9, 361, -1, null, '', 'bad', Infinity]) assert.equal(restoreDuration(invalid), 120);
  for (const duration of [9, 361, NaN]) assert.throws(() => build({ ...base, customMode: true, instrumental: true, duration }), /durée/);
});

test('the complete simple prompt is validated without truncating explicit tags', () => {
  assert.equal(build({ ...base, description: 'a'.repeat(3000) }).prompt.length, 3000);
  assert.throws(() => build({ ...base, description: 'a'.repeat(3000), selectedTags: ['jazz'] }), /3000 caractères/);
  assert.equal(build({ ...base, selectedTags: ['jazz'] }).prompt, `${base.description}, jazz`);
});

test('custom limits validate combined style and require lyrics for voices', () => {
  assert.throws(() => build({ ...base, customMode: true, instrumental: true, title: '' }), /Titre requis/);
  assert.throws(() => build({ ...base, customMode: true }), /paroles/);
  assert.throws(() => build({ ...base, customMode: true, instrumental: true, style: 'a'.repeat(1000), selectedTags: ['jazz'] }), /1000 caractères/);
  assert.throws(() => build({ ...base, customMode: true, instrumental: true, title: 'a'.repeat(81) }), /80 caractères/);
  assert.throws(() => build({ ...base, customMode: true, lyrics: 'a'.repeat(5001) }), /5000 caractères/);
});

test('an audio remix uses custom duration and keeps its source and written lyrics', () => {
  const payload = build({ ...base, title: '', uploadUrl: 'https://media.example/source.mp3', sourceDurationSec: 200, lyrics: '\nMon refrain\n', duration: 180 });
  assert.equal(payload.customMode, true);
  assert.equal(payload.duration, 180);
  assert.equal(payload.prompt, '\nMon refrain\n');
  assert.equal(payload.uploadUrl, 'https://media.example/source.mp3');
  assert.equal(payload.title, 'Remix');
});

test('tag chips already present in an editor are not duplicated at submission', () => {
  const description = `${'a'.repeat(2992)}, jazz`;
  assert.equal(build({ ...base, description, selectedTags: ['jazz', 'JAZZ'] }).prompt, description);
  const style = `${'a'.repeat(992)}, jazz`;
  assert.equal(build({ ...base, customMode: true, instrumental: true, style, selectedTags: ['jazz'] }).style, style);
  assert.equal(build({ ...base, description: 'jazz', selectedTags: ['jazz', 'soul'] }).prompt, 'jazz, soul');
});

test('complete generator payloads satisfy actual backend generation validation', () => {
  for (const model of ['V6', 'V6_WILD', 'V6_MINI']) {
    for (const patch of [
      {},
      { customMode: true, lyrics: '\n[Verse]\n Texte exact. \n' },
      { customMode: true, instrumental: true, duration: 360 },
      { title: '', uploadUrl: 'https://media.example/source.mp3', lyrics: 'Texte source', duration: 10 },
      { title: '', uploadUrl: 'https://media.example/source.mp3', instrumental: true },
    ]) {
      const payload = build({ ...base, ...patch, model });
      const result = validateBackend({ ...payload, hasUploadUrl: Boolean(payload.uploadUrl) });
      assert.equal(result.ok, true, JSON.stringify({ model, patch, result }));
    }
  }
});

test('active generator and history render the current model controls and filtered collections', () => {
  const source = readFileSync('app/ai-generator/page.tsx', 'utf8');
  const active = source.slice(source.indexOf('  const studioModelLabel'), source.indexOf('  return (\n    <SynauraAppShell contentClassName="max-w-[1660px]"'));
  assert.match(active, /CURRENT_SUNO_MODELS\.map/);
  assert.match(active, /!availableModels\.includes\(model\.id\)/);
  assert.match(active, /<SunoV6Announcement/);
  assert.doesNotMatch(active, /Générer 2 versions|Deux versions seront/);
  const library = readFileSync('app/ai-library/page.tsx', 'utf8');
  assert.match(library, /filteredGenerations\.map/);
  assert.match(library, /filteredTracks\.map/);
  for (const legacy of ['V4_5', 'V4_5PLUS', 'V5', 'V5_5']) assert.ok(library.includes(`value="${legacy}"`));
});

test('owned UI files remain valid TSX', () => {
  for (const file of ['app/ai-generator/page.tsx', 'app/ai-library/page.tsx', 'app/create/page.tsx', 'components/BuyCreditsModal.tsx', 'components/ai-studio/SunoV6Announcement.tsx']) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(source.parseDiagnostics.length, 0, file);
  }
});
