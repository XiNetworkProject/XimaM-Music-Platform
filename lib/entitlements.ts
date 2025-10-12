export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise';

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

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  free: {
    uploads: { maxTracks: 10, maxStorageGb: 0.5, maxPlaylists: 5, maxFileMb: 80 },
    ai: { monthlyCredits: 0, maxGenerationsPerMonth: 0, availableModels: ['V4_5'] },
    audio: { maxQualityKbps: 128 },
    features: {
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
    uploads: { maxTracks: 40, maxStorageGb: 1, maxPlaylists: 30, maxFileMb: 200 },
    ai: { monthlyCredits: 120, maxGenerationsPerMonth: 10, availableModels: ['V4_5', 'V4_5PLUS'] },
    audio: { maxQualityKbps: 256 },
    features: {
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
    uploads: { maxTracks: 100, maxStorageGb: 5, maxPlaylists: -1, maxFileMb: 500 },
    ai: { monthlyCredits: 360, maxGenerationsPerMonth: 30, availableModels: ['V4_5', 'V4_5PLUS', 'V5'] },
    audio: { maxQualityKbps: 320 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      collaborativePlaylists: true,
      adFree: true,
      aiGeneration: true,
      download: true,
    },
  },
  enterprise: {
    uploads: { maxTracks: -1, maxStorageGb: 1000, maxPlaylists: -1, maxFileMb: 1000 },
    ai: { monthlyCredits: 1200, maxGenerationsPerMonth: 100, availableModels: ['V4_5', 'V4_5PLUS', 'V5'] },
    audio: { maxQualityKbps: 320 },
    features: {
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

export function getEntitlements(plan: PlanKey): Entitlements {
  return PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free;
}


