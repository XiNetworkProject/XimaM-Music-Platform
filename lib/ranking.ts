import type { TrackDiscoveryMetrics } from './recommendation/types';

export type TrackStats = {
  plays_30d: number;
  completes_30d: number;
  likes_30d: number;
  shares_30d: number;
  favorites_30d: number;
  listen_ms_30d: number;
  unique_listeners_30d: number;
  retention_complete_rate_30d: number;
};

export type TrackDiscoveryInput = TrackStats & {
  ageHours: number;
  momentumScore?: number;
  creatorFollowers?: number;
  comments30d?: number;
  reactions30d?: number;
  playlistSaves30d?: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function finite(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function bayesianRate(successes: number, trials: number, prior: number, priorWeight: number) {
  const safeTrials = Math.max(0, trials);
  const safeSuccesses = Math.min(safeTrials, Math.max(0, successes));
  return (safeSuccesses + prior * priorWeight) / (safeTrials + priorWeight);
}

function normalizeRate(value: number, low: number, high: number) {
  if (high <= low) return 0;
  return clamp((value - low) / (high - low));
}

function boundedLog(value: number, reference: number) {
  return clamp(Math.log1p(Math.max(0, value)) / Math.log1p(reference));
}

/**
 * Signals shared by Flow, Discover and Radar.
 *
 * Rates use conservative priors so one like after one play cannot outrank a
 * title with a sustained audience. Repeated plays are capped by unique
 * listeners, which also prevents one listener from manufacturing momentum.
 */
export function computeTrackDiscoveryMetrics(input: TrackDiscoveryInput): TrackDiscoveryMetrics {
  const plays = finite(input.plays_30d);
  const listeners = finite(input.unique_listeners_30d);
  const effectivePlays = listeners > 0
    ? Math.max(listeners, Math.min(plays, listeners * 5))
    : Math.min(plays, 20);
  const completes = Math.min(finite(input.completes_30d), effectivePlays);
  const likes = Math.min(finite(input.likes_30d), effectivePlays);
  const shares = Math.min(finite(input.shares_30d), effectivePlays);
  const saves = Math.min(
    Math.max(finite(input.favorites_30d), finite(input.playlistSaves30d)),
    effectivePlays,
  );
  const comments = Math.min(finite(input.comments30d), effectivePlays);
  const reactions = Math.min(finite(input.reactions30d), effectivePlays);
  const retentionFromView = clamp(finite(input.retention_complete_rate_30d) / 100);
  const retentionFromCounts = effectivePlays > 0 ? completes / effectivePlays : 0;
  const observedCompletion = retentionFromView > 0 ? retentionFromView : retentionFromCounts;

  const completionRate = bayesianRate(observedCompletion * effectivePlays, effectivePlays, 0.38, 10);
  const likeRate = bayesianRate(likes, effectivePlays, 0.045, 18);
  const saveRate = bayesianRate(saves, effectivePlays, 0.02, 22);
  const shareRate = bayesianRate(shares, effectivePlays, 0.012, 24);
  const discussionRate = bayesianRate(comments + reactions, effectivePlays, 0.018, 20);

  const qualityScore = 10 * (
    normalizeRate(completionRate, 0.22, 0.8) * 0.52 +
    normalizeRate(likeRate, 0.025, 0.175) * 0.23 +
    normalizeRate(saveRate, 0.012, 0.09) * 0.11 +
    normalizeRate(shareRate, 0.008, 0.06) * 0.07 +
    normalizeRate(discussionRate, 0.012, 0.09) * 0.07
  );

  const followers = finite(input.creatorFollowers);
  const reachScore = 10 * (
    boundedLog(listeners, 75) * 0.52 +
    boundedLog(plays, 400) * 0.33 +
    boundedLog(followers, 500) * 0.15
  );
  const ageHours = finite(input.ageHours);
  const freshnessScore = 10 * Math.exp(-ageHours * Math.LN2 / (24 * 14));
  const momentumScore = clamp(finite(input.momentumScore), 0, 10);
  const confidence = clamp(1 - Math.exp(-(effectivePlays + listeners * 0.75) / 14));
  const lowExposure = 1 - clamp((plays + followers * 1.5) / 1200);

  const emergingScore = clamp(
    (
      qualityScore * 0.43 +
      momentumScore * 0.28 +
      freshnessScore * 0.19 +
      lowExposure * 1.5
    ) * (0.55 + confidence * 0.45),
    0,
    10,
  );
  const catalogMaturity = 10 * (1 - Math.exp(-ageHours / (24 * 45)));
  const catalogScore = clamp(qualityScore * 0.62 + reachScore * 0.22 + catalogMaturity * 0.16, 0, 10);

  return {
    plays30d: Math.round(plays),
    completes30d: Math.round(completes),
    likes30d: Math.round(likes),
    shares30d: Math.round(shares),
    saves30d: Math.round(saves),
    comments30d: Math.round(comments),
    reactions30d: Math.round(reactions),
    uniqueListeners30d: Math.round(listeners),
    completionRate30d: Number((completionRate * 100).toFixed(2)),
    creatorFollowers: Math.round(followers),
    ageHours: Number(ageHours.toFixed(2)),
    qualityScore: Number(qualityScore.toFixed(4)),
    reachScore: Number(reachScore.toFixed(4)),
    momentumScore: Number(momentumScore.toFixed(4)),
    freshnessScore: Number(freshnessScore.toFixed(4)),
    emergingScore: Number(emergingScore.toFixed(4)),
    catalogScore: Number(catalogScore.toFixed(4)),
    confidence: Number(confidence.toFixed(4)),
  };
}

export function globalDiscoveryScore(metrics: TrackDiscoveryMetrics) {
  return Number((
    metrics.qualityScore * 0.38 +
    metrics.momentumScore * 0.3 +
    metrics.reachScore * 0.24 +
    metrics.freshnessScore * 0.08
  ).toFixed(6));
}

/** Backwards-compatible entry point for older recommendation call sites. */
export function computeRankingScore(stats: TrackStats, ageHours: number, sourceBonus = 0): number {
  const metrics = computeTrackDiscoveryMetrics({ ...stats, ageHours });
  return Number((globalDiscoveryScore(metrics) + finite(sourceBonus)).toFixed(6));
}
