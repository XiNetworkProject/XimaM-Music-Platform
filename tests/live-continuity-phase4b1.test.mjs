import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  LIVE_HISTORY_STATE_KEY,
  LIVE_SNAPSHOT_LIMIT,
  LIVE_SNAPSHOT_TTL_MS,
  attachLiveSnapshotToHistory,
  createLiveSnapshotId,
  liveDraftStorageKey,
  loadLiveDraft,
  loadLiveNavigationContext,
  makeLiveNavigationSnapshot,
  mergeLiveFeedOrder,
  saveLiveDraft,
  saveLiveNavigationContext,
} from '../lib/liveContinuity.ts';
import { shouldRenderGlobalMiniPlayer } from '../lib/routeChrome.ts';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');

class MemoryStorage {
  #values = new Map();

  get length() { return this.#values.size; }
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
  key(index) { return [...this.#values.keys()][index] ?? null; }
}

const items = [
  { id: 'track:a', type: 'track', track: { _id: 'a' } },
  { id: 'post:b', type: 'post', post: { id: 'b' } },
  { id: 'clip:c', type: 'clip', clip: { id: 'c' }, track: { _id: 'a' } },
  { id: 'track:d', type: 'track', track: { _id: 'd' } },
];

function snapshot(overrides = {}, now = 1_800_000_000_000) {
  const snapshotId = overrides.snapshotId || createLiveSnapshotId(now);
  return makeLiveNavigationSnapshot({
    snapshotId,
    historyKey: 'next-history-key',
    feedMode: 'synaura-scroll',
    filter: 'clips',
    exactItemOrder: items.map((item) => item.id),
    activeItemId: 'clip:c',
    scrollOffsetWithinItem: 17,
    cursors: { tracks: 52 },
    hasMore: { tracks: true },
    frozenSeenBoundary: 2,
    source: { sourceTrackId: 'a', clipId: 'c' },
    draftRefs: [],
    contextSurface: 'feed',
    ...overrides,
  }, now);
}

test('snapshot save/restore conserve ancre, filtre, curseur et ordre hybride', () => {
  const storage = new MemoryStorage();
  const saved = snapshot();
  saveLiveNavigationContext(storage, saved, items);

  const restored = loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: saved.snapshotId }, storage, saved.savedAt + 10);
  assert.equal(restored.status, 'success');
  assert.equal(restored.snapshot?.activeItemId, 'clip:c');
  assert.equal(restored.snapshot?.filter, 'clips');
  assert.deepEqual(restored.snapshot?.cursors, { tracks: 52 });
  assert.deepEqual(restored.snapshot?.hasMore, { tracks: true });
  assert.deepEqual(restored.snapshot?.exactItemOrder, ['track:a', 'post:b', 'clip:c', 'track:d']);
  assert.deepEqual(restored.feed?.items.map((item) => item.type), ['track', 'post', 'clip', 'track']);
});

test('tous les filtres Live exposés se restaurent sur la même entrée', () => {
  for (const filter of ['foryou', 'new', 'clips', 'creators', 'challenges']) {
    const storage = new MemoryStorage();
    const saved = snapshot({ snapshotId: `live-filter-${filter}`, filter });
    saveLiveNavigationContext(storage, saved, items);
    assert.equal(
      loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: saved.snapshotId }, storage, saved.savedAt + 1).snapshot?.filter,
      filter,
    );
  }
});

test('la reconstruction gèle la partie vue et ajoute seulement le tail frais', () => {
  const saved = snapshot();
  const cached = [items[0], items[1], items[2], items[3]];
  const fresh = [
    { id: 'track:d', type: 'track', track: { _id: 'd', title: 'fresh entity' } },
    { id: 'track:e', type: 'track', track: { _id: 'e' } },
    { id: 'post:f', type: 'post', post: { id: 'f' } },
  ];
  const merged = mergeLiveFeedOrder(saved, cached, fresh);
  assert.deepEqual(merged.map((item) => item.id), ['track:a', 'post:b', 'clip:c', 'track:d', 'track:e', 'post:f']);
  assert.equal(merged.find((item) => item.id === 'track:d')?.track.title, 'fresh entity', 'seul le préfixe déjà vu reste gelé');
  assert.equal(merged.findIndex((item) => item.id === saved.activeItemId), 2, 'l’ancre est retrouvée par ID');
});

