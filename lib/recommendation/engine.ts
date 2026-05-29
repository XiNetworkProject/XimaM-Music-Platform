import type {
  RecommendationContext,
  RecommendationReason,
  RecommendedPost,
  RecommendedTrack,
  UserRecommendationSignals,
} from './types';

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function norm(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function ageHours(createdAt: string | undefined, now: number) {
  if (!createdAt) return 24 * 30;
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return 24 * 30;
  return Math.max(0, (now - ts) / 3_600_000);
}

function freshnessScore(createdAt: string | undefined, now: number) {
  const h = ageHours(createdAt, now);
  return 4.2 * Math.exp(-h * Math.LN2 / 72);
}

function genreAffinity(track: RecommendedTrack, signals: UserRecommendationSignals) {
  const genres = toArray(track.genre).map(norm);
  let score = 0;
  for (const genre of genres) {
    score += signals.preferredGenres.get(genre) || 0;
  }
  return Math.min(8, score);
}

function artistAffinity(track: RecommendedTrack, signals: UserRecommendationSignals) {
  const artistId = String(track.artist?._id || '');
  if (!artistId) return 0;
  let score = signals.artistAffinity.get(artistId) || 0;
  if (signals.followedArtistIds.has(artistId)) score += 7;
  return Math.min(10, score);
}

function addReason(reasons: RecommendationReason[], condition: boolean, reason: RecommendationReason) {
  if (condition && !reasons.includes(reason)) reasons.push(reason);
}

export function scoreTrackCandidate(
  track: RecommendedTrack,
  signals: UserRecommendationSignals,
  context: RecommendationContext = {},
): RecommendedTrack {
  const now = context.now || Date.now();
  const id = String(track._id || '');
  const reasons: RecommendationReason[] = [];
  const base = Number(track.rankingScore || 0);
  const fresh = freshnessScore(track.createdAt, now);
  const artist = artistAffinity(track, signals);
  const genre = genreAffinity(track, signals);
  const repeat24 = signals.trackRepeatCounts24h.get(id) || 0;
  const repeat72 = signals.trackRepeatCounts72h.get(id) || 0;
  const completes72 = signals.trackRecentCompletes72h.get(id) || 0;
  const isObsessed = signals.currentObsessionTrackIds.has(id);
  const recentlyPlayedIndex = signals.recentlyPlayedTrackIds.indexOf(id);
  const recentlyPlayedPenalty = recentlyPlayedIndex >= 0 ? Math.max(0.12, 1 - (signals.recentlyPlayedTrackIds.length - recentlyPlayedIndex) * 0.16) : 1;
  const skipPenalty = signals.skippedTrackIds.has(id) ? 0.28 : 1;
  const seenPenalty = signals.recentlyRecommendedTrackIds.has(id) && !isObsessed ? 0.62 : 1;
  const collab = signals.collaborativeTrackIds.has(id) ? 3.8 : 0;
  const liked = signals.likedTrackIds.has(id) ? 2.4 : 0;

  // Re-listening right now is not simply "seen fatigue": it is a temporary taste signal.
  // The exact track gets a capped boost, while related genres/artists benefit too.
  const obsessionBoost = isObsessed ? Math.min(7, 2.5 + repeat72 * 0.85 + completes72 * 1.2) : 0;
  const repeatBoost = !isObsessed && repeat72 > 0 ? Math.min(3.5, repeat72 * 0.65) : 0;

  let score =
    base * 1.15 +
    fresh +
    artist +
    genre +
    collab +
    liked +
    obsessionBoost +
    repeatBoost;

  if (context.strategy === 'trending') {
    score = base * 1.5 + fresh * 0.45 + (track.isBoosted ? 2 : 0);
  }

  // If the exact track has been hammered in the last day, still allow it, but avoid loops.
  const hardRepeatPenalty = repeat24 >= 5 && !isObsessed ? 0.55 : 1;
  score *= recentlyPlayedPenalty * skipPenalty * seenPenalty * hardRepeatPenalty;

  addReason(reasons, base > 0, 'global_performance');
  addReason(reasons, fresh > 1.2 || Boolean(track.isFresh), 'fresh');
  addReason(reasons, artist > 0, signals.followedArtistIds.has(String(track.artist?._id || '')) ? 'followed_artist' : 'artist_affinity');
  addReason(reasons, genre > 0, 'genre_affinity');
  addReason(reasons, collab > 0, 'collaborative');
  addReason(reasons, repeat72 > 0, 'recent_repeat');
  addReason(reasons, isObsessed, 'current_obsession');
  addReason(reasons, recentlyPlayedPenalty < 1, 'fatigue');
  addReason(reasons, seenPenalty < 1, 'already_seen');
  addReason(reasons, skipPenalty < 1, 'skip_penalty');
  addReason(reasons, reasons.length === 0, 'exploration');

  const next: RecommendedTrack = {
    ...track,
    recommendationScore: Number(score.toFixed(6)),
    recommendationReasons: reasons,
    isCurrentObsession: isObsessed,
  };

  if (context.debug) {
    next.recommendationDebug = {
      base,
      fresh: Number(fresh.toFixed(3)),
      artist: Number(artist.toFixed(3)),
      genre: Number(genre.toFixed(3)),
      repeat24,
      repeat72,
      completes72,
      collab,
      liked,
      recentlyPlayedPenalty: Number(recentlyPlayedPenalty.toFixed(3)),
      seenPenalty,
      skipPenalty,
    };
  }

  return next;
}

export function rerankTracks(
  tracks: RecommendedTrack[],
  signals: UserRecommendationSignals,
  context: RecommendationContext = {},
) {
  const maxConsecutiveArtists = context.maxConsecutiveArtists || 2;
  const scored = tracks
    .map((track) => scoreTrackCandidate(track, signals, context))
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));

  const result: RecommendedTrack[] = [];
  const deferred: RecommendedTrack[] = [];

  for (const track of scored) {
    const artistId = track.artist?._id || '';
    let consecutive = 0;
    for (let i = result.length - 1; i >= 0 && i >= result.length - maxConsecutiveArtists; i--) {
      if (result[i]?.artist?._id && result[i].artist?._id === artistId) consecutive++;
      else break;
    }
    if (artistId && consecutive >= maxConsecutiveArtists) deferred.push(track);
    else result.push(track);
  }

  for (const track of deferred) {
    const artistId = track.artist?._id || '';
    let inserted = false;
    for (let i = maxConsecutiveArtists; i < result.length; i++) {
      const before = result.slice(Math.max(0, i - maxConsecutiveArtists + 1), i);
      if (!before.some((item) => item.artist?._id === artistId)) {
        result.splice(i, 0, track);
        inserted = true;
        break;
      }
    }
    if (!inserted) result.push(track);
  }

  // Exploration slots: keep some fresh/unknown tracks from being buried by old stats.
  const freshCandidates = scored.filter((track) => track.isFresh || (track.recommendationReasons || []).includes('fresh'));
  for (let i = 5; i < result.length && freshCandidates.length; i += 9) {
    const candidate = freshCandidates.shift();
    if (!candidate) continue;
    const currentIndex = result.findIndex((track) => track._id === candidate._id);
    if (currentIndex > i) {
      result.splice(currentIndex, 1);
      result.splice(i, 0, candidate);
    }
  }

  return result;
}

