import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function motion({ preference, aura, reduced = false, saveData = false, hidden = false, denied = false } = {}) {
  const values = new Map([['synaura.living-motion.v1', preference], ['synaura.auraVisuals.enabled', aura]]);
  const exports = {};
  const listeners = new Map();
  const target = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  let cleanup;
  const code = ts.transpileModule(read('components/ambient/useLivingMotion.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: () => ({ useSyncExternalStore: (subscribe, snapshot) => { cleanup = subscribe(() => {}); return snapshot(); } }),
    window: { ...target, dispatchEvent: event => listeners.get(event.type)?.() },
    document: { ...target, hidden }, navigator: { connection: { ...target, saveData } },
    matchMedia: () => ({ ...target, matches: reduced }), Event: class { constructor(type) { this.type = type; } },
    localStorage: { getItem: key => { if (denied) throw Error('denied'); return values.get(key); }, setItem: (key, value) => values.set(key, value) },
  });
  const result = exports.useLivingMotion();
  return { result, values, cleanup, listeners };
}

test('ambient motion respects user pause, reduced motion, save-data and document visibility', () => {
  assert.equal(motion().result.enabled, true);
  for (const condition of [{ preference: 'off' }, { reduced: true }, { saveData: true }, { hidden: true }, { aura: '0' }]) {
    assert.equal(motion(condition).result.enabled, false, JSON.stringify(condition));
  }
  assert.equal(motion({ preference: 'on', reduced: true }).result.enabled, false);
  assert.equal(motion({ preference: 'on', aura: '0' }).result.enabled, true);
  assert.equal(motion({ denied: true }).result.enabled, true);
});

test('motion choice persists; listeners clean up on unmount', () => {
  const { result, values, cleanup, listeners } = motion();
  result.setEnabled(false);
  assert.equal(values.get('synaura.living-motion.v1'), 'off');
  result.setEnabled(true);
  assert.equal(values.get('synaura.living-motion.v1'), 'on');
  cleanup();
  assert.equal(listeners.size, 0);
});

test('entry and ambient presentation do not read business data or mutate audio/auth', () => {
  for (const file of ['components/ambient/LivingAmbience.tsx', 'components/enter/SynauraPresentation.tsx', 'components/enter/EntryFrame.tsx', 'components/enter/ProductScreens.tsx']) {
    const source = read(file);
    assert.doesNotMatch(source, /fetch\(|AudioContext|new Audio\(|useAudio|signIn\(|signOut\(|\/api\//, file);
  }
  const ambient = read('components/ambient/LivingAmbience.tsx');
  assert.match(ambient, /aria-hidden="true"/);
  assert.match(ambient, /pointerType === 'touch'/);
  assert.match(ambient, /cancelAnimationFrame\(frame\)/);
  assert.match(ambient, /removeEventListener\('pointermove'/);
  const slides = read('components/enter/SynauraPresentation.tsx');
  assert.match(slides, /slide.inert = index !== active/);
  assert.match(slides, /behavior: enabled \? 'smooth' : 'instant'/);
  assert.match(slides, /Passer la présentation/);
  assert.doesNotMatch(slides, /setInterval|setTimeout/);
});

test('real product captures are bounded local assets, labeled and accessible', () => {
  const gallery = read('components/enter/ProductScreens.tsx');
  for (const product of ['live', 'discover', 'studio']) {
    const path = `public/brand/product/${product}-desktop.webp`;
    assert.ok(statSync(new URL(`../${path}`, import.meta.url)).size < 180000);
    assert.match(gallery, new RegExp(`${product}-desktop\\.webp`));
  }
  assert.match(gallery, /données de démonstration/);
  assert.match(gallery, /loading="lazy"/);
  assert.match(gallery, /aria-pressed=\{active === screen.id\}/);
  assert.match(gallery, /SynauraOverlay open=\{expanded\}/);
});

test('styles retain keyboard access, narrow layouts and reduced-motion fallbacks', () => {
  const css = read('components/enter/entry-experience.css');
  const ambient = read('components/ambient/living-ambience.css');
  for (const source of [css, ambient]) assert.match(source, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /max-width:360px/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /data-in-view=false/);
  assert.match(ambient, /pointer-events: none/);
  assert.match(ambient, /body:has\(\[role=dialog\]\)/);
});

test('presentation is a separate horizontal route; the original home scene remains mounted', () => {
  const home = read('components/enter/PublicChamberEntry.tsx');
  assert.match(home, /ChamberProduct presentationHref="\/landing\/presentation"/);
  assert.doesNotMatch(home, /SynauraPresentation/);
  assert.match(read('app/landing/presentation/page.tsx'), /safeEntryTarget/);
  assert.match(read('components/enter/presentation-slides.css'), /scroll-snap-type:x mandatory/);
  assert.match(read('components/enter/presentation-slides.css'), /overflow-y:auto/);
  assert.match(read('components/enter/EnterSynaura.tsx'), /\/landing\/presentation\?intent=signup/);
  assert.match(read('app/auth/signin/page.tsx'), /\/landing\/presentation\?intent=signup&callbackUrl=/);
});
