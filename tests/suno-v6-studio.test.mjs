import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const storePath = 'lib/studio/store.ts';
const queuePath = 'components/studio/hooks/useStudioGenerationQueue.ts';
const formPath = 'components/studio/LeftDock/GeneratorForm.tsx';
const clientPath = 'app/studio/StudioClient.tsx';
function evaluate(file, mocks = {}, environment = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const names = Object.keys(environment);
  new Function('require', 'module', 'exports', ...names, output)(
    (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), module, module.exports, ...Object.values(environment),
  );
  return module.exports;
}
const models = evaluate('lib/sunoModels.ts');
function freshStore(saved) {
  const values = new Map(saved ? [['studio.store.v2', JSON.stringify({ state: saved, version: 0 })]] : []);
  const storage = require('zustand/middleware').createJSONStorage(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }));
  const { useStudioStore, ...helpers } = evaluate(storePath, {
    '@/lib/sunoModels': models,
    'zustand/middleware': { persist: (creator, options) => require('zustand/middleware').persist(creator, { ...options, storage }) },
  });
  const select = (selector) => selector(useStudioStore.getState());
  select.getState = useStudioStore.getState;
  return { store: useStudioStore, select, ...helpers };
}
function queueModule(select, { effects = [], notifications = [], fetch = async () => assert.fail('Unexpected request') } = {}) {
  return evaluate(queuePath, {
    react: { useCallback: (callback) => callback, useEffect: (effect) => effects.push(effect) },
    '@/hooks/useBackgroundGeneration': { useBackgroundGeneration: () => ({ generations: [], startBackgroundGeneration() {} }) },
    '@/lib/studio/store': { useStudioStore: select },
    '@/lib/sunoModels': models,
    '@/components/NotificationCenter': { notify: Object.fromEntries(['error', 'info', 'success'].map((type) => [type, (...args) => notifications.push({ type, args })])) },
  }, { fetch });
}
const nextTick = () => new Promise((resolve) => setImmediate(resolve));

test('persisted form/pending queue migrate; historical tracks and completed jobs keep their models', () => {
  const completed = { id: 'done', status: 'done', paramsSnapshot: { model: 'V4_5', prompt: 'old' } };
  const running = { id: 'running', status: 'running', paramsSnapshot: { model: 'V5' } };
  const historicalTrack = { id: 'old-track', model: 'V5', title: 'Old', tags: [], prompt: 'old', lyrics: '', hasVocals: false };
  const { store } = freshStore({ form: { model: 'V4_5PLUS', description: 'Saved idea' }, tracks: [historicalTrack], jobs: [completed], queueItems: [completed, running, { id: 'draft', status: 'pending', paramsSnapshot: { model: 'V5_5' } }] });
  const state = store.getState();
  assert.equal(state.form.model, 'V6');
  assert.equal(state.form.description, 'Saved idea');
  assert.equal(state.form.duration, null);
  assert.equal(state.form.styleInfluence, 50);
  assert.equal(state.queueItems[2].paramsSnapshot.model, 'V6');
  assert.deepEqual(state.queueItems[0], completed);
  assert.deepEqual(state.queueItems[1], running);
  assert.deepEqual(state.jobs[0], completed);
  assert.deepEqual(state.tracks[0], historicalTrack);
  state.loadTrackIntoForm('old-track');
  assert.equal(store.getState().form.model, 'V6');
  assert.equal(store.getState().form.instrumental, true);
  assert.equal(store.getState().tracks[0].model, 'V5');
});

test('retry creates a current request without modifying original completed/failed source', () => {
  const original = { id: 'failed', projectId: 'project_default', status: 'failed', paramsSnapshot: { model: 'V4', customMode: true, prompt: '\nExact lyrics\n' } };
  const { store } = freshStore({ queueItems: [original] });
  const id = store.getState().retryQueueItem('failed');
  assert.ok(id);
  assert.equal(store.getState().queueItems[0].paramsSnapshot.model, 'V6');
  assert.equal(store.getState().queueItems[0].paramsSnapshot.prompt, original.paramsSnapshot.prompt);
  assert.deepEqual(store.getState().queueItems[1], original);
});

