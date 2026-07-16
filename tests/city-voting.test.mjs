import assert from 'node:assert/strict';
import test from 'node:test';
import { countCityVotes, selectCityBattleWinner } from '../lib/cityVoting.ts';

const tracks = [
  { _id: 'track-a', pulse: 90, createdAt: '2026-07-15T08:00:00.000Z' },
  { _id: 'track-b', pulse: 70, createdAt: '2026-07-16T08:00:00.000Z' },
];

test('city vote counts contain only persisted vote rows', () => {
  assert.deepEqual(countCityVotes([
    { track_id: 'track-a' },
    { track_id: 'track-b' },
    { track_id: 'track-a' },
    { track_id: null },
  ]), { 'track-a': 2, 'track-b': 1 });
});

test('a city battle cannot produce a winner without a real vote', () => {
  assert.equal(selectCityBattleWinner(tracks, { 'track-a': 0, 'track-b': 0 }), null);
});

test('real vote totals decide the city winner before Pulse is used as a tie breaker', () => {
  assert.equal(selectCityBattleWinner(tracks, { 'track-a': 1, 'track-b': 2 })?._id, 'track-b');
  assert.equal(selectCityBattleWinner(tracks, { 'track-a': 2, 'track-b': 2 })?._id, 'track-a');
});
