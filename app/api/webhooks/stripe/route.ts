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
  console.log('🔍 Détails de l\'abonnement Stripe:', {
    id: subscription.id,
    status: subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    trial_end: subscription.trial_end,
    customer: subscription.customer,
    metadata: subscription.metadata
  });

  // Essayer de récupérer les métadonnées
  let { userId, subscriptionId, subscriptionType } = subscription.metadata || {};

  // Si les métadonnées sont manquantes, essayer de retrouver l'utilisateur via le customer
  if (!userId && subscription.customer) {
    console.log('⚠️ Métadonnées manquantes, recherche via customer...');
    
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      
      // Vérifier que le customer n'est pas supprimé et a un email
      if (customer.deleted || !customer.email) {
        console.log('❌ Customer supprimé ou sans email');
        return;
      }
      
      console.log('👤 Customer trouvé:', customer.email);
      
      // Rechercher l'utilisateur par email
      const User = (await import('@/models/User')).default;
      const user = await User.findOne({ email: customer.email });
      
      if (user) {
        userId = user._id.toString();
        console.log('✅ Utilisateur trouvé via email:', userId);
      } else {
        console.log('❌ Utilisateur non trouvé pour l\'email:', customer.email);
        return;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du customer:', error);
      return;
    }
  }

  // Si on n'a toujours pas d'userId, on ne peut pas continuer
  if (!userId) {
    console.log('❌ Impossible de déterminer l\'utilisateur');
    return;
  }

  // Si on n'a pas de subscriptionId, essayer de le déterminer via le prix Stripe
  if (!subscriptionId) {
    console.log('⚠️ subscriptionId manquant, recherche via prix...');
    
    try {
      const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
      console.log('💰 Prix trouvé:', price.metadata);
      
      if (price.metadata.subscription_type) {
        // Rechercher l'abonnement par type
        const subscriptionDoc = await Subscription.findOne({ name: price.metadata.subscription_type });
        if (subscriptionDoc) {
          subscriptionId = subscriptionDoc._id.toString();
          subscriptionType = subscriptionDoc.name;
          console.log('✅ Abonnement trouvé via prix:', subscriptionType);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du prix:', error);
    }
  }

  // Si on n'a toujours pas de subscriptionId, utiliser un abonnement par défaut
  if (!subscriptionId) {
    console.log('⚠️ Utilisation de l\'abonnement par défaut (starter)');
    const defaultSubscription = await Subscription.findOne({ name: 'starter' });
    if (defaultSubscription) {
      subscriptionId = defaultSubscription._id.toString();
      subscriptionType = 'starter';
    } else {
      console.log('❌ Aucun abonnement par défaut trouvé');
      return;
    }
  }

  // Récupérer les détails de l'abonnement
  const subscriptionDetails = await Subscription.findById(subscriptionId);
  if (!subscriptionDetails) {
    console.error(`❌ Abonnement ${subscriptionId} non trouvé`);
    return;
  }

  console.log('✅ Abonnement trouvé:', subscriptionDetails.name);

  // Convertir les timestamps Stripe (secondes) en dates JavaScript
  const currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : new Date();
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined;

  console.log('📅 Dates converties:', {
    currentPeriodStart: currentPeriodStart.toISOString(),
    currentPeriodEnd: currentPeriodEnd.toISOString(),
    trialEnd: trialEnd?.toISOString()
  });

  // Créer ou mettre à jour l'abonnement utilisateur
  const userSubscription = await UserSubscription.findOneAndUpdate(
    { user: userId },
    {
      subscription: subscriptionId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      status: subscription.status === 'trialing' ? 'trial' : 'active',
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      trialEnd: trialEnd,
      usage: {
        uploads: 0,
        comments: 0,
        plays: 0,
        playlists: 0,
      },
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Abonnement créé pour l'utilisateur ${userId}: ${subscriptionType}`);
  console.log('📊 Abonnement utilisateur:', userSubscription._id);
}

async function handleSubscriptionUpdated(subscription: any) {
  const { userId, subscriptionId } = subscription.metadata;

  // Convertir les timestamps Stripe (secondes) en dates JavaScript
  const currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : new Date();
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined;

  // Mettre à jour l'abonnement utilisateur
  await UserSubscription.findOneAndUpdate(
    { user: userId },
    {
      status: subscription.status === 'trialing' ? 'trial' : subscription.status,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      trialEnd: trialEnd,
    }
  );

  console.log(`✅ Abonnement mis à jour pour l'utilisateur ${userId}`);
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
  console.log('🔍 Détails de la facture:', {
    id: invoice.id,
    subscription: invoice.subscription,
    status: invoice.status
  });

  if (!invoice.subscription) {
    console.log('⚠️ Pas d\'abonnement associé à cette facture');
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const { userId } = subscription.metadata;

    // Mettre à jour le statut du paiement
    await Payment.findOneAndUpdate(
      { stripeSubscriptionId: invoice.subscription },
      { status: 'succeeded' }
    );

    console.log(`✅ Paiement réussi pour l'abonnement de l'utilisateur ${userId}`);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'abonnement:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log('🔍 Détails de la facture échouée:', {
    id: invoice.id,
    subscription: invoice.subscription,
    status: invoice.status
  });

  if (!invoice.subscription) {
    console.log('⚠️ Pas d\'abonnement associé à cette facture');
    return;
  }

  try {
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

    console.log(`❌ Paiement échoué pour l'abonnement de l'utilisateur ${userId}`);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'abonnement:', error);
  }
} 