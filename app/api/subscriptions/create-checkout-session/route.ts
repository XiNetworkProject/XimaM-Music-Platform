import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Subscription from '@/models/Subscription';
import UserSubscription from '@/models/UserSubscription';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Début création session de paiement...');
    
    // Vérifier les variables d'environnement Stripe
    console.log('🔍 Vérification STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Présente' : 'Manquante');
    console.log('🔍 Vérification NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Présente' : 'Manquante');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️ Mode démo - Stripe non configuré');
      
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }

      await dbConnect();
      const { subscriptionId } = await request.json();
      
      if (!subscriptionId) {
        return NextResponse.json({ error: 'ID d\'abonnement requis' }, { status: 400 });
      }

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return NextResponse.json({ error: 'Abonnement non trouvé' }, { status: 404 });
      }

      // En mode démo, créer directement l'abonnement
      const userSubscription = await UserSubscription.findOneAndUpdate(
        { user: session.user.id },
        {
          subscription: subscriptionId,
          status: 'trial',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
          usage: {
            uploads: 0,
            comments: 0,
            plays: 0,
            playlists: 0,
          },
        },
        { upsert: true, new: true }
      );

      console.log('✅ Abonnement créé en mode démo:', subscription.name);
      
      return NextResponse.json({
        success: true,
        message: `Abonnement ${subscription.name} activé en mode démo`,
        subscription: userSubscription,
        demo: true
      });
    }

    // Code Stripe normal
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Utilisateur non autorisé');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur autorisé:', session.user.id);
    await dbConnect();

    const { subscriptionId } = await request.json();
    console.log('📝 ID abonnement reçu:', subscriptionId);

    if (!subscriptionId) {
      console.log('❌ ID d\'abonnement manquant');
      return NextResponse.json({ error: 'ID d\'abonnement requis' }, { status: 400 });
    }

    // Récupérer l'abonnement
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      console.log('❌ Abonnement non trouvé:', subscriptionId);
      return NextResponse.json({ error: 'Abonnement non trouvé' }, { status: 404 });
    }
    
    console.log('✅ Abonnement trouvé:', subscription.name);

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

    // Code Stripe ici...
    console.log('🔄 Création de la session Stripe...');
    
    // Import dynamique de Stripe pour éviter les erreurs
    const { stripe } = await import('@/lib/stripe');
    
    // Créer ou récupérer le client Stripe
    let customer;
    const existingUserSubscription = await UserSubscription.findOne({ user: session.user.id });
    
    if (existingUserSubscription?.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(existingUserSubscription.stripeCustomerId);
        console.log('✅ Customer Stripe existant récupéré:', customer.id);
      } catch (error) {
        console.log('⚠️ Customer Stripe non trouvé, création d\'un nouveau...');
        // Le customer n'existe plus, on en crée un nouveau
        customer = await stripe.customers.create({
          email: session.user.email || undefined,
          name: session.user.name || undefined,
          metadata: {
            userId: session.user.id,
          },
        });
        
        // Mettre à jour l'ID du customer en base
        await UserSubscription.findOneAndUpdate(
          { user: session.user.id },
          { 
            stripeCustomerId: customer.id,
            $unset: { stripeSubscriptionId: 1 } // Nettoyer l'ancien subscription ID si présent
          },
          { upsert: true }
        );
        console.log('✅ Nouveau customer Stripe créé:', customer.id);
      }
    } else {
      customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      console.log('✅ Nouveau customer Stripe créé:', customer.id);
    }

    // Créer le produit et le prix Stripe s'ils n'existent pas
    let stripePriceId = subscription.stripePriceId;
    
    if (!stripePriceId) {
      console.log('🔄 Création du produit Stripe...');
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

    console.log('✅ Session Stripe créée:', checkoutSession.id);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    console.error('❌ Erreur création session de paiement:', error);
    
    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la session de paiement',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 