import assert from 'node:assert/strict';
import test from 'node:test';
import { computeTrackDiscoveryMetrics, globalDiscoveryScore } from '../lib/ranking.ts';
import { rerankPosts, rerankTracks, scorePostCandidate, scoreTrackCandidate } from '../lib/recommendation/engine.ts';
import { sortTracksNewest } from '../lib/recommendation/chronological.ts';

function signals() {
  return {
    userId: 'test-user',
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
    currentSessionRecommendedTrackIds: new Set(),
    currentSessionRecommendedPostIds: new Set(),
    currentSessionRecommendedClipIds: new Set(),
    currentSessionCompletedTrackIds: new Set(),
    currentSessionSkippedTrackIds: new Set(),
    recommendationCounts: new Map(),
    currentSessionRecommendationCounts: new Map(),
    lastRecommendedAt: new Map(),
    currentSessionArtistCounts: new Map(),
    currentSessionGenreCounts: new Map(),
    currentSessionPreferredGenres: new Map(),
    currentSessionAvoidedGenres: new Map(),
    currentSessionArtistAffinity: new Map(),
    currentSessionArtistAversion: new Map(),
    followedPostCreatorIds: new Set(),
    preferredGenres: new Map(),
    avoidedGenres: new Map(),
    artistAffinity: new Map(),
    artistAversion: new Map(),
    hiddenArtistIds: new Set(),
    trackRepeatCounts24h: new Map(),
    trackRepeatCounts72h: new Map(),
    trackRecentCompletes72h: new Map(),
    currentObsessionTrackIds: new Set(),
    recentlyPlayedTrackIds: [],
    signalStrength: 0,
  };
}

function metrics(overrides = {}) {
  return computeTrackDiscoveryMetrics({
    plays_30d: 40,
    completes_30d: 25,
    likes_30d: 5,
    shares_30d: 2,
    favorites_30d: 2,
    listen_ms_30d: 0,
    unique_listeners_30d: 28,
    retention_complete_rate_30d: 62,
    ageHours: 24 * 12,
    momentumScore: 4.5,
    comments30d: 2,
    reactions30d: 2,
    ...overrides,
  });
}

function track(id, artistId, score, discovery = metrics(), genre = 'pop') {
  return {
    _id: id,
    title: id,
    artist: { _id: artistId, name: artistId },
    audioUrl: `https://example.test/${id}.mp3`,
    genre: [genre],
    createdAt: new Date(Date.now() - discovery.ageHours * 3_600_000).toISOString(),
    plays: discovery.plays30d,
    rankingScore: score,
    discoveryMetrics: discovery,
  };
}

test('small samples receive confidence correction', () => {
  const onePerfectPlay = metrics({
    plays_30d: 1,
    completes_30d: 1,
    likes_30d: 1,
    shares_30d: 0,
    favorites_30d: 0,
    unique_listeners_30d: 1,
    retention_complete_rate_30d: 100,
    momentumScore: 0,
  });
  const confirmedSignal = metrics();
  assert.ok(confirmedSignal.qualityScore > onePerfectPlay.qualityScore);
  assert.ok(confirmedSignal.confidence > onePerfectPlay.confidence);
});

test('skips strongly reduce an otherwise identical candidate', () => {
  const userSignals = signals();
  userSignals.skippedTrackIds.add('skipped');
  const sharedMetrics = metrics();
  const skipped = scoreTrackCandidate(track('skipped', 'artist-a', globalDiscoveryScore(sharedMetrics), sharedMetrics), userSignals, { sessionSeed: 'stable' });
  const kept = scoreTrackCandidate(track('kept', 'artist-b', globalDiscoveryScore(sharedMetrics), sharedMetrics), userSignals, { sessionSeed: 'stable' });
  assert.ok(Number(kept.recommendationScore) > Number(skipped.recommendationScore) * 2);
});

test('session ranking is stable and protects artist diversity', () => {
  const candidates = [];
  for (let index = 0; index < 8; index += 1) candidates.push(track(`a-${index}`, 'artist-a', 9 - index * 0.05));
  for (let index = 0; index < 18; index += 1) {
    const emerging = metrics({
      plays_30d: 24,
      unique_listeners_30d: 16,
      ageHours: 24 * (index % 10),
      momentumScore: index % 3 === 0 ? 5.5 : 3.2,
    });
    candidates.push(track(`other-${index}`, `artist-${index + 2}`, 7.5 - index * 0.03, emerging, index % 2 ? 'rap' : 'electro'));
  }

  const first = rerankTracks(candidates, signals(), { strategy: 'reco', sessionSeed: 'same-session', maxPerArtist: 3 });
  const second = rerankTracks(candidates, signals(), { strategy: 'reco', sessionSeed: 'same-session', maxPerArtist: 3 });
  assert.deepEqual(first.map((item) => item._id), second.map((item) => item._id));
  const firstTwelve = first.slice(0, 12);
  for (let index = 1; index < firstTwelve.length; index += 1) {
    assert.notEqual(firstTwelve[index - 1].artist?._id, firstTwelve[index].artist?._id);
  }
  assert.ok(firstTwelve.filter((item) => item.artist?._id === 'artist-a').length <= 2);
  assert.ok(firstTwelve.filter((item) => item.recommendationBucket === 'emerging').length >= 2);
});

