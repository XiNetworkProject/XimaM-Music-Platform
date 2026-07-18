import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HomePost, MusicClip, Track } from '@/api/types';
import type { ScrollFeedItem } from '@/components/swipe/feedTypes';

const STORAGE_PREFIX = 'synaura.scroll.resume.v2';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_SNAPSHOT_ITEMS = 84;
const ITEMS_BEFORE_ANCHOR = 10;

export type PersistedFlowMode = 'reco' | 'trending' | 'boost' | 'clips';

export type FlowResumeSnapshot = {
  version: 2;
  savedAt: number;
  mode: PersistedFlowMode;
  activeItemId: string;
  activeIndex: number;
  items: ScrollFeedItem[];
};

function storageKey(
  ownerId: string | null | undefined,
  mode: PersistedFlowMode,
  sourceTrackId = '',
  clipId = '',
) {
  return [STORAGE_PREFIX, ownerId || 'guest', mode, sourceTrackId || 'all', clipId || 'all'].join(':');
}

function isFeedItem(value: unknown): value is ScrollFeedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ScrollFeedItem>;
  return typeof item.id === 'string'
    && item.id.length > 0
    && ['track', 'clip', 'post', 'artist_spotlight', 'collection', 'challenge', 'announcement'].includes(String(item.kind));
}

export function buildFlowResumeSnapshot(
  mode: PersistedFlowMode,
  items: ScrollFeedItem[],
  activeIndex: number,
): FlowResumeSnapshot | null {
  if (!items.length) return null;
  const safeIndex = Math.max(0, Math.min(items.length - 1, activeIndex));
  const start = Math.max(0, safeIndex - ITEMS_BEFORE_ANCHOR);
  const end = Math.min(items.length, start + MAX_SNAPSHOT_ITEMS);
  const snapshotItems = items.slice(start, end);
  const snapshotIndex = safeIndex - start;
  const activeItemId = snapshotItems[snapshotIndex]?.id || '';
  if (!activeItemId) return null;
  return {
    version: 2,
    savedAt: Date.now(),
    mode,
    activeItemId,
    activeIndex: snapshotIndex,
    items: snapshotItems,
  };
}

export async function readFlowResumeSnapshot(input: {
  ownerId?: string | null;
  mode: PersistedFlowMode;
  sourceTrackId?: string;
  clipId?: string;
}) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(input.ownerId, input.mode, input.sourceTrackId, input.clipId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FlowResumeSnapshot;
    if (parsed?.version !== 2 || parsed.mode !== input.mode) return null;
    if (!Number.isFinite(parsed.savedAt) || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    const items = Array.isArray(parsed.items) ? parsed.items.filter(isFeedItem) : [];
    if (!items.length) return null;
    const byId = items.findIndex((item) => item.id === parsed.activeItemId);
    const activeIndex = byId >= 0
      ? byId
      : Math.max(0, Math.min(items.length - 1, Number(parsed.activeIndex || 0)));
    return { ...parsed, items, activeIndex, activeItemId: items[activeIndex].id };
  } catch {
    return null;
  }
}

export async function writeFlowResumeSnapshot(input: {
  ownerId?: string | null;
  sourceTrackId?: string;
  clipId?: string;
  snapshot: FlowResumeSnapshot;
}) {
  try {
    await AsyncStorage.setItem(
      storageKey(input.ownerId, input.snapshot.mode, input.sourceTrackId, input.clipId),
      JSON.stringify(input.snapshot),
    );
  } catch {
    // La reprise du Flow reste best-effort et ne doit jamais bloquer le scroll.
  }
}

export function extractFlowSources(items: ScrollFeedItem[]): {
  tracks: Track[];
  clips: MusicClip[];
  posts: HomePost[];
} {
  const tracks = new Map<string, Track>();
  const clips = new Map<string, MusicClip>();
  const posts = new Map<string, HomePost>();
  for (const item of items) {
    if (item.kind === 'track') tracks.set(item.track._id, item.track);
    if (item.kind === 'clip') clips.set(item.clip.id, item.clip);
    if (item.kind === 'post') posts.set(item.post.id, item.post);
  }
  return {
    tracks: Array.from(tracks.values()),
    clips: Array.from(clips.values()),
    posts: Array.from(posts.values()),
  };
}
