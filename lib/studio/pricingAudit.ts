/** Internal planning inputs, not imported by the Studio UI. No account identifiers. */
export const STUDIO_SUPPLIER_PRICING = {
  checkedAt: '2026-10-09',
  source: 'https://sunoapi.org/billing',
  usdPerCredit: 0.005,
  // V6 generation: six successful calls at 12 credits in account logs.
  // Endpoint tariffs below are generic billing rows, not per-model guarantees.
  credits: {
    generation: 12, upload_cover: 12, extend: 12, replace: 5,
    vocals: 12, instrumental: 12, style: 0.4, persona: 0,
    stems: 10, stems_multi: 50, stems_instrument: 20, wav: 0.4, cover: 0,
    lyrics: 0.4, syncedLyrics: 0.5, musicVideo: 2,
    mashup: null, sounds: null, midi: null, recovery: null,
  },
  notes: ['Sounds billing only lists V5 (2.5 credits); current V6 cost unconfirmed.', 'V6 Mini/Wild individual rates unconfirmed.', 'Retail Suno credits and supplier credits are not interchangeable.'],
} as const;

export function studioEconomyScenario(input: {
  revenueEur: number; grantedCredits: number; extraRewardCredits: number;
  customerCost: number; providerCredits: number; consumedFraction: number;
  usdToEur: number; reserveFraction: number;
}) {
  for (const value of Object.values(input)) if (!Number.isFinite(value) || value < 0) throw new Error('Invalid scenario');
  if (!input.customerCost || !input.usdToEur || input.consumedFraction > 1 || input.reserveFraction > 1) throw new Error('Invalid scenario');
  const availableCredits = input.grantedCredits + input.extraRewardCredits;
  const consumedCredits = availableCredits * input.consumedFraction;
  const providerCostEur = consumedCredits / input.customerCost * input.providerCredits * STUDIO_SUPPLIER_PRICING.usdPerCredit * input.usdToEur;
  const revenueAfterReserveEur = input.revenueEur * (1 - input.reserveFraction);
  return {
    consumedCredits, outstandingCredits: availableCredits - consumedCredits,
    providerCostEur, revenueAfterReserveEur,
    remainingBeforeOtherCostsEur: revenueAfterReserveEur - providerCostEur,
    // A non-expiring balance remains a future obligation, never recognized as profit.
    outstandingProviderExposureEur: (availableCredits - consumedCredits) / input.customerCost * input.providerCredits * STUDIO_SUPPLIER_PRICING.usdPerCredit * input.usdToEur,
  };
}