test('a track already shown in the active session falls behind an unseen equivalent', () => {
  const userSignals = signals();
  userSignals.currentSessionRecommendedTrackIds.add('seen-now');
  userSignals.currentSessionRecommendationCounts.set('seen-now', 1);
  userSignals.lastRecommendedAt.set('seen-now', Date.now());
  const sharedMetrics = metrics();
  const seen = scoreTrackCandidate(track('seen-now', 'artist-a', 8, sharedMetrics), userSignals, { sessionSeed: 'live-session' });
  const unseen = scoreTrackCandidate(track('unseen-now', 'artist-b', 8, sharedMetrics), userSignals, { sessionSeed: 'live-session' });
  assert.ok(Number(unseen.recommendationScore) > Number(seen.recommendationScore) * 5);
});

test('session-level artist and genre exposure opens room for discovery', () => {
  const userSignals = signals();
  userSignals.currentSessionArtistCounts.set('artist-overexposed', 4);
  userSignals.currentSessionGenreCounts.set('rap', 5);
  const sharedMetrics = metrics();
  const fatigued = scoreTrackCandidate(track('fatigued', 'artist-overexposed', 8, sharedMetrics, 'rap'), userSignals, { sessionSeed: 'live-session' });
  const fresh = scoreTrackCandidate(track('fresh-space', 'artist-new', 8, sharedMetrics, 'ambient'), userSignals, { sessionSeed: 'live-session' });
  assert.ok(Number(fresh.recommendationScore) > Number(fatigued.recommendationScore) * 2);
});

test('live session taste reacts more strongly than long-term taste', () => {
  const userSignals = signals();
  userSignals.currentSessionArtistAffinity.set('artist-now', 6);
  userSignals.currentSessionPreferredGenres.set('soul', 5);
  userSignals.currentSessionArtistAversion.set('artist-skip', 6);
  userSignals.currentSessionAvoidedGenres.set('metal', 5);
  const sharedMetrics = metrics();
  const wanted = scoreTrackCandidate(track('wanted-now', 'artist-now', 7, sharedMetrics, 'soul'), userSignals, { sessionSeed: 'live-taste' });
  const rejected = scoreTrackCandidate(track('rejected-now', 'artist-skip', 7, sharedMetrics, 'metal'), userSignals, { sessionSeed: 'live-taste' });
  assert.ok(Number(wanted.recommendationScore) > Number(rejected.recommendationScore) * 3);
});

test('a skip in the current session almost removes the same track', () => {
  const userSignals = signals();
  userSignals.currentSessionSkippedTrackIds.add('session-skip');
  const sharedMetrics = metrics();
  const skipped = scoreTrackCandidate(track('session-skip', 'artist-a', 9, sharedMetrics), userSignals, { sessionSeed: 'live-skip' });
  const unseen = scoreTrackCandidate(track('session-unseen', 'artist-b', 9, sharedMetrics), userSignals, { sessionSeed: 'live-skip' });
  assert.ok(Number(unseen.recommendationScore) > Number(skipped.recommendationScore) * 10);
});

test('an explicitly hidden artist is removed before reranking', () => {
  const userSignals = signals();
  userSignals.hiddenArtistIds.add('artist-hidden');
  const ranked = rerankTracks([
    track('hidden-track', 'artist-hidden', 999),
    track('visible-track', 'artist-visible', 1),
  ], userSignals, { sessionSeed: 'hidden-artist' });
  assert.deepEqual(ranked.map((item) => item._id), ['visible-track']);
});

test('posts already viewed in the active session are not immediately recycled', () => {
  const userSignals = signals();
  userSignals.currentSessionRecommendedPostIds.add('post-seen');
  userSignals.currentSessionRecommendationCounts.set('post-seen', 1);
  userSignals.lastRecommendedAt.set('post-seen', Date.now());
  const createdAt = new Date().toISOString();
  const seen = scorePostCandidate({ id: 'post-seen', created_at: createdAt, likes_count: 3, comments_count: 1 }, userSignals, { sessionSeed: 'live-session' });
  const unseen = scorePostCandidate({ id: 'post-new', created_at: createdAt, likes_count: 3, comments_count: 1 }, userSignals, { sessionSeed: 'live-session' });
  assert.ok(Number(unseen.recommendationScore) > Number(seen.recommendationScore) * 5);
});

test('post ranking prevents one creator and one attached track from filling the feed', () => {
  const createdAt = new Date().toISOString();
  const posts = [
    { id: 'a1', creator_id: 'creator-a', track_id: 'track-a', created_at: createdAt, likes_count: 30 },
    { id: 'a2', creator_id: 'creator-a', track_id: 'track-a', created_at: createdAt, likes_count: 29 },
    { id: 'a3', creator_id: 'creator-a', track_id: 'track-b', created_at: createdAt, likes_count: 28 },
    { id: 'b1', creator_id: 'creator-b', created_at: createdAt, likes_count: 10 },
    { id: 'c1', creator_id: 'creator-c', created_at: createdAt, likes_count: 9 },
  ];
  const ranked = rerankPosts(posts, signals(), { sessionSeed: 'post-diversity' });
  assert.notEqual(ranked[0].creator_id, ranked[1].creator_id);
  assert.equal(ranked.slice(0, 4).filter((post) => post.track_id === 'track-a').length, 1);
});

test('newest sorting is strictly chronological and does not use recommendation scores', () => {
  const newest = track('newest', 'artist-a', 0.1);
  newest.createdAt = '2026-07-16T09:00:00.000Z';
  const popularOlder = track('popular-older', 'artist-b', 999);
  popularOlder.createdAt = '2026-07-15T09:00:00.000Z';
  const oldest = track('oldest', 'artist-c', 5000);
  oldest.createdAt = '2026-07-14T09:00:00.000Z';

  assert.deepEqual(sortTracksNewest([oldest, newest, popularOlder]).map((item) => item._id), [
    'newest',
    'popular-older',
    'oldest',
  ]);
});
