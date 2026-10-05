type PricePlan = { id: string; priceMonthly: number; priceYearly: number };
export function planCharge(plan: PricePlan, period: 'month' | 'year'): number | null {
  if (plan.id === 'free') return 0;
  const value = period === 'year' ? plan.priceYearly : plan.priceMonthly;
  return Number.isFinite(value) && value > 0 ? value : null;
}
export function annualSaving(plan: PricePlan): number | null {
  const monthly = planCharge(plan, 'month'); const yearly = planCharge(plan, 'year');
  if (!monthly || !yearly || yearly >= monthly * 12) return null;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}
export function isStripeCheckout(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password; } catch { return false; }
}
