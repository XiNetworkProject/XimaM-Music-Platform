import test from 'node:test';
import assert from 'node:assert/strict';
import { read, compile, policy, engine, clips, signals, track, clip, cohort, now, plain } from './helpers/recommendation-fixtures.mjs';

test('balanced policy targets eight affinity, six fresh and six emerging slots', () => {
  const s = signals(); s.signalStrength = 30; s.preferredGenres.set('rap', 10);
  const ranked = engine.rerankTracks(cohort(), s, { now, sessionSeed: 'balanced' }).slice(0, 20);
  const buckets = ranked.reduce((counts, item) => ({ ...counts, [item.recommendationBucket]: (counts[item.recommendationBucket] || 0) + 1 }), {});
  assert.deepEqual(buckets, { affinity: 8, fresh: 6, emerging: 6 });
  assert.equal(new Set(ranked.map((t) => t._id)).size, 20);
});
test('cold start has no fabricated personal affinity and contains fresh/emerging exploration', () => {
  const ranked = engine.rerankTracks(cohort(), signals(), { now }).slice(0, 20);
  assert.ok(ranked.filter((t) => t.recommendationBucket === 'emerging').length >= 6);
  assert.ok(ranked.filter((t) => t.recommendationBucket === 'fresh').length >= 6);
  assert.ok(ranked.every((t) => !t.recommendationReasons.includes('genre_affinity')));
});
test('ranking is deterministic, independent of input order, deduplicated and non-mutating', () => {
  const source = cohort(); const snapshot = JSON.stringify(source); const s = signals();
  const first = engine.rerankTracks([...source, source[0], { ...source[1], _id: '' }], s, { now, sessionSeed: 'fixed' });
  const second = engine.rerankTracks(source.slice().reverse(), s, { now, sessionSeed: 'fixed' });
  assert.deepEqual(plain(first.map((t) => t._id)), plain(second.map((t) => t._id)));
  assert.equal(JSON.stringify(source), snapshot);
});
test('missing audio and hidden creators never return, even in a sparse fallback', () => {
  const s = signals(); s.hiddenArtistIds.add('blocked');
  const ranked = engine.rerankTracks([track('blocked', 'fresh', 'blocked'), { ...track('silent'), audioUrl: '' }, track('valid')], s, { now });
  assert.deepEqual(plain(ranked.map((t) => t._id)), ['valid']);
});
test('sparse and single-creator catalogues terminate without fabricating tracks', () => {
  const source = Array.from({ length: 60 }, (_, i) => track(`one-${i}`, 'affinity', 'one'));
  assert.equal(engine.rerankTracks(source, signals(), { now }).length, 60);
  assert.equal(engine.rerankTracks([], signals(), { now }).length, 0);
});
test('invalid metrics do not produce NaN/Infinity in any strategy', () => {
  const t = track('invalid'); t.plays = Infinity; t.rankingScore = NaN;
  for (const key of Object.keys(t.discoveryMetrics)) t.discoveryMetrics[key] = NaN;
  for (const strategy of ['reco', 'popular', 'fresh', 'trending', 'mixed', 'boosted']) assert.ok(Number.isFinite(engine.scoreTrackCandidate(t, signals(), { now, strategy }).recommendationScore));
});
test('existing promotion remains bounded and explicitly labelled instead of claiming personal affinity', () => {
  const t = track('same'); const promoted = { ...t, isBoosted: true, boostMultiplier: 999 };
  const s = signals();
  const organic = engine.scoreTrackCandidate(promoted, s, { now, strategy: 'reco' });
  const delta = organic.recommendationScore - engine.scoreTrackCandidate(t, s, { now, strategy: 'reco' }).recommendationScore;
  assert.ok(delta > 0 && delta <= 1.200001);
  assert.equal(organic.recommendationReasons[0], 'promotion');
  assert.ok(engine.scoreTrackCandidate(promoted, s, { now, strategy: 'boosted' }).recommendationScore > engine.scoreTrackCandidate(t, s, { now, strategy: 'boosted' }).recommendationScore);
});
test('low-exposure definition includes creator audience, not only one unpopular track', () => {
  assert.equal(policy.isLowExposure(track('small', 'emerging')), true);
  const t = track('large', 'emerging'); t.discoveryMetrics.creatorFollowers = 50000;
  assert.equal(policy.isLowExposure(t), false);
});
test('diversity continues after position 24 while alternatives remain', () => {
  const source = Array.from({ length: 100 }, (_, i) => ({ id: String(i), creator: `c${i % 10}`, score: i % 10 === 0 ? 999 : 1 }));
  const ranked = policy.diversifyRanked(source, { id: (t) => t.id, creator: (t) => t.creator, score: (t) => t.score });
  for (let i = 1; i < ranked.length; i++) assert.notEqual(ranked[i].creator, ranked[i - 1].creator);
});
test('clips reject hidden creators, hidden sources, unpublished clips and private sources', () => {
  const s = signals(); s.hiddenArtistIds.add('blocked'); s.hiddenArtistIds.add('artist-blocked-source');
  const source = [clip('ok'), clip('author', 'blocked'), clip('source', 'other', 'blocked-source'), { ...clip('draft'), visibility: 'draft' }, { ...clip('private'), sourceTrack: { ...clip('private').sourceTrack, isPublic: false } }, { ...clip('silent'), videoUrl: null }];
  assert.deepEqual(plain(clips.rankMusicClips(source, s, { now }).map((t) => t.id)), ['ok']);
});
test('clips honor source skips, avoid source repetition and tolerate invalid dates/counts', () => {
  const s = signals(); s.currentSessionSkippedTrackIds.add('skipped');
  const ranked = clips.rankMusicClips([clip('skip', 'creator', 'skipped'), clip('normal'), { ...clip('bad'), createdAt: 'invalid', likesCount: NaN, commentsCount: -100 }], s, { now });
  assert.ok(ranked.find((t) => t.id === 'normal').recommendationScore > ranked.find((t) => t.id === 'skip').recommendationScore);
  assert.ok(ranked.every((t) => Number.isFinite(t.recommendationScore)));
});
test('posts remove hidden/private/duplicate entries and bound social count domination', () => {
  const s = signals(); s.hiddenArtistIds.add('hidden');
  const post = { id: 'ok', creator_id: 'visible', likes_count: 100, comments_count: 100, created_at: new Date(now).toISOString() };
  const ranked = engine.rerankPosts([post, post, { ...post, id: 'hidden', creator_id: 'hidden' }, { ...post, id: 'private', is_public: false }], s, { now });
  assert.equal(ranked.length, 1);
  assert.equal(engine.scorePostCandidate(post, s, { now }).recommendationScore, engine.scorePostCandidate({ ...post, likes_count: 1e10, comments_count: 1e10 }, s, { now }).recommendationScore);
});
test('numeric defaults handle missing, blank, malformed, negative and nonfinite inputs', () => {
  for (const value of [null, undefined, '', ' ', 'NaN', 'Infinity', '4x']) assert.equal(policy.boundedInteger(value, 30, 1, 200), 30);
  assert.equal(policy.boundedInteger('-2', 30, 1, 200), 1); assert.equal(policy.boundedInteger('9000', 30, 1, 200), 200);
  assert.equal(policy.boundedInteger('3.5', 30, 1, 200), 3);
});
test('interleave always terminates for every small pool and consumes every available item once', () => {
  for (let t = 0; t < 16; t++) for (let p = 0; p < 16; p++) {
    const tracks = Array.from({ length: t }, (_, i) => `t${i}`), posts = Array.from({ length: p }, (_, i) => `p${i}`);
    const output = policy.interleaveMusicAndPosts(tracks, posts);
    assert.equal(output.length, t + p); assert.equal(new Set(output.map((v) => v.value)).size, t + p);
    assert.deepEqual(plain(output.filter((v) => v.type === 'track').map((v) => v.value)), tracks);
  }
  assert.deepEqual(plain(policy.interleaveMusicAndPosts([1,2,3,4,5,6], ['a','b'], 8).map((v) => v.type)), ['track','track','track','post','track','track','track','post']);
});

