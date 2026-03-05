// ──────────────────────────────────────────────────────────────
// lib/billing/pricing.ts — Source unique de vérité pricing Synaura
// ──────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────

export type PlanKey = 'free' | 'starter' | 'pro';
export type BillingInterval = 'month' | 'year';
export type CreditPackId = 'petit' | 'moyen' | 'populaire' | 'best_value';
export type CreditSource =
  | 'subscription_grant'
  | 'pack_purchase'
  | 'action_spend'
  | 'welcome_bonus'
  | 'daily_spin'
  | 'admin_adjustment'
  | 'refund';

export interface Plan {
  key: PlanKey;
  label: string;
  monthlyCredits: number;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIds: Record<BillingInterval, string>;
  badge?: string;
  features: string[];
  limits: {
    maxTracks: number;
    maxPlaylists: number;
    maxStorageGb: number;
    maxFileMb: number;
    audioQualityKbps: number;
    availableModels: string[];
  };
  featureFlags: {
    messaging: boolean;
    analyticsBasic: boolean;
    analyticsAdvanced: boolean;
    collaborativePlaylists: boolean;
    adFree: boolean;
    aiGeneration: boolean;
    download: boolean;
  };
}

export interface CreditPack {
  id: CreditPackId;
  label: string;
  credits: number;
  priceEur: number;
  badge?: 'populaire' | 'meilleure_valeur';
}

export interface ActionCost {
  key: string;
  label: string;
  credits: number;
}

// ─── Constantes ──────────────────────────────────────────────

export const CREDITS_PER_GENERATION = 12;
export const WELCOME_CREDITS = 50;

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: 'free',
    label: 'Free',
    monthlyCredits: 0,
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIds: { month: '', year: '' },
    features: [
      'Profil public et bibliothèque',
      'Uploads limités',
      'Lecture et découverte de base',
      `${WELCOME_CREDITS} crédits de bienvenue (≈ ${Math.floor(WELCOME_CREDITS / CREDITS_PER_GENERATION)} gén.)`,
      'Modèle IA V4.5',
    ],
    limits: {
      maxTracks: 10,
      maxStorageGb: 0.5,
      maxPlaylists: 5,
      maxFileMb: 80,
      audioQualityKbps: 128,
      availableModels: ['V4_5'],
    },
    featureFlags: {
      messaging: false,
      analyticsBasic: false,
      analyticsAdvanced: false,
      collaborativePlaylists: false,
      adFree: false,
      aiGeneration: true,
      download: false,
    },
  },
  starter: {
    key: 'starter',
    label: 'Starter',
    monthlyCredits: 600,
    priceMonthly: 4.99,
    priceYearly: 47.88,
    stripePriceIds: {
      month: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH || '',
      year: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR || '',
    },
    badge: 'Populaire',
    features: [
      '600 crédits / mois (≈ 50 gén.)',
      'Modèles V4.5 et V4.5+',
      'Messagerie',
      'Sans publicité',
      'Statistiques de base',
      'Téléversements plus lourds',
    ],
    limits: {
      maxTracks: 40,
      maxStorageGb: 1,
      maxPlaylists: 30,
      maxFileMb: 200,
      audioQualityKbps: 256,
      availableModels: ['V4_5', 'V4_5PLUS'],
    },
    featureFlags: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: false,
      collaborativePlaylists: false,
      adFree: true,
      aiGeneration: true,
      download: false,
    },
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    monthlyCredits: 2400,
    priceMonthly: 14.99,
    priceYearly: 143.88,
    stripePriceIds: {
      month: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH || '',
      year: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR || '',
    },
    features: [
      '2 400 crédits / mois (≈ 200 gén.)',
      'Tous les modèles IA (V4.5, V4.5+, V5)',
      'Messagerie',
      'Playlists collaboratives',
      'Analyses avancées',
      'Téléchargement de musique',
    ],
    limits: {
      maxTracks: 100,
      maxStorageGb: 5,
      maxPlaylists: -1,
      maxFileMb: 500,
      audioQualityKbps: 320,
      availableModels: ['V4_5', 'V4_5PLUS', 'V5'],
    },
    featureFlags: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      collaborativePlaylists: true,
      adFree: true,
      aiGeneration: true,
      download: true,
    },
  },
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'petit',      label: 'Petit',      credits: 120,  priceEur: 1.99 },
  { id: 'moyen',      label: 'Moyen',      credits: 500,  priceEur: 6.99 },
  { id: 'populaire',  label: 'Populaire',  credits: 1200, priceEur: 14.99, badge: 'populaire' },
  { id: 'best_value', label: 'Best Value', credits: 3000, priceEur: 29.99, badge: 'meilleure_valeur' },
];

export const ACTION_COSTS: Record<string, ActionCost> = {
  generation:    { key: 'generation',    label: 'Génération musicale', credits: 12 },
  upload_cover:  { key: 'upload_cover',  label: 'Upload cover / Remix', credits: 12 },
  stem_split:    { key: 'stem_split',    label: 'Séparation de pistes', credits: 50 },
  lyrics_gen:    { key: 'lyrics_gen',    label: 'Génération de paroles', credits: 0 },
};

// ─── Fonctions utilitaires ───────────────────────────────────

export function getGenerationsFromCredits(credits: number): number {
  return Math.floor(credits / CREDITS_PER_GENERATION);
}

export function generationsApprox(balance: number): number {
  return Math.floor(balance / CREDITS_PER_GENERATION);
}

export function findPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function priceToCents(priceEur: number): number {
  return Math.round(priceEur * 100);
}

export function getPlanByKey(key: string): Plan | undefined {
  return PLANS[key as PlanKey];
}

/**
 * Retrouve le plan correspondant à un Stripe price ID.
 * Parcourt tous les plans et vérifie les IDs month/year.
 */
export function getPlanByPriceId(priceId: string): Plan | undefined {
  if (!priceId) return undefined;
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceIds.month === priceId || plan.stripePriceIds.year === priceId) {
      return plan;
    }
  }
  return undefined;
}

/**
 * Retourne le coût €/crédit pour un pack donné.
 */
export function packEurPerCredit(pack: CreditPack): number {
  return pack.priceEur / pack.credits;
}

/**
 * Calcule l'économie annuelle d'un plan par rapport au paiement mensuel.
 */
export function yearlyDiscount(plan: Plan): number {
  const monthlyTotal = plan.priceMonthly * 12;
  return Math.round((monthlyTotal - plan.priceYearly) * 100) / 100;
}

/**
 * Prix mensuel effectif pour un plan annuel.
 */
export function effectiveMonthlyPrice(plan: Plan, interval: BillingInterval): number {
  if (interval === 'year') {
    return Math.round((plan.priceYearly / 12) * 100) / 100;
  }
  return plan.priceMonthly;
}

export const PLAN_KEYS: PlanKey[] = ['free', 'starter', 'pro'];
