import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RankingFeedChunk } from '@/api/types';
import { getRecommendationSeenIds } from '@/feed/recommendationSession';

const CACHE_PREFIX = 'synaura.feed.first-page.v4';
const MAX_CACHE_AGE_MS = 12 * 60 * 60 * 1000;

type CachedFeed = {
  savedAt: number;
  chunk: RankingFeedChunk;
};

function cacheKey(mode: string, seedGenre: string | null, userId?: string | null) {
  const owner = userId || 'anonymous';
  const seed = seedGenre?.trim().toLowerCase() || 'all';
  return `${CACHE_PREFIX}:${owner}:${mode}:${seed}`;
}

export async function readRankingFeedCache(mode: string, seedGenre: string | null, userId?: string | null) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(mode, seedGenre, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFeed;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_CACHE_AGE_MS) return null;
    if (!Array.isArray(parsed.chunk?.tracks) || !parsed.chunk.tracks.length) return null;
    const seen = new Set(await getRecommendationSeenIds('track'));
    const tracks = parsed.chunk.tracks.filter((track) => (
      typeof track?._id === 'string'
      && track._id.length > 0
      && typeof track.audioUrl === 'string'
      && track.audioUrl.length > 0
      && !seen.has(track._id)
    ));
    if (!tracks.length) return null;
    return { ...parsed.chunk, tracks };
  } catch {
    return null;
  }
}

export async function writeRankingFeedCache(
  mode: string,
  seedGenre: string | null,
  chunk: RankingFeedChunk,
  userId?: string | null,
) {
  if (!chunk.tracks.length) return;
  const cached: CachedFeed = { savedAt: Date.now(), chunk };
  await AsyncStorage.setItem(cacheKey(mode, seedGenre, userId), JSON.stringify(cached)).catch(() => {});
}