// Real handlers; database and authentication dependencies are isolated, no writes.
function routeHarness(path, sessionUser = null, candidates = cohort(40)) {
  const observed = [];
  const db = { from(table) { const query = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve) => resolve({ data: [], count: 0, error: null }) : (...args) => { observed.push([table, key, ...args]); return query; } }); return query; } };
  const apiSignals = signals(); apiSignals.hiddenArtistIds.add('blocked');
  const imports = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers || {} }) } },
    '@/lib/getApiSession': { getApiSession: async () => sessionUser ? { user: { id: sessionUser } } : null },
    '@/lib/database': { dbAdmin: db }, '@/lib/publicTracks': { applyPublicTrackFilter: (q) => q },
    '@/lib/recommendation/policy': policy,
    '@/lib/recommendation': { ...engine, loadGlobalTrackCandidates: async () => candidates, buildRecommendationSignals: async ({ userId }) => { observed.push(['viewer', userId]); return apiSignals; },
      parseRecommendationExclusions: () => new Set(), sortTracksNewest: (items) => items.slice().sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt)) },
    '@/lib/remixServer': { getRemixAttributionForChildren: async () => new Map(), getPublishedVariationCounts: async () => new Map(), normalizeRemixTrackRef: (id) => ({ type: 'track', id }) },
    '@/lib/discoverMoods': { getMoodById: (id) => id === 'ai' ? { id, isAiOnly: true } : id === 'rap' ? { id, keywords: ['rap'] } : null, matchesMoodKeywords: (t) => t.genre.includes('rap') },
    '@/lib/discoverData': { attachLikedFlag: async (tracks) => tracks, getRadarTracks: async (limit, hidden) => { observed.push(['radar-hidden', hidden?.has('blocked')]); return candidates.filter((t) => !hidden?.has(t.artist?._id)).slice(0,limit); } },
    '@/lib/editorialCollections': { getFeaturedEditorialCollections: async () => [] },
  };
  const route = compile(read(path), imports);
  return { observed, get: (query = '') => { const url = new URL(`http://localhost/test?${query}`); return route.GET({ url: url.href, nextUrl: url }); } };
}
for (const path of ['app/api/recommendations/feed/route.ts', 'app/api/recommendations/mixed/route.ts']) {
  test(`${path} does not trust URL userId for personal data`, async () => {
    const anon = routeHarness(path); const response = await anon.get('userId=victim'); assert.equal(response.status, 200);
    assert.deepEqual(anon.observed.find((v) => v[0] === 'viewer'), ['viewer', null]);
    const member = routeHarness(path, 'actual'); await member.get('userId=victim');
    assert.deepEqual(member.observed.find((v) => v[0] === 'viewer'), ['viewer', 'actual']);
  });
}
test('ranking handler returns default 30, not 1, with unchanged JSON keys and policy version', async () => {
  const h = routeHarness('app/api/ranking/feed/route.ts'); const result = await h.get();
  assert.equal(result.status, 200); assert.equal(result.body.tracks.length, 30); assert.equal(result.body.nextCursor, 30);
  assert.equal(result.body.policyVersion, 'balanced-v1'); assert.equal(result.body.hasMore, true);
});
test('Discover newest excludes hidden artists without disturbing chronology; malformed pagination is bounded', async () => {
  const h = routeHarness('app/api/discover/route.ts', 'actual', [track('a','fresh','blocked'), track('b','fresh'), track('c')]);
  const result = await h.get('sort=newest&page=NaN&limit=Infinity');
  assert.equal(result.status, 200); assert.equal(result.body.page, 0); assert.deepEqual(plain(result.body.tracks.map((t) => t._id)), ['b','c']);
});
test('moods use the shared pool but preserve matching, AI intent, private caching and honest scarcity', async () => {
  const path = 'app/api/discover/moods/route.ts';
  const h = routeHarness(path, 'actual', [track('rap'), track('folk','fresh'), { ...track('ai'), isAI: true }, track('blocked','affinity','blocked')]);
  const rap = await h.get('mood=rap'); assert.deepEqual(plain(rap.body.tracks.map((t) => t._id)), ['rap']); assert.equal(rap.body.hasEnough, false);
  const ai = await h.get('mood=ai'); assert.deepEqual(plain(ai.body.tracks.map((t) => t._id)), ['ai']); assert.equal(ai.headers['Cache-Control'], 'private, no-store');
  assert.equal((await h.get('mood=invalid')).status, 400);
});
test('Radar and native overview apply hidden creators before selecting their visible results', async () => {
  for (const path of ['app/api/mobile/discover/route.ts','app/api/discover/radar/route.ts']) {
    const h=routeHarness(path,'actual',[track('hidden','fresh','blocked'),track('visible')]);
    const result=await h.get(); assert.equal(result.status,200);
    assert.deepEqual(h.observed.find((v)=>v[0]==='radar-hidden'),['radar-hidden',true]);
    const items=result.body.tracks || result.body.newest;
    assert.deepEqual(plain(items.map((t)=>t._id)),['visible']);
  }
});

