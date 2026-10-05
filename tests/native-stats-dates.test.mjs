import test from 'node:test';
import assert from 'node:assert/strict';
import { serverDateMillis, countdownLabel } from '../synaura-app/src/utils/serverDate.ts';
import { chartMaximum, linePath, buildStatsTrend, validStatsMetrics } from '../synaura-app/src/stats/chartModel.ts';
const point = (date, plays = 0, retention = null) => ({ date, plays, retention, likes: 0, uniques: 0, dataQuality: retention === null ? 'insufficient' : 'real' });
test('production PostgreSQL timestamps convert to ISO and give a finite native countdown', () => {
  assert.equal(serverDateMillis('2026-10-05 22:00:00+00'), Date.parse('2026-10-05T22:00:00Z'));
  assert.equal(countdownLabel('2026-10-05 22:00:00+00', Date.parse('2026-10-05T21:58:59Z')), '00:01:01');
  assert.equal(countdownLabel('invalid'), 'Horaire indisponible');
  assert.equal(countdownLabel(null), 'Horaire indisponible');
  assert.equal(countdownLabel('2026-10-05T21:00:00Z', Date.parse('2026-10-05T22:00:00Z')), '00:00:00');
});
test('comparison shares a single magnitude scale instead of making 10 and 100 look identical', () => {
  const max = chartMaximum([10], [100]); assert.equal(max, 100);
  assert.equal(linePath([10], 100, 100, max), 'M 0.0 75.6');
  assert.equal(linePath([100], 100, 100, max), 'M 0.0 18.0');
});
test('insufficient retention creates a gap rather than an invented 0%', () => {
  const result = buildStatsTrend([point('a', 2, 50), point('b'), point('c', 4, 75)], [], [], 'tracks', 'retention');
  assert.deepEqual(result.values, [50, null, 75]);
  assert.match(linePath(result.values, 100, 100), /^M .* M /);
});
test('comparison aligns dates and retains social-only days in global statistics', () => {
  const result = buildStatsTrend([point('2026-01-01', 10)], [{ date: '2026-01-02', posts: 1, likes: 5, comments: 2 }], [point('2026-01-02', 30)], 'global', 'likes');
  assert.deepEqual(result.points, [{ date: '2026-01-01', value: 0 }, { date: '2026-01-02', value: 5 }]);
  assert.deepEqual(result.compareValues, [null, 0]);
});
test('post analysis does not offer unavailable audio metrics', () => {
  assert.deepEqual(validStatsMetrics('posts'), ['posts', 'likes', 'comments']);
  assert.ok(!validStatsMetrics('tracks').includes('comments'));
  assert.ok(!linePath([NaN, Infinity, null], 100, 100).includes('NaN'));
});
