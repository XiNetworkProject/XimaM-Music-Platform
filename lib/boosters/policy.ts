export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';
export type Booster = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'track' | 'artist' | 'credits';
  rarity: Rarity;
  multiplier: number;
  duration_hours: number;
  enabled?: boolean;
};
export type Pity = {
  opens_since_rare: number;
  opens_since_epic: number;
  opens_since_legendary: number;
};
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Essentiel',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};
export const PACKS = {
  starter_weekly: { label: 'Pack Starter', size: 3, perWeek: 1, luck: 0.3 },
  pro_weekly: { label: 'Pack Pro', size: 5, perWeek: 2, luck: 0.5 },
};
export function normalizePlan(value: unknown): Plan {
  return value === 'starter' || value === 'pro' || value === 'enterprise'
    ? value
    : 'free';
}
export function canClaimPack(plan: Plan, key: string) {
  return key === 'starter_weekly'
    ? plan !== 'free'
    : key === 'pro_weekly' && (plan === 'pro' || plan === 'enterprise');
}
export function cooldownFor(plan: Plan) {
  return (plan === 'free' ? 24 : 12) * 3_600_000;
}
export function luckFor(plan: Plan) {
  return plan === 'free' ? 0 : plan === 'starter' ? 0.3 : 0.5;
}
export function weekStartUTC(date: Date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function nextStreak(
  last: string | null | undefined,
  streak: number,
  now: number
) {
  return last && now - new Date(last).getTime() <= 48 * 3_600_000
    ? Number(streak || 0) + 1
    : 1;
}
export function guaranteedRarity(pity: Pity, streak: number): Rarity {
  if (pity.opens_since_legendary >= 79 || (streak > 0 && streak % 30 === 0))
    return 'legendary';
  if (pity.opens_since_epic >= 24 || (streak > 0 && streak % 14 === 0))
    return 'epic';
  if (pity.opens_since_rare >= 6 || (streak > 0 && streak % 7 === 0))
    return 'rare';
  return 'common';
}
// Keep the existing base weights. Redistribute missing/lower tiers only amongst
// eligible tiers: a guarantee must never fall back to a lower rarity.
export function drawOdds(
  catalog: Booster[],
  luck = 0,
  floor: Rarity = 'common',
  pack = false
) {
  const l = Math.max(0, Math.min(1, luck));
  const weights = {
    legendary: 1 + l * (pack ? 1.2 : 1.5),
    epic: 3 + l * (pack ? 3 : 4),
    rare: pack ? 20 : 18,
    common: 0,
  };
  weights.common = 100 - weights.legendary - weights.epic - weights.rare;
  const eligible = RARITIES.filter(
    (r) =>
      RARITIES.indexOf(r) >= RARITIES.indexOf(floor) &&
      catalog.some((b) => b.enabled !== false && b.rarity === r)
  );
  const total = eligible.reduce((sum, r) => sum + weights[r], 0);
  return eligible.map((rarity) => ({
    rarity,
    percent: (weights[rarity] / total) * 100,
  }));
}
export function chooseBooster(
  catalog: Booster[],
  luck = 0,
  floor: Rarity = 'common',
  pack = false,
  random = Math.random
): Booster | null {
  const odds = drawOdds(catalog, luck, floor, pack);
  let roll = random() * 100;
  let rarity = odds.at(-1)?.rarity;
  for (const chance of odds) {
    roll -= chance.percent;
    if (roll < 0) {
      rarity = chance.rarity;
      break;
    }
  }
  const pool = catalog.filter(
    (b) => b.enabled !== false && b.rarity === rarity
  );
  return pool.length
    ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
    : null;
}
export function missionHasReset(
  m: { cooldown_hours: number },
  progress: { claimed: boolean; completed_at: string | null } | undefined,
  now: number
) {
  // An earned but unclaimed reward never expires.
  return (
    !!progress?.claimed &&
    !!progress.completed_at &&
    m.cooldown_hours > 0 &&
    now - new Date(progress.completed_at).getTime() >=
      m.cooldown_hours * 3_600_000
  );
}
export function effectiveBoost(
  existing: { multiplier: number; expires_at: string }[],
  booster: Pick<Booster, 'multiplier' | 'duration_hours'>,
  now: number
) {
  return {
    multiplier: Math.max(
      Number(booster.multiplier),
      ...existing.map((b) => Number(b.multiplier))
    ),
    expiresAt: new Date(
      Math.max(
        now + booster.duration_hours * 3_600_000,
        ...existing.map((b) => new Date(b.expires_at).getTime())
      )
    ).toISOString(),
  };
}
