/**
 * Crée les produits et prix Stripe pour Synaura.
 *
 * Prérequis:
 * - STRIPE_SECRET_KEY défini dans l'environnement (utilise .env.local si présent)
 * - npm i stripe (déjà inclus via @supabase)
 *
 * Usage:
 *   node scripts/create_stripe_products.js
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

const CURRENCY = 'eur';

const plans = [
  {
    name: 'Starter',
    description: 'Pour les créateurs débutants',
    monthly: 4.99,
    yearly: 4.99 * 12 * 0.8,
  },
  {
    name: 'Pro',
    description: 'Pour les artistes et professionnels',
    monthly: 14.99,
    yearly: 14.99 * 12 * 0.8,
  },
  {
    name: 'Enterprise',
    description: 'Solutions sur mesure (coming soon)',
    monthly: 59.99,
    yearly: 59.99 * 12 * 0.8,
  },
];

async function createOrGetProduct(name, description) {
  const list = await stripe.products.list({ active: true, limit: 100 });
  const existing = list.data.find(p => p.name === `Synaura ${name}`);
  if (existing) return existing;
  return await stripe.products.create({ name: `Synaura ${name}`, description });
}

async function createOrGetPrice(productId, unitAmount, interval) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(p => p.unit_amount === unitAmount && p.recurring?.interval === interval && p.currency === CURRENCY);
  if (match) return match;
  return await stripe.prices.create({ product: productId, unit_amount: unitAmount, currency: CURRENCY, recurring: { interval } });
}

(async () => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY manquant.');
      process.exit(1);
    }

    const out = {};

    for (const plan of plans) {
      const product = await createOrGetProduct(plan.name, plan.description);
      const month = await createOrGetPrice(product.id, Math.round(plan.monthly * 100), 'month');
      const year = await createOrGetPrice(product.id, Math.round(plan.yearly * 100), 'year');
      out[plan.name] = { productId: product.id, month: month.id, year: year.id };
      console.log(`✅ ${plan.name}: product=${product.id} month=${month.id} year=${year.id}`);
    }

    console.log('\nAjoute ces variables dans .env.local :');
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH=${out.Starter.month}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR=${out.Starter.year}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH=${out.Pro.month}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR=${out.Pro.year}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTH=${out.Enterprise.month}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEAR=${out.Enterprise.year}`);
  } catch (e) {
    console.error('❌ Erreur création produits/prix:', e.message || e);
    process.exit(1);
  }
})();