test('outbound model/duration normalization handles old queued payloads without changing raw lyrics', () => {
  const { select } = freshStore();
  const { prepareStudioRequest } = queueModule(select);
  const source = { model: 'V5', customMode: false, duration: 90, durationHint: 'long', _endpoint: 'upload-cover', _batchTotal: 2, prompt: 'idea' };
  const prepared = prepareStudioRequest(source);
  assert.equal(prepared.endpoint, '/api/suno/upload-cover');
  assert.deepEqual(prepared.body, { model: 'V6', customMode: false, prompt: 'idea' });
  assert.equal(source.model, 'V5');
  assert.equal(prepareStudioRequest({ model: 'V6_WILD', customMode: true, duration: 360, prompt: '\nVerse\n' }).body.prompt, '\nVerse\n');
  assert.throws(() => prepareStudioRequest({ customMode: true, duration: 361 }), /10 et 360/);
  assert.throws(() => prepareStudioRequest({ customMode: true, duration: 10.5 }), /entier/);
});

test('custom duration is sent, simple duration is Auto, vocal lyrics stay verbatim and limits include tags', () => {
  const { store, select } = freshStore();
  const { makeStudioRequestFromForm } = queueModule(select);
  const form = { ...store.getState().form, customMode: true, style: 'Pop', lyrics: '\n[Verse]\n  Exact words\n', duration: 120, vocalGender: 'f' };
  const custom = makeStudioRequestFromForm(form);
  assert.equal(custom.duration, 120);
  assert.equal(custom.prompt, form.lyrics);
  assert.equal(custom.vocalGender, 'f');
  const instrumental = makeStudioRequestFromForm({ ...form, instrumental: true });
  assert.equal(Object.hasOwn(instrumental, 'prompt'), false);
  assert.equal(Object.hasOwn(instrumental, 'vocalGender'), false);
  const simple = makeStudioRequestFromForm({ ...form, customMode: false, description: 'Pop instrumental' });
  assert.equal(Object.hasOwn(simple, 'duration'), false);
  assert.equal(Object.hasOwn(simple, 'vocalGender'), false);
  assert.throws(() => makeStudioRequestFromForm({ ...form, style: 'x'.repeat(999), tags: ['more'] }), /1000/);
  assert.throws(() => makeStudioRequestFromForm({ ...form, duration: 9 }), /10 et 360/);
  assert.throws(() => makeStudioRequestFromForm({ ...form, customMode: false, description: 'x'.repeat(3000), tags: ['more'] }), /3000/);
});

test('queue claims once across repeated effects, reports server adjustment and records the actual model', async () => {
  const { store, select } = freshStore();
  store.getState().enqueueQueueItem({ customMode: false, model: 'V6_WILD', prompt: 'test' }, 'project_default');
  const effects = [], notifications = [], requests = [];
  const { useStudioGenerationQueue } = queueModule(select, { effects, notifications, fetch: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ taskId: 'task-1', model: 'V6_MINI', requestedModel: 'V6_WILD', modelAdjusted: true }) };
  } });
  useStudioGenerationQueue({ onInsufficientCredits() {}, onCreditsBalance() {} });
  effects.at(-1)();
  effects.at(-1)();
  await nextTick();
  assert.equal(requests.length, 1);
  assert.equal(store.getState().jobs[0].paramsSnapshot.model, 'V6_MINI');
  assert.equal(store.getState().queueItems[0].paramsSnapshot.model, 'V6_MINI');
  assert.ok(notifications.some((notice) => notice.type === 'info' && notice.args[0] === 'Modèle ajusté'));
});

test('queue reports safe server failure exactly, keeps failed entry, and opens credits only for 402', async () => {
  const { store, select } = freshStore();
  store.getState().enqueueQueueItem({ model: 'V6', prompt: 'test' }, 'project_default');
  const effects = [], notifications = [];
  let creditPrompts = 0;
  queueModule(select, { effects, notifications, fetch: async () => ({ ok: false, status: 402, json: async () => ({ error: 'Crédits insuffisants pour cette génération.' }) }) })
    .useStudioGenerationQueue({ onInsufficientCredits() { creditPrompts++; }, onCreditsBalance() {} });
  effects.at(-1)();
  await nextTick();
  assert.equal(creditPrompts, 1);
  assert.equal(store.getState().queueItems[0].status, 'failed');
  assert.equal(store.getState().queueItems[0].error, 'Crédits insuffisants pour cette génération.');
  assert.ok(notifications.some((notice) => notice.args[1] === store.getState().queueItems[0].error));
});

