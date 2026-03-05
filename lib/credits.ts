// ──────────────────────────────────────────────────────────────
// lib/credits.ts — Rétro-compatibilité, ré-exporte depuis lib/billing/pricing.ts
// ──────────────────────────────────────────────────────────────

export {
  CREDITS_PER_GENERATION,
  CREDIT_PACKS,
  getGenerationsFromCredits,
  generationsApprox,
  findPackById,
  priceToCents,
  WELCOME_CREDITS,
  ACTION_COSTS,
} from './billing/pricing';

export type { CreditPack, CreditPackId } from './billing/pricing';

export async function fetchCreditsBalance(): Promise<{ balance: number } | null> {
  try {
    const res = await fetch('/api/ai/credits', { cache: 'no-store' });
    if (!res.ok) return { balance: 0 };
    return await res.json();
  } catch {
    return { balance: 0 };
  }
}