test('clip feed uses a fixed bounded pool, filters before hasMore, and preserves owner listings', async () => {
  const calls = [];
  const source = [clip('a'), clip('b'), clip('c')];
  const db = { from(table) { const query = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve) => resolve({ data: source, error: null }) : (...args) => { calls.push([table, key, ...args]); return query; } }); return query; } };
  const route = compile(read('app/api/music-clips/route.ts'), {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/getApiSession': { getApiSession: async () => ({ user: { id: 'owner' } }) },
    '@/lib/database': { dbAdmin: db },
    '@/lib/musicClips': { formatMusicClips: async (rows) => rows },
    '@/lib/remixServer': { normalizeRemixTrackRef: (id) => ({ id, type: 'track' }) },
    '@/lib/recommendation': { buildRecommendationSignals: async () => signals(), rankMusicClips: clips.rankMusicClips, parseRecommendationExclusions: (value) => new Set((value || '').split(',').filter(Boolean)) },
    '@/lib/recommendation/policy': policy,
  });
  const get = (query) => route.GET({ nextUrl: new URL(`http://localhost/test?${query}`) });
  const feed = await get('limit=2&exclude=b');
  assert.equal(feed.status, 200); assert.equal(feed.body.hasMore, false);
  assert.equal(feed.body.nextCursor, 2); assert.equal(feed.body.policyVersion, 'balanced-v1');
  assert.ok(feed.body.clips.every((item) => item.id !== 'b'));
  assert.ok(calls.some((call) => call[1] === 'limit' && call[2] === 240));
  calls.length = 0;
  const exhausted = await get('limit=2&cursor=2&exclude=b');
  assert.equal(exhausted.body.clips.length, 0); assert.equal(exhausted.body.hasMore, false);
  assert.ok(calls.some((call) => call[1] === 'limit' && call[2] === 240));
  calls.length = 0;
  const owner = await get('creatorId=owner&limit=2');
  assert.equal(owner.body.clips.length, 2); assert.equal(owner.body.hasMore, true);
  assert.equal(owner.body.policyVersion, undefined);
  assert.ok(calls.some((call) => call[1] === 'range' && call[2] === 0 && call[3] === 2));
  assert.ok(!calls.some((call) => call[1] === 'eq' && call[2] === 'visibility'));
  assert.ok(!calls.some((call) => ['insert', 'update', 'delete', 'upsert'].includes(call[1])));
});

