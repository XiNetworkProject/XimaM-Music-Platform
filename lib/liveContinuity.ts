import type { ScrollFeedItem } from './scrollFeed';

export type LiveFeedFilter = 'foryou' | 'new' | 'clips' | 'creators' | 'challenges';

export type LiveNavigationSnapshot = {
  version: 1;
  snapshotId: string;
  historyKey: string;
  savedAt: number;
  expiresAt: number;
  feedMode: 'synaura-scroll';
  filter: LiveFeedFilter;
  exactItemOrder: string[];
  activeItemId: string;
  scrollOffsetWithinItem: number;
  cursors: { tracks: number };
  hasMore: { tracks: boolean };
  frozenSeenBoundary: number;
  source: { sourceTrackId?: string; clipId?: string };
  draftRefs: string[];
  contextSurface: 'prelude' | 'feed';
};

export type LiveFeedCache = {
  version: 1;
  snapshotId: string;
  savedAt: number;
  expiresAt: number;
  items: ScrollFeedItem[];
};

export type LiveRestoreResult = {
  status: 'success' | 'partial' | 'miss';
  reason: string;
  snapshot: LiveNavigationSnapshot | null;
  feed: LiveFeedCache | null;
};

export type LiveDraft = {
  version: 1;
  savedAt: number;
  userId: string;
  entityType: 'track' | 'post' | 'clip';
  entityId: string;
  text: string;
  timestampSeconds?: number;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
type HistoryLike = Pick<History, 'state' | 'replaceState'>;

export const LIVE_SNAPSHOT_TTL_MS = 30 * 60 * 1000;
export const LIVE_SNAPSHOT_LIMIT = 4;
const LIVE_DRAFT_LIMIT = 8;
export const LIVE_HISTORY_STATE_KEY = 'synauraLiveSnapshotId';
const SNAPSHOT_PREFIX = 'synaura.live.continuity.snapshot.v1:';
const FEED_PREFIX = 'synaura.live.continuity.feed.v1:';
const DRAFT_PREFIX = 'synaura.live.continuity.draft.v1:';

const snapshotMemory = new Map<string, LiveNavigationSnapshot>();
const feedMemory = new Map<string, LiveFeedCache>();
const draftMemory = new Map<string, LiveDraft>();

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)));
}

