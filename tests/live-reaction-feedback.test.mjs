import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';
import { reviewedPilotV1 } from './helpers/reviewed-pilot-v1.mjs';

const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Live metadata has no nested scroll at any breakpoint; artwork and audio bindings are untouched', () => {
  const css = postcss.parse(read('components/v2/experience-live-navigation.css'));
  let count = 0;
  css.walkRules('.synaura-chambre .experience-live .v2-live-track-copy', rule => {
    count++;
    for (const node of rule.nodes) {
      if (node.prop === 'max-height') assert.equal(node.value, 'none');
      if (node.prop === 'overflow') assert.equal(node.value, 'visible');
    }
  });
  assert.equal(count, 5);
  const source = reviewedPilotV1('components/home/SynauraScroll.tsx', read('components/home/SynauraScroll.tsx'));
  const before = read('artifacts/live-reactions/before/components/home/SynauraScroll.tsx');
  const normalize = s => s.replace(/\s+celebrate\s+(?=open=)/, '\n                          ')
    .replace('live-moment-actions relative mt-2', 'mt-2').replaceAll('\r\n', '\n');
  assert.equal(normalize(source), normalize(before));
});

test('emoji bursts are bounded, expire and cancel all timers on unmount', () => {
  let state = [], refCursor = 0, timerId = 0;
  const refs = [], timers = new Map(), cleanups = [];
  const mocks = {
    react: {
      useState: initial => [state, update => { state = typeof update === 'function' ? update(state) : update; }],
      useRef: initial => refs[refCursor++] ?? (refs[refCursor - 1] = { current: initial }),
      useEffect: effect => { if (!cleanups.length) cleanups.push(effect()); },
    },
    'react-dom': { createPortal: value => value },
    '@/lib/momentReactions': { MOMENT_REACTION_META: {} },
    './LiveReactionBurst.module.css': {},
  };
  const module = { exports: {} };
  const compiled = ts.transpileModule(read('components/player/LiveReactionBurst.tsx'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', compiled)(
    id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), module, module.exports,
    (callback, delay) => { assert.equal(delay, 2800); timers.set(++timerId, callback); return timerId; },
    id => timers.delete(id),
  );
  const render = () => { refCursor = 0; return module.exports.useLiveReactionBurst(); };
  for (let i = 0; i < 40; i++) render().emit(i % 2 ? 'favorite' : 'drop');
  assert.equal(state.length, 4);
  assert.equal(timers.size, 4);
  assert.deepEqual(state.map(burst => burst.type), ['drop', 'favorite', 'drop', 'favorite']);
  for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
  assert.equal(render().layer, null);
  render().emit('vocals');
  assert.equal(timers.size, 1);
  cleanups[0]();
  assert.equal(timers.size, 0);
});

test('one choice calls the existing callback once, with decorative non-interactive and reduced-motion feedback', () => {
  const picker = read('components/player/ReactionPicker.tsx');
  assert.match(picker, /if \(celebrate\) burst\.emit\(type\);\s+onPick\(type\);/);
  assert.equal((picker.match(/onPick\(type\)/g) || []).length, 1);
  const burst = read('components/player/LiveReactionBurst.tsx');
  assert.match(burst, /aria-hidden="true"/);
  assert.doesNotMatch(burst, /fetch\(|new Audio|localStorage|sessionStorage|setInterval/);
  const css = postcss.parse(read('components/player/LiveReactionBurst.module.css'));
  assert.match(css.toString(), /pointer-events: none/);
  assert.doesNotMatch(css.toString(), /infinite/);
  const reduced = css.nodes.find(node => node.type === 'atrule' && node.params === '(prefers-reduced-motion: reduce)');
  assert.ok(reduced);
  assert.doesNotMatch(reduced.toString(), /translate|scale\(/);
  assert.match(read('app/dev/live-reactions/page.tsx'), /NODE_ENV === 'production'\) notFound\(\)/);
  assert.doesNotMatch(read('app/dev/live-reactions/ReactionLab.tsx'), /fetch\(|\.post\(/);
});
