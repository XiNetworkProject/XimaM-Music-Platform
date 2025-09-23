export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Entitlements {
  uploads: { maxTracks: number; maxStorageGb: number; maxPlaylists: number; maxFileMb: number };
  ai: { maxGenerationsPerMonth: number };
  features: {
    messaging: boolean;
    analyticsBasic: boolean;
    analyticsAdvanced: boolean;
    collaborativePlaylists: boolean;
    adFree: boolean;
    aiGeneration: boolean;
  };
}

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  free: {
    uploads: { maxTracks: 5, maxStorageGb: 0.5, maxPlaylists: 3, maxFileMb: 50 },
    ai: { maxGenerationsPerMonth: 1 },
    features: {
      messaging: false,
      analyticsBasic: false,
      analyticsAdvanced: false,
      collaborativePlaylists: false,
      adFree: false,
      aiGeneration: true,
    },
  },
  starter: {
    uploads: { maxTracks: 20, maxStorageGb: 1, maxPlaylists: 20, maxFileMb: 100 },
    ai: { maxGenerationsPerMonth: 3 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: false,
      collaborativePlaylists: false,
      adFree: true,
      aiGeneration: true,
    },
  },
  pro: {
    uploads: { maxTracks: 50, maxStorageGb: 5, maxPlaylists: -1, maxFileMb: 200 },
    ai: { maxGenerationsPerMonth: 10 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      collaborativePlaylists: true,
      adFree: true,
      aiGeneration: true,
    },
  },
  enterprise: {
    uploads: { maxTracks: -1, maxStorageGb: 1000, maxPlaylists: -1, maxFileMb: 500 },
    ai: { maxGenerationsPerMonth: 100 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      collaborativePlaylists: true,
      adFree: true,
      aiGeneration: true,
    },
  },
};

export function getEntitlements(plan: PlanKey): Entitlements {
  return PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free;
}


