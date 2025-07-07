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

    // Récupérer l'abonnement utilisateur actif
    const userSubscription = await UserSubscription.findOne({
      user: session.user.id,
      status: { $in: ['active', 'trial'] }
    }).populate('subscription');

    if (!userSubscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        userSubscription: null
      });
    }

    const response = {
      hasSubscription: true,
      subscription: userSubscription.subscription,
      userSubscription: {
        id: userSubscription._id,
        status: userSubscription.status,
        currentPeriodStart: userSubscription.currentPeriodStart,
        currentPeriodEnd: userSubscription.currentPeriodEnd,
        trialEnd: userSubscription.status === 'trial' ? userSubscription.currentPeriodEnd : undefined,
        usage: userSubscription.usage,
        stripeSubscriptionId: userSubscription.stripeSubscriptionId
      }
    };

    console.log('📊 Abonnement utilisateur récupéré:', {
      userId: session.user.id,
      hasSubscription: response.hasSubscription,
      subscriptionName: response.subscription?.name,
      status: response.userSubscription?.status
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 