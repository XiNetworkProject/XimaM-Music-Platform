export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Entitlements {
  uploads: { maxTracks: number; maxStorageGb: number; maxPlaylists: number; maxFileMb: number };
  ai: { maxGenerationsPerMonth: number; availableModels: string[] };
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
    uploads: { maxTracks: 5, maxStorageGb: 0.5, maxPlaylists: 3, maxFileMb: 50 },
    ai: { maxGenerationsPerMonth: 1, availableModels: ['V4_5'] },
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
    uploads: { maxTracks: 20, maxStorageGb: 1, maxPlaylists: 20, maxFileMb: 100 },
    ai: { maxGenerationsPerMonth: 3, availableModels: ['V4_5', 'V4_5PLUS'] },
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
    uploads: { maxTracks: 50, maxStorageGb: 5, maxPlaylists: -1, maxFileMb: 200 },
    ai: { maxGenerationsPerMonth: 10, availableModels: ['V4_5', 'V4_5PLUS', 'V5'] },
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
    uploads: { maxTracks: -1, maxStorageGb: 1000, maxPlaylists: -1, maxFileMb: 500 },
    ai: { maxGenerationsPerMonth: 100, availableModels: ['V4_5', 'V4_5PLUS', 'V5'] },
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