function keyboard(key, patch = {}) {
  return { key, code: key === ' ' ? 'Space' : '', target: { tagName: 'DIV', isContentEditable: false }, defaultPrevented: false, repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
    preventDefault() { this.defaultPrevented = true; }, ...patch };
}
test('Studio hotkeys respect native controls/modifiers/repeats and already-owned Space', () => {
  const { handleStudioHotkeys } = evaluate('lib/studio/hotkeys.ts');
  let plays = 0;
  const handlers = { onPlayPause: () => plays++ };
  handleStudioHotkeys(keyboard(' '), handlers);
  assert.equal(plays, 1);
  for (const patch of [{ defaultPrevented: true }, { repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, ...['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].map((tagName) => ({ target: { tagName } })), { target: { tagName: 'DIV', isContentEditable: true } }, { target: { tagName: 'SPAN', closest: () => ({ role: 'dialog' }) } }]) {
    handleStudioHotkeys(keyboard(' ', patch), handlers);
  }
  handleStudioHotkeys(keyboard('k', { ctrlKey: true }), handlers);
  handleStudioHotkeys(keyboard('k', { metaKey: true }), handlers);
  assert.equal(plays, 1);
  handleStudioHotkeys(keyboard('k'), handlers);
  assert.equal(plays, 2);
});

function ast(file) { return ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function findNode(root, predicate) {
  if (predicate(root)) return root;
  return ts.forEachChild(root, (child) => findNode(child, predicate));
}
test('actual Studio palette effect handles Ctrl/Cmd+K without a second playback listener', () => {
  const tree = ast(clientPath);
  const effect = findNode(tree, (node) => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect' && node.arguments[0]?.getText(tree).includes('setCmdOpen(true)'));
  assert.ok(effect);
  const code = ts.transpileModule(`module.exports = ${effect.arguments[0].getText(tree)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let handler, opened = 0, playCount = 0;
  const module = { exports: {} };
  new Function('module', 'window', 'setSettingsOpen', 'setCmdOpen', 'cmdInputRef', 'setTimeout', 'play', 'pause', code)(module, { addEventListener: (_, callback) => { handler = callback; }, removeEventListener() {} }, () => {}, (value) => { if (value) opened++; }, { current: { focus() {} } }, (callback) => callback(), () => playCount++, () => playCount++);
  module.exports();
  handler(keyboard('k', { ctrlKey: true }));
  handler(keyboard('k', { metaKey: true }));
  handler(keyboard(' '));
  assert.equal(opened, 2);
  assert.equal(playCount, 0);
});

test('all actual presets are coherent valid V6 requests, including instrumental Cinematic', () => {
  const tree = ast(clientPath);
  const declaration = findNode(tree, (node) => ts.isVariableDeclaration(node) && node.name.getText(tree) === 'presets');
  const presets = new Function('DEFAULT_SUNO_MODEL', `return (${declaration.initializer.arguments[0].body.getText(tree)});`)('V6');
  const { store, select } = freshStore();
  const { makeStudioRequestFromForm } = queueModule(select);
  for (const preset of presets) {
    const request = makeStudioRequestFromForm({ ...store.getState().form, ...preset.patch });
    assert.equal(request.model, 'V6', preset.id);
  }
  const cinematic = presets.find((preset) => preset.id === 'cinematic');
  assert.equal(cinematic.patch.instrumental, true);
  assert.equal(cinematic.patch.duration, 120);
  assert.deepEqual(ast(formPath).parseDiagnostics, []);
});

test('visible selector uses entitlement models, actual voice values and Auto/custom duration controls', () => {
  const { store, select } = freshStore();
  const formEffects = [];
  const render = (allowed) => evaluate(formPath, {
    react: { useMemo: (callback) => callback(), useState: (initial) => [initial, () => {}], useEffect: (effect) => formEffects.push(effect) },
    'lucide-react': Object.fromEntries(['Sliders', 'Wand2', 'FileText', 'Settings2'].map((name) => [name, () => null])),
    '@/components/ui/SunoAccordionSection': { SunoAccordionSection: 'section' },
    '@/components/ui/sunoClasses': {},
    '@/components/ai-studio/SunoV6Announcement': { __esModule: true, default: 'aside' },
    '@/lib/studio/store': { useStudioStore: select },
    '@/lib/sunoModels': models,
    '@/hooks/useEntitlementsClient': { useEntitlementsClient: () => ({ loading: false, entitlements: { ai: { availableModels: allowed } } }) },
  }).default({ onGenerate() {} });
  function elements(root, predicate) {
    if (!root || typeof root !== 'object') return [];
    if (Array.isArray(root)) return root.flatMap((child) => elements(child, predicate));
    return [...(predicate(root) ? [root] : []), ...elements(root.props?.children, predicate)];
  }
  const free = render(['V6_MINI']);
  const freeModels = elements(free, (node) => node.type === 'option' && node.props.value?.startsWith?.('V6'));
  assert.deepEqual(freeModels.map((node) => [node.props.value, node.props.disabled]), [['V6', true], ['V6_WILD', true], ['V6_MINI', false]]);
  formEffects.at(-1)();
  assert.equal(store.getState().form.model, 'V6_MINI');
  const paidModels = elements(render(['V6', 'V6_WILD', 'V6_MINI']), (node) => node.type === 'option' && node.props.value?.startsWith?.('V6'));
  assert.ok(paidModels.every((node) => !node.props.disabled));
  const auto = elements(free, (node) => node.type === 'select' && node.props.value === 'auto')[0];
  assert.equal(auto.props.disabled, true);
  store.getState().setForm({ customMode: true });
  const custom = elements(render(['V6_MINI']), (node) => node.type === 'select' && node.props.value === 'auto')[0];
  custom.props.onChange({ target: { value: 'custom' } });
  assert.equal(store.getState().form.duration, 60);
  const voice = elements(render(['V6_MINI']), (node) => node.type === 'option' && ['m', 'f'].includes(node.props.value));
  assert.equal(voice.length, 2);
});

test('entitlement readiness protects paid restored selection while the session and account request resolve', async () => {
  const cells = [], effects = [];
  let index = 0, session = { data: null, status: 'loading' }, requests = 0, resolveResponse;
  const { useEntitlementsClient } = evaluate('hooks/useEntitlementsClient.ts', {
    react: {
      useState: (initial) => {
        const i = index++;
        if (!(i in cells)) cells[i] = initial;
        return [cells[i], (value) => { cells[i] = value; }];
      },
      useMemo: (callback) => callback(),
      useEffect: (effect) => effects.push(effect),
    },
    'next-auth/react': { useSession: () => session },
    '@/lib/entitlements': { getEntitlements: (plan) => ({ ai: { availableModels: plan === 'free' ? ['V6_MINI'] : ['V6', 'V6_WILD', 'V6_MINI'] }, features: { adFree: plan !== 'free' } }) },
  }, { fetch: () => { requests++; return new Promise((resolve) => { resolveResponse = resolve; }); } });
  const render = () => { index = 0; return useEntitlementsClient(); };
  assert.equal(render().loading, true);
  effects.at(-1)();
  assert.equal(requests, 0);
  session = { data: { user: { id: 'paid-user' } }, status: 'authenticated' };
  assert.equal(render().loading, true);
  effects.at(-1)();
  assert.equal(requests, 1);
  assert.equal(render().loading, true);
  resolveResponse({ ok: true, json: async () => ({ subscription: { name: 'Starter' } }) });
  await nextTick();
  const ready = render();
  assert.equal(ready.loading, false);
  assert.deepEqual(ready.entitlements.ai.availableModels, ['V6', 'V6_WILD', 'V6_MINI']);
});
