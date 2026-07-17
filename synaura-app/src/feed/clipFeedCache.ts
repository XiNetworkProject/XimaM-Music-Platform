import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MusicClip } from '@/api/types';
import { getRecommendationSeenIds } from '@/feed/recommendationSession';

const CACHE_PREFIX = 'synaura.clip-feed.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type ClipFeedCache = {
  clips: MusicClip[];
  nextCursor: number;
  hasMore: boolean;
  savedAt: number;
};

function cacheKey(userId?: string | null, sourceTrackId?: string, clipId?: string) {
  return [CACHE_PREFIX, userId || 'guest', sourceTrackId || 'all', clipId || 'all'].join(':');
}

export async function readClipFeedCache(userId?: string | null, sourceTrackId?: string, clipId?: string) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId, sourceTrackId, clipId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClipFeedCache;
    if (!Array.isArray(parsed.clips) || Date.now() - Number(parsed.savedAt || 0) > MAX_AGE_MS) return null;
    if (sourceTrackId || clipId) return parsed;
    const seen = new Set(await getRecommendationSeenIds('clip'));
    const clips = parsed.clips.filter((clip) => !seen.has(clip.id));
    return clips.length ? { ...parsed, clips } : null;
  } catch {
    return null;
  }
}

export async function writeClipFeedCache(
  value: Omit<ClipFeedCache, 'savedAt'>,
  userId?: string | null,
  sourceTrackId?: string,
  clipId?: string,
) {
  try {
    await AsyncStorage.setItem(cacheKey(userId, sourceTrackId, clipId), JSON.stringify({ ...value, savedAt: Date.now() }));
  } catch {
    // Le cache ne doit jamais bloquer le Flow.
  }
}
