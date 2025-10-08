/**
 * Script pour créer les prix de lancement Stripe
 * 
 * Prérequis :
 * 1. Installer Stripe CLI : npm install stripe
 * 2. Configurer STRIPE_SECRET_KEY dans .env.local
 * 
 * Usage : node scripts/create-stripe-launch-prices.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé. Crée-le d\'abord avec STRIPE_SECRET_KEY');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const stripeKey = envVars.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY non trouvée dans .env.local');
  process.exit(1);
}

const stripe = require('stripe')(stripeKey);

async function createLaunchPrices() {
  console.log('🚀 Création des prix de lancement Synaura...\n');

  try {
    // ========== PLAN STARTER ==========
    console.log('📦 Création du produit Starter...');
    
    const starterProduct = await stripe.products.create({
      name: 'Synaura Starter (Offre de Lancement)',
      description: 'Plan Starter avec 60% de réduction - Offre de lancement limitée',
      metadata: {
        plan: 'starter',
        launch_offer: 'true',
        discount: '60%'
      }
    });
    console.log('✅ Produit Starter créé:', starterProduct.id);

    // Prix mensuel Starter (1,99€)
    const starterMonthly = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 199, // 1,99€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'month'
      },
      nickname: 'Starter Mensuel (Lancement -60%)',
      metadata: {
        plan: 'starter',
        period: 'month',
        launch_offer: 'true',
        original_price: '4.99',
        discount: '60%'
      }
    });
    console.log('✅ Prix Starter Mensuel:', starterMonthly.id);
    console.log('   → NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH=' + starterMonthly.id);

    // Prix annuel Starter (19,16€)
    const starterYearly = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 1916, // 19,16€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'year'
      },
      nickname: 'Starter Annuel (Lancement -60%)',
      metadata: {
        plan: 'starter',
        period: 'year',
        launch_offer: 'true',
        original_price: '47.90',
        discount: '60%'
      }
    });
    console.log('✅ Prix Starter Annuel:', starterYearly.id);
    console.log('   → NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH=' + starterYearly.id);

    // ========== PLAN PRO ==========
    console.log('\n📦 Création du produit Pro...');
    
    const proProduct = await stripe.products.create({
      name: 'Synaura Pro (Offre de Lancement)',
      description: 'Plan Pro avec 50% de réduction - Offre de lancement limitée',
      metadata: {
        plan: 'pro',
        launch_offer: 'true',
        discount: '50%'
      }
    });
    console.log('✅ Produit Pro créé:', proProduct.id);

    // Prix mensuel Pro (7,49€)
    const proMonthly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 749, // 7,49€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'month'
      },
      nickname: 'Pro Mensuel (Lancement -50%)',
      metadata: {
        plan: 'pro',
        period: 'month',
        launch_offer: 'true',
        original_price: '14.99',
        discount: '50%'
      }
    });
    console.log('✅ Prix Pro Mensuel:', proMonthly.id);
    console.log('   → NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH_LAUNCH=' + proMonthly.id);

    // Prix annuel Pro (71,95€)
    const proYearly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 7195, // 71,95€ en centimes
      currency: 'eur',
      recurring: {
        interval: 'year'
      },
      nickname: 'Pro Annuel (Lancement -50%)',
      metadata: {
        plan: 'pro',
        period: 'year',
        launch_offer: 'true',
        original_price: '143.90',
        discount: '50%'
      }
    });
    console.log('✅ Prix Pro Annuel:', proYearly.id);
    console.log('   → NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR_LAUNCH=' + proYearly.id);

    // ========== RÉSUMÉ ==========
    console.log('\n\n🎉 ========== PRIX DE LANCEMENT CRÉÉS AVEC SUCCÈS ! ==========\n');
    console.log('📋 Ajoute ces variables dans ton fichier .env.local :\n');
    console.log('# Prix de lancement Stripe');
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH=${starterMonthly.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH=${starterYearly.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH_LAUNCH=${proMonthly.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR_LAUNCH=${proYearly.id}`);
    console.log('\n✅ Tous les prix de lancement ont été créés !');
    console.log('📊 Prix créés :');
    console.log('   - Starter Mensuel : 1,99€/mois (-60%)');
    console.log('   - Starter Annuel : 19,16€/an (-60%)');
    console.log('   - Pro Mensuel : 7,49€/mois (-50%)');
    console.log('   - Pro Annuel : 71,95€/an (-50%)');
    console.log('\n🎁 Les premiers abonnés conserveront ces prix à vie !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des prix:', error);
    process.exit(1);
  }
}

createLaunchPrices();

