export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type NativeBooster = { id: string; key: string; name: string; description: string; type: 'track' | 'artist' | 'credits'; rarity: Rarity; multiplier: number; duration_hours: number; enabled?: boolean };
export type OwnedBooster = { id: string; status: string; obtained_at: string; booster: NativeBooster };
export type BoosterData = {
  catalog: NativeBooster[]; inventory: OwnedBooster[]; remainingMs: number; streak: number; plan: string;
  packs: Record<string, { eligible: boolean; claimed: number; perWeek: number; size: number }>;
  odds: { rarity: Rarity; percent: number }[];
};
export type BoosterTarget = { id: string; title: string; coverUrl?: string; createdAt?: string };
export type ReceivedBooster = { inventory_id: string; booster: NativeBooster };
export type SpinStatus = { canSpin: boolean; nextAvailableAt: string | null; streak: number };
export type SpinOutcome = { index: number; resultKey: string; reward: { kind: string; label: string }; nextAvailableAt?: string; rewardPayload?: { booster?: NativeBooster } };
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Essentiel', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };
export const RARITY_COLOR: Record<Rarity, string> = { common: '#A2D8CD', rare: '#9FBFFF', epic: '#D3ACFF', legendary: '#F6D39A' };
// Server draw order and weighted angular sizes. No reward is drawn on the phone.
export const WHEEL_SEGMENTS = [
  { key: 'lose', kind: 'none', label: 'À demain', weight: 10, color: '#354665' },
  { key: 'credits_10', kind: 'credits', label: '+10', weight: 20, color: '#176BAA' },
  { key: 'credits_25', kind: 'credits', label: '+25', weight: 20, color: '#6845CD' },
  { key: 'common_booster', kind: 'booster', label: 'Essentiel', weight: 30, color: '#138177' },
  { key: 'rare_booster', kind: 'booster', label: 'Rare', weight: 14, color: '#354DE0' },
  { key: 'epic_booster', kind: 'booster', label: 'Épique', weight: 5, color: '#B33891' },
  { key: 'legendary_booster', kind: 'booster', label: 'Légendaire', weight: 1, color: '#F6C56B' },
] as const;
export function wheelArc(index: number) {
  const start = WHEEL_SEGMENTS.slice(0, index).reduce((sum, entry) => sum + entry.weight * 3.6, 0);
  const end = start + WHEEL_SEGMENTS[index].weight * 3.6;
  return { start, end, middle: (start + end) / 2 };
}
export function readSpinOutcome(value: unknown): SpinOutcome {
  const result = value as SpinOutcome; const entry = WHEEL_SEGMENTS[result?.index];
  if (!Number.isInteger(result?.index) || !entry || entry.key !== result.resultKey || result.reward?.kind !== entry.kind || typeof result.reward?.label !== 'string') throw new Error('Résultat non confirmé. Vérifie ton inventaire avant de recommencer.');
  return result;
}
export function wheelLanding(index: number) { return 5 * 360 + ((360 - wheelArc(index).middle) % 360); }
export function remainingLabel(milliseconds: number) {
  if (!Number.isFinite(milliseconds)) return 'Horaire indisponible';
  if (milliseconds <= 0) return 'Disponible';
  const minutes = Math.ceil(milliseconds / 60000);
  return minutes >= 60 ? Math.floor(minutes / 60) + ' h ' + String(minutes % 60).padStart(2, '0') : minutes + ' min';
}
