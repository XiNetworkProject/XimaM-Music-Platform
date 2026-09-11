export type SonicQualityName = 'HIGH' | 'LOW';

export type SonicQualityProfile = {
  name: SonicQualityName;
  dpr: [number, number];
  antialias: boolean;
  particles: number;
  godRays: {
    samples: number;
    density: number;
    decay: number;
    weight: number;
    exposure: number;
    resolutionScale: number;
    blur: boolean;
  };
  bloom: {
    intensity: number;
    mipmapBlur: boolean;
  };
};

export const SONIC_TIMELINE = {
  duration: 3.2,
  labels: {
    start: 0,
    lightEnter: 0.19,
    pulseOne: 0.33,
    pulseTwo: 0.485,
    logoContact: 0.745,
    logoReveal: 1,
    impact: 1.795,
    lightExit: 2.235,
    resolve: 2.65,
  },
} as const;

export const SONIC_SCENE = {
  camera: { position: [0.28, 0.12, 9.2] as [number, number, number], fov: 40 },
  source: { position: [6.15, 2.05, 3.05] as [number, number, number] },
  sourceCue: { position: [5.95, 1.75, 0.45] as [number, number, number] },
  beam: {
    length: 9,
    radius: 1.62,
    violet: '#d8d3ff',
    cyan: '#dff8ff',
    white: '#fff5e8',
  },
  logo: { highSize: 4.85, lowSize: 3.82, z: 0.1, relief: 0.075 },
  fogDensity: 0.028,
} as const;

export const SONIC_QUALITY: Record<SonicQualityName, SonicQualityProfile> = {
  HIGH: {
    name: 'HIGH',
    dpr: [1, 1.5],
    antialias: true,
    particles: 156,
    godRays: {
      samples: 46,
      density: 0.91,
      decay: 0.93,
      weight: 0.21,
      exposure: 0.24,
      resolutionScale: 0.58,
      blur: true,
    },
    bloom: { intensity: 0.36, mipmapBlur: true },
  },
  LOW: {
    name: 'LOW',
    dpr: [1, 1],
    antialias: false,
    particles: 58,
    godRays: {
      samples: 24,
      density: 0.87,
      decay: 0.92,
      weight: 0.18,
      exposure: 0.22,
      resolutionScale: 0.38,
      blur: false,
    },
    bloom: { intensity: 0.28, mipmapBlur: false },
  },
};

export function selectSonicQuality(): SonicQualityProfile {
  if (typeof window === 'undefined') return SONIC_QUALITY.HIGH;
  const mobile = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const constrained = (navigatorWithMemory.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
  return mobile || constrained ? SONIC_QUALITY.LOW : SONIC_QUALITY.HIGH;
}
