import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import UserSubscription from '@/models/UserSubscription';
import Subscription from '@/models/Subscription';

export async function GET() {
  try {
    console.log('🔍 Début de la requête my-subscription');
    
    const session = await getServerSession(authOptions);
    console.log('👤 Session utilisateur:', session?.user?.id ? 'Présente' : 'Absente');
    
    if (!session?.user?.id) {
      console.log('❌ Utilisateur non autorisé');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    console.log('✅ Utilisateur autorisé:', session.user.id);
    await dbConnect();

    // Récupérer l'abonnement utilisateur actif
    const userSubscription = await UserSubscription.findOne({
      user: session.user.id,
      status: { $in: ['active', 'trial'] }
    }).populate('subscription');

    console.log('📊 Abonnement utilisateur trouvé:', userSubscription ? 'Oui' : 'Non');
    if (userSubscription) {
      console.log('📋 Détails abonnement:', {
        id: userSubscription._id,
        status: userSubscription.status,
        subscription: userSubscription.subscription,
        currentPeriodEnd: userSubscription.currentPeriodEnd
      });
    }

    if (!userSubscription) {
      console.log('⚠️ Aucun abonnement actif trouvé');
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        usage: null
      });
    }

    // Vérifier si l'abonnement est réellement expiré
    const now = new Date();
    const isExpired = userSubscription.currentPeriodEnd && 
                     new Date(userSubscription.currentPeriodEnd) < now;
    const isTrialExpired = userSubscription.trialEnd && 
                          new Date(userSubscription.trialEnd) < now;
    
    // Si c'est un essai gratuit expiré, le marquer comme expiré
    if (userSubscription.status === 'trial' && isTrialExpired) {
      console.log('⚠️ Essai gratuit expiré, mise à jour du statut...');
      
      await UserSubscription.findByIdAndUpdate(userSubscription._id, {
        status: 'expired'
      });
      
      console.log('⚠️ Aucun abonnement actif trouvé (essai expiré)');
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        usage: null
      });
    }
    
    // Si c'est un abonnement actif expiré, le marquer comme expiré
    if (userSubscription.status === 'active' && isExpired) {
      console.log('⚠️ Abonnement actif expiré, mise à jour du statut...');
      
      await UserSubscription.findByIdAndUpdate(userSubscription._id, {
        status: 'expired'
      });
      
      console.log('⚠️ Aucun abonnement actif trouvé (expiré)');
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        usage: null
      });
    }

    // Récupérer les détails de l'abonnement
    const subscription = await Subscription.findById(userSubscription.subscription);
    console.log('📦 Détails du plan d\'abonnement:', subscription ? 'Trouvé' : 'Non trouvé');

    if (!subscription) {
      console.log('❌ Plan d\'abonnement non trouvé');
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        usage: null
      });
    }

    const response = {
      hasSubscription: true,
      subscription: {
        id: subscription._id,
        name: subscription.name,
        price: subscription.price,
        currency: subscription.currency,
        interval: subscription.interval,
        features: subscription.features,
        limits: subscription.limits
      },
      userSubscription: {
        id: userSubscription._id,
        status: userSubscription.status,
        currentPeriodStart: userSubscription.currentPeriodStart,
        currentPeriodEnd: userSubscription.currentPeriodEnd,
        trialEnd: userSubscription.trialEnd,
        usage: userSubscription.usage,
        stripeSubscriptionId: userSubscription.stripeSubscriptionId
      }
    };

    console.log('✅ Réponse envoyée:', {
      hasSubscription: response.hasSubscription,
      subscriptionName: response.subscription.name,
      userStatus: response.userSubscription.status
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'abonnement' },
      { status: 500 }
    );
  }
} 