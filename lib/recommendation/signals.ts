import type { UserRecommendationSignals } from './types';
import { DISCOVER_MOODS } from '../discoverMoods';

const DAY = 24 * 60 * 60 * 1000;

function emptySignals(userId: string | null): UserRecommendationSignals {
  return {
    userId,
    followedArtistIds: new Set(),
    likedTrackIds: new Set(),
    completedTrackIds: new Set(),
    skippedTrackIds: new Set(),
    collaborativeTrackIds: new Set(),
    likedPostIds: new Set(),
    commentedPostIds: new Set(),
    recentlyRecommendedTrackIds: new Set(),
    recentlyRecommendedPostIds: new Set(),
    recentlyRecommendedClipIds: new Set(),
    recommendationCounts: new Map(),
    lastRecommendedAt: new Map(),
    followedPostCreatorIds: new Set(),
    preferredGenres: new Map(),
    avoidedGenres: new Map(),
    artistAffinity: new Map(),
    artistAversion: new Map(),
    trackRepeatCounts24h: new Map(),
    trackRepeatCounts72h: new Map(),
    trackRecentCompletes72h: new Map(),
    currentObsessionTrackIds: new Set(),
    recentlyPlayedTrackIds: [],
    signalStrength: 0,
  };
}

function inc(map: Map<string, number>, key: string, by = 1) {
  if (!key || !Number.isFinite(by)) return;
  map.set(key, (map.get(key) || 0) + by);
}

function normalizeGenres(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return [];
}

function eventProgress(event: any) {
  const direct = Number(event?.progress_pct);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const position = Number(event?.position_ms);
  const duration = Number(event?.duration_ms);
  return Number.isFinite(position) && Number.isFinite(duration) && duration > 0 ? (position / duration) * 100 : 0;
}

function eventTrackId(event: any) {
  const id = String(event?.track_id || '');
  return event?.is_ai_track && id && !id.startsWith('ai-') ? `ai-${id}` : id;
}

type TasteSignal = {
  positive: number;
  negative: number;
  lastPositive: number;
  lastNegative: number;
};

function tasteSignal(map: Map<string, TasteSignal>, trackId: string) {
  const current = map.get(trackId) || { positive: 0, negative: 0, lastPositive: 0, lastNegative: 0 };
  map.set(trackId, current);
  return current;
}