test('snapshot expiré ou historique sans association produit un miss sans crash', () => {
  const storage = new MemoryStorage();
  const saved = snapshot();
  saveLiveNavigationContext(storage, saved, items);
  assert.equal(loadLiveNavigationContext({}, storage, saved.savedAt + 1).status, 'miss');
  const stale = loadLiveNavigationContext(
    { [LIVE_HISTORY_STATE_KEY]: saved.snapshotId },
    storage,
    saved.savedAt + LIVE_SNAPSHOT_TTL_MS + 1,
  );
  assert.deepEqual({ status: stale.status, snapshot: stale.snapshot, feed: stale.feed }, { status: 'miss', snapshot: null, feed: null });
});

test('snapshot incomplet produit un miss propre', () => {
  const storage = new MemoryStorage();
  storage.setItem('synaura.live.continuity.snapshot.v1:live-incomplete', JSON.stringify({
    version: 1,
    snapshotId: 'live-incomplete',
    expiresAt: Date.now() + 60_000,
  }));
  const restored = loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: 'live-incomplete' }, storage);
  assert.equal(restored.status, 'miss');
  assert.equal(restored.reason, 'snapshot-stale-or-invalid');
});

test('cache incomplet produit un restore-partial et permet le fallback réseau', () => {
  const storage = new MemoryStorage();
  const saved = snapshot();
  saveLiveNavigationContext(storage, saved, items.filter((item) => item.id !== 'clip:c'));
  const restored = loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: saved.snapshotId }, storage, saved.savedAt + 2);
  assert.equal(restored.status, 'partial');
  assert.equal(restored.reason, 'cached-anchor-or-seen-item-missing');
  assert.equal(restored.snapshot?.activeItemId, 'clip:c');
});

test('un sessionStorage indisponible ne bloque ni navigation ni fallback mémoire', () => {
  const blocked = {
    get length() { throw new Error('blocked'); },
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('blocked'); },
    key() { throw new Error('blocked'); },
  };
  const saved = snapshot({ snapshotId: 'live-storage-blocked' });
  assert.doesNotThrow(() => saveLiveNavigationContext(blocked, saved, items));
  assert.equal(loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: saved.snapshotId }, blocked, saved.savedAt + 1).status, 'success');
});

test('history.state conserve l’état Next et reçoit une seule association Live', () => {
  let state = { __NA: true, key: 'next-key', tree: ['live'] };
  let calls = 0;
  const history = {
    get state() { return state; },
    replaceState(next) { state = next; calls += 1; },
  };
  attachLiveSnapshotToHistory(history, 'live-snapshot');
  attachLiveSnapshotToHistory(history, 'live-snapshot');
  assert.deepEqual(state, { __NA: true, key: 'next-key', tree: ['live'], [LIVE_HISTORY_STATE_KEY]: 'live-snapshot' });
  assert.equal(calls, 1);
});

test('route puis Back retrouve le snapshot de l’entrée Live, pas celui de la route', () => {
  const storage = new MemoryStorage();
  const saved = snapshot({ snapshotId: 'live-route-back' });
  saveLiveNavigationContext(storage, saved, items);
  const entries = [{ key: 'live-entry', [LIVE_HISTORY_STATE_KEY]: saved.snapshotId }, { key: 'track-entry' }];
  let cursor = 1;
  cursor -= 1;
  const restored = loadLiveNavigationContext(entries[cursor], storage, saved.savedAt + 4);
  assert.equal(restored.status, 'success');
  assert.equal(restored.snapshot?.activeItemId, 'clip:c');
});

