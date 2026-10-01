import type { Booster, Rarity } from './policy';

export const BOOST_FAMILIES = [
  {
    id: 'amplifier',
    name: 'Amplificateur',
    target: 'track',
    color: '#ad86ff',
    symbol: '✦',
    description:
      'Un fort bonus de priorité pour ton morceau dans les recommandations Live et Découvrir.',
    condition: 'Un morceau public avec audio.',
    duration: [3, 6, 12, 24],
  },
  {
    id: 'live',
    name: 'Pulse Live',
    target: 'track',
    color: '#fa81b4',
    symbol: '≋',
    description:
      'Concentre toute sa puissance sur la découverte de ton morceau dans Live.',
    condition: 'Agit dans le flux recommandé Live.',
    duration: [4, 8, 16, 24],
  },
  {
    id: 'radar',
    name: 'Radar',
    target: 'track',
    color: '#72cedf',
    symbol: '◎',
    description:
      'Donne la priorité à ton morceau dans les sélections recommandées de Découvrir.',
    condition: 'Ne modifie pas les tris chronologiques ou par popularité.',
    duration: [6, 12, 24, 48],
  },
  {
    id: 'resonance',
    name: 'Résonance',
    target: 'track',
    color: '#b8a4ff',
    symbol: '⌁',
    description:
      'Un coup de projecteur ciblé auprès des auditeurs dont les goûts correspondent déjà à ton univers.',
    condition: 'Activé par une affinité musicale mesurée, pas inventée.',
    duration: [6, 12, 24, 48],
  },
  {
    id: 'horizon',
    name: 'Nouvel Horizon',
    target: 'track',
    color: '#8fcbb0',
    symbol: '↗',
    description:
      'Priorise ton morceau auprès des auditeurs qui ne connaissent pas encore ton artiste.',
    condition: 'Aucun suivi, aucune affinité ni écoute récente de cet artiste.',
    duration: [6, 12, 24, 48],
  },
  {
    id: 'revival',
    name: 'Rappel',
    target: 'track',
    color: '#d9a6ec',
    symbol: '↺',
    description: 'Remet un ancien morceau dans la course aux recommandations.',
    condition: 'Morceaux publiés depuis au moins 30 jours.',
    duration: [12, 24, 48, 72],
  },
  {
    id: 'release',
    name: 'Décollage',
    target: 'track',
    color: '#edb978',
    symbol: '↑',
    description:
      'Un lancement plus puissant pour un morceau fraîchement publié.',
    condition: 'Morceaux de moins de 14 jours ; effet limité à cette fenêtre.',
    duration: [3, 6, 12, 24],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    target: 'artist',
    color: '#f0d08b',
    symbol: '⁂',
    description:
      'Soutient les morceaux publics de ton catalogue dans les recommandations, plutôt qu’un seul titre.',
    condition: 'Catalogue original ; diversité entre artistes conservée.',
    duration: [3, 6, 12, 24],
  },
  {
    id: 'creation',
    name: 'Création',
    target: 'credits',
    color: '#91b5ff',
    symbol: '✧',
    description:
      'Une recharge de crédits IA utilisables dans le Studio, ajoutée à ton solde à l’activation.',
    condition: 'Ne débloque pas les modèles réservés à un abonnement.',
    duration: [1, 1, 1, 1],
  },
] as const;
export type BoostFamily = (typeof BOOST_FAMILIES)[number]['id'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
const POWER = [1.5, 2, 3, 4] as const;
const LEVELS = ['Étincelle', 'Impulsion', 'Déferlante', 'Supernova'] as const;

// Keys are an allowlist, not arbitrary user-supplied effect parameters. Old keys
// keep the legacy contract. This catalogue is seeded only by a reviewed migration.
export const CAMPAIGN_CATALOG = BOOST_FAMILIES.flatMap((family) =>
  RARITIES.map(
    (rarity, i) =>
      ({
        key: `campaign_${family.id}_${rarity}`,
        name: `${family.name} · ${LEVELS[i]}`,
        description: `${family.description} ${family.condition}`,
        type: family.target,
        rarity,
        multiplier: POWER[i],
        duration_hours: family.duration[i],
        family: family.id,
        credits: family.id === 'creation' ? [6, 12, 24, 48][i] : 0,
      } satisfies Omit<Booster, 'id'> & {
        family: BoostFamily;
        credits: number;
      })
  )
);

export function campaignDefinition(key?: string | null) {
  return CAMPAIGN_CATALOG.find((item) => item.key === key);
}
export function familyFor(key?: string | null) {
  const item = campaignDefinition(key);
  return item
    ? BOOST_FAMILIES.find((family) => family.id === item.family)!
    : null;
}
export function activationFamily(key?: string | null) {
  return campaignDefinition(key)?.family || 'legacy';
}
export function campaignEligibility(
  key: string,
  createdAt: string | null | undefined,
  now: number
): string | null {
  const family = campaignDefinition(key)?.family;
  if (family !== 'revival' && family !== 'release') return null;
  const created = new Date(createdAt || '').getTime();
  if (!Number.isFinite(created) || created > now)
    return 'La date de publication de ce morceau ne permet pas ce boost.';
  const age = (now - created) / 86400000;
  if (family === 'revival' && age < 30)
    return 'Rappel est réservé aux morceaux publiés depuis au moins 30 jours.';
  if (family === 'release' && age >= 14)
    return 'Décollage est réservé aux morceaux de moins de 14 jours.';
  return null;
}
export function campaignPower(rarity: Rarity) {
  return POWER[RARITIES.indexOf(rarity)];
}

export function campaignExpiry(key: string, createdAt: string | undefined, proposed: string) {
  if (campaignDefinition(key)?.family !== 'release') return proposed;
  const boundary = new Date(createdAt || '').getTime() + 14 * 86400000;
  return Number.isFinite(boundary) ? new Date(Math.min(Date.parse(proposed), boundary)).toISOString() : proposed;
}

export type ActiveCampaign = {
  key: string;
  multiplier: number;
  expiresAt: string;
};
export type CampaignContext = {
  now: number;
  surface?: 'live' | 'discover';
  createdAt?: string;
  affinity: boolean;
  knowsArtist: boolean;
  rejected: boolean;
  strategy?: string;
};
export function eligibleCampaigns(
  campaigns: ActiveCampaign[] | undefined,
  context: CampaignContext
) {
  // Pure popularity/chronology and negative feedback always take precedence.
  if (
    context.rejected ||
    context.strategy === 'popular' ||
    context.strategy === 'fresh'
  )
    return [];
  return (campaigns || []).filter((active) => {
    const family = campaignDefinition(active.key)?.family;
    if (
      !family ||
      family === 'creation' ||
      !Number.isFinite(active.multiplier) ||
      active.multiplier <= 1 ||
      Date.parse(active.expiresAt) <= context.now ||
      !Number.isFinite(Date.parse(active.expiresAt))
    )
      return false;
    if (campaignEligibility(active.key, context.createdAt, context.now))
      return false;
    if (family === 'live') return context.surface === 'live';
    if (family === 'radar') return context.surface === 'discover';
    if (family === 'resonance') return context.affinity;
    if (family === 'horizon') return !context.knowsArtist;
    return true;
  });
}

export function campaignLift(
  baseScore: number,
  campaigns: ActiveCampaign[] | undefined,
  context: CampaignContext
) {
  const eligible = eligibleCampaigns(campaigns, context);
  // No exponential stacking. Only the strongest eligible effect applies to a
  // given listener/surface; 24 extra points maximum, before fatigue penalties.
  const power = Math.min(
    4,
    Math.max(1, ...eligible.map((active) => active.multiplier))
  );
  const lift = Math.min(24, (Math.max(0, baseScore) + 2) * (power - 1));
  return {
    lift,
    power,
    families: Array.from(
      new Set(eligible.map((active) => campaignDefinition(active.key)!.family))
    ),
  };
}
