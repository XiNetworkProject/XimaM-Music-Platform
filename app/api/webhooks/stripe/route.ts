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
  console.log('🔍 Détails de la session checkout:', {
    id: session.id,
    customer: session.customer,
    subscription: session.subscription,
    metadata: session.metadata
  });

  const { subscriptionId, subscriptionType } = session.metadata || {};
  let { userId } = session.metadata || {};

  // Si on a les métadonnées, créer l'abonnement directement
  if (userId && subscriptionId) {
    console.log('✅ Création de l\'abonnement depuis le checkout...');
    
    try {
      // Récupérer les détails de l'abonnement
      const subscriptionDetails = await Subscription.findById(subscriptionId);
      if (!subscriptionDetails) {
        console.error(`❌ Abonnement ${subscriptionId} non trouvé`);
        return;
      }

      // Récupérer les détails de l'abonnement Stripe si disponible
      let stripeSubscription: any = null;
      if (session.subscription) {
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log('📦 Abonnement Stripe récupéré:', stripeSubscription.id);
        } catch (error) {
          console.log('⚠️ Impossible de récupérer l\'abonnement Stripe:', (error as Error).message);
        }
      }

      // Convertir les dates
      const currentPeriodStart = stripeSubscription?.current_period_start ? 
        new Date(stripeSubscription.current_period_start * 1000) : new Date();
      const currentPeriodEnd = stripeSubscription?.current_period_end ? 
        new Date(stripeSubscription.current_period_end * 1000) : 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const trialEnd = stripeSubscription?.trial_end ? 
        new Date(stripeSubscription.trial_end * 1000) : undefined;

      // Créer ou mettre à jour l'abonnement utilisateur
      const userSubscription = await UserSubscription.findOneAndUpdate(
        { user: userId },
        {
          subscription: subscriptionId,
          stripeSubscriptionId: session.subscription || null,
          stripeCustomerId: session.customer,
          status: stripeSubscription?.status === 'trialing' ? 'trial' : 'active',
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

      console.log(`✅ Abonnement créé depuis checkout pour l'utilisateur ${userId}: ${subscriptionType}`);
      console.log('📊 Abonnement utilisateur:', userSubscription._id);

    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'abonnement:', error);
    }
  } else {
    console.log('⚠️ Métadonnées manquantes dans le checkout, attente du webhook subscription.created');
  }

  // Mettre à jour le statut du paiement si il y en a un
  if (session.payment_intent) {
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: session.payment_intent },
      { status: 'succeeded' }
    );
  }

  console.log(`Paiement réussi pour l'utilisateur ${userId || 'inconnu'}`);
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
  console.log('🔍 Mise à jour abonnement Stripe:', {
    id: subscription.id,
    status: subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    trial_end: subscription.trial_end,
    metadata: subscription.metadata
  });

  const { subscriptionId } = subscription.metadata || {};
  let { userId } = subscription.metadata || {};

  // Si pas de métadonnées, essayer de retrouver l'utilisateur via le customer
  if (!userId && subscription.customer) {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (!customer.deleted && customer.email) {
        const User = (await import('@/models/User')).default;
        const user = await User.findOne({ email: customer.email });
        if (user) {
          userId = user._id.toString();
          console.log('✅ Utilisateur trouvé via customer:', userId);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du customer:', error);
    }
  }

  if (!userId) {
    console.log('❌ Impossible de déterminer l\'utilisateur pour la mise à jour');
    return;
  }

  // Convertir les timestamps Stripe (secondes) en dates JavaScript
  const currentPeriodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : new Date();
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined;

  // Déterminer le statut correct
  let status = 'active';
  if (subscription.status === 'trialing') {
    status = 'trial';
  } else if (subscription.status === 'active') {
    status = 'active';
  } else if (subscription.status === 'canceled') {
    status = 'canceled';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'unpaid') {
    status = 'expired';
  }

  console.log('📊 Mise à jour avec statut:', status);

  // Mettre à jour l'abonnement utilisateur
  const updatedSubscription = await UserSubscription.findOneAndUpdate(
    { user: userId },
    {
      status: status,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      trialEnd: trialEnd,
    },
    { new: true }
  );

  console.log(`✅ Abonnement mis à jour pour l'utilisateur ${userId}: ${status}`);
  console.log('📋 Détails mise à jour:', {
    id: updatedSubscription?._id,
    status: updatedSubscription?.status,
    currentPeriodEnd: updatedSubscription?.currentPeriodEnd
  });
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