export function scorePostCandidate(
  post: RecommendedPost,
  signals: UserRecommendationSignals,
  context: RecommendationContext = {},
): RecommendedPost {
  const now = context.now || Date.now();
  const creatorId = String(post.creator?.id || post.creator_id || '');
  const trackId = String(post.track_id || post.track?.id || '');
  const likes = Number(post.likes_count || 0);
  const comments = Number(post.comments_count || 0);
  const fresh = freshnessScore(post.created_at, now);
  const reasons: RecommendationReason[] = [];
  let score = fresh + Math.log10(1 + likes) * 2.4 + Math.log10(1 + comments) * 3.2;

  if (creatorId && signals.followedArtistIds.has(creatorId)) {
    score += 7;
    reasons.push('followed_artist');
  }
  if (creatorId && signals.followedPostCreatorIds.has(creatorId)) {
    score += 4;
    reasons.push('social_engagement');
  }
  const creatorAffinity = creatorId ? signals.artistAffinity.get(creatorId) || 0 : 0;
  if (creatorAffinity > 0) {
    score += Math.min(6, creatorAffinity * 0.9);
    reasons.push('artist_affinity');
  }
  if (trackId && (signals.likedTrackIds.has(trackId) || signals.completedTrackIds.has(trackId) || signals.currentObsessionTrackIds.has(trackId))) {
    score += signals.currentObsessionTrackIds.has(trackId) ? 8 : 4;
    reasons.push('post_track_match');
  }
  const postTrackGenres = toArray(post.track?.genre).map(norm);
  const genreMatch = postTrackGenres.reduce((sum, genre) => sum + (signals.preferredGenres.get(genre) || 0), 0);
  if (genreMatch > 0) {
    score += Math.min(5.5, genreMatch * 0.75);
    reasons.push('genre_affinity');
  }
  if (fresh > 1.2) reasons.push('fresh');
  if (signals.recentlyRecommendedPostIds.has(String(post.id || ''))) {
    score *= 0.58;
    reasons.push('already_seen');
  }
  if (likes + comments > 0) reasons.push('social_engagement');
  if (!reasons.length) reasons.push('exploration');

  const next: RecommendedPost = {
    ...post,
    recommendationScore: Number(score.toFixed(6)),
    recommendationReasons: Array.from(new Set(reasons)),
  };
  if (context.debug) {
    next.recommendationDebug = { fresh: Number(fresh.toFixed(3)), likes, comments, creatorId, trackId };
  }
  return next;
}

export function rerankPosts(posts: RecommendedPost[], signals: UserRecommendationSignals, context: RecommendationContext = {}) {
  return posts
    .map((post) => scorePostCandidate(post, signals, context))
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
}

