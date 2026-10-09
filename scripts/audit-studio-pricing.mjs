// Read-only economics scenarios. No environment secrets, DB, supplier calls or purchases.
// node --experimental-strip-types scripts/audit-studio-pricing.mjs
import { PLANS, CREDIT_PACKS, CREDITS_PER_GENERATION } from '../lib/billing/pricing.ts';
import { STUDIO_SUPPLIER_PRICING, studioEconomyScenario } from '../lib/studio/pricingAudit.ts';
import { STUDIO_PRICING_POLICY, accessibleStudioPrices, STUDIO_PRICING_REVIEW } from '../lib/studio/pricing.ts';

const assumptions = {
  usdToEur: 1, // Deliberately explicit stress-test assumption, NOT a live exchange rate.
  reserveFraction: 0.20, // Planning envelope, NOT a tax rate or measured payment fee.
};
const offers = Object.values(PLANS).filter(plan => plan.monthlyCredits > 0).flatMap(plan => [
  { name: `${plan.key}/month`, revenueEur: plan.priceMonthly, grantedCredits: plan.monthlyCredits },
  { name: `${plan.key}/year-month-equivalent`, revenueEur: plan.priceYearly / 12, grantedCredits: plan.monthlyCredits },
]).concat(CREDIT_PACKS.map(pack => ({ name: `pack/${pack.id}`, revenueEur: pack.priceEur, grantedCredits: pack.credits })));
const scenarios = offers.flatMap(offer => [0.5, 1].flatMap(consumedFraction => [0, 50].map(extraRewardCredits => ({
  offer: offer.name, consumedFraction, extraRewardCredits,
  ...studioEconomyScenario({ revenueEur: offer.revenueEur, grantedCredits: offer.grantedCredits, ...assumptions, consumedFraction, extraRewardCredits, customerCost: CREDITS_PER_GENERATION, providerCredits: STUDIO_SUPPLIER_PRICING.credits.generation }),
}))));
console.log(JSON.stringify({
  policy: STUDIO_PRICING_POLICY, assumptions,
  caveats: ['Hypothetical scenarios, not measured margins.', 'Unused credits remain redeemable; no breakage revenue assumed.', 'Reward amounts are stress cases, not measured averages.', 'Hosting, taxes, payment fees and usage mix require actual accounting data.', ...STUDIO_SUPPLIER_PRICING.notes],
  releaseConfiguration: { STUDIO_TOOLS_ENABLED: 'true', STUDIO_TOOLS_PRICING_POLICY: STUDIO_PRICING_POLICY },
  tariffs: accessibleStudioPrices(), unavailablePendingCosts: STUDIO_PRICING_REVIEW,
  scenarios,
}, null, 2));
