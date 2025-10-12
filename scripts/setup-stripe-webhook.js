// Setup/ensure Stripe webhook endpoint and print the signing secret
// Usage (PowerShell): node scripts/setup-stripe-webhook.js
// Optional: node scripts/setup-stripe-webhook.js --rotate to rotate existing secret

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

(async () => {
  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY manquant dans .env.local');
    process.exit(1);
  }
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const endpointUrl = `${baseUrl.replace(/\/$/, '')}/api/billing/webhook`;
  const rotate = process.argv.includes('--rotate');

  const stripe = require('stripe')(secretKey);

  try {
    // Chercher un endpoint existant avec cette URL
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    const existing = list.data.find((w) => w.url === endpointUrl);
    const enabledEvents = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ];

    if (existing) {
      console.log(`ℹ️ Webhook déjà présent: ${existing.id} → ${existing.url}`);
      // Mettre à jour les events si différents
      const needUpdate =
        existing.enabled_events.length !== enabledEvents.length ||
        enabledEvents.some((e) => !existing.enabled_events.includes(e));
      if (needUpdate) {
        await stripe.webhookEndpoints.update(existing.id, { enabled_events: enabledEvents });
        console.log('✅ Events mis à jour');
      }
      if (rotate && typeof stripe.webhookEndpoints.rotateSecret === 'function') {
        const rotated = await stripe.webhookEndpoints.rotateSecret(existing.id);
        const newSecret = rotated.secret;
        console.log('🔑 Nouveau signing secret généré.');
        writeEnvSecret(newSecret);
      } else {
        console.log('⚠️ Secret non modifié (utilisez --rotate pour en générer un nouveau).');
      }
    } else {
      // Créer un nouvel endpoint et récupérer le secret
      const created = await stripe.webhookEndpoints.create({
        url: endpointUrl,
        enabled_events: enabledEvents,
        description: 'Synaura billing webhook',
      });
      const signingSecret = created.secret; // visible uniquement à la création
      console.log(`✅ Webhook créé: ${created.id} → ${created.url}`);
      console.log('🔑 Signing secret récupéré.');
      writeEnvSecret(signingSecret);
    }
  } catch (err) {
    console.error('❌ Erreur Stripe:', err?.message || err);
    process.exit(1);
  }

  function writeEnvSecret(secret) {
    if (!secret) {
      console.warn('⚠️ Aucun secret à écrire');
      return;
    }
    const envPath = path.resolve(process.cwd(), '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf8'); } catch {}
    const line = `STRIPE_WEBHOOK_SECRET=${secret}`;
    if (content.includes('STRIPE_WEBHOOK_SECRET=')) {
      content = content.replace(/STRIPE_WEBHOOK_SECRET=.*/g, line);
    } else {
      content += (content.endsWith('\n') ? '' : '\n') + line + '\n';
    }
    fs.writeFileSync(envPath, content, 'utf8');
    console.log(`📝 .env.local mis à jour avec STRIPE_WEBHOOK_SECRET`);
  }
})();


