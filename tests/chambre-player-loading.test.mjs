import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { alignExpandedPlayerQueue } from '../lib/playerOpening.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../components/TikTokPlayer.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('TikTokPlayer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const effects = [];
let reducer;
let initial;
function collect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
      && node.arguments[0]?.getText(tree).includes('await fetchFeedChunk(feedMode, 0, feedSeedGenre)')) effects.push(node.arguments[0]);
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'feedReducer') reducer = node;
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'feedInitial') initial = node.initializer;
  ts.forEachChild(node, collect);
}
collect(tree);
assert.equal(effects.length, 1, 'exactly the real initial feed effect must be exercised');
assert.ok(reducer && initial, 'use the real reducer rather than copying its behavior');
const effectScript = ts.transpileModule(`
  const feedInitial = ${initial.getText(tree)};
  ${reducer.getText(tree)}
  globalThis.actualEffect = ${effects[0].getText(tree)};
  globalThis.actualReducer = feedReducer;
  globalThis.initialState = feedInitial;
`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

const track = id => ({ _id: id, title: id, artist: { name: 'Artist' }, audioUrl: `/${id}.mp3` });
const chunk = ids => ({ tracks: ids.map(track), nextCursor: ids.length, hasMore: false });
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness() {
  const pending = [];
  const actions = [];
  const controls = [];
  const active = track('A');
  const ref = value => ({ current: value });
  const ctx = {
    isOpen: true, feedMode: 'reco', feedSeedGenre: 'Pop', initialTrackId: 'A',
    openSeedIdRef: ref('A'), openedTrackIdRef: ref('A'), feedLoadedRef: ref(''),
    loadRequestRef: ref(0), didBootRef: ref(false), bootingRef: ref(false), suppressAutoplayRef: ref(false),
    prevQueueRef: ref({ tracks: [active], currentTrackIndex: 0 }),
    audioState: { tracks: [active], currentTrackIndex: 0 },
    setCommentsOpen() {}, setShareOpen() {}, setShowQueue() {}, setLyricsOpen() {},
    fetchFeedChunk(...args) {
      return new Promise((resolve, reject) => pending.push({ args, resolve, reject }));
    },
    insertRadioTracks: tracks => tracks,
    trackId: t => t?._id || '',
    alignExpandedPlayerQueue,
    setQueueOnly: (...args) => controls.push({ kind: 'queue-only', args }),
    setQueueAndPlay: (...args) => controls.push({ kind: 'play', args }),
    requestAnimationFrame: callback => { callback(); return 1; },
    scrollSnap: { scrollTo() {} },
    window: { setTimeout: callback => { callback(); return 1; } },
    dispatch(action) { actions.push(action); ctx.state = ctx.actualReducer(ctx.state, action); },
  };
  runInNewContext(effectScript, ctx);
  ctx.state = ctx.initialState;
  return { ctx, pending, actions, controls, setup: () => ctx.actualEffect() };
}

test('actual player effect survives StrictMode setup-cleanup-setup and ignores the stale first success', async () => {
  const h = harness();
  const firstCleanup = h.setup();
  assert.equal(h.ctx.state.loading, true);
  firstCleanup();
  assert.equal(h.ctx.feedLoadedRef.current, '');
  const secondCleanup = h.setup();
  assert.equal(h.pending.length, 2);
  h.pending[0].resolve(chunk(['OLD']));
  await flush();
  assert.equal(h.ctx.state.loading, true);
  assert.equal(h.controls.length, 0, 'an abandoned request must never align or play');
  assert.equal(h.actions.filter(a => a.type === 'LOAD_SUCCESS').length, 0);
  h.pending[1].resolve(chunk(['A','B']));
  await flush();
  assert.equal(h.ctx.state.loading, false);
  assert.deepEqual(Array.from(h.ctx.state.tracks, t => t._id), ['A','B']);
  assert.deepEqual(h.controls.map(c => c.kind), ['queue-only']);
  assert.equal(h.actions.filter(a => a.type === 'LOAD_SUCCESS').length, 1);
  secondCleanup();
  assert.equal(h.ctx.feedLoadedRef.current, 'reco:Pop:A', 'completed response retains the existing cache key');
});

test('actual settled effect retains its warm feed across hidden-close and reopen without a new request', async () => {
  const h = harness();
  const cleanup = h.setup();
  h.pending[0].resolve(chunk(['A','B']));
  await flush();
  const warmState = h.ctx.state;
  cleanup();
  h.ctx.isOpen = false;
  assert.equal(h.setup(), undefined);
  h.ctx.isOpen = true;
  assert.equal(h.setup(), undefined);
  assert.equal(h.pending.length, 1);
  assert.equal(h.ctx.state, warmState);
  assert.equal(h.ctx.state.loading, false);
  assert.equal(h.controls.length, 1);
});

test('actual pending cleanup cannot erase the key owned by a newer request', async () => {
  const h = harness();
  const oldCleanup = h.setup();
  h.ctx.feedSeedGenre = 'Disco';
  const currentCleanup = h.setup();
  oldCleanup();
  assert.equal(h.ctx.feedLoadedRef.current, 'reco:Disco:A');
  h.pending[0].reject(new Error('old request failed'));
  await flush();
  assert.equal(h.actions.filter(a => a.type === 'LOAD_FAIL').length, 0);
  assert.equal(h.ctx.state.loading, true);
  h.pending[1].resolve(chunk(['A','C']));
  await flush();
  assert.equal(h.ctx.state.loading, false);
  assert.deepEqual(Array.from(h.ctx.state.tracks, t => t._id), ['A','C']);
  currentCleanup();
  assert.equal(h.ctx.feedLoadedRef.current, 'reco:Disco:A');
});

test('actual active request failure settles loading while abandoned failure stays ignored', async () => {
  const h = harness();
  h.setup()();
  const cleanup = h.setup();
  h.pending[0].reject(new Error('abandoned'));
  await flush();
  assert.equal(h.ctx.state.loading, true);
  h.pending[1].reject(new Error('active'));
  await flush();
  assert.equal(h.ctx.state.loading, false);
  assert.equal(h.actions.filter(a => a.type === 'LOAD_FAIL').length, 1);
  assert.equal(h.controls.length, 0);
  cleanup();
  assert.equal(h.ctx.feedLoadedRef.current, 'reco:Pop:A', 'existing completed-error caching policy is not changed by this fix');
});

test('actual success before unmount remains warm and a fresh component instance loads normally', async () => {
  const first = harness();
  const cleanup = first.setup();
  first.pending[0].resolve(chunk(['A']));
  await flush();
  cleanup();
  assert.equal(first.ctx.state.loading, false);
  assert.equal(first.controls.length, 0, 'equivalent existing queue stays untouched');
  const reopened = harness();
  reopened.setup();
  assert.equal(reopened.pending.length, 1, 'unmount/remount intentionally owns fresh component refs');
  reopened.pending[0].resolve(chunk(['A']));
  await flush();
  assert.equal(reopened.ctx.state.loading, false);
  assert.equal(reopened.controls.length, 0);
});

test('actual late stale response cannot replace a completed replay or clear its warm key', async () => {
  const h = harness();
  const abandonedCleanup = h.setup();
  abandonedCleanup();
  h.setup();
  h.pending[1].resolve(chunk(['A','CURRENT']));
  await flush();
  h.pending[0].resolve(chunk(['STALE']));
  await flush();
  abandonedCleanup();
  assert.deepEqual(Array.from(h.ctx.state.tracks, t => t._id), ['A','CURRENT']);
  assert.equal(h.ctx.feedLoadedRef.current, 'reco:Pop:A');
  assert.equal(h.ctx.state.loading, false);
  assert.deepEqual(h.controls.map(c => c.kind), ['queue-only']);
});
