/**
 * Script de validation de la cohérence du pricing Synaura.
 *
 * Usage: npx ts-node scripts/validate-pricing.ts
 *   ou:  npx tsx scripts/validate-pricing.ts
 */

import {
  PLANS,
  CREDIT_PACKS,
  CREDITS_PER_GENERATION,
  WELCOME_CREDITS,
  packEurPerCredit,
} from '../lib/billing/pricing';

let errors = 0;
let warnings = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    errors++;
  } else {
    console.log(`  OK: ${msg}`);
  }
}

function warn(condition: boolean, msg: string) {
  if (!condition) {
    console.warn(`  WARN: ${msg}`);
    warnings++;
  }
}

console.log('=== Validation pricing Synaura ===\n');

// 1. CREDITS_PER_GENERATION cohérent
console.log('1. Constantes de base');
assert(CREDITS_PER_GENERATION === 12, `CREDITS_PER_GENERATION = ${CREDITS_PER_GENERATION} (attendu: 12)`);
assert(WELCOME_CREDITS === 50, `WELCOME_CREDITS = ${WELCOME_CREDITS} (attendu: 50)`);

// 2. Plans
console.log('\n2. Plans');
assert(PLANS.free.monthlyCredits === 0, 'Free: 0 crédits/mois');
assert(PLANS.free.priceMonthly === 0, 'Free: prix = 0€');
assert(PLANS.starter.monthlyCredits === 600, `Starter: ${PLANS.starter.monthlyCredits} crédits/mois (attendu: 600)`);
assert(PLANS.pro.monthlyCredits === 2400, `Pro: ${PLANS.pro.monthlyCredits} crédits/mois (attendu: 2400)`);

// Vérifier que l'annuel est bien -20%
const starterExpectedYearly = Math.round(PLANS.starter.priceMonthly * 12 * 0.8 * 100) / 100;
assert(
  Math.abs(PLANS.starter.priceYearly - starterExpectedYearly) < 0.02,
  `Starter annuel: ${PLANS.starter.priceYearly}€ ≈ ${starterExpectedYearly}€ (-20%)`
);

const proExpectedYearly = Math.round(PLANS.pro.priceMonthly * 12 * 0.8 * 100) / 100;
assert(
  Math.abs(PLANS.pro.priceYearly - proExpectedYearly) < 0.02,
  `Pro annuel: ${PLANS.pro.priceYearly}€ ≈ ${proExpectedYearly}€ (-20%)`
);

// 3. Packs moins avantageux que abonnements
console.log('\n3. Packs vs Abonnements (€/crédit)');
const starterEurPerCredit = PLANS.starter.priceMonthly / PLANS.starter.monthlyCredits;
const proEurPerCredit = PLANS.pro.priceMonthly / PLANS.pro.monthlyCredits;
console.log(`  Starter: ${(starterEurPerCredit * 100).toFixed(4)}¢/crédit`);
console.log(`  Pro:     ${(proEurPerCredit * 100).toFixed(4)}¢/crédit`);

for (const pack of CREDIT_PACKS) {
  const eurPerCredit = packEurPerCredit(pack);
  const ratio = eurPerCredit / starterEurPerCredit;
  assert(
    eurPerCredit > starterEurPerCredit,
    `Pack ${pack.label} (${(eurPerCredit * 100).toFixed(4)}¢/cr) plus cher que Starter (${ratio.toFixed(2)}x)`
  );
  assert(
    eurPerCredit > proEurPerCredit,
    `Pack ${pack.label} (${(eurPerCredit * 100).toFixed(4)}¢/cr) plus cher que Pro`
  );
}

// 4. Pas de génération gratuite possible
console.log('\n4. Sécurité: pas de génération gratuite');
assert(CREDITS_PER_GENERATION > 0, 'Coût de génération > 0');
assert(PLANS.free.monthlyCredits === 0, 'Free: 0 crédits récurrents (pas de génération "gratuite" chaque mois)');

// 5. Packs ordonnés par volume
console.log('\n5. Packs ordonnés correctement');
for (let i = 1; i < CREDIT_PACKS.length; i++) {
  assert(
    CREDIT_PACKS[i].credits > CREDIT_PACKS[i - 1].credits,
    `Pack ${CREDIT_PACKS[i].label} (${CREDIT_PACKS[i].credits}) > ${CREDIT_PACKS[i - 1].label} (${CREDIT_PACKS[i - 1].credits})`
  );
  const prevEur = packEurPerCredit(CREDIT_PACKS[i - 1]);
  const currEur = packEurPerCredit(CREDIT_PACKS[i]);
  assert(
    currEur < prevEur,
    `Pack ${CREDIT_PACKS[i].label} meilleur tarif/crédit que ${CREDIT_PACKS[i - 1].label}`
  );
}

// Résumé
console.log('\n=== Résultat ===');
if (errors === 0) {
  console.log(`Tout est OK. ${warnings} warning(s).`);
  process.exit(0);
} else {
  console.error(`${errors} erreur(s), ${warnings} warning(s).`);
  process.exit(1);
}
