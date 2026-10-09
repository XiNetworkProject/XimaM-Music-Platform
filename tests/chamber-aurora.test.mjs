import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';
const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

async function renderHarness({ enabled = true, paused = false, hidden = false, interactive = false } = {}) {
  const effects = [], frames = new Map(), states = [], disposed = [];
  let nextFrame = 0, refIndex = 0, renders = 0, ratio = 0;
  const events = () => ({ listeners: new Map(), addEventListener(k, v) { this.listeners.set(k, v); }, removeEventListener(k) { this.listeners.delete(k); } });
  const node = { ...events(), closest() { return this; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) };
  const canvas = events(), document = { ...events(), hidden };
  const react = { useRef: initial => ({ current: refIndex++ === 0 ? node : refIndex === 2 ? canvas : initial }), useState: initial => [initial, value => states.push(value)], useEffect: fn => effects.push(fn) };
  class Disposable { dispose() { disposed.push(this.constructor.name); } }
  class Vector2 { constructor(x = 0, y = 0) { this.set(x, y); } set(x, y) { this.x = x; this.y = y; return this; } lerp() { return this; } }
  const ripples = [];
  class Vector4 { constructor(...values) { this.values = values; ripples.push(this); } set(...values) { this.values = values; return this; } }
  class Element { constructor(control = false) { this.control = control; } closest() { return this.control ? {} : null; } }
  class WebGLRenderer extends Disposable { setPixelRatio(value) { ratio = value; } setSize() {} render() { renders++; } forceContextLoss() {} }
  class Texture extends Disposable {}
  const THREE = { WebGLRenderer, Vector2, Vector4, TextureLoader: class { async loadAsync() { return new Texture(); } }, ShaderMaterial: class extends Disposable {}, PlaneGeometry: class extends Disposable {}, Scene: class { add() {} }, Mesh: class {}, OrthographicCamera: class {}, SRGBColorSpace: 'srgb' };
  const intersections = [], resizes = [];
  class IntersectionObserver { constructor(callback) { this.callback = callback; intersections.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  class ResizeObserver { constructor(callback) { this.callback = callback; resizes.push(this); } observe() {} disconnect() { this.disconnected = true; } }
  const code = ts.transpileModule(read('components/celestial/AuroraBackdrop.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const mocks = { react, three: THREE, '@/components/ambient/useLivingMotion': { useLivingMotion: () => ({ enabled }) }, './auroraBackdropShader': {}, './aurora-backdrop.css': {} };
  new Function('require', 'exports', 'module', 'window', 'document', 'IntersectionObserver', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'Element', code)(
    name => name in mocks ? mocks[name] : require(name), module.exports, module, { devicePixelRatio: 3 }, document, IntersectionObserver, ResizeObserver,
    callback => { frames.set(++nextFrame, callback); return nextFrame; }, id => frames.delete(id), Element,
  );
  module.exports.default({ paused, interactive });
  const cleanups = effects.map(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  return {
    frames, states, document, node, intersections, resizes, disposed, ripples, Element,
    get renders() { return renders; }, get ratio() { return ratio; },
    tick(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); },
    cleanup() { cleanups.forEach(fn => fn?.()); },
  };
}

test('real backdrop runtime draws only one still frame when paused or motion-constrained', async () => {
  for (const options of [{ paused: true }, { enabled: false }]) {
    const h = await renderHarness(options);
    assert.ok(h.states.includes('webgl'));
    h.tick(100); h.tick(200);
    assert.equal(h.renders, 1); assert.equal(h.frames.size, 0); assert.equal(h.ratio, 1);
    h.cleanup();
  }
});

test('touch emits sky ripples, but controls, scrolling and disabled interactions do not', async () => {
  for (const scenario of [
    { interactive: true, expected: 1 },
    { interactive: true, control: true, expected: 0 },
    { interactive: true, drag: 40, expected: 0 },
    { interactive: true, paused: true, expected: 0 },
    { interactive: false, expected: 0 },
  ]) {
    const h = await renderHarness(scenario); h.tick(100);
    const event = { clientX: 250, clientY: 190, pointerId: 1, button: 0, isPrimary: true, target: new h.Element(scenario.control) };
    h.node.listeners.get('pointerdown')(event);
    h.node.listeners.get('pointerup')({ ...event, clientY: event.clientY + (scenario.drag || 0) });
    assert.equal(h.ripples.filter(r => r.values[2] >= 0).length, scenario.expected);
    h.cleanup();
  }
});

test('sky runtime throttles, stops while hidden/offscreen and releases all GPU resources', async () => {
  const h = await renderHarness();
  h.tick(100); h.tick(116); assert.equal(h.renders, 1);
  h.tick(150); assert.equal(h.renders, 2);
  h.document.hidden = true; h.document.listeners.get('visibilitychange')(); assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.document.listeners.get('visibilitychange')(); assert.equal(h.frames.size, 1);
  h.intersections[0].callback([{ isIntersecting: false }]); assert.equal(h.frames.size, 0);
  h.intersections[0].callback([{ isIntersecting: true }]); assert.equal(h.frames.size, 1);
  h.cleanup();
  assert.equal(h.frames.size, 0); assert.equal(h.disposed.length, 4);
  assert.equal(h.intersections[0].disconnected, true); assert.equal(h.resizes[0].disconnected, true);
  assert.equal(h.node.listeners.size, 0); assert.equal(h.document.listeners.size, 0);
});

test('public sky replaces the sculpture but keeps pulse controls, chapters and independent presentation', () => {
  const home = read('components/enter/PublicChamberEntry.tsx'), chamber = read('components/chamber/ChamberProduct.tsx');
  assert.match(home, /ChamberProduct presentationHref="\/landing\/presentation" celestial/);
  assert.match(chamber, /celestial = false/);
  assert.match(chamber, /<ChamberMaterial progress=\{progress\} paused=\{paused\}/);
  assert.match(chamber, /!celestial && <ChamberMaterial/);
  assert.match(chamber, /<AuroraBackdrop paused=\{paused \|\| listening\} pulse=\{pulse\}/);
  assert.doesNotMatch(read('components/celestial/AuroraBackdrop.tsx'), /fetch\(|new Audio|AudioContext|preventDefault|setInterval|\/api\//);
  assert.match(read('components/celestial/auroraBackdropShader.ts'), /smoothstep\(\.635, \.76, uv.y\)/);
  const sky = read('components/celestial/AuroraBackdrop.tsx');
  assert.match(sky, /Math.hypot\(e.clientX - start.x, e.clientY - start.y\) > 10/);
  assert.match(sky, /isControl\(e.target\)/);
  assert.match(sky, /pointercancel', cancel/);
  for (const file of ['components/chamber/chamber-celestial.css', 'components/celestial/aurora-backdrop.css']) assert.doesNotThrow(() => postcss.parse(read(file)));
});
