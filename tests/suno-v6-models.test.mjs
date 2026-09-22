import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { projectLiveMedia } from './helpers/reviewed-live-media.mjs';
import { CURRENT_SUNO_MODELS, DEFAULT_SUNO_MODEL, normalizeGenerationModel, getSunoModelLabel, SUNO_GENERATION_LIMITS } from '../lib/sunoModels.ts';
import { PLANS, CREDITS_PER_GENERATION, CREDIT_PACKS, ACTION_COSTS } from '../lib/billing/pricing.ts';

test('V6 Mini for Free, every V6 variant for every paid subscription', () => {
  assert.deepEqual(CURRENT_SUNO_MODELS.map(model => model.id), ['V6', 'V6_WILD', 'V6_MINI']);
  assert.equal(DEFAULT_SUNO_MODEL, 'V6');
  assert.deepEqual(PLANS.free.limits.availableModels, ['V6_MINI']);
  for (const plan of ['starter', 'pro']) assert.deepEqual(PLANS[plan].limits.availableModels, ['V6', 'V6_WILD', 'V6_MINI']);
  for (const model of CURRENT_SUNO_MODELS) assert.equal(model.minPlan, model.id === 'V6_MINI' ? 'free' : 'starter');
});

test('legacy drafts migrate on re-use without mutating historical identity', () => {
  for (const old of ['V4', 'V4_5', 'V4_5PLUS', 'V4_5ALL', 'V5', 'V5_5', 'suno-V4_5', undefined, null, {}, 'untrusted']) {
    assert.equal(normalizeGenerationModel(old), 'V6');
  }
  for (const { id } of CURRENT_SUNO_MODELS) assert.equal(normalizeGenerationModel(id), id);
  assert.equal(normalizeGenerationModel(' v6_wild '), 'V6_WILD');
  assert.equal(normalizeGenerationModel('V6_WILD', PLANS.free.limits.availableModels), 'V6_MINI');
  assert.equal(normalizeGenerationModel('V6_WILD', PLANS.starter.limits.availableModels), 'V6_WILD');
  assert.equal(normalizeGenerationModel('V5', ['V6_MINI']), 'V6_MINI');
  assert.equal(normalizeGenerationModel('V6_WILD', []), 'V6');
  assert.equal(getSunoModelLabel('V5_5'), 'V5.5');
  assert.equal(getSunoModelLabel('UPLOAD'), 'UPLOAD');
  assert.equal(getSunoModelLabel('suno-V4_5'), 'suno-V4_5');
  assert.equal(getSunoModelLabel('V6_WILD'), 'V6 Wild');
});

test('new text and duration limits do not confuse generation with cover', () => {
  assert.deepEqual(SUNO_GENERATION_LIMITS, { simplePrompt: 3000, coverSimplePrompt: 500, prompt: 5000, style: 1000, title: 80, minDuration: 10, maxDuration: 360 });
});

test('V6 does not alter subscription prices, grants, packs, credit charges or non-model rights', () => {
  const source = readFileSync(new URL('../artifacts/suno-v6/before/lib/billing/pricing.ts', import.meta.url), 'utf8');
  const old = {};
  new Function('exports', 'process', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(old, { env: {} });
  const invariantPlan = plan => ({ ...plan, features: plan.features.filter(feature => !/modèle/i.test(feature)), limits: { ...plan.limits, availableModels: [] }, stripePriceIds: {} });
  for (const name of Object.keys(PLANS)) assert.deepEqual(invariantPlan(PLANS[name]), invariantPlan(old.PLANS[name]), name);
  assert.equal(CREDITS_PER_GENERATION, old.CREDITS_PER_GENERATION);
  assert.deepEqual(CREDIT_PACKS, old.CREDIT_PACKS);
  assert.deepEqual(ACTION_COSTS, old.ACTION_COSTS);
});

test('V6 leaves the audio engine, schema, entry and unrelated APIs on the preserved baseline', () => {
  // LF companion was derived only after verifying every original raw-byte digest.
  const baseline = JSON.parse(readFileSync(new URL('../artifacts/chambre-full-redesign/protected-before-lf.json', import.meta.url), 'utf8'));
  const authorized = new Set(['app/api/suno/generate/route.ts', 'app/api/suno/upload-cover/route.ts', 'lib/routeChrome.ts']);
  for (const [file, hash] of Object.entries(baseline)) {
    if (authorized.has(file)) continue;
    const bytes = readFileSync(new URL(`../${file}`, import.meta.url));
    let source = bytes.includes(0) ? bytes : bytes.toString('utf8').replaceAll('\r\n', '\n');
    if (['lib/audio/AudioCore.ts', 'app/api/media/upload/route.ts', 'app/api/music-clips/[id]/route.ts'].includes(file)) source = projectLiveMedia(file, source);
    if (file === 'components/chamber/ChamberProduct.tsx') {
      // Exactly the optional home CTA routes into the new horizontal presentation.
      // Project these two reviewed fragments; the old scene/audio/scroll stays hashed.
      const signature = 'export default function ChamberProduct({ presentationHref }: { presentationHref?: string } = {}) {';
      const cta = '{presentationHref ? <Link href={presentationHref} className="cp-button cp-button-light">Découvrir Synaura <ArrowUpRight size={20} /></Link> : <button type="button" className="cp-button cp-button-light" onClick={() => goToChapter(1)}>Découvrir Synaura <ArrowUpRight size={20} /></button>}';
      assert.equal(source.split(signature).length, 2);
      assert.equal(source.split(cta).length, 2);
      source = source.replace(signature, 'export default function ChamberProduct() {').replace(cta, '<button type="button" className="cp-button cp-button-light" onClick={() => goToChapter(1)}>Découvrir Synaura <ArrowUpRight size={20} /></button>');
    }
    assert.equal(createHash('sha256').update(source).digest('hex'), hash, file);
  }
});

test('global playback shortcut ignores composition, controls, modifiers and already handled events', () => {
  const source = readFileSync(new URL('../components/FullScreenPlayer.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('player.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'onKey') callbacks.push(node.initializer.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(callbacks.length, 1);
  const js = ts.transpileModule(`const handler = ${callbacks[0]};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  let plays = 0;
  const handler = new Function('togglePlay', `${js}; return handler;`)(() => { plays += 1; });
  const event = overrides => ({ code: 'Space', defaultPrevented: false, target: { isContentEditable: false, closest: () => null }, preventDefault() { this.defaultPrevented = true; }, ...overrides });
  for (const key of ['defaultPrevented', 'repeat', 'isComposing', 'metaKey', 'ctrlKey', 'altKey', 'shiftKey']) handler(event({ [key]: true }));
  handler(event({ target: { isContentEditable: true } }));
  handler(event({ target: { closest: () => ({}) } }));
  assert.equal(plays, 0);
  const space = event();
  handler(space);
  assert.equal(plays, 1);
  assert.equal(space.defaultPrevented, true);
  handler(space);
  assert.equal(plays, 1);
});
