import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import dbConnect from '@/lib/db';
import UserSubscription from '@/models/UserSubscription';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Début debug sync abonnement...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    // Récupérer l'abonnement utilisateur
    const userSubscription = await UserSubscription.findOne({ user: session.user.id });
    
    if (!userSubscription) {
      console.log('⚠️ Aucun abonnement trouvé en base, recherche via Stripe...');
      
      // Essayer de trouver l'abonnement Stripe via le customer
      try {
        const User = (await import('@/models/User')).default;
        const user = await User.findById(session.user.id);
        
        if (!user?.email) {
          return NextResponse.json({ 
            error: 'Email utilisateur non trouvé',
            hasSubscription: false 
          });
        }
        
        // Rechercher les abonnements Stripe pour cet utilisateur
        const subscriptions = await stripe.subscriptions.list({
          customer: user.email,
          limit: 10,
          status: 'all'
        });
        
        console.log(`📦 ${subscriptions.data.length} abonnements Stripe trouvés`);
        
        if (subscriptions.data.length === 0) {
          return NextResponse.json({ 
            error: 'Aucun abonnement Stripe trouvé',
            hasSubscription: false 
          });
        }
        
        // Prendre le plus récent
        const latestSubscription = subscriptions.data[0];
        console.log('📋 Abonnement Stripe le plus récent:', {
          id: latestSubscription.id,
          status: latestSubscription.status,
          metadata: latestSubscription.metadata
        });
        
        // Créer l'abonnement en base
        const { subscriptionId, subscriptionType } = latestSubscription.metadata || {};
        
        if (!subscriptionId) {
          return NextResponse.json({
            error: 'Métadonnées subscriptionId manquantes',
            stripeSubscription: latestSubscription
          });
        }
        
        // Convertir les dates
        const currentPeriodStart = (latestSubscription as any).current_period_start ? 
          new Date((latestSubscription as any).current_period_start * 1000) : new Date();
        const currentPeriodEnd = (latestSubscription as any).current_period_end ? 
          new Date((latestSubscription as any).current_period_end * 1000) : new Date();
        const trialEnd = (latestSubscription as any).trial_end ? 
          new Date((latestSubscription as any).trial_end * 1000) : null;
        
        // Déterminer le statut
        let status = 'active';
        if (latestSubscription.status === 'trialing') {
          status = 'trial';
        } else if (latestSubscription.status === 'active') {
          if ((latestSubscription as any).trial_end && (latestSubscription as any).trial_end < Math.floor(Date.now() / 1000)) {
            status = 'active';
          } else {
            status = 'trial';
          }
        }
        
        // Créer l'abonnement
        const newUserSubscription = await UserSubscription.create({
          user: session.user.id,
          subscription: subscriptionId,
          stripeSubscriptionId: latestSubscription.id,
          stripeCustomerId: latestSubscription.customer,
          status: status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          trialEnd: trialEnd,
          usage: {
            uploads: 0,
            comments: 0,
            plays: 0,
            playlists: 0,
          },
        });
        
        console.log('✅ Abonnement créé en base:', newUserSubscription._id);
        
        return NextResponse.json({
          success: true,
          action: 'created',
          status: status,
          subscription: newUserSubscription
        });
        
      } catch (error) {
        console.error('❌ Erreur lors de la création:', error);
        return NextResponse.json({
          error: 'Erreur lors de la création de l\'abonnement',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        }, { status: 500 });
      }
    }

    console.log('📊 Abonnement trouvé:', {
      id: userSubscription._id,
      status: userSubscription.status,
      stripeSubscriptionId: userSubscription.stripeSubscriptionId,
      currentPeriodEnd: userSubscription.currentPeriodEnd,
      trialEnd: userSubscription.trialEnd
    });

    // Si pas d'ID Stripe, on ne peut pas synchroniser
    if (!userSubscription.stripeSubscriptionId) {
      return NextResponse.json({
        error: 'Pas d\'ID Stripe pour synchroniser',
        subscription: userSubscription
      });
    }

    // Récupérer les données Stripe
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(userSubscription.stripeSubscriptionId);
      
      console.log('📦 Données Stripe:', {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_end: (stripeSubscription as any).current_period_end,
        trial_end: (stripeSubscription as any).trial_end
      });

      // Convertir les dates
      const currentPeriodEnd = (stripeSubscription as any).current_period_end ? 
        new Date((stripeSubscription as any).current_period_end * 1000) : null;
      const trialEnd = (stripeSubscription as any).trial_end ? 
        new Date((stripeSubscription as any).trial_end * 1000) : null;

      // Déterminer le statut correct
      let newStatus = 'active';
      if (stripeSubscription.status === 'trialing') {
        newStatus = 'trial';
      } else if (stripeSubscription.status === 'active') {
        newStatus = 'active';
      } else if (stripeSubscription.status === 'canceled') {
        newStatus = 'canceled';
      } else if (stripeSubscription.status === 'past_due') {
        newStatus = 'past_due';
      } else if (stripeSubscription.status === 'unpaid') {
        newStatus = 'expired';
      }

      // Mettre à jour l'abonnement
      const updatedSubscription = await UserSubscription.findByIdAndUpdate(
        userSubscription._id,
        {
          status: newStatus,
          currentPeriodEnd: currentPeriodEnd,
          trialEnd: trialEnd
        },
        { new: true }
      );

      console.log('✅ Abonnement mis à jour:', {
        oldStatus: userSubscription.status,
        newStatus: newStatus
      });

      return NextResponse.json({
        success: true,
        oldStatus: userSubscription.status,
        newStatus: newStatus,
        stripeStatus: stripeSubscription.status,
        subscription: updatedSubscription
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération Stripe:', error);
      return NextResponse.json({
        error: 'Erreur lors de la synchronisation avec Stripe',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erreur debug sync:', error);
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    );
  }
} 