/**
 * Script pour créer des codes promo Stripe
 * 
 * Usage : node scripts/create-promo-codes.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé');
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

// Codes promo à créer
const promoCodes = [
  {
    code: 'LAUNCH2025',
    percent_off: 10,
    duration: 'forever',
    max_redemptions: 1000,
    description: 'Lancement 2025 -10% à vie'
  },
  {
    code: 'WELCOME',
    percent_off: 5,
    duration: 'forever',
    max_redemptions: 500,
    description: 'Code de bienvenue - 5% à vie'
  },
  {
    code: 'EARLY',
    percent_off: 15,
    duration: 'forever',
    max_redemptions: 100,
    description: 'Early adopters - 15% à vie'
  },
  {
    code: 'VIP',
    percent_off: 20,
    duration: 'forever',
    max_redemptions: 50,
    description: 'VIP exclusif - 20% à vie'
  },
  {
    code: 'INFLUENCER',
    percent_off: 100,
    duration: 'forever',
    max_redemptions: 20,
    description: 'Influenceurs -100% gratuit'
  },
  {
    code: 'FIRST100',
    percent_off: 25,
    duration: 'forever',
    max_redemptions: 100,
    description: '100 premiers abonnés - 25% à vie'
  }
];

async function createPromoCodes() {
  console.log('🎁 Création des codes promo Stripe...\n');
  console.log('═'.repeat(80) + '\n');

  const created = [];
  const errors = [];

  for (const promo of promoCodes) {
    try {
      console.log(`📝 Création du code ${promo.code}...`);
      
      // Créer le coupon
      const coupon = await stripe.coupons.create({
        percent_off: promo.percent_off,
        duration: promo.duration,
        max_redemptions: promo.max_redemptions,
        name: promo.description,
        metadata: {
          code: promo.code,
          created_by: 'synaura_script'
        }
      });

      // Créer le code promo
      const promotionCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code: promo.code,
        max_redemptions: promo.max_redemptions,
        metadata: {
          description: promo.description
        }
      });

      console.log(`✅ Code créé : ${promo.code}`);
      console.log(`   Coupon ID: ${coupon.id}`);
      console.log(`   Promo Code ID: ${promotionCode.id}`);
      console.log(`   Réduction: ${promo.percent_off}%`);
      console.log(`   Durée: ${promo.duration}`);
      console.log(`   Utilisations max: ${promo.max_redemptions}`);
      console.log('');

      created.push({
        code: promo.code,
        couponId: coupon.id,
        promoCodeId: promotionCode.id,
        discount: promo.percent_off
      });

    } catch (e) {
      console.error(`❌ Erreur pour ${promo.code}:`, e.message);
      errors.push({ code: promo.code, error: e.message });
      console.log('');
    }
  }

  // Résumé
  console.log('═'.repeat(80));
  console.log('\n🎉 Création des codes promo terminée !\n');
  console.log(`✅ Codes créés : ${created.length}`);
  console.log(`❌ Erreurs : ${errors.length}`);
  
  if (created.length > 0) {
    console.log('\n📋 Codes promo actifs :');
    console.log('─'.repeat(80));
    created.forEach(p => {
      console.log(`   ${p.code.padEnd(15)} | -${p.discount}%`);
    });
  }

  if (errors.length > 0) {
    console.log('\n⚠️  Erreurs :');
    errors.forEach(e => {
      console.log(`   ${e.code}: ${e.error}`);
    });
  }

  console.log('\n💡 Ces codes peuvent être utilisés sur la page /subscriptions');
  console.log('   ou directement dans Stripe Checkout.\n');
}

createPromoCodes();

