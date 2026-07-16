import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HomeData, Track } from '@/api/types';

const CACHE_PREFIX = 'synaura.discover.overview.v3';
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type DiscoverOverviewCache = {
  savedAt: number;
  data: HomeData;
  tracks: Track[];
  creators: HomeData['creators'];
  nextPage: number;
  hasMore: boolean;
};

function key(sort: string) {
  return `${CACHE_PREFIX}:${sort || 'trending'}`;
}

export async function readDiscoverOverviewCache(sort: string): Promise<DiscoverOverviewCache | null> {
  try {
    const raw = await AsyncStorage.getItem(key(sort));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverOverviewCache;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!Array.isArray(parsed.tracks) || !Array.isArray(parsed.creators)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDiscoverOverviewCache(sort: string, cache: Omit<DiscoverOverviewCache, 'savedAt'>) {
  await AsyncStorage.setItem(key(sort), JSON.stringify({ ...cache, savedAt: Date.now() })).catch(() => {});
}

const V2_CACHE_KEY = 'synaura.discover.visual.v3';

export type DiscoverVisualCache<Collection = Record<string, unknown>> = {
  savedAt: number;
  newest: Track[];
  popular: Track[];
  hidden: Track[];
  radar: Track[];
  collections: Collection[];
  totalTracks: number;
};

export async function readDiscoverVisualCache<Collection>(): Promise<DiscoverVisualCache<Collection> | null> {
  try {
    const raw = await AsyncStorage.getItem(V2_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverVisualCache<Collection>;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (![parsed.newest, parsed.popular, parsed.hidden, parsed.radar, parsed.collections].every(Array.isArray)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDiscoverVisualCache<Collection>(cache: Omit<DiscoverVisualCache<Collection>, 'savedAt'>) {
  await AsyncStorage.setItem(V2_CACHE_KEY, JSON.stringify({ ...cache, savedAt: Date.now() })).catch(() => {});
}
