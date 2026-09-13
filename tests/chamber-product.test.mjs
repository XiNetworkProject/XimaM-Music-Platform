import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeChamberCatalog, chamberTime } from '../lib/chamberCatalog.ts';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const track = (overrides = {}) => ({
  _id: 'track-real-a', title: 'Vraie composition',
  artist: { _id: 'creator-a', name: 'Vrai nom', username: 'vrai-compte', avatar: '/media/portrait.jpg' },
  audioUrl: 'https://media.example.test/music.mp3', coverUrl: '/media/cover.jpg',
  duration: 187.4, genre: ['Ambient'], likes: ['listener-a'], comments: ['comment-a'], plays: 29,
  ...overrides,
});

test('Chambre catalog preserves source identities, real counts, source media and flags', () => {
  const raw = track({ likesCount: 47, commentsCount: 13, isLiked: true, isAI: true });
  const [result] = normalizeChamberCatalog({ tracks: [raw], hasMore: true, nextCursor: 18 });
  assert.equal(result._id, raw._id);
  assert.deepEqual(result.artist, raw.artist);
  assert.equal(result.audioUrl, raw.audioUrl);
  assert.equal(result.coverUrl, raw.coverUrl);
  assert.equal(result.duration, 187.4);
  assert.equal(result.likesCount, 47);
  assert.equal(result.commentsCount, 13);
  assert.equal(result.plays, 29);
  assert.equal(result.isLiked, true);
  assert.equal(result.isAI, true);
  assert.deepEqual(result.genre, ['Ambient']);
});

test('Chambre adapter does not invent or broaden remix/clip permissions', () => {
  const permissions = {
    allowClips: false, allowAiVariation: true, canRemixAiVariation: false,
    remixVisibility: 'followers', isPublic: true, variationsCount: 3,
    remixAttribution: { sourceTrackId: 'original-a', artist: 'Auteur original' },
  };
  const raw = Object.freeze(track(permissions));
  const [result] = normalizeChamberCatalog({ tracks: [raw] });
  for (const [key, value] of Object.entries(permissions)) assert.deepEqual(result[key], value, key);
  const [withoutPermissions] = normalizeChamberCatalog({ tracks: [track()] });
  for (const key of ['allowClips', 'allowAiVariation', 'canRemixAiVariation', 'remixVisibility']) {
    assert.equal(Object.hasOwn(withoutPermissions, key), false, key);
  }
  assert.equal(raw.title, 'Vraie composition');
});

test('Chambre catalog deduplicates exact source IDs, ignoring malformed records without inventing IDs', () => {
  const data = normalizeChamberCatalog({ tracks: [null, false, [], 'bad', {}, track(), track({ title: 'duplicate' }), track({ _id: 'track-b', title: 'B' }), track({ _id: 99 })] });
  assert.deepEqual(data.map(item => item._id), ['track-real-a', 'track-b']);
  assert.equal(data[0].title, 'Vraie composition');
});

test('Chambre normalization rejects malformed envelopes and honestly permits an empty catalog', () => {
  for (const payload of [null, false, [], {}, { tracks: null }, { tracks: {} }, { tracks: 'bad' }]) {
    assert.throws(() => normalizeChamberCatalog(payload), /Réponse du catalogue invalide/);
  }
  assert.deepEqual(normalizeChamberCatalog({ tracks: [] }), []);
});

test('Missing metadata stays honest and malformed counts never become invented engagement', () => {
  const [result] = normalizeChamberCatalog({ tracks: [track({
    title: '   ', artist: null, likes: ['a', null, 4], comments: ['c', {}],
    duration: -5, plays: Infinity, likesCount: -7, commentsCount: 'nonsense',
    genre: ['Jazz', false, {}], isLiked: 'true', isAI: 1,
  })] });
  assert.equal(result.title, 'Sans titre');
  assert.equal(result.artist.name, 'Artiste non renseigné');
  assert.equal(result.artist._id, '');
  assert.equal(result.artist.username, '');
  assert.equal(result.duration, 0);
  assert.equal(result.plays, 0);
  assert.equal(result.likesCount, 0);
  assert.equal(result.commentsCount, 0);
  assert.deepEqual(result.likes, ['a']);
  assert.deepEqual(result.comments, ['c']);
  assert.deepEqual(result.genre, ['Jazz']);
  assert.equal(result.isLiked, false);
  assert.equal(result.isAI, false);
  const [fallback] = normalizeChamberCatalog({ tracks: [track({ likesCount: null, commentsCount: undefined })] });
  assert.equal(fallback.likesCount, 1);
  assert.equal(fallback.commentsCount, 1);
});

test('Only usable HTTP(S) or local media paths enable a playable source', () => {
  for (const url of ['https://media.example.test/a.mp3', 'http://127.0.0.1:3000/a.mp3', '/media/a.mp3']) {
    assert.equal(normalizeChamberCatalog({ tracks: [track({ audioUrl: url })] })[0].audioUrl, url);
  }
  for (const url of [undefined, null, {}, 12, '', 'javascript:alert(1)', 'data:audio/wav;base64,x', 'file:///private.wav', '//external.test/a.mp3', 'https://', 'https://not a host/a.mp3']) {
    const [result] = normalizeChamberCatalog({ tracks: [track({ audioUrl: url, coverUrl: url, artist: { avatar: url } })] });
    assert.equal(result.audioUrl, '', String(url));
    assert.equal(result.coverUrl, undefined, String(url));
    assert.equal(result.artist.avatar, undefined, String(url));
  }
});

