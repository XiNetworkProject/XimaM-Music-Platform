import assert from 'node:assert/strict';
import test from 'node:test';
import { rankRelatedTrackCandidates } from '../lib/relatedTracks.ts';

const source = {
  id: 'source',
  artistId: 'artist-source',
  genres: ['Pop', 'Dream'],
  album: 'Moonlight',
};

function candidate(id, options = {}) {
  return {
    track: { id },
    id,
    artistId: options.artistId || `artist-${id}`,
    genres: options.genres || [],
    album: options.album || null,
    plays: options.plays || 0,
    playlistMatches: options.playlistMatches || [],
  };
}

test('real playlist and collection context wins over raw popularity', () => {
  const ranked = rankRelatedTrackCandidates(source, [
    candidate('collection-neighbour', {
      genres: ['Rock'],
      playlistMatches: [{ id: 'collection-1', title: 'Nuits Synaura', kind: 'collection', positionDistance: 1 }],
    }),
    candidate('popular-genre', { genres: ['Pop'], plays: 10_000_000 }),
    candidate('unrelated-popular', { genres: ['Metal'], plays: 99_000_000 }),
  ], 8);

  assert.equal(ranked[0].track.id, 'collection-neighbour');
  assert.match(ranked[0].reasons[0], /Même collection/);
  assert.equal(ranked.some((entry) => entry.track.id === 'unrelated-popular'), false);
});

test('album, genre and creator relations are explicit and deterministic', () => {
  const ranked = rankRelatedTrackCandidates(source, [
    candidate('same-album', { album: 'moonlight', genres: ['Dream'] }),
    candidate('same-creator', { artistId: 'artist-source' }),
    candidate('same-genre', { genres: ['Pop'] }),
  ], 8);

  assert.ok(ranked.find((entry) => entry.track.id === 'same-album')?.reasons.includes('Même album'));
  assert.ok(ranked.find((entry) => entry.track.id === 'same-creator')?.reasons.includes('Même créateur'));
  assert.match(ranked.find((entry) => entry.track.id === 'same-genre')?.reasons[0] || '', /Même ambiance/);
});

test('selection reduces consecutive exposure to one artist', () => {
  const ranked = rankRelatedTrackCandidates(source, [
    candidate('a-1', { artistId: 'artist-a', genres: ['Pop'] }),
    candidate('a-2', { artistId: 'artist-a', genres: ['Pop'] }),
    candidate('b-1', { artistId: 'artist-b', genres: ['Pop'] }),
    candidate('c-1', { artistId: 'artist-c', genres: ['Dream'] }),
  ], 4);

  assert.notEqual(ranked[0].track.id.startsWith('a-') && ranked[1].track.id.startsWith('a-'), true);
});
