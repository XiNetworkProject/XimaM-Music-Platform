// Utilitaires de crédits Synaura (génération IA)
// 1 génération = 12 crédits (aligné Suno, affichage psychologique via bonus)

export const CREDITS_PER_GENERATION = 12;

export type CreditPackId = 'mini' | 'plus' | 'pro' | 'studio';

export interface CreditPack {
  id: CreditPackId;
  label: string;
  baseCredits: number; // crédits "réels" du pack, hors bonus visuel
  bonusCredits: number; // bonus affiché pour effet psychologique
  displayedCredits: number; // base + bonus
  priceEur: number; // prix TTC en EUR
  badge?: 'populaire' | 'meilleure_valeur';
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'mini',
    label: 'Mini Créateur',
    baseCredits: 500,
    bonusCredits: 100,
    displayedCredits: 600,
    priceEur: 5.49,
  },
  {
    id: 'plus',
    label: 'Plus',
    baseCredits: 1000,
    bonusCredits: 200,
    displayedCredits: 1200,
    priceEur: 10.49,
    badge: 'populaire',
  },
  {
    id: 'pro',
    label: 'Créateur Pro',
    baseCredits: 2000,
    bonusCredits: 400,
    displayedCredits: 2400,
    priceEur: 20.49,
  },
  {
    id: 'studio',
    label: 'Studio',
    baseCredits: 4000,
    bonusCredits: 800,
    displayedCredits: 4800,
    priceEur: 39.49,
    badge: 'meilleure_valeur',
  },
];

export function getGenerationsFromCredits(credits: number): number {
  return Math.floor(credits / CREDITS_PER_GENERATION);
}

export function findPackById(id: CreditPackId): CreditPack | undefined {
  return CREDIT_PACKS.find(p => p.id === id);
}

export function priceToCents(priceEur: number): number {
  return Math.round(priceEur * 100);
}

export async function fetchCreditsBalance(): Promise<{ balance: number } | null> {
  try {
    const res = await fetch('/api/ai/credits', { cache: 'no-store' });
    if (!res.ok) return { balance: 0 };
    return await res.json();
  } catch {
    return { balance: 0 };
  }
}

export function generationsApprox(balance: number): number {
  return Math.floor(balance / CREDITS_PER_GENERATION);
}



