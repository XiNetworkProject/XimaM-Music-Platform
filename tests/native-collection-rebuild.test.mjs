import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { filterCollectionTracks, sortCollectionTracks } from '../synaura-app/src/components/mobile/collectionModel.ts';
const read = path => fs.readFileSync(new URL('../synaura-app/src/' + path, import.meta.url), 'utf8');
const track = (id, title, fields = {}) => ({ _id: id, title, audioUrl: 'https://example.test/' + id, ...fields });

test('library search keeps the actual queue position, including duplicates and accents', () => {
  const queue = [track('a', 'Autre'), track('b', 'Été bleu'), track('a', 'Autre'), track('b', 'Été bleu')];
  assert.deepEqual(filterCollectionTracks(queue, ' ETE ').map(item => item.index), [1, 3]);
  assert.deepEqual(filterCollectionTracks(queue, '').map(item => item.index), [0, 1, 2, 3]);
});
test('library search includes artist and genre, without mutating the source', () => {
  const queue = Object.freeze([track('a', 'Un son', { artist: { name: 'Éloïse' }, genre: ['Électro'] })]);
  assert.equal(filterCollectionTracks(queue, 'eloise')[0].track, queue[0]);
  assert.equal(filterCollectionTracks(queue, 'electro').length, 1);
  assert.equal(filterCollectionTracks(queue, 'inconnu').length, 0);
});
test('profile sorting is stable, tolerates missing dates and never reorders the source queue', () => {
  const tracks = Object.freeze([track('a', 'A', { createdAt: 'invalid', plays: 5 }), track('b', 'B', { createdAt: '2026-10-01', likesCount: 7 }), track('c', 'C')]);
  assert.deepEqual(sortCollectionTracks(tracks, 'recent').map(item => item._id), ['b', 'a', 'c']);
  assert.equal(sortCollectionTracks(tracks, 'plays')[0]._id, 'a');
  assert.equal(sortCollectionTracks(tracks, 'likes')[0]._id, 'b');
  assert.deepEqual(tracks.map(item => item._id), ['a', 'b', 'c']);
});
test('library uses account playlists, guarded reads and explicit playback only', () => {
  const source = read('screens/LibraryScreen.tsx');
  assert.doesNotMatch(source, /getHomeData/);
  assert.match(source, /Promise\.allSettled\(\[getMyProfile\(\), getFollowingCreators\(\)\]\)/);
  assert.match(source, /if \(id !== requestId.current\) return/);
  assert.match(source, /if \(player.current\?\._id === track._id\) await player.togglePlayPause\(\)/);
  assert.match(source, /player.setQueueAndPlay\(source, index\)/);
  assert.match(source, /style: 'cancel'/);
});
test('shared music cards do not fetch or own playback and stop visual motion offscreen', () => {
  const source = read('components/mobile/CollectionUI.tsx');
  assert.doesNotMatch(source, /usePlayer|fetch\(|@\/api\/client/);
  assert.match(source, /useEntryMotion\(Boolean\(playing\)\)/);
  assert.match(source, /rowCover: \{ flex: 0, width: 62, height: 62 \}/);
  assert.match(source, /EntryMotionScope/);
  assert.match(source, /resolvedTheme === 'light'/);
});
