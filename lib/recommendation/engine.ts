import type {
  DiscoveryBucket,
  RecommendationContext,
  RecommendationReason,
  RecommendedPost,
  RecommendedTrack,
  TrackDiscoveryMetrics,
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
  if (!createdAt) return 24 * 365;
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return 24 * 365;
  return Math.max(0, (now - ts) / 3_600_000);
}

function freshnessScore(createdAt: string | undefined, now: number) {
  return 10 * Math.exp(-ageHours(createdAt, now) * Math.LN2 / (24 * 14));
}

function saturating(value: number, scale: number) {
  return 1 - Math.exp(-Math.max(0, value) / scale);
}

export function deterministicUnit(seed: string, id: string) {
  const key = `${seed}\x00${id}`;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}

function fallbackMetrics(track: RecommendedTrack, now: number): TrackDiscoveryMetrics {
  const base = Math.max(0, Math.min(10, Number(track.rankingScore || 0)));
  const fresh = freshnessScore(track.createdAt, now);
  return {
    plays30d: Number(track.plays || 0),
    completes30d: 0,
    likes30d: 0,
    shares30d: 0,
    saves30d: 0,
    comments30d: 0,
    reactions30d: 0,
    uniqueListeners30d: 0,
    completionRate30d: 0,
    creatorFollowers: Number(track.artist?.followersCount || 0),
    ageHours: ageHours(track.createdAt, now),
    qualityScore: base,
    reachScore: base * 0.75,
    momentumScore: base * 0.55,
    freshnessScore: fresh,
    emergingScore: Math.min(10, base * 0.5 + fresh * 0.35),
    catalogScore: base * 0.8,
    confidence: 0.35,
  };
}

function genreAffinity(track: RecommendedTrack, signals: UserRecommendationSignals) {
  const genres = toArray(track.genre).map(norm);
  let positive = 0;
  let negative = 0;
  let sessionPositive = 0;
  let sessionNegative = 0;
  for (const genre of genres) {
    positive += signals.preferredGenres.get(genre) || 0;
    negative += signals.avoidedGenres.get(genre) || 0;
    sessionPositive += signals.currentSessionPreferredGenres.get(genre) || 0;
    sessionNegative += signals.currentSessionAvoidedGenres.get(genre) || 0;
  }
  return {
    positive: 6 * saturating(positive, 8),
    negative: 4.5 * saturating(negative, 5),
    sessionPositive: 5.5 * saturating(sessionPositive, 4.5),
    sessionNegative: 7 * saturating(sessionNegative, 3.5),
  };
}

function artistAffinity(track: RecommendedTrack, signals: UserRecommendationSignals) {
  const artistId = String(track.artist?._id || '');
  if (!artistId) return { positive: 0, negative: 0, sessionPositive: 0, sessionNegative: 0, followed: false };
  const followed = signals.followedArtistIds.has(artistId);
  return {
    positive: 6.5 * saturating(signals.artistAffinity.get(artistId) || 0, 7) + (followed ? 4.5 : 0),
    negative: 5 * saturating(signals.artistAversion.get(artistId) || 0, 5),
    sessionPositive: 6 * saturating(signals.currentSessionArtistAffinity.get(artistId) || 0, 4),
    sessionNegative: 8 * saturating(signals.currentSessionArtistAversion.get(artistId) || 0, 3.5),
    followed,
  };
}

function addReason(reasons: RecommendationReason[], condition: boolean, reason: RecommendationReason) {
  if (condition && !reasons.includes(reason)) reasons.push(reason);
}

