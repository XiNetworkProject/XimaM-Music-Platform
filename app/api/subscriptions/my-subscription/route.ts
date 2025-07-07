import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import UserSubscription from '@/models/UserSubscription';
import Subscription from '@/models/Subscription';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Récupérer l'abonnement actuel de l'utilisateur
    const userSubscription = await UserSubscription.findOne({
      userId: session.user.id,
      status: { $in: ['active', 'trial'] }
    }).populate('subscriptionId');

    if (!userSubscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        userSubscription: null
      });
    }

    // Récupérer les détails de l'abonnement
    const subscription = await Subscription.findById(userSubscription.subscriptionId);

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        userSubscription: null
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        _id: subscription._id,
        name: subscription.name,
        price: subscription.price,
        currency: subscription.currency,
        interval: subscription.interval,
        limits: subscription.limits,
        features: subscription.features
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
    console.error('Erreur lors de la récupération de l\'abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 