function isFilter(value: unknown): value is LiveFeedFilter {
  return value === 'foryou' || value === 'new' || value === 'clips' || value === 'creators' || value === 'challenges';
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function storageGet(storage: StorageLike, key: string) {
  try { return storage.getItem(key); } catch { return null; }
}

function storageSet(storage: StorageLike, key: string, value: string) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

function storageRemove(storage: StorageLike, key: string) {
  try { storage.removeItem(key); } catch {}
}

function validSnapshot(value: unknown, now: number): value is LiveNavigationSnapshot {
  const item = value as LiveNavigationSnapshot | null;
  return Boolean(
    item
      && item.version === 1
      && typeof item.snapshotId === 'string'
      && typeof item.historyKey === 'string'
      && typeof item.savedAt === 'number'
      && item.feedMode === 'synaura-scroll'
      && isFilter(item.filter)
      && typeof item.activeItemId === 'string' && item.activeItemId.length > 0
      && Array.isArray(item.exactItemOrder)
      && item.exactItemOrder.length > 0
      && item.exactItemOrder.every((id) => typeof id === 'string' && id.length > 0)
      && item.exactItemOrder.includes(item.activeItemId)
      && typeof item.scrollOffsetWithinItem === 'number'
      && Number.isFinite(item.scrollOffsetWithinItem)
      && typeof item.cursors?.tracks === 'number'
      && Number.isFinite(item.cursors.tracks)
      && typeof item.hasMore?.tracks === 'boolean'
      && typeof item.frozenSeenBoundary === 'number'
      && Number.isFinite(item.frozenSeenBoundary)
      && item.source && typeof item.source === 'object'
      && (item.source.sourceTrackId === undefined || typeof item.source.sourceTrackId === 'string')
      && (item.source.clipId === undefined || typeof item.source.clipId === 'string')
      && Array.isArray(item.draftRefs)
      && item.draftRefs.every((key) => typeof key === 'string')
      && (item.contextSurface === 'prelude' || item.contextSurface === 'feed')
      && typeof item.expiresAt === 'number'
      && item.expiresAt > now,
  );
}

function validFeed(value: unknown, snapshotId: string, now: number): value is LiveFeedCache {
  const item = value as LiveFeedCache | null;
  return Boolean(
    item
      && item.version === 1
      && item.snapshotId === snapshotId
      && typeof item.expiresAt === 'number'
      && item.expiresAt > now
      && Array.isArray(item.items),
  );
}

function snapshotKey(snapshotId: string) {
  return `${SNAPSHOT_PREFIX}${snapshotId}`;
}

function feedKey(snapshotId: string) {
  return `${FEED_PREFIX}${snapshotId}`;
}

export function createLiveSnapshotId(now = Date.now()) {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `live-${now.toString(36)}-${random}`;
}

export function readLiveSnapshotId(historyState: unknown) {
  if (!historyState || typeof historyState !== 'object') return null;
  const value = (historyState as Record<string, unknown>)[LIVE_HISTORY_STATE_KEY];
  return typeof value === 'string' && value.startsWith('live-') ? value : null;
}

export function attachLiveSnapshotToHistory(history: HistoryLike, snapshotId: string) {
  const current = history.state && typeof history.state === 'object' ? history.state : {};
  if ((current as Record<string, unknown>)[LIVE_HISTORY_STATE_KEY] === snapshotId) return;
  try { history.replaceState({ ...current, [LIVE_HISTORY_STATE_KEY]: snapshotId }, ''); } catch {}
}

export function makeLiveNavigationSnapshot(input: Omit<LiveNavigationSnapshot, 'version' | 'savedAt' | 'expiresAt'>, now = Date.now()): LiveNavigationSnapshot {
  const exactItemOrder = uniqueStrings(input.exactItemOrder);
  const activeItemId = exactItemOrder.includes(input.activeItemId) ? input.activeItemId : exactItemOrder[0] || '';
  return {
    ...input,
    version: 1,
    savedAt: now,
    expiresAt: now + LIVE_SNAPSHOT_TTL_MS,
    exactItemOrder,
    activeItemId,
    scrollOffsetWithinItem: Number.isFinite(input.scrollOffsetWithinItem) ? input.scrollOffsetWithinItem : 0,
    frozenSeenBoundary: Math.max(0, Math.min(input.frozenSeenBoundary, Math.max(0, exactItemOrder.length - 1))),
    draftRefs: uniqueStrings(input.draftRefs),
  };
}

function removeSnapshot(storage: StorageLike, snapshotId: string) {
  snapshotMemory.delete(snapshotId);
  feedMemory.delete(snapshotId);
  storageRemove(storage, snapshotKey(snapshotId));
  storageRemove(storage, feedKey(snapshotId));
}

function pruneLiveSnapshotMemory(now: number) {
  snapshotMemory.forEach((snapshot, id) => {
    if (snapshot.expiresAt <= now) {
      snapshotMemory.delete(id);
      feedMemory.delete(id);
    }
  });
  Array.from(snapshotMemory.values()).reverse()
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(LIVE_SNAPSHOT_LIMIT)
    .forEach((snapshot) => {
      snapshotMemory.delete(snapshot.snapshotId);
      feedMemory.delete(snapshot.snapshotId);
    });
}

export function pruneLiveSnapshots(storage: StorageLike, now = Date.now()) {
  pruneLiveSnapshotMemory(now);
  const entries: Array<{ id: string; savedAt: number }> = [];
  let keys: Array<string | null> = [];
  try { keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)); } catch { return; }
  for (const key of keys) {
    if (!key?.startsWith(SNAPSHOT_PREFIX)) continue;
    const id = key.slice(SNAPSHOT_PREFIX.length);
    const parsed = parseJson<LiveNavigationSnapshot>(storageGet(storage, key));
    if (!validSnapshot(parsed, now)) {
      removeSnapshot(storage, id);
      continue;
    }
    entries.push({ id, savedAt: parsed.savedAt });
  }
  entries
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(LIVE_SNAPSHOT_LIMIT)
    .forEach(({ id }) => removeSnapshot(storage, id));
}

export function saveLiveNavigationContext(storage: StorageLike, snapshot: LiveNavigationSnapshot, items: ScrollFeedItem[]) {
  const feed: LiveFeedCache = {
    version: 1,
    snapshotId: snapshot.snapshotId,
    savedAt: snapshot.savedAt,
    expiresAt: snapshot.expiresAt,
    items,
  };
  snapshotMemory.set(snapshot.snapshotId, snapshot);
  feedMemory.set(snapshot.snapshotId, feed);
  storageSet(storage, snapshotKey(snapshot.snapshotId), JSON.stringify(snapshot));
  storageSet(storage, feedKey(snapshot.snapshotId), JSON.stringify(feed));
  pruneLiveSnapshots(storage, snapshot.savedAt);
}