function impressionPenalty(id: string, signals: UserRecommendationSignals, now: number, kind: 'track' | 'post' = 'track') {
  const sessionSeen = kind === 'post'
    ? signals.currentSessionRecommendedPostIds.has(id)
    : signals.currentSessionRecommendedTrackIds.has(id);
  const sessionCount = signals.currentSessionRecommendationCounts.get(id) || 0;
  if (sessionSeen || sessionCount > 0) {
    const base = kind === 'post' ? 0.07 : 0.09;
    return Math.max(0.012, base * Math.pow(0.48, Math.max(0, sessionCount - 1)));
  }
  const last = signals.lastRecommendedAt.get(id) || 0;
  const count = signals.recommendationCounts.get(id) || 0;
  if (!last) return 1;
  const hours = Math.max(0, (now - last) / 3_600_000);
  const recency = hours < 6 ? 0.34 : hours < 24 ? 0.52 : hours < 72 ? 0.7 : 0.84;
  return Math.max(0.26, recency * Math.pow(0.93, Math.max(0, count - 1)));
}

function naturalBucket(track: RecommendedTrack, reasons: RecommendationReason[]): DiscoveryBucket {
  const metrics = track.discoveryMetrics;
  if (track.isBoosted) return 'boosted';
  if (reasons.some((reason) => reason === 'followed_artist' || reason === 'artist_affinity' || reason === 'genre_affinity' || reason === 'collaborative')) return 'affinity';
  if ((metrics?.emergingScore || 0) >= 3.4 && (metrics?.plays30d || track.plays || 0) < 500) return 'emerging';
  if ((metrics?.freshnessScore || 0) >= 4.8) return 'fresh';
  if ((metrics?.momentumScore || 0) >= 2.8) return 'momentum';
  if ((metrics?.qualityScore || 0) >= 3.2) return 'quality';
  return 'catalog';
}

