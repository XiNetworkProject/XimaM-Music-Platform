// ──────────────────────────────────────────────────────────────
// lib/entitlements.ts — Entitlements par plan, alignés sur lib/billing/pricing.ts
// ──────────────────────────────────────────────────────────────

import { PLANS, type PlanKey as BillingPlanKey } from './billing/pricing';

export type PlanKey = BillingPlanKey;

export interface Entitlements {
  uploads: { maxTracks: number; maxStorageGb: number; maxPlaylists: number; maxFileMb: number };
  ai: { monthlyCredits?: number; maxGenerationsPerMonth: number; availableModels: string[] };
  audio: { maxQualityKbps: number };
  features: {
    messaging: boolean;
    analyticsBasic: boolean;
    analyticsAdvanced: boolean;
    collaborativePlaylists: boolean;
    adFree: boolean;
    aiGeneration: boolean;
    download: boolean;
  };
}

function planToEntitlements(planKey: PlanKey): Entitlements {
  const p = PLANS[planKey];
  return {
    uploads: {
      maxTracks: p.limits.maxTracks,
      maxStorageGb: p.limits.maxStorageGb,
      maxPlaylists: p.limits.maxPlaylists,
      maxFileMb: p.limits.maxFileMb,
    },
    ai: {
      monthlyCredits: p.monthlyCredits,
      maxGenerationsPerMonth: Math.floor(p.monthlyCredits / 12) || 0,
      availableModels: p.limits.availableModels,
    },
    audio: { maxQualityKbps: p.limits.audioQualityKbps },
    features: { ...p.featureFlags },
  };
}

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  free: planToEntitlements('free'),
  starter: planToEntitlements('starter'),
  pro: planToEntitlements('pro'),
};

export function getEntitlements(plan: PlanKey): Entitlements {
  return PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free;
}
