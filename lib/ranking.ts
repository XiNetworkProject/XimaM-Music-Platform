export type TrackStats = {
  plays_30d: number;
  completes_30d: number;
  likes_30d: number;
  shares_30d: number;
  favorites_30d: number;
  listen_ms_30d: number;
  unique_listeners_30d: number;
  retention_complete_rate_30d: number; // 0..100
};

export function computeRankingScore(stats: TrackStats, ageHours: number, sourceBonus: number = 0): number {
  const plays = stats.plays_30d || 0;
  const completes = stats.completes_30d || 0;
  const likes = stats.likes_30d || 0;
  const shares = stats.shares_30d || 0;
  const favorites = stats.favorites_30d || 0;
  const listenMs = stats.listen_ms_30d || 0;
  const listeners = stats.unique_listeners_30d || 0;
  const retention = (stats.retention_complete_rate_30d || 0) / 100.0;

  // Normalisations simples pour limiter l'impact des gros volumes
  const playsNorm = Math.log10(1 + plays);
  const completesNorm = Math.log10(1 + completes);
  const likesNorm = Math.log10(1 + likes);
  const sharesNorm = Math.log10(1 + shares);
  const favsNorm = Math.log10(1 + favorites);
  const listenPerUser = listeners > 0 ? listenMs / (listeners * 60_000) : 0; // minutes moyennes par user sur 30j
  const listenNorm = Math.min(1.5, listenPerUser / 3); // cap à 1.5 pour 4.5 min moyennes

  // Poids (ajustables)
  const w1 = 0.8;  // plays
  const w2 = 1.0;  // completes
  const w3 = 2.2;  // retention
  const w4 = 1.2;  // avg listen
  const w5 = 0.9;  // likes
  const w6 = 1.1;  // shares
  const w7 = 1.0;  // favorites

  // Décroissance temporelle (12h demi-vie)
  const halfLifeH = 12;
  const decay = Math.exp(-Math.max(0, ageHours) * Math.LN2 / halfLifeH);

  const score = (
    w1 * playsNorm +
    w2 * completesNorm +
    w3 * retention +
    w4 * listenNorm +
    w5 * likesNorm +
    w6 * sharesNorm +
    w7 * favsNorm +
    sourceBonus
  ) * decay;

  return Number(score.toFixed(6));
}


