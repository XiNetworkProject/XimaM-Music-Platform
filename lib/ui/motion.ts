export const SYNAURA_MOTION = {
  duration: {
    instant: 90,
    fast: 150,
    standard: 220,
    expressive: 360,
  },
  easing: {
    standard: [0.22, 1, 0.36, 1] as const,
    entrance: [0.16, 1, 0.3, 1] as const,
    exit: [0.4, 0, 1, 1] as const,
  },
  distance: {
    subtle: 6,
    sheet: 24,
  },
} as const;

export const SYNAURA_MOTION_TRANSITION = {
  duration: SYNAURA_MOTION.duration.standard / 1000,
  ease: SYNAURA_MOTION.easing.standard,
} as const;
