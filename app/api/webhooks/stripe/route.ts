import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/db';
import UserSubscription from '@/models/UserSubscription';
import Payment from '@/models/Payment';
import Subscription from '@/models/Subscription';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook Stripe reçu');
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    console.log('📝 Signature présente:', !!signature);
    console.log('🔑 Webhook secret configuré:', !!webhookSecret);

    if (!signature) {
      console.log('❌ Signature manquante');
      return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Erreur signature webhook:', err);
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }

    await dbConnect();

    console.log('📋 Type d\'événement:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('✅ Traitement checkout.session.completed');
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        console.log('✅ Traitement customer.subscription.created');
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log('✅ Traitement customer.subscription.updated');
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log('✅ Traitement customer.subscription.deleted');
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('✅ Traitement invoice.payment_succeeded');
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log('✅ Traitement invoice.payment_failed');
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`⚠️ Événement non géré: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Erreur webhook Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const { userId, subscriptionId, subscriptionType } = session.metadata;

  // Mettre à jour le statut du paiement
  await Payment.findOneAndUpdate(
    { stripePaymentIntentId: session.payment_intent },
    { status: 'succeeded' }
  );

  console.log(`Paiement réussi pour l'utilisateur ${userId}`);
}

async function handleSubscriptionCreated(subscription: any) {
  const { userId, subscriptionId, subscriptionType } = subscription.metadata;

  // Récupérer les détails de l'abonnement
  const subscriptionDetails = await Subscription.findById(subscriptionId);
  if (!subscriptionDetails) {
    console.error(`Abonnement ${subscriptionId} non trouvé`);
    return;
  }

  // Créer ou mettre à jour l'abonnement utilisateur
  const userSubscription = await UserSubscription.findOneAndUpdate(
    { user: userId },
    {
      subscription: subscriptionId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      status: subscription.status === 'trialing' ? 'trial' : 'active',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      usage: {
        uploads: 0,
        comments: 0,
        plays: 0,
        playlists: 0,
      },
    },
    { upsert: true, new: true }
  );

  console.log(`Abonnement créé pour l'utilisateur ${userId}: ${subscriptionType}`);
}

async function handleSubscriptionUpdated(subscription: any) {
  const { userId, subscriptionId } = subscription.metadata;

  // Mettre à jour l'abonnement utilisateur
  await UserSubscription.findOneAndUpdate(
    { user: userId },
    {
      status: subscription.status === 'trialing' ? 'trial' : subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    }
  );

  console.log(`Abonnement mis à jour pour l'utilisateur ${userId}`);
}

async function handleSubscriptionDeleted(subscription: any) {
  const { userId } = subscription.metadata;

  // Marquer l'abonnement comme annulé
  await UserSubscription.findOneAndUpdate(
    { user: userId },
    { status: 'canceled' }
  );

  console.log(`Abonnement annulé pour l'utilisateur ${userId}`);
}

async function handlePaymentSucceeded(invoice: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId } = subscription.metadata;

  // Mettre à jour le statut du paiement
  await Payment.findOneAndUpdate(
    { stripeSubscriptionId: invoice.subscription },
    { status: 'succeeded' }
  );

  console.log(`Paiement réussi pour l'abonnement de l'utilisateur ${userId}`);
}

async function handlePaymentFailed(invoice: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId } = subscription.metadata;

  // Mettre à jour le statut du paiement
  await Payment.findOneAndUpdate(
    { stripeSubscriptionId: invoice.subscription },
    { status: 'failed' }
  );

  // Marquer l'abonnement comme en retard de paiement
  await UserSubscription.findOneAndUpdate(
    { user: userId },
    { status: 'past_due' }
  );

  console.log(`Paiement échoué pour l'abonnement de l'utilisateur ${userId}`);
} 