export async function buildUserRecommendationSignals({
  supabase,
  userId,
  candidateTracks = [],
  sessionId = null,
}: {
  supabase: any;
  userId: string | null;
  candidateTracks?: any[];
  sessionId?: string | null;
}): Promise<UserRecommendationSignals> {
  const signals = emptySignals(userId);
  if (!userId) return signals;

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const since72Ms = now - 3 * DAY;
  const since7 = new Date(now - 7 * DAY).toISOString();

  const [followsRes, recentEventsRes, likesRes, postLikesRes, postCommentsRes, profileRes, impressionsRes] = await Promise.all([
    supabase.from('user_follows').select('following_id').eq('follower_id', userId).limit(1000),
    supabase
      .from('track_events')
      .select('track_id, event_type, created_at, progress_pct, position_ms, duration_ms, is_ai_track')
      .eq('user_id', userId)
      .gte('created_at', since30)
      .in('event_type', ['play_start', 'play_complete', 'play_progress', 'favorite', 'like', 'skip', 'next', 'prev'])
      .order('created_at', { ascending: false })
      .limit(1600),
    supabase.from('track_likes').select('track_id').eq('user_id', userId).limit(500),
    supabase.from('post_likes').select('post_id').eq('user_id', userId).limit(500),
    supabase.from('post_comments').select('post_id').eq('user_id', userId).limit(500),
    supabase.from('profiles').select('preferences').eq('id', userId).single(),
    supabase
      .from('recommendation_impressions')
      .select('content_type, content_id, created_at, session_id')
      .eq('user_id', userId)
      .gte('created_at', since7)
      .order('created_at', { ascending: false })
      .limit(800),
  ]);

  for (const row of followsRes.data || []) {
    if (row.following_id) signals.followedArtistIds.add(String(row.following_id));
  }
  for (const row of likesRes.data || []) {
    if (row.track_id) signals.likedTrackIds.add(String(row.track_id));
  }
  for (const row of postLikesRes.data || []) {
    if (row.post_id) signals.likedPostIds.add(String(row.post_id));
  }
  for (const row of postCommentsRes.data || []) {
    if (row.post_id) signals.commentedPostIds.add(String(row.post_id));
  }

  for (const impression of impressionsRes.data || []) {
    if (sessionId && impression.session_id === sessionId) continue;
    const contentId = String(impression.content_id || '');
    if (!contentId) continue;
    if (impression.content_type === 'track') signals.recentlyRecommendedTrackIds.add(contentId);
    if (impression.content_type === 'post') signals.recentlyRecommendedPostIds.add(contentId);
    if (impression.content_type === 'clip') signals.recentlyRecommendedClipIds.add(contentId);
    inc(signals.recommendationCounts, contentId);
    const created = impression.created_at ? new Date(impression.created_at).getTime() : 0;
    if (created > (signals.lastRecommendedAt.get(contentId) || 0)) signals.lastRecommendedAt.set(contentId, created);
  }

  const recentEvents = recentEventsRes.data || [];
  const startedCounts = new Map<string, number>();
  const completeCounts = new Map<string, number>();
  const tasteByTrack = new Map<string, TasteSignal>();
  const recentTrackOrder: string[] = [];

  for (const event of recentEvents) {
    const trackId = eventTrackId(event);
    if (!trackId) continue;
    const created = event.created_at ? new Date(event.created_at).getTime() : now;
    const ageDays = Math.max(0, (now - created) / DAY);
    const is72 = created >= since72Ms;
    const is24 = created >= now - DAY;
    const progress = eventProgress(event);
    const taste = tasteSignal(tasteByTrack, trackId);

    if ((event.event_type === 'play_start' || event.event_type === 'play_complete') && !recentTrackOrder.includes(trackId)) {
      recentTrackOrder.push(trackId);
    }
    if (event.event_type === 'play_start') {
      inc(startedCounts, trackId);
      if (is72) inc(signals.trackRepeatCounts72h, trackId);
      if (is24) inc(signals.trackRepeatCounts24h, trackId);
      taste.positive += 0.08 * Math.exp(-ageDays * Math.LN2 / 14);
    }
    if (event.event_type === 'play_complete') {
      signals.completedTrackIds.add(trackId);
      inc(completeCounts, trackId);
      if (is72) inc(signals.trackRecentCompletes72h, trackId);
      taste.positive += 2.4 * Math.exp(-ageDays * Math.LN2 / 18);
      taste.lastPositive = Math.max(taste.lastPositive, created);
    }
    if (event.event_type === 'like' || event.event_type === 'favorite') {
      signals.likedTrackIds.add(trackId);
      taste.positive += 3.6 * Math.exp(-ageDays * Math.LN2 / 24);
      taste.lastPositive = Math.max(taste.lastPositive, created);
    }
    if (event.event_type === 'play_progress' && progress >= 45) {
      taste.positive += (progress >= 75 ? 1.2 : 0.45) * Math.exp(-ageDays * Math.LN2 / 12);
      taste.lastPositive = Math.max(taste.lastPositive, created);
    }
    if (event.event_type === 'skip' || ((event.event_type === 'next' || event.event_type === 'prev') && progress < 35)) {
      const severity = event.event_type === 'skip' || progress < 20 ? 2.8 : 1.2;
      taste.negative += severity * Math.exp(-ageDays * Math.LN2 / 5);
      taste.lastNegative = Math.max(taste.lastNegative, created);
    }
  }

  for (const trackId of Array.from(signals.likedTrackIds)) {
    const taste = tasteSignal(tasteByTrack, trackId);
    taste.positive = Math.max(taste.positive, 3.6);
    taste.lastPositive = Math.max(taste.lastPositive, now);
  }

  tasteByTrack.forEach((taste, trackId) => {
    const recoveredAfterSkip = taste.lastPositive > taste.lastNegative;
    if (!signals.likedTrackIds.has(trackId) && !recoveredAfterSkip && taste.negative > Math.max(0.8, taste.positive * 0.72)) {
      signals.skippedTrackIds.add(trackId);
    }
  });
  startedCounts.forEach((starts, trackId) => {
    if (starts >= 2 && !completeCounts.has(trackId) && !signals.likedTrackIds.has(trackId)) {
      const taste = tasteByTrack.get(trackId);
      if ((taste?.negative || 0) > 0) signals.skippedTrackIds.add(trackId);
    }
  });
  signals.trackRepeatCounts72h.forEach((count, trackId) => {
    const completes = signals.trackRecentCompletes72h.get(trackId) || 0;
    if ((count >= 3 && completes >= 1) || completes >= 2) signals.currentObsessionTrackIds.add(trackId);
  });
  signals.recentlyPlayedTrackIds = recentTrackOrder.slice(0, 24);

  const trackById = new Map<string, any>();
  for (const track of candidateTracks || []) {
    const id = String(track?._id || track?.id || '');
    if (id) trackById.set(id, track);
  }

  const tasteIds = Array.from(tasteByTrack.keys()).slice(0, 180);
  const missingNormalIds = tasteIds.filter((id) => id && !id.startsWith('ai-') && !trackById.has(id));
  const missingAiIds = tasteIds.filter((id) => id.startsWith('ai-') && !trackById.has(id)).map((id) => id.slice(3));
  const [normalMeta, aiMeta] = await Promise.all([
    missingNormalIds.length
      ? supabase.from('tracks').select('id, creator_id, genre').in('id', missingNormalIds)
      : Promise.resolve({ data: [] }),
    missingAiIds.length
      ? supabase.from('ai_tracks').select('id, tags, generation:ai_generations(user_id)').in('id', missingAiIds)
      : Promise.resolve({ data: [] }),
  ]);
  for (const track of normalMeta.data || []) trackById.set(String(track.id), track);
  for (const track of aiMeta.data || []) {
    trackById.set(`ai-${track.id}`, {
      ...track,
      creator_id: Array.isArray(track.generation) ? track.generation[0]?.user_id : track.generation?.user_id,
      genre: track.tags,
    });
  }

  tasteByTrack.forEach((taste, trackId) => {
    const track = trackById.get(trackId);
    if (!track) return;
    const artistId = String(track.artist?._id || track.creator_id || '');
    const positive = Math.min(8, taste.positive);
    const negative = Math.min(6, taste.negative);
    if (positive > 0.1) {
      inc(signals.artistAffinity, artistId, positive);
      for (const genre of normalizeGenres(track.genre || track.tags)) inc(signals.preferredGenres, genre, positive);
    }
    if (negative > 0.2 && taste.lastNegative >= taste.lastPositive) {
      inc(signals.artistAversion, artistId, negative);
      for (const genre of normalizeGenres(track.genre || track.tags)) inc(signals.avoidedGenres, genre, negative);
    }
  });

  try {
    const userLikedIds = Array.from(signals.likedTrackIds).filter((id) => !id.startsWith('ai-')).slice(0, 40);
    if (userLikedIds.length >= 2) {
      const { data: otherLikers } = await supabase
        .from('track_likes')
        .select('user_id')
        .in('track_id', userLikedIds)
        .neq('user_id', userId)
        .limit(400);
      const counts = new Map<string, number>();
      for (const row of otherLikers || []) inc(counts, String(row.user_id || ''));
      const similarUsers = Array.from(counts.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([id]) => id);
      if (similarUsers.length) {
        const { data: theirLikes } = await supabase.from('track_likes').select('track_id').in('user_id', similarUsers).limit(600);
        for (const row of theirLikes || []) {
          const trackId = String(row.track_id || '');
          if (trackId && !signals.likedTrackIds.has(trackId)) signals.collaborativeTrackIds.add(trackId);
        }
      }
    }
  } catch {}

  try {
    const postIds = Array.from(new Set([
      ...Array.from(signals.likedPostIds),
      ...Array.from(signals.commentedPostIds),
    ])).slice(0, 200);
    if (postIds.length) {
      const { data: posts } = await supabase.from('creator_posts').select('id, creator_id').in('id', postIds);
      for (const post of posts || []) {
        if (post.creator_id) signals.followedPostCreatorIds.add(String(post.creator_id));
      }
    }
  } catch {}

  try {
    const onboarding = (profileRes as any)?.data?.preferences?.onboarding;
    if (onboarding && typeof onboarding === 'object') {
      for (const genre of normalizeGenres(onboarding.favoriteGenres)) inc(signals.preferredGenres, genre, 0.9);
      const favoriteMoods: unknown[] = Array.isArray(onboarding.favoriteMoods) ? onboarding.favoriteMoods : [];
      for (const moodId of favoriteMoods) {
        const mood = DISCOVER_MOODS.find((item) => item.id === moodId);
        if (!mood || mood.isAiOnly) continue;
        for (const keyword of mood.keywords) inc(signals.preferredGenres, keyword, 0.65);
      }
    }
  } catch {}

  signals.signalStrength = Math.min(100, Number((
    signals.likedTrackIds.size * 3 +
    signals.completedTrackIds.size * 1.5 +
    signals.skippedTrackIds.size * 1.25 +
    signals.followedArtistIds.size * 2 +
    Math.min(20, recentEvents.length * 0.08)
  ).toFixed(2)));

  return signals;
}

export function buildAnonymousRecommendationSignals(): UserRecommendationSignals {
  return emptySignals(null);
}
