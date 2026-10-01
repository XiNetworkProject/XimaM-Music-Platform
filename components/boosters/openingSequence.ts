// Presentation only. A reveal is never allowed before the server reward exists.
export type OpeningPhase =
  | 'charge'
  | 'waiting'
  | 'sealed'
  | 'tearing'
  | 'fracture'
  | 'burst'
  | 'revealed';
export const CHARGE_MS = 1050;
export const FRACTURE_MS = 180;
export const BURST_MS = 650;
export const TEAR_COMPLETE_AT = 0.92;
export function tearProgress(start: number, deltaY: number, height: number) {
  const travel = Math.min(200, Math.max(110, height * 0.62));
  return Math.min(1, Math.max(0, start) + Math.max(0, deltaY) / travel);
}
export function openingPhase(
  elapsed: number,
  readyAt: number | null,
  immediate: boolean,
  tornAt: number | null = null,
  progress = 0
): OpeningPhase {
  if (immediate) return readyAt === null ? 'waiting' : 'revealed';
  if (tornAt === null) {
    if (progress > 0) return 'tearing';
    return elapsed < CHARGE_MS ? 'charge' : 'sealed';
  }
  if (readyAt === null) return 'waiting';
  const impactStart = Math.max(tornAt, readyAt);
  if (elapsed < impactStart + FRACTURE_MS) return 'fracture';
  if (elapsed < impactStart + FRACTURE_MS + BURST_MS) return 'burst';
  return 'revealed';
}
