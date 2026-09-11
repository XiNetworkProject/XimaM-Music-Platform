import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CONTEXT_SURFACE_HISTORY_KEY,
  MAX_CONTEXT_SURFACE_DEPTH,
  closeTopContextSurface,
  createContextSurfaceEntry,
  getContextSurfaceCanonicalHref,
  getContextSurfaceUrlPolicy,
  pushContextSurface,
  readContextSurfaceHistory,
  reconcileContextSurfaceHistory,
  replaceContextSurface,
  resolveContextSurfacePresentation,
  withContextSurfaceHistory,
} from '../lib/contextSurfaces.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

let keyIndex = 0;
const entry = (overrides = {}) => createContextSurfaceEntry({
  surface: 'context-surface-demo',
  entityType: 'demo',
  entityId: 'one',
  origin: 'live',
  presentation: 'auto',
  returnSnapshotId: 'live-snapshot-1',
  ...overrides,
}, () => `history-${++keyIndex}`);

test('open, replace et close conservent une pile minimale', () => {
  const first = entry();
  const opened = pushContextSurface([], first);
  assert.equal(opened.mode, 'push');
  assert.deepEqual(opened.stack, [first]);

  const replacement = entry({ entityId: 'replacement' });
  const replaced = replaceContextSurface(opened.stack, replacement);
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].entityId, 'replacement');
  assert.deepEqual(closeTopContextSurface(replaced), []);
});

test('une ouverture identique remplace au lieu de créer une boucle Back', () => {
  const first = entry();
  const duplicate = entry();
  const result = pushContextSurface([first], duplicate);
  assert.equal(result.mode, 'replace');
  assert.deepEqual(result.stack, [duplicate]);
});

test('la profondeur est bornée et une surface justifiée revient niveau par niveau', () => {
  const first = entry({ entityId: 'first' });
  const second = entry({ entityId: 'second', entityType: 'comments' });
  const third = entry({ entityId: 'third', entityType: 'track' });
  const fourth = entry({ entityId: 'fourth', entityType: 'lyrics' });
  const stack = [first, second, third];
  const bounded = pushContextSurface(stack, fourth);
  assert.equal(MAX_CONTEXT_SURFACE_DEPTH, 3);
  assert.equal(bounded.mode, 'replace');
  assert.deepEqual(bounded.stack.map((item) => item.entityId), ['first', 'second', 'fourth']);

  const priorState = withContextSurfaceHistory({ __NA: true }, [first, second], '/live');
  const back = reconcileContextSurfaceHistory(stack, priorState, '/live');
  assert.deepEqual(back.stack, [first, second]);
  assert.deepEqual(back.closed, [third]);
});

test('history.state Next est préservé et le marqueur reste borné', () => {
  const first = entry();
  const state = withContextSurfaceHistory({ __NA: true, tree: ['next'] }, [first], '/live');
  assert.equal(state.__NA, true);
  assert.deepEqual(state.tree, ['next']);
  assert.equal(state[CONTEXT_SURFACE_HISTORY_KEY].backgroundPath, '/live');
  assert.deepEqual(readContextSurfaceHistory(state)?.stack, [first]);
  assert.equal(CONTEXT_SURFACE_HISTORY_KEY in withContextSurfaceHistory(state, [], '/live'), false);
});

test('Back ferme la surface avant de quitter le background', () => {
  const first = entry();
  const state = withContextSurfaceHistory({}, [first], '/live');
  assert.deepEqual(reconcileContextSurfaceHistory([first], {}, '/live'), { stack: [], closed: [first] });
  assert.deepEqual(reconcileContextSurfaceHistory([first], state, '/discover'), { stack: [], closed: [first] });
});

test('un history.state stale ou mal formé est ignoré sans crash', () => {
  const stale = { [CONTEXT_SURFACE_HISTORY_KEY]: { version: 1, backgroundPath: '/live', stack: [{ surface: '' }] } };
  assert.equal(readContextSurfaceHistory(stale), null);
  assert.deepEqual(reconcileContextSurfaceHistory([], stale, '/live'), { stack: [], closed: [] });
});

