// Presentation of the existing daily-spin contract. Never draws a reward locally.
export const WHEEL_SEGMENTS = [
  {
    key: 'lose',
    kind: 'none',
    label: 'À demain !',
    short: 'À DEMAIN',
    weight: 10,
    color: '#354665',
  },
  {
    key: 'credits_10',
    kind: 'credits',
    label: '+10 crédits IA',
    short: '+10',
    weight: 20,
    color: '#176baa',
  },
  {
    key: 'credits_25',
    kind: 'credits',
    label: '+25 crédits IA',
    short: '+25',
    weight: 20,
    color: '#6845cd',
  },
  {
    key: 'common_booster',
    kind: 'booster',
    label: 'Booster commun',
    short: 'COMMUN',
    weight: 30,
    color: '#138177',
  },
  {
    key: 'rare_booster',
    kind: 'booster',
    label: 'Booster rare',
    short: 'RARE',
    weight: 14,
    color: '#354de0',
  },
  {
    key: 'epic_booster',
    kind: 'booster',
    label: 'Booster épique',
    short: 'ÉPIQUE',
    weight: 5,
    color: '#b33891',
  },
  {
    key: 'legendary_booster',
    kind: 'booster',
    label: 'Booster légendaire',
    short: 'LÉGENDAIRE',
    weight: 1,
    color: '#f6c56b',
  },
] as const;

export type WheelOutcome = {
  index: number;
  resultKey: string;
  reward: { kind: 'none' | 'credits' | 'booster'; label: string };
};
export type WheelResponse =
  | { ok: true; result: WheelOutcome }
  | { ok: false; error: string };

export function readWheelOutcome(value: unknown): WheelOutcome | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Partial<WheelOutcome>;
  if (!Number.isInteger(result.index)) return null;
  const segment = WHEEL_SEGMENTS[result.index!];
  if (
    !segment ||
    result.resultKey !== segment.key ||
    result.reward?.kind !== segment.kind ||
    typeof result.reward.label !== 'string'
  )
    return null;
  return result as WheelOutcome;
}

export function wheelArc(index: number) {
  const start = WHEEL_SEGMENTS.slice(0, index).reduce(
    (sum, segment) => sum + segment.weight * 3.6,
    0
  );
  const end = start + WHEEL_SEGMENTS[index].weight * 3.6;
  return { start, end, middle: (start + end) / 2 };
}

// Pointer is fixed at twelve o'clock. Land in the middle of the server's sector.
export function wheelLanding(index: number, current: number) {
  const target = (360 - wheelArc(index).middle) % 360;
  const offset = ((current % 360) + 360) % 360;
  return current + 5 * 360 + ((target - offset + 360) % 360);
}