test('Time labels are bounded, finite and deterministic', () => {
  assert.equal(chamberTime(0), '0:00');
  assert.equal(chamberTime(187.8), '3:07');
  assert.equal(chamberTime(-20), '0:00');
  assert.equal(chamberTime(Infinity), '0:00');
  assert.equal(chamberTime(NaN), '0:00');
});

test('Chambre route remains noindex and guarded from production', async () => {
  const source = await read('app/dev/chambre/page.tsx');
  assert.match(source, /process\.env\.NODE_ENV === 'production'\) notFound\(\)/);
  assert.match(source, /robots:\s*\{ index: false, follow: false \}/);
});

test('Integrated Chambre uses existing musical providers without creating or rerouting audio', async () => {
  const sources = await Promise.all(['ChamberProduct.tsx', 'ChamberListening.tsx', 'ChamberMaterial.tsx'].map(file => read(`components/chamber/${file}`)));
  for (const source of sources) {
    assert.doesNotMatch(source, /<audio\b|new\s+(?:Audio|AudioContext|AudioCore)\s*\(|createMediaElementSource\s*\(|<AudioPlayerProvider\b|<SessionProvider\b/);
    assert.doesNotMatch(source, /\/media\/signature\.wav|synaura-sonic-logo\.wav/);
  }
  assert.match(sources[1], /useAudioPlayer, useAudioTime/);
  assert.match(sources[2], /never analyses or reroutes musical audio/);
});

test('Real catalog query waits for entry, carries cancellation and reuses warm data', async () => {
  const [product, listening] = await Promise.all([read('components/chamber/ChamberProduct.tsx'), read('components/chamber/ChamberListening.tsx')]);
  assert.match(product, /useState\(false\)/);
  assert.match(product, /<ChamberListening enabled=\{entered\}/);
  assert.match(listening, /queryFn: async \(\{ signal \}\)/);
  assert.match(listening, /fetch\('\/api\/ranking\/feed\?limit=18&ai=1&strategy=fresh', \{ signal \}\)/);
  assert.match(listening, /enabled(?:\s*[:,])/);
  assert.match(listening, /enabled: enabled && sessionStatus !== 'loading'/);
  assert.match(listening, /staleTime: 5 \* 60_000/);
  assert.match(listening, /gcTime: 30 \* 60_000/);
  for (const option of ['refetchOnWindowFocus', 'refetchOnReconnect', 'refetchOnMount']) assert.match(listening, new RegExp(`${option}: false`));
  assert.equal((listening.match(/useQuery\(/g) || []).length, 1);
  assert.equal((listening.match(/\bfetch\(/g) || []).length, 1);
  const queryKey = listening.match(/queryKey:\s*\[([^\]]+)\]/)?.[1] || '';
  assert.match(queryKey, /viewer|session|user/i, 'Viewer-dependent likes and remix permissions must not leak across cached sessions.');
});

test('Queue replacement is confined to explicit Play while inspection is read-only', async () => {
  const [product, listening] = await Promise.all([read('components/chamber/ChamberProduct.tsx'), read('components/chamber/ChamberListening.tsx')]);
  const playSelection = listening.slice(listening.indexOf('const playSelection ='), listening.indexOf('const inspectNeighbour ='));
  assert.equal((listening.match(/player\.setQueueAndPlay\(/g) || []).length, 1);
  assert.match(playSelection, /if \(!track\.audioUrl\)/);
  assert.match(playSelection, /const playable = tracks\.filter\(item => item\.audioUrl\)/);
  assert.match(playSelection, /player\.setQueueAndPlay\(playable,/);
  assert.match(listening, /onClick=\{\(\) => void playSelection\(featured\)\}/);
  assert.match(listening, /onClick=\{\(\) => void playSelection\(track\)\}/);
  const inspection = listening.slice(listening.indexOf('const inspectNeighbour ='), listening.indexOf('const commentEntity ='));
  assert.doesNotMatch(inspection, /player\.|setQueue|\.play\(|\.pause\(|\.seek\(/);
  assert.doesNotMatch(product, /setQueueAndPlay|\.play\(|\.pause\(|\.seek\(|new Audio/);
});

test('Profile, comments and actions preserve canonical context hooks and exact source entities', async () => {
  const listening = await read('components/chamber/ChamberListening.tsx');
  for (const hook of ['useProfilePeek', 'useCommentsSurface', 'useTrackActions']) assert.match(listening, new RegExp(`${hook}\\('other'\\)`));
  assert.match(listening, /openProfile\(featured\.artist\.username, event\.currentTarget\)/);
  assert.match(listening, /type: 'track' as const, id: track\._id/);
  assert.match(listening, /creatorId: track\.artist\._id/);
  assert.match(listening, /count: track\.commentsCount/);
  assert.match(listening, /openComments\(commentEntity\(featured\), event\.currentTarget\)/);
  assert.match(listening, /actions\.open\(featured, 'playlist-picker', event\.currentTarget\)/);
  assert.match(listening, /actions\.open\(track, 'queue', event\.currentTarget\)/);
  assert.match(listening, /actions\.share\(featured, event\.currentTarget\)/);
});

test('Transport seek and volume changes only come from explicit native range controls', async () => {
  const listening = await read('components/chamber/ChamberListening.tsx');
  assert.equal((listening.match(/player\.seek\(/g) || []).length, 1);
  assert.match(listening, /aria-label="Position dans le morceau"/);
  assert.match(listening, /onChange=\{event => player\.seek\(Number\(event\.target\.value\)\)\}/);
  assert.match(listening, /onChange=\{event => player\.setVolume\(Number\(event\.target\.value\)\)\}/);
});
