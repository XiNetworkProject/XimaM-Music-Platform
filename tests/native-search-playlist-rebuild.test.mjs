import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { recentSearches, searchCount, uniqueSearchResults, shuffledTracks, SEARCH_FILTERS } from '../synaura-app/src/components/search/searchModel.ts';
const read = file => fs.readFileSync(new URL('../synaura-app/src/' + file, import.meta.url), 'utf8');
const track = id => ({ _id: id, title: id });

test('recent searches tolerate corrupt storage, trim, deduplicate and stay bounded', () => {
  assert.deepEqual(recentSearches(null), []);
  assert.deepEqual(recentSearches({}), []);
  assert.deepEqual(recentSearches([' XimaM ', null, 7, 'ximam', '', 'a', 'Été']), ['XimaM', 'Été']);
  assert.equal(recentSearches(Array.from({ length: 20 }, (_, n) => 'query-' + n)).length, 8);
  assert.equal(recentSearches(['x'.repeat(200)])[0].length, 120);
});
test('merged search sources deduplicate by entity identity, without dropping first result', () => {
  const first = track('a');
  const input = { tracks: [first, track('a'), track('b')], artists: [{ id: 'a' }], playlists: [{ id: 'p' }, { id: 'p' }], posts: [{ id: 'x' }, { id: 'x' }] };
  const results = uniqueSearchResults(input);
  assert.equal(results.tracks[0], first);
  assert.equal(searchCount(results, 'all'), 5);
  assert.equal(searchCount(results, 'posts'), 1);
  assert.equal(input.tracks.length, 3);
  assert.deepEqual(SEARCH_FILTERS.map(item => item.value), ['all', 'tracks', 'artists', 'playlists', 'posts']);
});
test('shuffle preserves every queue entry and never mutates the source', () => {
  const original = Object.freeze([track('a'), track('b'), track('a'), track('d')]);
  const shuffled = shuffledTracks(original, () => 0);
  assert.deepEqual(original.map(item => item._id), ['a', 'b', 'a', 'd']);
  assert.equal(shuffled.length, original.length);
  original.forEach(item => assert.equal(shuffled.filter(next => next === item).length, 1));
  assert.notDeepEqual(shuffled, original);
  assert.deepEqual(shuffledTracks([]), []);
  assert.deepEqual(shuffledTracks([original[0]]), [original[0]]);
});
test('search clears pending short queries, hides stale results and ignores outdated requests', () => {
  const source = read('screens/SearchScreen.tsx');
  assert.match(source, /value.length < 2\) \{ setLoading\(false\); setResolvedQuery\(''\)/);
  assert.match(source, /resolvedQuery !== value/);
  assert.match(source, /if \(!cancelled\) \{ setResults\(uniqueSearchResults\(next\)\)/);
  assert.match(source, /cancelled = true; clearTimeout\(timer\)/);
  assert.match(source, /\}, \[value, retry\]\)/); // changing result filters is local, not a new search
  assert.match(source, /recentTouched.current/);
});
test('search retains explicit playback, detail navigation and actions for all four entities', () => {
  const source = read('screens/SearchScreen.tsx');
  assert.match(source, /player.current\?\._id === track._id\) await player.togglePlayPause\(\)/);
  assert.match(source, /player.setQueueAndPlay\(source, index\)/);
  for (const route of ['TrackDetail', 'PublicProfile', 'PlaylistDetail', 'PostDetail']) assert.ok(source.includes("navigate('" + route + "'"));
  assert.match(source, /<TrackActionsSheet/);
  assert.match(source, /post.imageUrl/);
  assert.doesNotMatch(source, /autoFocus\b/);
});
test('playlist keeps real data and long-list virtualization, no automatic playback', () => {
  const source = read('screens/PlaylistDetailScreen.tsx');
  assert.match(source, /getPlaylistDetail\(playlistId\)/);
  assert.match(source, /<FlatList<Track>/);
  assert.doesNotMatch(source, /CollectionReveal/); // observed Android late-mount opacity regression
  assert.match(source, /layout.miniPlayerClearance \+ 28/);
  assert.match(source, /keyExtractor=\{\(track, index\) => track._id \+ ':' \+ index\}/);
  assert.match(source, /setQueueAndPlay\(list, index\)/);
  assert.match(source, /onPress=\{\(\) => void playFrom\(shuffledTracks\(tracks\)\)\}/);
  assert.match(source, /entityVersion.current !== version/);
});
test('playlist permissions, sharing, download and like rollback are preserved', () => {
  const source = read('screens/PlaylistDetailScreen.tsx');
  assert.match(source, /collection\?\.downloadEnabled !== false && playlist\?\.downloadEnabled !== false/);
  assert.match(source, /collection\?\.commentsEnabled !== false && playlist\?\.commentsEnabled !== false/);
  assert.match(source, /if \(!canDownload \|\| !track.audioUrl\) return/);
  assert.match(source, /if \(!result\) throw new Error/);
  assert.match(source, /\[track._id\]: beforeCount/);
  assert.match(source, /likePending.current.has\(track._id\)/);
  assert.match(source, /player.addNext\(track\)/);
  assert.match(source, /<EntityShareSheet/);
  assert.match(source, /<ShareSheet/);
  assert.match(source, /Clipboard.setStringAsync\(webUrl\)/);
});
test('shared search field is theme aware, clear remains available during requests and touch target stays 44px', () => {
  const source = read('components/search/SynauraSearchField.tsx');
  assert.match(source, /useCollectionPalette\(\)/);
  assert.match(source, /<TextInput accessibilityLabel=\{placeholder\}/);
  assert.match(source, /clear: \{ width: 44, height: 44/);
  assert.match(source, /loading \? <ActivityIndicator[\s\S]*?: null\}[\s\S]*?\{value \? <EntryPressable/);
});