export function loadLiveNavigationContext(historyState: unknown, storage: StorageLike, now = Date.now()): LiveRestoreResult {
  const snapshotId = readLiveSnapshotId(historyState);
  if (!snapshotId) return { status: 'miss', reason: 'history-entry-without-snapshot', snapshot: null, feed: null };

  const memorySnapshot = snapshotMemory.get(snapshotId);
  const storedSnapshot = memorySnapshot || parseJson<LiveNavigationSnapshot>(storageGet(storage, snapshotKey(snapshotId)));
  if (!validSnapshot(storedSnapshot, now)) {
    removeSnapshot(storage, snapshotId);
    return { status: 'miss', reason: 'snapshot-stale-or-invalid', snapshot: null, feed: null };
  }

  const memoryFeed = feedMemory.get(snapshotId);
  const storedFeed = memoryFeed || parseJson<LiveFeedCache>(storageGet(storage, feedKey(snapshotId)));
  if (!validFeed(storedFeed, snapshotId, now)) {
    return { status: 'partial', reason: 'feed-cache-missing', snapshot: storedSnapshot, feed: null };
  }

  const cachedIds = new Set(storedFeed.items.map((item) => item?.id).filter(Boolean));
  const missingSeenItem = storedSnapshot.exactItemOrder
    .slice(0, storedSnapshot.frozenSeenBoundary + 1)
    .some((id) => !cachedIds.has(id));
  if (missingSeenItem || !cachedIds.has(storedSnapshot.activeItemId)) {
    return { status: 'partial', reason: 'cached-anchor-or-seen-item-missing', snapshot: storedSnapshot, feed: storedFeed };
  }
  return { status: 'success', reason: 'snapshot-and-feed-cache-valid', snapshot: storedSnapshot, feed: storedFeed };
}

export function mergeLiveFeedOrder(
  snapshot: LiveNavigationSnapshot | null,
  cachedItems: ScrollFeedItem[],
  freshItems: ScrollFeedItem[],
) {
  if (!snapshot) return freshItems;
  const byId = new Map<string, ScrollFeedItem>();
  for (const item of freshItems) if (item?.id) byId.set(item.id, item);
  for (const item of cachedItems) if (item?.id) byId.set(item.id, item);
  const restored: ScrollFeedItem[] = [];
  const used = new Set<string>();
  const frozenOrder = snapshot.exactItemOrder.slice(0, snapshot.frozenSeenBoundary + 1);
  for (const id of frozenOrder) {
    const item = byId.get(id);
    if (!item) continue;
    restored.push(item);
    used.add(id);
  }
  for (const item of freshItems) {
    if (!item?.id || used.has(item.id)) continue;
    restored.push(item);
    used.add(item.id);
  }
  return restored;
}

function safePart(value: string) {
  return encodeURIComponent(value).slice(0, 180);
}

export function liveDraftStorageKey(userId: string, entityType: LiveDraft['entityType'], entityId: string) {
  return `${DRAFT_PREFIX}${safePart(userId)}:${entityType}:${safePart(entityId)}`;
}

export function saveLiveDraft(storage: StorageLike, draft: LiveDraft) {
  const key = liveDraftStorageKey(draft.userId, draft.entityType, draft.entityId);
  if (!draft.text.trim()) {
    draftMemory.delete(key);
    storageRemove(storage, key);
    return null;
  }
  const boundedDraft = { ...draft, text: draft.text.slice(0, 500) };
  draftMemory.set(key, boundedDraft);
  Array.from(draftMemory.entries())
    .sort((left, right) => right[1].savedAt - left[1].savedAt)
    .slice(LIVE_DRAFT_LIMIT)
    .forEach(([oldKey]) => draftMemory.delete(oldKey));
  storageSet(storage, key, JSON.stringify(boundedDraft));
  return key;
}

export function loadLiveDraft(storage: StorageLike, key: string, userId: string): LiveDraft | null {
  if (!key.startsWith(`${DRAFT_PREFIX}${safePart(userId)}:`)) return null;
  const draft = draftMemory.get(key) || parseJson<LiveDraft>(storageGet(storage, key));
  if (!draft || draft.version !== 1 || draft.userId !== userId || !draft.entityId || !draft.text) return null;
  if (Date.now() - draft.savedAt > LIVE_SNAPSHOT_TTL_MS) {
    draftMemory.delete(key);
    storageRemove(storage, key);
    return null;
  }
  return draft;
}

export function reportLiveRestore(event: 'restore-success' | 'restore-partial' | 'restore-miss', reason: string) {
  if (process.env.NODE_ENV !== 'production') console.info('[live-continuity]', event, { reason });
}
