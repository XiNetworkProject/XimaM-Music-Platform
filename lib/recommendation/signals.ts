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
    followedPostCreatorIds: new Set(),
    preferredGenres: new Map(),
    artistAffinity: new Map(),
    trackRepeatCounts24h: new Map(),
    trackRepeatCounts72h: new Map(),
    trackRecentCompletes72h: new Map(),
    currentObsessionTrackIds: new Set(),
    recentlyPlayedTrackIds: [],
  };
}

function inc(map: Map<string, number>, key: string, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + by);
}

function normalizeGenres(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return [];
}

export async function buildUserRecommendationSignals({
  supabase,
  userId,
  candidateTracks = [],
}: {
  supabase: any;
  userId: string | null;
  candidateTracks?: any[];
}): Promise<UserRecommendationSignals> {
  const signals = emptySignals(userId);
  if (!userId) return signals;

  const now = Date.now();
  const since14 = new Date(now - 14 * DAY).toISOString();
  const since72 = new Date(now - 3 * DAY).toISOString();

  const [followsRes, recentEventsRes, likesRes, postLikesRes, postCommentsRes, profileRes] = await Promise.all([
    supabase.from('user_follows').select('following_id').eq('follower_id', userId).limit(1000),
    supabase
      .from('track_events')
      .select('track_id, event_type, created_at, progress_pct')
      .eq('user_id', userId)
      .gte('created_at', since14)
      .in('event_type', ['play_start', 'play_complete', 'play_progress', 'favorite', 'like', 'skip', 'next', 'prev'])
      .order('created_at', { ascending: false })
      .limit(1200),
    supabase.from('track_likes').select('track_id').eq('user_id', userId).limit(500),
    supabase.from('post_likes').select('post_id').eq('user_id', userId).limit(500),
    supabase.from('post_comments').select('post_id').eq('user_id', userId).limit(500),
    supabase.from('profiles').select('preferences').eq('id', userId).single(),
  ]);

  try {
    const { data: impressions } = await supabase
      .from('recommendation_impressions')
      .select('content_type, content_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(now - 7 * DAY).toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    for (const impression of impressions || []) {
      const contentId = String(impression.content_id || '');
      if (!contentId) continue;
      if (impression.content_type === 'track') signals.recentlyRecommendedTrackIds.add(contentId);
      if (impression.content_type === 'post') signals.recentlyRecommendedPostIds.add(contentId);
    }
  } catch {}

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

  const recentEvents = recentEventsRes.data || [];
  const startedCounts = new Map<string, number>();
  const completeCounts = new Map<string, number>();
  const recentTrackOrder: string[] = [];

  for (const event of recentEvents) {
    const trackId = String(event.track_id || '');
    if (!trackId) continue;
    const created = event.created_at ? new Date(event.created_at).getTime() : 0;
    const is72 = created >= new Date(since72).getTime();
    const is24 = created >= now - DAY;

    if ((event.event_type === 'play_start' || event.event_type === 'play_complete') && !recentTrackOrder.includes(trackId)) {
      recentTrackOrder.push(trackId);
    }
    if (event.event_type === 'play_start') {
      inc(startedCounts, trackId);
      if (is72) inc(signals.trackRepeatCounts72h, trackId);
      if (is24) inc(signals.trackRepeatCounts24h, trackId);
    }
    if (event.event_type === 'play_complete') {
      signals.completedTrackIds.add(trackId);
      inc(completeCounts, trackId);
      if (is72) inc(signals.trackRecentCompletes72h, trackId);
    }
    if (event.event_type === 'like' || event.event_type === 'favorite') {
      signals.likedTrackIds.add(trackId);
    }
    if (event.event_type === 'skip') {
      signals.skippedTrackIds.add(trackId);
    }
    if ((event.event_type === 'next' || event.event_type === 'prev') && Number(event.progress_pct || 0) < 35) {
      signals.skippedTrackIds.add(trackId);
    }
  }

  startedCounts.forEach((starts, trackId) => {
    if (starts >= 2 && !completeCounts.has(trackId) && !signals.likedTrackIds.has(trackId)) {
      signals.skippedTrackIds.add(trackId);
    }
  });
  signals.trackRepeatCounts72h.forEach((count, trackId) => {
    const completes = signals.trackRecentCompletes72h.get(trackId) || 0;
    if (count >= 3 || completes >= 2) signals.currentObsessionTrackIds.add(trackId);
  });
  signals.recentlyPlayedTrackIds = recentTrackOrder.slice(0, 16);

  const trackById = new Map<string, any>();
  for (const track of candidateTracks || []) {
    const id = String(track?._id || track?.id || '');
    if (id) trackById.set(id, track);
  }

  const missingNormalIds = Array.from(new Set([
    ...Array.from(signals.likedTrackIds),
    ...Array.from(signals.completedTrackIds),
    ...Array.from(signals.currentObsessionTrackIds),
  ]))
    .filter((id) => id && !id.startsWith('ai-') && !trackById.has(id))
    .slice(0, 120);

  if (missingNormalIds.length) {
    const { data: extraTracks } = await supabase.from('tracks').select('id, creator_id, genre').in('id', missingNormalIds);
    for (const track of extraTracks || []) trackById.set(String(track.id), track);
  }

  const affinityIds = new Set<string>([
    ...Array.from(signals.likedTrackIds),
    ...Array.from(signals.completedTrackIds),
    ...Array.from(signals.currentObsessionTrackIds),
  ]);
  affinityIds.forEach((trackId) => {
    const track = trackById.get(trackId);
    if (!track) return;
    const artistId = String(track.artist?._id || track.creator_id || '');
    const weight = signals.currentObsessionTrackIds.has(trackId) ? 5 : signals.completedTrackIds.has(trackId) ? 2 : 1.5;
    inc(signals.artistAffinity, artistId, weight);
    for (const genre of normalizeGenres(track.genre)) inc(signals.preferredGenres, genre, weight);
  });

  try {
    const userLikedIds = Array.from(signals.likedTrackIds).filter((id) => !id.startsWith('ai-')).slice(0, 40);
    if (userLikedIds.length >= 2) {
      const { data: otherLikers } = await supabase
        .from('track_likes')
        .select('user_id')
        .in('track_id', userLikedIds)
        .neq('user_id', userId)
        .limit(300);
      const counts = new Map<string, number>();
      for (const row of otherLikers || []) inc(counts, String(row.user_id || ''));
      const similarUsers = Array.from(counts.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([id]) => id);
      if (similarUsers.length) {
        const { data: theirLikes } = await supabase.from('track_likes').select('track_id').in('user_id', similarUsers).limit(500);
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

  // Amorce "a froid" issue de l'onboarding : un poids modeste, ecrase naturellement
  // par le comportement reel (chaque ecoute/like pese 1.5 a 5) des qu'il y en a.
  try {
    const onboarding = (profileRes as any)?.data?.preferences?.onboarding;
    if (onboarding && typeof onboarding === 'object') {
      for (const genre of normalizeGenres(onboarding.favoriteGenres)) {
        inc(signals.preferredGenres, genre, 1);
      }
      const favoriteMoods: unknown[] = Array.isArray(onboarding.favoriteMoods) ? onboarding.favoriteMoods : [];
      for (const moodId of favoriteMoods) {
        const mood = DISCOVER_MOODS.find((item) => item.id === moodId);
        if (!mood || mood.isAiOnly) continue;
        for (const keyword of mood.keywords) inc(signals.preferredGenres, keyword, 1);
      }
    }
  } catch {}

  return signals;
}

export function buildAnonymousRecommendationSignals(): UserRecommendationSignals {
  return emptySignals(null);
}

