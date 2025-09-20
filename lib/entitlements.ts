export type PlanKey = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Entitlements {
  uploads: { maxTracks: number; maxStorageGb: number; maxPlaylists: number };
  features: {
    messaging: boolean;
    analyticsBasic: boolean;
    analyticsAdvanced: boolean;
    collaborativePlaylists: boolean;
    adFree: boolean;
  };
}

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  free: {
    uploads: { maxTracks: 5, maxStorageGb: 0.5, maxPlaylists: 3 },
    features: {
      messaging: false,
      analyticsBasic: false,
      analyticsAdvanced: false,
      collaborativePlaylists: false,
      adFree: false,
    },
  },
  starter: {
    uploads: { maxTracks: 20, maxStorageGb: 1, maxPlaylists: 20 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: false,
      collaborativePlaylists: false,
      adFree: true,
    },
  },
  pro: {
    uploads: { maxTracks: 50, maxStorageGb: 5, maxPlaylists: -1 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      collaborativePlaylists: true,
      adFree: true,
    },
  },
  enterprise: {
    uploads: { maxTracks: -1, maxStorageGb: 1000, maxPlaylists: -1 },
    features: {
      messaging: true,
      analyticsBasic: true,
      analyticsAdvanced: true,
      collaborativePlaylists: true,
      adFree: true,
    },
  },
};

export function getEntitlements(plan: PlanKey): Entitlements {
  return PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free;
}


