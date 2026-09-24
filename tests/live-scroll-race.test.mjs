import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../components/home/SynauraScroll.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('SynauraScroll.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const hook = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'useFeedScrollSnap');
assert.ok(hook, 'exercise the actual Live scroll hook');
const script = ts.transpileModule(`${hook.getText(tree)}; globalThis.hook = useFeedScrollSnap;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function harness() {
  let cursor = 0, now = 0, timerId = 0, output;
  const slots = [], effects = [], timers = new Map(), navigations = [];
  const el = new EventTarget();
  Object.assign(el, { scrollTop: 0, clientHeight: 800, scrollHeight: 3200, scrollTo({ top }) { this.target = top; } });
  const win = new EventTarget();
  Object.assign(win, { innerHeight: 800, onscrollend: null });
  const options = {
    pilot: true, itemCount: 4, activeIndex: 0, locked: false, ready: true,
    onTogglePlay() {}, onNavigate(index, source) { navigations.push({ index, source }); },
  };
  const ctx = {
    window: win, WHEEL_LOCK_MS: 260, SNAP_SETTLE_MS: 90,
    clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)),
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, j) => !Object.is(dep, slots[i].deps[j]))) {
        effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  runInNewContext(script, ctx);
  const render = changes => {
    Object.assign(options, changes);
    cursor = 0;
    output = ctx.hook(options);
    output.containerRef.current = el;
    output.itemRefs.current = [0, 800, 1600, 2400].map(offsetTop => ({ offsetTop, offsetHeight: 800 }));
    effects.splice(0).forEach(fn => fn());
    return output;
  };
  render();
  return {
    el, win, navigations, render, get hook() { return output; },
    tick(ms) {
      const end = now + ms;
      while (true) {
        const pending = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!pending) break;
        now = pending[1].at; timers.delete(pending[0]); pending[1].fn();
      }
      now = end;
    },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('a pending native scroll callback cannot take back an automatic track advance', () => {
  const h = harness();
  h.el.scrollTop = 810; h.hook.onScroll();
  h.hook.scrollTo(2); h.render({ activeIndex: 2 });
  h.tick(100);
  assert.deepEqual(h.navigations, []);
});

test('intermediate scrollend does not select the old track during programmatic advance', () => {
  const h = harness();
  h.hook.scrollTo(1); h.render({ activeIndex: 1 });
  h.el.scrollTop = 250; h.el.dispatchEvent(new Event('scrollend'));
  assert.deepEqual(h.navigations, []);
  h.el.scrollTop = 800; h.hook.onScroll(); h.el.dispatchEvent(new Event('scrollend'));
  assert.deepEqual(h.navigations, []);
});

test('a slow smooth scroll stays protected beyond 500 ms and an earlier transition cannot unlock it', () => {
  const h = harness();
  h.hook.scrollTo(1); h.render({ activeIndex: 1 }); h.tick(300);
  h.hook.scrollTo(2); h.render({ activeIndex: 2 }); h.tick(900);
  h.el.scrollTop = 900; h.hook.onScroll(); h.tick(100);
  h.el.dispatchEvent(new Event('scrollend'));
  assert.deepEqual(h.navigations, []);
});

test('a new touch interrupts the pending target and still permits a genuine swipe', () => {
  const h = harness();
  h.hook.scrollTo(2); h.render({ activeIndex: 2 });
  h.hook.onTouchStart(); h.el.scrollTop = 800; h.hook.onTouchEnd(); h.tick(100);
  assert.deepEqual(h.navigations.map(n => n.index), [1]);
});

test('an immediate reversal cancels the browser animation even before the first scroll frame', () => {
  const h = harness();
  h.hook.scrollTo(1); h.render({ activeIndex: 1 });
  h.hook.scrollTo(0); h.render({ activeIndex: 0 });
  assert.equal(h.el.target, 0, 'the old smooth animation must actually be stopped');
  h.el.dispatchEvent(new Event('scrollend')); h.tick(100);
  assert.deepEqual(h.navigations, []);
});

test('opening a surface cancels a queued native selection; locked touchend does not stick', () => {
  const h = harness();
  h.el.scrollTop = 800; h.hook.onScroll(); h.render({ locked: true }); h.tick(100);
  assert.deepEqual(h.navigations, []);
  h.hook.onTouchStart(); h.hook.onTouchEnd(); h.render({ locked: false });
  h.hook.onScroll(); h.tick(100);
  assert.deepEqual(h.navigations.map(n => n.index), [1]);
});

test('unmount cancels pending selection and a reached target permits subsequent native scrolling', () => {
  const h = harness();
  h.hook.scrollTo(1); h.render({ activeIndex: 1 });
  h.el.scrollTop = 800; h.hook.onScroll(); h.tick(100);
  h.el.scrollTop = 1600; h.hook.onScroll(); h.tick(100);
  assert.deepEqual(h.navigations.map(n => n.index), [2]);
  h.el.scrollTop = 2400; h.hook.onScroll(); h.dispose(); h.tick(100);
  assert.equal(h.navigations.length, 1);
});
