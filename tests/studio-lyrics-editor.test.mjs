import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { feedbackFailure } from '../lib/studio/feedback.ts';

// Execute the real component with isolated React scheduling, timers and HTTP.
function harness() {
  let cursor = 0, dirty = true, effects = [], tree, timerId = 0;
  const slots = [], requests = [], timers = new Map(), storage = new Map();
  const studio = { owner: 'A', form: { lyrics: { value: 'Mon texte', set(value) { this.value = value; dirty = true; } }, instrumental: { value: false, set() {} } } };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; dirty = true; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const imports = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': new Proxy({}, { get: (_, key) => key }), '@/components/ui/SynauraOverlay': { SynauraOverlay: 'overlay' }, './StudioTextLibrary': { default: 'library' } };
  const module = { exports: {} };
  imports['@/lib/studio/feedback'] = { feedbackFailure };
  imports['@/lib/studio/clientActivity'] = { startStudioActivity: () => 'test-request', reportStudioActivity() {} };
  const code = ts.transpileModule(readFileSync('components/ai-studio/StudioLyricsEditor.tsx', 'utf8'), { fileName: 'editor.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => { assert.ok(id in imports, id); return imports[id]; }, AbortController, DOMException, TypeError, Date, document: { visibilityState: 'hidden' }, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout: id => timers.delete(id), fetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })) });
  const render = () => { let guard = 0; while (dirty) { assert.ok(++guard < 20); dirty = false; cursor = 0; tree = module.exports.default({ studio }); const queued = effects; effects = []; queued.forEach(fn => fn()); } };
  const flatten = value => Array.isArray(value) ? value.flatMap(flatten) : value && typeof value === 'object' ? [value, ...flatten(value.props?.children)] : [];
  const byLabel = label => { const node = flatten(tree).find(item => item.props?.['aria-label'] === label); assert.ok(node, label); return node.props; };
  const byText = text => { const node = flatten(tree).find(item => item.type === 'button' && item.props.children === text); assert.ok(node, text); return node.props; };
  const flush = async () => { for (let i = 0; i < 10; i++) { await Promise.resolve(); render(); } };
  render();
  // This button has an icon + text; open through its aria-expanded toolbar control.
  flatten(tree).find(item => item.type === 'button' && item.props['aria-expanded'] === false).props.onClick(); render();
  flatten(tree).find(item => item.type === 'textarea' && item.props.maxLength === 200).props.onChange({ target: { value: 'Un refrain nocturne' } }); render();
  return { studio, requests, storage, timers, byLabel, byText, render, flush,
    async respond(index, body) { requests[index].resolve({ ok: true, status: 200, json: async () => body }); await flush(); },
    async tick() { const [id, timer] = [...timers].find(([, item]) => item.ms === 4000); timers.delete(id); timer.fn(); await flush(); },
    unmount() { slots.forEach(slot => slot.cleanup?.()); },
  };
}

test('lyrics assistant double-click submits once and never overwrites lyrics before Apply', async () => {
  const h = harness(); const submit = h.byLabel('Générer une proposition de paroles').onClick;
  submit(); submit(); assert.equal(h.requests.length, 1); assert.equal(h.requests[0].options.method, 'POST');
  await h.respond(0, { taskId: 'lyrics-A', variants: [{ text: 'Nouvelle proposition' }] });
  assert.equal(h.studio.form.lyrics.value, 'Mon texte');
  h.byText('Utiliser ces paroles').onClick(); h.render();
  assert.equal(h.studio.form.lyrics.value, 'Nouvelle proposition');
  h.byLabel('Annuler la modification des paroles').onClick(); h.render();
  assert.equal(h.studio.form.lyrics.value, 'Mon texte'); h.unmount();
});
test('pending lyrics resumes the same task using GET, including hidden-page polling stop', async () => {
  const h = harness(); h.byLabel('Générer une proposition de paroles').onClick();
  await h.respond(0, { taskId: 'lyrics-A', variants: [] }); await h.tick();
  h.byLabel('Vérifier les paroles en cours').onClick();
  assert.equal(h.requests.length, 2); assert.equal(h.requests[1].options.method, 'GET');
  assert.equal(h.requests[1].url, '/api/suno/generate-lyrics?taskId=lyrics-A'); h.unmount();
});
test('late lyrics response after unmount cannot write session storage or the draft', async () => {
  const h = harness(); h.byLabel('Générer une proposition de paroles').onClick(); h.unmount();
  assert.equal(h.requests[0].options.signal.aborted, true);
  await h.respond(0, { taskId: 'late-A', variants: [] });
  assert.equal(h.storage.size, 0); assert.equal(h.studio.form.lyrics.value, 'Mon texte');
});
