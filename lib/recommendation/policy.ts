import type { DiscoveryBucket } from './types';

/** Versioned product policy, independent of transport, database and AudioCore. */
export const RECOMMENDATION_POLICY_VERSION = 'balanced-v1';
export const RECOMMENDATION_ENGINE_VERSION = 'discovery-v6';

// Target slots, not a claim that every catalogue can supply every segment.
// Every item occupies one slot; fallback is mandatory for sparse catalogues.
export const BALANCED_SCHEDULE: readonly DiscoveryBucket[] = [
  'affinity', 'fresh', 'emerging', 'affinity', 'fresh',
  'affinity', 'emerging', 'affinity', 'fresh', 'emerging',
  'affinity', 'fresh', 'affinity', 'emerging', 'fresh',
  'affinity', 'emerging', 'affinity', 'fresh', 'emerging',
];
export const COLD_START_SCHEDULE: readonly DiscoveryBucket[] = [
  'fresh', 'emerging', 'quality', 'fresh', 'emerging',
  'fresh', 'emerging', 'catalog', 'fresh', 'emerging',
];

export function finitePositive(value: unknown, ceiling = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(ceiling, Math.max(0, number)) : 0;
}
export function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
}
export function normalizedGenres(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return Array.from(new Set(values.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)));
}
export function uniqueCandidates<T>(items: readonly T[], id: (item: T) => string): T[] {
  const found = new Map<string, T>();
  for (const item of items) { const key = id(item); if (key && !found.has(key)) found.set(key, item); }
  return Array.from(found.values());
}
export function stableTie(left: string, right: string) { return left < right ? -1 : left > right ? 1 : 0; }

export function isLowExposure(track: { plays?: number; artist?: { followersCount?: number }; discoveryMetrics?: { plays30d: number; creatorFollowers: number } }) {
  return finitePositive(track.discoveryMetrics?.plays30d ?? track.plays) < 500
    && finitePositive(track.discoveryMetrics?.creatorFollowers ?? track.artist?.followersCount) < 500;
}

/** O(n²), with scores cached once, not recalculated inside repeated sorts.
 * All finite catalogues terminate. Relax diversity only when alternatives run
 * out; never relax visibility, hidden creators or explicit exclusions here.
 */
export function diversifyRanked<T>(items: readonly T[], options: {
  id: (item: T) => string;
  creator: (item: T) => string;
  score: (item: T) => number;
  source?: (item: T) => string;
  limit?: number;
}) {
  const remaining = uniqueCandidates(items, options.id).map((item) => ({ item, id: options.id(item),
    creator: options.creator(item), source: options.source?.(item) || '', score: finitePositive(options.score(item)) }));
  const selected: typeof remaining = [];
  const limit = boundedInteger(options.limit, remaining.length, 0, remaining.length);
  while (remaining.length && selected.length < limit) {
    const recent = selected.slice(-8);
    const previous = selected[selected.length - 1];
    let best = 0, bestTier = Infinity, bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const creatorCount = candidate.creator ? recent.filter((v) => v.creator === candidate.creator).length : 0;
      const sourceCount = candidate.source ? recent.filter((v) => v.source === candidate.source).length : 0;
      const tier = (candidate.creator && previous?.creator === candidate.creator ? 4 : 0)
        + (creatorCount >= 2 ? 2 : 0) + (sourceCount > 0 ? 1 : 0);
      const score = candidate.score / (1 + creatorCount * .3 + sourceCount * .5);
      if (tier < bestTier || (tier === bestTier && (score > bestScore || (score === bestScore && stableTie(candidate.id, remaining[best].id) < 0)))) {
        best = i; bestTier = tier; bestScore = score;
      }
    }
    selected.push(remaining.splice(best, 1)[0]);
  }
  return selected.map((entry) => entry.item);
}

/** Three musical slots then one social slot, consuming an item on every turn.
 * Preserve order within each source. No comparison of incomparable scores.
 */
export function interleaveMusicAndPosts<T, P>(tracks: readonly T[], posts: readonly P[], limit = 480) {
  const output: Array<{ type: 'track'; value: T } | { type: 'post'; value: P }> = [];
  const maximum = boundedInteger(limit, 480, 0, 2000);
  let ti = 0, pi = 0;
  while (output.length < maximum && (ti < tracks.length || pi < posts.length)) {
    if (pi < posts.length && (ti >= tracks.length || output.length % 4 === 3)) output.push({ type: 'post', value: posts[pi++] });
    else output.push({ type: 'track', value: tracks[ti++] });
  }
  return output;
}
