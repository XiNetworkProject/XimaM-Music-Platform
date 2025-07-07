import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import UserSubscription from '@/models/UserSubscription';
import Subscription from '@/models/Subscription';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Récupérer l'abonnement utilisateur actif
    const userSubscription = await UserSubscription.findOne({
      user: session.user.id,
      status: { $in: ['active', 'trial'] }
    }).populate('subscription');

    if (!userSubscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        usage: null
      });
    }

    // Récupérer les détails de l'abonnement
    const subscription = await Subscription.findById(userSubscription.subscription);

    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'abonnement' },
      { status: 500 }
    );
  }
} 