export function scoreTrackCandidate(
  track: RecommendedTrack,
  signals: UserRecommendationSignals,
  context: RecommendationContext = {},
): RecommendedTrack {
  const now = context.now || Date.now();
  const id = String(track._id || '');
  const reasons: RecommendationReason[] = [];
  const metrics = track.discoveryMetrics || fallbackMetrics(track, now);
  const artist = artistAffinity(track, signals);
  const genre = genreAffinity(track, signals);
  const repeat24 = signals.trackRepeatCounts24h.get(id) || 0;
  const repeat72 = signals.trackRepeatCounts72h.get(id) || 0;
  const completes72 = signals.trackRecentCompletes72h.get(id) || 0;
  const isObsessed = signals.currentObsessionTrackIds.has(id);
  const recentlyPlayedIndex = signals.recentlyPlayedTrackIds.indexOf(id);
  const seedGenre = norm(context.seedGenre);
  const trackGenres = toArray(track.genre).map(norm);
  const seedAffinity = seedGenre && trackGenres.some((value) => value.includes(seedGenre) || seedGenre.includes(value)) ? 1.2 : 0;
  const collaborative = signals.collaborativeTrackIds.has(id) ? 3.2 : 0;
  const obsessionBoost = isObsessed ? Math.min(5.5, 1.8 + repeat72 * 0.65 + completes72 * 0.95) : 0;
  const promotion = track.isBoosted ? Math.min(1.2, Math.max(0.35, Number(track.boostMultiplier || 1) - 0.7)) : 0;
  const sessionArtistExposure = signals.currentSessionArtistCounts.get(String(track.artist?._id || '')) || 0;
  const sessionGenreExposure = trackGenres.reduce(
    (highest, genreId) => Math.max(highest, signals.currentSessionGenreCounts.get(genreId) || 0),
    0,
  );
  const sessionArtistPenalty = sessionArtistExposure > 0
    ? Math.max(0.34, Math.pow(0.72, sessionArtistExposure))
    : 1;
  const sessionGenrePenalty = sessionGenreExposure > 0
    ? Math.max(0.58, Math.pow(0.91, sessionGenreExposure))
    : 1;

  let score: number;
  switch (context.strategy) {
    case 'popular':
      score = metrics.qualityScore * 1.22 + metrics.reachScore * 0.92 + metrics.momentumScore * 0.24 + Math.log1p(Math.max(0, Number(track.plays || 0))) * 0.32;
      break;
    case 'trending':
      score = metrics.momentumScore * 1.55 + metrics.qualityScore * 0.82 + metrics.reachScore * 0.42 + metrics.freshnessScore * 0.2;
      break;
    case 'fresh':
      score = metrics.freshnessScore * 1.35 + metrics.qualityScore * 0.95 + metrics.emergingScore * 0.72 + metrics.momentumScore * 0.35;
      break;
    case 'boosted':
      score = metrics.qualityScore * 0.9 + metrics.momentumScore * 0.45 + metrics.freshnessScore * 0.25 + (track.isBoosted ? 15 + promotion * 2 : 0);
      break;
    default:
      score =
        Number(track.rankingScore || 0) * 0.75 +
        metrics.qualityScore * 0.72 +
        metrics.momentumScore * 0.45 +
        metrics.emergingScore * 0.28 +
        artist.positive +
        genre.positive +
        artist.sessionPositive +
        genre.sessionPositive +
        seedAffinity +
        collaborative +
        obsessionBoost +
        promotion -
        artist.negative -
        genre.negative -
        artist.sessionNegative -
        genre.sessionNegative;
      break;
  }

  let recentPlayPenalty = 1;
  if (recentlyPlayedIndex >= 0) {
    recentPlayPenalty = Math.min(0.82, 0.16 + recentlyPlayedIndex * 0.045);
    if (isObsessed) recentPlayPenalty = Math.max(0.58, recentPlayPenalty);
  }
  const skipPenalty = signals.currentSessionSkippedTrackIds.has(id)
    ? 0.045
    : signals.skippedTrackIds.has(id) ? 0.22 : 1;
  const seenPenalty = impressionPenalty(id, signals, now);
  const repeatPenalty = repeat24 >= 5 && !isObsessed ? 0.5 : repeat24 >= 3 && !isObsessed ? 0.72 : 1;
  const jitter = (deterministicUnit(context.sessionSeed || 'synaura', id) - 0.5) * 0.24;
  score = score
    * recentPlayPenalty
    * skipPenalty
    * seenPenalty
    * repeatPenalty
    * sessionArtistPenalty
    * sessionGenrePenalty
    + jitter;

  addReason(reasons, metrics.qualityScore >= 3.2, 'quality_signal');
  addReason(reasons, metrics.momentumScore >= 2.8, 'momentum');
  addReason(reasons, metrics.emergingScore >= 3.4 && metrics.plays30d < 500, 'emerging_creator');
  addReason(reasons, metrics.freshnessScore >= 4.8 || Boolean(track.isFresh), 'fresh');
  addReason(reasons, metrics.catalogScore >= 3.5 && metrics.ageHours >= 24 * 30, 'catalog_rediscovery');
  addReason(reasons, artist.followed, 'followed_artist');
  addReason(reasons, !artist.followed && artist.positive + artist.sessionPositive > 0.25, 'artist_affinity');
  addReason(reasons, genre.positive + genre.sessionPositive > 0.25 || seedAffinity > 0, 'genre_affinity');
  addReason(reasons, collaborative > 0, 'collaborative');
  addReason(reasons, repeat72 > 0, 'recent_repeat');
  addReason(reasons, isObsessed, 'current_obsession');
  addReason(reasons, recentlyPlayedIndex >= 0, 'fatigue');
  addReason(reasons, sessionArtistPenalty < 1 || sessionGenrePenalty < 1, 'fatigue');
  addReason(reasons, seenPenalty < 1, 'already_seen');
  addReason(reasons, skipPenalty < 1, 'skip_penalty');
  addReason(reasons, Number(track.rankingScore || 0) > 0, 'global_performance');
  addReason(reasons, reasons.length === 0, 'exploration');

  const next: RecommendedTrack = {
    ...track,
    discoveryMetrics: metrics,
    recommendationScore: Number(score.toFixed(6)),
    recommendationReasons: reasons,
    recommendationBucket: naturalBucket({ ...track, discoveryMetrics: metrics }, reasons),
    isCurrentObsession: isObsessed,
  };

  if (context.debug) {
    next.recommendationDebug = {
      quality: metrics.qualityScore,
      momentum: metrics.momentumScore,
      reach: metrics.reachScore,
      freshness: metrics.freshnessScore,
      emerging: metrics.emergingScore,
      artistAffinity: Number(artist.positive.toFixed(3)),
      genreAffinity: Number(genre.positive.toFixed(3)),
      sessionArtistAffinity: Number(artist.sessionPositive.toFixed(3)),
      sessionGenreAffinity: Number(genre.sessionPositive.toFixed(3)),
      negativeAffinity: Number((artist.negative + genre.negative).toFixed(3)),
      sessionNegativeAffinity: Number((artist.sessionNegative + genre.sessionNegative).toFixed(3)),
      repeat24,
      repeat72,
      recentPlayPenalty: Number(recentPlayPenalty.toFixed(3)),
      seenPenalty: Number(seenPenalty.toFixed(3)),
      sessionArtistExposure,
      sessionGenreExposure,
      sessionArtistPenalty: Number(sessionArtistPenalty.toFixed(3)),
      sessionGenrePenalty: Number(sessionGenrePenalty.toFixed(3)),
      skipPenalty,
      signalStrength: signals.signalStrength,
    };
  }

  return next;
}

