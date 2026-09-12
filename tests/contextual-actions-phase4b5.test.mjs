import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { insertQueueTrack, remainingQueueStart, normalizeActionTrack, canPlaylistTrack, trackShareUrl, trackHandoffHref, nativeTrackShare, copyTrackLink } from '../lib/trackActions.ts';
const source = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const t = id => ({ _id: id });
test('copy is canonical and denied clipboard never produces fake success', async () => {
  let copied;
  await copyTrackLink('a', { writeText: async value => { copied = value; } });
  assert.equal(copied, 'https://synaura.fr/track/a');
  await assert.rejects(copyTrackLink('a', undefined), /manuellement/);
  await assert.rejects(copyTrackLink('a', {writeText: async()=>{throw Error('denied');}}), /manuellement/);
});
test('queue without a loaded track retains its first item as upcoming, not current', () => {
  assert.equal(remainingQueueStart([t('a'), t('b')], null), 0);
  assert.equal(remainingQueueStart([t('a'), t('b')], 'missing'), 0);
  assert.equal(remainingQueueStart([t('a'), t('b')], 'a'), 1);
});
test('next/end preserve current identity, deduplicate, never mutate the input', () => {
  const queue = ['a','b','c'].map(t);
  assert.deepEqual(insertQueueTrack(queue, 'b', t('a'), 'next').map(t => t._id), ['b','a','c']);
  assert.deepEqual(insertQueueTrack(queue, 'b', t('a'), 'end').map(t => t._id), ['b','c','a']);
  assert.deepEqual(queue.map(t => t._id), ['a','b','c']);
  assert.equal(insertQueueTrack(queue, 'b', t('b'), 'next'), queue);
  assert.deepEqual(insertQueueTrack([], null, t('a'), 'next'), [t('a')]);
});
test('full queue rejects insertion explicitly rather than silently dropping a track', () => {
  const queue = Array.from({length:500}, (_, i) => t(String(i)));
  assert.throws(() => insertQueueTrack(queue, '499', t('new'), 'end'), /500/);
  assert.equal(insertQueueTrack(queue, '499', t('1'), 'end').length, 500);
});
test('track normalization and actual playlist support exclude radio and AI foreign IDs', () => {
  const track = normalizeActionTrack({id:'abc', artist:'Alice', creatorId:'u1', audio_url:'/a', genre:['Pop']});
  assert.equal(track.artist._id, 'u1'); assert.equal(track.artist.name, 'Alice'); assert.equal(track.audioUrl, '/a');
  assert(canPlaylistTrack('abc')); assert(!canPlaylistTrack('ai-a')); assert(!canPlaylistTrack('radio-a')); assert(!canPlaylistTrack(''));
});
test('share and creation use canonical routes and preserve a Live return token', () => {
  const track = normalizeActionTrack({id:'a/b'});
  assert.equal(trackShareUrl(track._id), 'https://synaura.fr/track/a%2Fb');
  const remix = new URL(trackHandoffHref(track, 'remix', 'snapshot-1'), 'https://synaura.fr');
  assert.equal(remix.pathname, '/ai-generator'); assert.equal(remix.searchParams.get('sourceTrackId'), 'a/b');
  assert.equal(remix.searchParams.get('liveReturn'), 'snapshot-1');
  const clip = new URL(trackHandoffHref(track, 'clip'), 'https://synaura.fr');
  assert.equal(clip.pathname, '/clips/new'); assert.equal(clip.searchParams.get('trackType'), 'track');
});
test('native share, unsupported fallback, rejected fallback and user cancellation are distinct', async () => {
  const track = { _id:'a', title:'A' }; let payload;
  assert.equal(await nativeTrackShare(track, {share:async d => {payload=d;}}), 'shared');
  assert.equal(payload.url, trackShareUrl('a'));
  assert.equal(await nativeTrackShare(track, {}), 'fallback');
  assert.equal(await nativeTrackShare(track, {canShare:()=>false,share:async()=>assert.fail()}), 'fallback');
  assert.equal(await nativeTrackShare(track, {share:async()=>{throw Error('denied');}}), 'fallback');
  assert.equal(await nativeTrackShare(track, {share:async()=>{throw new DOMException('cancelled','AbortError');}}), 'cancelled');
});
test('all heavy actions are lazy, queries are not imported by the entry button', async () => {
  const registration = await source('components/actions/ActionsRegistration.tsx');
  assert.match(registration, /dynamic\(\(\) => import\('\.\/ActionsSurface'\)/);
  const button = await source('components/actions/TrackActionButton.tsx');
  assert.doesNotMatch(button, /useActionTrack|useOwnedPlaylists|fetch\(/);
  const actions = await source('components/actions/useTrackActions.ts');
  assert.match(actions, /replace: Boolean\(controller.current && siblings.has/);
  assert.doesNotMatch(actions, /\.play\(|\.pause\(|\.seek\(|setQueue/);
});
test('playlist picker uses owned real API, private creation, actual membership and explicit feedback', async () => {
  const surface = await source('components/actions/ActionsSurface.tsx');
  assert.match(surface, /isPublic: false/); assert.match(surface, /exists \? 'DELETE' : 'POST'/);
  assert.match(surface, /aria-pressed=\{exists\}/); assert.match(surface, /playlistKey\(viewer\)/);
  assert.doesNotMatch(surface, /\/api\/playlists\/simple|new Audio\(/);
});
test('favorite mutation reads server state and publishes only successful mutations', async () => {
  const fullClient = await source('lib/organizationClient.ts');
  const client = fullClient.slice(fullClient.indexOf('export function useFavoriteActions'));
  assert.match(client, /method: liked \? 'DELETE' : 'POST'/);
  assert(client.indexOf('const after = await organizationRequest') < client.indexOf('syncLikeState(id'));
  assert.match(client, /client.isMutating/);
  assert.match(client, /cancelQueries/);
  assert.match(fullClient, /likeState\[id\]\.lastUpdated < query.data.startedAt/);
});
test('only AudioCore owns queue; old queue surfaces are adapters', async () => {
  const provider = await source('app/providers.tsx');
  assert.doesNotMatch(provider, /setItem\(['"]queue\.upnext|\[upNextTracks, setUpNextTracks\]/);
  assert.match(provider, /core\.reorderQueue\(insertQueueTrack/);
  const dialog = await source('components/QueueDialog.tsx');
  assert.match(dialog, /actions.open\(null, 'queue'\)/); assert.doesNotMatch(dialog, /createPortal|UModal/);
});
test('404 Clips nav is removed and Track actions wrap accessibly', async () => {
  assert.doesNotMatch(await source('lib/primaryNavigation.ts'), /href: ['"]\/clips['"]/);
  assert.match(await source('app/track/[id]/TrackPageClient.tsx'), /flex flex-wrap/);
  assert.match(await source('components/actions/ActionsSurface.tsx'), /ArrowDown.*ArrowUp.*Home.*End/);
});