test('les présentations responsive respectent sheet mobile et drawer desktop', () => {
  assert.equal(resolveContextSurfacePresentation('auto', 390), 'sheet');
  assert.equal(resolveContextSurfacePresentation('auto', 767), 'sheet');
  assert.equal(resolveContextSurfacePresentation('auto', 768), 'drawer-right');
  assert.equal(resolveContextSurfacePresentation('auto', 1440), 'drawer-right');
  assert.equal(resolveContextSurfacePresentation('modal', 390), 'modal');
});

test('les routes canoniques partageables restent indépendantes de la surface', () => {
  const profile = entry({ entityType: 'profile', entityId: 'test2' });
  assert.equal(getContextSurfaceUrlPolicy(profile), 'canonical-route');
  assert.equal(getContextSurfaceCanonicalHref(profile), '/profile/test2');
  assert.equal(getContextSurfaceCanonicalHref(entry({ entityType: 'demo', entityId: 'test' })), null);
  assert.equal(getContextSurfaceUrlPolicy(entry({ entityType: 'demo', entityId: 'test' })), 'transient');
});

test('le host utilise exclusivement SynauraOverlay et ne pousse aucune route Next', async () => {
  const controller = await read('components/context-surfaces/ContextSurfaceController.tsx');
  assert.match(controller, /<SynauraOverlay/);
  assert.match(controller, /history=\{false\}/);
  assert.match(controller, /window\.history\.pushState/);
  assert.doesNotMatch(controller, /router\.(?:push|replace)/);
  assert.doesNotMatch(controller, /backdrop|bg-black\/60/);
});

test('Escape, focus trap, restore focus, scroll lock et reduced motion restent canoniques', async () => {
  const overlay = await read('components/ui/SynauraOverlay.tsx');
  const controller = await read('components/context-surfaces/ContextSurfaceController.tsx');
  assert.match(overlay, /event\.key === 'Escape'/);
  assert.match(overlay, /event\.key !== 'Tab'/);
  assert.match(overlay, /restoreFocusRef\.current\?\.focus/);
  assert.match(overlay, /useReducedMotion/);
  assert.match(overlay, /\[data-testid="synaura-scroll-feed"\]/);
  assert.match(controller, /data-context-surface-trigger-key/);
  assert.match(controller, /data-testid="synaura-scroll-feed"/);
});

test('la largeur desktop et la safe area mobile sont encodées dans la primitive canonique', async () => {
  const overlay = await read('components/ui/SynauraOverlay.tsx');
  assert.match(overlay, /context-responsive/);
  assert.match(overlay, /clamp\(23\.75rem,30vw,30rem\)/);
  assert.match(overlay, /env\(safe-area-inset-bottom\)/);
  assert.match(overlay, /md:items-stretch md:justify-end/);
});

test('Live reste monté et son activeItemId n’est pas muté par le contrôleur', async () => {
  const layout = await read('app/layout.tsx');
  const controller = await read('components/context-surfaces/ContextSurfaceController.tsx');
  const live = await read('components/home/SynauraScroll.tsx');
  assert.match(layout, /<ContextSurfaceProvider>/);
  assert.match(live, /data-context-surface-origin="live"/);
  assert.doesNotMatch(controller, /activeItemId|setActiveIndex|scrollTo/);
  assert.doesNotMatch(controller, /liveContinuity|saveLiveContinuitySnapshot/);
});

test('ouvrir, fermer ou remplacer ne connaît aucune commande AudioCore', async () => {
  const controller = await read('components/context-surfaces/ContextSurfaceController.tsx');
  const core = await read('lib/audio/AudioCore.ts');
  assert.ok(core.length > 0);
  assert.doesNotMatch(controller, /AudioCore|useAudioPlayer|setQueue|play\(|pause\(|seek\(/);
});

test('la démo reste confinée à la route dev non disponible en production', async () => {
  const page = await read('app/dev/ui/page.tsx');
  const lab = await read('app/dev/ui/ComponentLab.tsx');
  assert.match(page, /process\.env\.NODE_ENV === 'production'/);
  assert.match(page, /notFound\(\)/);
  assert.match(lab, /context-surface-demo/);
  assert.doesNotMatch(lab, /ProfilePeek|CommentsPanel/);
});