const SCHEDULES: Record<string, DiscoveryBucket[]> = {
  reco: ['affinity', 'quality', 'emerging', 'fresh', 'affinity', 'momentum', 'emerging', 'catalog', 'quality', 'fresh', 'affinity', 'emerging'],
  popular: ['quality', 'momentum', 'catalog', 'quality', 'emerging', 'momentum', 'quality', 'fresh'],
  trending: ['momentum', 'quality', 'momentum', 'fresh', 'quality', 'emerging', 'momentum', 'catalog'],
  fresh: ['fresh', 'emerging', 'quality', 'fresh', 'momentum', 'emerging', 'fresh', 'catalog'],
  boosted: ['boosted', 'quality', 'boosted', 'fresh', 'boosted', 'emerging', 'quality', 'momentum'],
  mixed: ['affinity', 'emerging', 'quality', 'fresh', 'momentum', 'catalog'],
};

function scheduleForSession(strategy: string, signals: UserRecommendationSignals) {
  if (strategy !== 'reco') return SCHEDULES[strategy] || SCHEDULES.reco;
  if (signals.signalStrength < 8) {
    return ['fresh', 'emerging', 'quality', 'momentum', 'catalog', 'emerging', 'fresh', 'quality', 'momentum', 'catalog'] satisfies DiscoveryBucket[];
  }
  const hasLiveTaste = signals.currentSessionArtistAffinity.size > 0 || signals.currentSessionPreferredGenres.size > 0;
  if (hasLiveTaste) {
    return ['affinity', 'emerging', 'quality', 'affinity', 'fresh', 'momentum', 'affinity', 'catalog', 'emerging', 'quality', 'fresh', 'affinity'] satisfies DiscoveryBucket[];
  }
  return SCHEDULES.reco;
}

function matchesBucket(track: RecommendedTrack, bucket: DiscoveryBucket) {
  const metrics = track.discoveryMetrics;
  const reasons = track.recommendationReasons || [];
  if (bucket === 'boosted') return Boolean(track.isBoosted);
  if (bucket === 'affinity') return reasons.some((reason) => reason === 'followed_artist' || reason === 'artist_affinity' || reason === 'genre_affinity' || reason === 'collaborative');
  if (bucket === 'emerging') return (metrics?.emergingScore || 0) >= 3.4 && (metrics?.plays30d || track.plays || 0) < 500;
  if (bucket === 'fresh') return (metrics?.freshnessScore || 0) >= 4.8;
  if (bucket === 'momentum') return (metrics?.momentumScore || 0) >= 2.8;
  if (bucket === 'quality') return (metrics?.qualityScore || 0) >= 3.2;
  return (metrics?.catalogScore || 0) >= 3.2 || (metrics?.ageHours || 0) >= 24 * 30;
}

function primaryGenre(track: RecommendedTrack) {
  return norm(toArray(track.genre)[0] || '');
}