function clientHarness() {
  let user = 'a', index = 0, dirty = true, effects = [], value;
  const slots = [], storage = new Map();
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: initial }; return [slots[i].value, (next) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; dirty = true; }]; },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) { const i = index++; if (JSON.stringify(slots[i]?.deps) !== JSON.stringify(deps)) { slots[i] = { deps }; effects.push(fn); } },
  };
  const { useAudioRecommendations } = compile(read('hooks/useAudioRecommendations.ts'), { react, 'next-auth/react': { useSession: () => ({ data: user ? { user: { id: user } } : null }) }, '@/lib/recommendation/policy': policy },
    { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key,value) } });
  function render() { let guard=0; while (dirty && guard++ < 10) { dirty=false; index=0; value=useAudioRecommendations(); const pending=effects; effects=[]; pending.forEach((fn)=>fn()); } return value; }
  return { storage, render, get value() { return value; }, refresh: () => { dirty=true; return render(); }, switchUser: (id) => { user=id; dirty=true; return render(); } };
}
test('client tastes reset across accounts, tolerate bad storage and keep an explicit queue first', () => {
  const h = clientHarness(); h.storage.set('userHistory_a', JSON.stringify([track('a')])); h.render(); assert.equal(h.value.userHistory[0]._id, 'a');
  h.switchUser('b'); assert.equal(h.value.userHistory.length, 0);
  h.storage.set('userHistory_c', '{bad'); h.storage.set('userPreferences_c', 'null'); h.switchUser('c'); assert.equal(h.value.userHistory.length, 0);
  const current = track('current'), queued = track('queued'); assert.equal(h.value.getAutoPlayNext(current, [current,queued], cohort())._id, 'queued');
  assert.equal(h.value.getAutoPlayNext(current, [current], [current]), null);
});
test('client recommendation has creator diversity and does not promote an incidental short listen to a preference', () => {
  const h = clientHarness(); h.render();
  h.value.analyzeListeningSession({ ...track('short'), duration: 180 }, 1); h.refresh();
  assert.equal(h.value.userPreferences.favoriteGenres.length, 0);
  h.value.analyzeListeningSession({ ...track('long'), duration: 180 }, 100); h.refresh(); assert.ok(h.value.userPreferences.favoriteGenres.includes('rap'));
  const candidates = [track('a1','affinity','one'),track('a2','affinity','one'),track('b','affinity','two')];
  const output = h.value.getSimilarTracks(track('reference'), candidates, 3);
  assert.notEqual(output[0].artist._id, output[1].artist._id);
});
test('rolling metrics never replace measured zero with lifetime totals', () => {
  const source = read('lib/recommendation/candidates.ts');
  assert.match(source, /plays_30d: Number\(stats.plays_30d \?\? 0\)/);
  assert.match(source, /likes_30d: Number\(stats.likes_30d \?\? 0\)/);
});
