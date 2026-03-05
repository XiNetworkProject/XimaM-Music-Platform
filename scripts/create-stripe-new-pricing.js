/**
 * Script: Création des nouveaux produits et prix Stripe pour Synaura
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-new-pricing.js
 *
 * Ce script crée :
 *   - 2 produits d'abonnement (Starter, Pro) avec prix monthly + yearly
 *   - 4 produits de packs de crédits (one-time)
 *
 * Après exécution, copier les price IDs affichés dans .env.local
 */

const Stripe = require('stripe');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY requis. Usage: STRIPE_SECRET_KEY=sk_... node scripts/create-stripe-new-pricing.js');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2024-04-10' });

async function main() {
  console.log('--- Création des produits Stripe Synaura ---\n');

  // ═══════════════════════════════════════════
  // 1. ABONNEMENTS
  // ═══════════════════════════════════════════

  // Starter
  const starterProduct = await stripe.products.create({
    name: 'Synaura Starter',
    description: '600 crédits/mois (~50 générations), modèles V4.5 et V4.5+',
    metadata: { plan_id: 'starter', credits_amount: '600', is_pack: 'false' },
  });
  console.log(`Produit Starter: ${starterProduct.id}`);

  const starterMonth = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 499,
    currency: 'eur',
    recurring: { interval: 'month' },
    nickname: 'Synaura Starter Mensuel',
    metadata: { plan_id: 'starter', credits_amount: '600', billing_interval: 'month' },
  });
  console.log(`  Starter mensuel: ${starterMonth.id} (4.99€/mois)`);

  const starterYear = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 4788,
    currency: 'eur',
    recurring: { interval: 'year' },
    nickname: 'Synaura Starter Annuel',
    metadata: { plan_id: 'starter', credits_amount: '600', billing_interval: 'year' },
  });
  console.log(`  Starter annuel:  ${starterYear.id} (47.88€/an = 3.99€/mois)\n`);

  // Pro
  const proProduct = await stripe.products.create({
    name: 'Synaura Pro',
    description: '2400 crédits/mois (~200 générations), tous les modèles IA',
    metadata: { plan_id: 'pro', credits_amount: '2400', is_pack: 'false' },
  });
  console.log(`Produit Pro: ${proProduct.id}`);

  const proMonth = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 1499,
    currency: 'eur',
    recurring: { interval: 'month' },
    nickname: 'Synaura Pro Mensuel',
    metadata: { plan_id: 'pro', credits_amount: '2400', billing_interval: 'month' },
  });
  console.log(`  Pro mensuel: ${proMonth.id} (14.99€/mois)`);

  const proYear = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 14388,
    currency: 'eur',
    recurring: { interval: 'year' },
    nickname: 'Synaura Pro Annuel',
    metadata: { plan_id: 'pro', credits_amount: '2400', billing_interval: 'year' },
  });
  console.log(`  Pro annuel:  ${proYear.id} (143.88€/an = 11.99€/mois)\n`);

  // ═══════════════════════════════════════════
  // 2. PACKS DE CRÉDITS (one-time)
  // ═══════════════════════════════════════════

  const packs = [
    { name: 'Pack Petit',      credits: 120,  amount: 199,  id: 'petit' },
    { name: 'Pack Moyen',      credits: 500,  amount: 699,  id: 'moyen' },
    { name: 'Pack Populaire',  credits: 1200, amount: 1499, id: 'populaire' },
    { name: 'Pack Best Value', credits: 3000, amount: 2999, id: 'best_value' },
  ];

  console.log('Packs de crédits:');
  for (const pack of packs) {
    const product = await stripe.products.create({
      name: `Synaura ${pack.name}`,
      description: `${pack.credits} crédits IA (~${Math.floor(pack.credits / 12)} générations)`,
      metadata: {
        packId: pack.id,
        credits_amount: String(pack.credits),
        is_pack: 'true',
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.amount,
      currency: 'eur',
      nickname: `Synaura ${pack.name}`,
      metadata: {
        packId: pack.id,
        credits_amount: String(pack.credits),
        is_pack: 'true',
      },
    });
    console.log(`  ${pack.name}: ${price.id} (${(pack.amount / 100).toFixed(2)}€ → ${pack.credits} crédits)`);
  }

  // ═══════════════════════════════════════════
  // 3. Résumé pour .env.local
  // ═══════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════');
  console.log('Copier dans .env.local :');
  console.log('═══════════════════════════════════════════\n');
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH=${starterMonth.id}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR=${starterYear.id}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH=${proMonth.id}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR=${proYear.id}`);
  console.log('');
  console.log('(Les prix Enterprise ont été supprimés)');
  console.log('\nTerminé !');
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