export function rerankTracks(
  tracks: RecommendedTrack[],
  signals: UserRecommendationSignals,
  context: RecommendationContext = {},
) {
  const strategy = context.strategy || 'reco';
  const hardGenre = norm(context.genreFilter);
  const scored = tracks
    .filter((track) => !hardGenre || toArray(track.genre).some((genre) => norm(genre).includes(hardGenre)))
    .map((track) => scoreTrackCandidate(track, signals, context))
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
  const remaining = [...scored];
  const result: RecommendedTrack[] = [];
  const artistCounts = new Map<string, number>();
  const bucketCounts = new Map<DiscoveryBucket, number>();
  let aiCount = 0;
  const schedule = scheduleForSession(strategy, signals);
  const explorationPressure = Math.max(0.16, Math.min(0.46, 0.46 - signals.signalStrength * 0.004));

  const allowed = (track: RecommendedTrack, position: number, strict: boolean) => {
    const artistId = String(track.artist?._id || '');
    const artistCount = artistCounts.get(artistId) || 0;
    const maxPerArtist = context.maxPerArtist || (position < 24 ? 3 : position < 60 ? 6 : Number.POSITIVE_INFINITY);
    if (strict && artistId && artistCount >= maxPerArtist) return false;
    if (strict && result.length && artistId && result[result.length - 1]?.artist?._id === artistId) return false;
    if (strict && track.isAI && position >= 5 && aiCount / Math.max(1, position) >= 0.45) return false;
    const genre = primaryGenre(track);
    if (strict && genre && result.length >= 2 && result.slice(-2).every((item) => primaryGenre(item) === genre)) return false;
    return true;
  };

  while (remaining.length) {
    const position = result.length;
    const desired = schedule[position % schedule.length];
    let candidates = remaining.filter((track) => matchesBucket(track, desired) && allowed(track, position, true));
    if (!candidates.length) candidates = remaining.filter((track) => allowed(track, position, true));
    if (!candidates.length) candidates = remaining.filter((track) => allowed(track, position, false));
    if (!candidates.length) break;

    const recentGenres = result.slice(-8).map(primaryGenre);
    candidates.sort((a, b) => {
      const adjusted = (track: RecommendedTrack) => {
        const artistId = String(track.artist?._id || '');
        const genre = primaryGenre(track);
        const metrics = track.discoveryMetrics;
        const discoveryLift = desired === 'emerging' || desired === 'fresh' || desired === 'catalog'
          ? ((metrics?.emergingScore || 0) * 0.38
            + (metrics?.freshnessScore || 0) * 0.22
            + (1 - Math.max(0, Math.min(1, metrics?.confidence || 0))) * 1.4) * explorationPressure
          : 0;
        return Number(track.recommendationScore || 0)
          + discoveryLift
          - (artistCounts.get(artistId) || 0) * 1.05
          - recentGenres.filter((value) => value && value === genre).length * 0.28
          - (bucketCounts.get(desired) || 0) * 0.08;
      };
      return adjusted(b) - adjusted(a);
    });

    const selected = candidates[0];
    const index = remaining.findIndex((track) => track._id === selected._id);
    remaining.splice(index, 1);
    const selectedBucket = matchesBucket(selected, desired) ? desired : selected.recommendationBucket || naturalBucket(selected, selected.recommendationReasons || []);
    selected.recommendationBucket = selectedBucket;
    result.push(selected);
    const artistId = String(selected.artist?._id || '');
    if (artistId) artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
    bucketCounts.set(selectedBucket, (bucketCounts.get(selectedBucket) || 0) + 1);
    if (selected.isAI) aiCount += 1;
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
  let score = fresh * 0.65 + Math.log1p(likes) * 1.8 + Math.log1p(comments) * 2.5;

  if (creatorId && signals.followedArtistIds.has(creatorId)) {
    score += 5.5;
    reasons.push('followed_artist');
  }
  if (creatorId && signals.followedPostCreatorIds.has(creatorId)) {
    score += 3.2;
    reasons.push('social_engagement');
  }
  const creatorAffinity = creatorId ? signals.artistAffinity.get(creatorId) || 0 : 0;
  if (creatorAffinity > 0) {
    score += Math.min(5, creatorAffinity * 0.65);
    reasons.push('artist_affinity');
  }
  if (trackId && (signals.likedTrackIds.has(trackId) || signals.completedTrackIds.has(trackId) || signals.currentObsessionTrackIds.has(trackId))) {
    score += signals.currentObsessionTrackIds.has(trackId) ? 6 : 3.4;
    reasons.push('post_track_match');
  }
  const postTrackGenres = toArray(post.track?.genre).map(norm);
  const genreMatch = postTrackGenres.reduce((sum, genre) => sum + (signals.preferredGenres.get(genre) || 0), 0);
  if (genreMatch > 0) {
    score += Math.min(4.5, genreMatch * 0.55);
    reasons.push('genre_affinity');
  }
  if (fresh > 4.8) reasons.push('fresh');
  const seenPenalty = impressionPenalty(String(post.id || ''), signals, now, 'post');
  if (seenPenalty < 1) {
    score *= seenPenalty;
    reasons.push('already_seen');
  }
  if (likes + comments > 0) reasons.push('social_engagement');
  if (!reasons.length) reasons.push('exploration');

  const next: RecommendedPost = {
    ...post,
    recommendationScore: Number(score.toFixed(6)),
    recommendationReasons: Array.from(new Set(reasons)),
  };
  if (context.debug) next.recommendationDebug = { fresh: Number(fresh.toFixed(3)), likes, comments, creatorId, trackId, seenPenalty };
  return next;
}

export function rerankPosts(posts: RecommendedPost[], signals: UserRecommendationSignals, context: RecommendationContext = {}) {
  const scored = posts
    .map((post) => scorePostCandidate(post, signals, context))
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
  const result: RecommendedPost[] = [];
  const deferred: RecommendedPost[] = [];
  const creatorCounts = new Map<string, number>();
  const attachedTrackIds = new Set<string>();
  let trackShareCount = 0;
  for (const post of scored) {
    const creatorId = String(post.creator?.id || post.creator_id || '');
    const trackId = String(post.track_id || post.track?.id || '');
    const creatorCount = creatorCounts.get(creatorId) || 0;
    const previousCreatorId = String(result[result.length - 1]?.creator?.id || result[result.length - 1]?.creator_id || '');
    const isTrackShare = Boolean(trackId);
    const trackShareRatio = trackShareCount / Math.max(1, result.length);
    const shouldDefer = Boolean(
      (creatorId && (creatorId === previousCreatorId || creatorCount >= 2))
      || (trackId && attachedTrackIds.has(trackId))
      || (isTrackShare && result.length >= 4 && trackShareRatio >= 0.55),
    );
    if (shouldDefer) {
      deferred.push(post);
      continue;
    }
    result.push(post);
    if (creatorId) creatorCounts.set(creatorId, creatorCount + 1);
    if (trackId) attachedTrackIds.add(trackId);
    if (isTrackShare) trackShareCount += 1;
  }
  while (deferred.length) {
    const previousCreatorId = String(result[result.length - 1]?.creator?.id || result[result.length - 1]?.creator_id || '');
    deferred.sort((left, right) => {
      const adjusted = (post: RecommendedPost) => {
        const creatorId = String(post.creator?.id || post.creator_id || '');
        const trackId = String(post.track_id || post.track?.id || '');
        return Number(post.recommendationScore || 0)
          - (creatorId && creatorId === previousCreatorId ? 50 : 0)
          - (creatorCounts.get(creatorId) || 0) * 8
          - (trackId && attachedTrackIds.has(trackId) ? 100 : 0);
      };
      return adjusted(right) - adjusted(left);
    });
    const selected = deferred.shift()!;
    result.push(selected);
    const creatorId = String(selected.creator?.id || selected.creator_id || '');
    const trackId = String(selected.track_id || selected.track?.id || '');
    if (creatorId) creatorCounts.set(creatorId, (creatorCounts.get(creatorId) || 0) + 1);
    if (trackId) attachedTrackIds.add(trackId);
  }
  return result;
}