test('les snapshots de session sont bornés', () => {
  const storage = new MemoryStorage();
  for (let index = 0; index < LIVE_SNAPSHOT_LIMIT + 3; index += 1) {
    const saved = snapshot({ snapshotId: `live-bounded-${index}` }, 1_800_000_000_000 + index);
    saveLiveNavigationContext(storage, saved, items);
  }
  assert.equal(storage.length, LIVE_SNAPSHOT_LIMIT * 2, 'chaque snapshot retenu possède un snapshot et un cache feed');
  const oldest = loadLiveNavigationContext({ [LIVE_HISTORY_STATE_KEY]: 'live-bounded-0' }, storage, 1_800_000_000_100);
  assert.equal(oldest.status, 'miss');
});

test('draft minimal est cloisonné par utilisateur et contexte', () => {
  const storage = new MemoryStorage();
  const key = liveDraftStorageKey('user:1', 'track', 'track/7');
  saveLiveDraft(storage, {
    version: 1,
    savedAt: Date.now(),
    userId: 'user:1',
    entityType: 'track',
    entityId: 'track/7',
    text: 'brouillon',
    timestampSeconds: 83,
  });
  assert.equal(loadLiveDraft(storage, key, 'user:1')?.timestampSeconds, 83);
  assert.equal(loadLiveDraft(storage, key, 'user:2'), null);
});

test('le composant restaure avant autoplay sans toucher à AudioCore', async () => {
  const source = await read('components/home/SynauraScroll.tsx');
  assert.match(source, /if \(!continuityReady\)[\s\S]{0,180}Restauration de Live/);
  assert.match(source, /findIndex\(\(item\) => item\.id === restoredSnapshot\.activeItemId\)/);
  assert.match(source, /scrollSnap\.scrollTo\(anchorIndex, 'auto'\)/);
  assert.match(source, /suppressRestoredAutoplayRef\.current/);
  assert.match(source, /if \(!continuitySettled \|\| suppressRestoredAutoplayRef\.current/);
  assert.match(source, /if \(!continuitySettled \|\| !needsTrackFetch/);

  const restoreStart = source.indexOf('const anchorIndex = feedItems.findIndex');
  const restoreEnd = source.indexOf('const persistLiveSnapshot', restoreStart);
  const restorePath = source.slice(restoreStart, restoreEnd);
  assert.doesNotMatch(restorePath, /setQueueAndPlay|playIndex\(/, 'la restauration ne reconstruit ni ne lance la queue');

  const audioCore = await read('lib/audio/AudioCore.ts');
  assert.ok(audioCore.length > 0);
  assert.doesNotMatch(source.slice(0, restoreStart), /__phase4bAudioMutation/);
});

test('la fenêtre reste virtualisée à ±5 et expose une ancre E2E stable', async () => {
  const [source, postSlide] = await Promise.all([
    read('components/home/SynauraScroll.tsx'),
    read('components/home/ScrollPostSlide.tsx'),
  ]);
  assert.match(source, /const RENDER_BUFFER = 5/);
  assert.match(source, /Math\.max\(0, activeIndex - RENDER_BUFFER\)/);
  assert.match(source, /Math\.min\(feedItems\.length - 1, activeIndex \+ RENDER_BUFFER\)/);
  assert.match(source, /data-feed-item-id=\{item\.id\}/);
  assert.match(source, /data-active=\{index === activeIndex \? 'true' : 'false'\}/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /index === activeIndex && track\.artist\?\._id/);
  assert.match(postSlide, /useTrackWaveform\(active \? track\?\._id : undefined/);
});

test('la matrice mini-player garde le contrôle hors conflit média réel', () => {
  assert.equal(shouldRenderGlobalMiniPlayer('/notifications'), true);
  assert.equal(shouldRenderGlobalMiniPlayer('/messages'), true);
  assert.equal(shouldRenderGlobalMiniPlayer('/messages/conversation-1'), false);
  assert.equal(shouldRenderGlobalMiniPlayer('/upload'), false);
  assert.equal(shouldRenderGlobalMiniPlayer('/clips/new'), false);
  assert.equal(shouldRenderGlobalMiniPlayer('/create'), false);
  assert.equal(shouldRenderGlobalMiniPlayer('/ai-generator'), true);
});
