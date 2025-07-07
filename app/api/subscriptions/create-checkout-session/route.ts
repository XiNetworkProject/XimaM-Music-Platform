import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import { stripe } from '@/lib/stripe';
import Subscription from '@/models/Subscription';
import UserSubscription from '@/models/UserSubscription';
import Payment from '@/models/Payment';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'ID d\'abonnement requis' }, { status: 400 });
    }

    // Récupérer l'abonnement
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return NextResponse.json({ error: 'Abonnement non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif
    const existingSubscription = await UserSubscription.findOne({ 
      user: session.user.id,
      status: { $in: ['active', 'trial'] }
    });

    if (existingSubscription) {
      return NextResponse.json({ 
        error: 'Vous avez déjà un abonnement actif',
        subscriptionId: existingSubscription._id 
      }, { status: 400 });
    }

    // Créer ou récupérer le client Stripe
    let customer;
    const existingUserSubscription = await UserSubscription.findOne({ user: session.user.id });
    
    if (existingUserSubscription?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(existingUserSubscription.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });
    }

    // Créer le produit et le prix Stripe s'ils n'existent pas
    let stripePriceId = subscription.stripePriceId;
    
    if (!stripePriceId) {
      // Créer le produit Stripe
      const product = await stripe.products.create({
        name: subscription.name.charAt(0).toUpperCase() + subscription.name.slice(1),
        description: `Plan ${subscription.name} - ${subscription.features.join(', ')}`,
        metadata: {
          subscription_type: subscription.name,
          features: JSON.stringify(subscription.features),
        },
      });

      // Créer le prix Stripe
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(subscription.price * 100), // Stripe utilise les centimes
        currency: subscription.currency.toLowerCase(),
        recurring: {
          interval: subscription.interval,
        },
        metadata: {
          subscription_type: subscription.name,
        },
      });

      stripePriceId = price.id;

      // Mettre à jour l'abonnement avec l'ID du prix Stripe
      await Subscription.findByIdAndUpdate(subscriptionId, { stripePriceId: price.id });
    }

    // Créer la session de paiement
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscriptions?canceled=true`,
      metadata: {
        userId: session.user.id,
        subscriptionId: subscriptionId,
        subscriptionType: subscription.name,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          subscriptionId: subscriptionId,
          subscriptionType: subscription.name,
        },
        trial_period_days: subscription.name === 'free' ? 0 : 7, // 7 jours d'essai gratuit
      },
    });

    // Enregistrer le paiement en attente
    await Payment.create({
      userId: session.user.id,
      subscriptionId: subscriptionId,
      stripePaymentIntentId: checkoutSession.payment_intent as string,
      amount: subscription.price,
      currency: subscription.currency,
      status: 'pending',
      paymentMethod: 'card',
      metadata: {
        subscriptionType: subscription.name,
        features: subscription.features,
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    console.error('Erreur création session de paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
} 