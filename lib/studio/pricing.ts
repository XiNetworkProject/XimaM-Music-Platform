/** Customer credit scale. This is not a supplier-credit or currency conversion. */
export const STUDIO_PRICING_POLICY = 'accessible-v1';
export const STUDIO_TARIFFS = {
  extend: 12, replace: 6, vocals: 12, instrumental: 12,
  mashup: 12, sounds: 4, style: 1, persona: 0,
  stems: 10, stems_multi: 50, stems_instrument: 20,
  wav: 1, midi: 4, cover: 0, recovery: 2,
} as const;
export type PricedStudioTool = keyof typeof STUDIO_TARIFFS;

// Missing billing rows, or an old model's price only: never enable by analogy.
export const STUDIO_PRICING_REVIEW: readonly PricedStudioTool[] = ['mashup', 'sounds', 'midi', 'recovery'];
export function studioTariffReady(action: PricedStudioTool) { return !STUDIO_PRICING_REVIEW.includes(action); }
export function accessibleStudioPrices(): Partial<Record<PricedStudioTool, number>> {
  return Object.fromEntries(Object.entries(STUDIO_TARIFFS).filter(([action]) => studioTariffReady(action as PricedStudioTool)));
}
export function studioCreditsLabel(credits: number) {
  return credits === 0 ? 'Sans crédit' : `${credits} crédit${credits === 1 ? '' : 's'}`;
}
export function parseStudioPriceQuote(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1000) {
    throw new Error('Actualisez le tarif avant de confirmer. Aucun crédit débité.');
  }
  return value;
}
