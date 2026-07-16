import assert from 'node:assert/strict';
import test from 'node:test';
import { computeTrackDiscoveryMetrics, globalDiscoveryScore } from '../lib/ranking.ts';
import { rerankTracks, scoreTrackCandidate } from '../lib/recommendation/engine.ts';
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
  assert.ok(firstTwelve.filter((item) => item.artist?._id === 'artist-a').length <= 3);
  assert.ok(firstTwelve.filter((item) => item.recommendationBucket === 'emerging').length >= 2);
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
