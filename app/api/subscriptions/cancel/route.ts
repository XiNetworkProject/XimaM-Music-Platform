import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import { stripe } from '@/lib/stripe';
import UserSubscription from '@/models/UserSubscription';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    // Récupérer l'abonnement utilisateur
    const userSubscription = await UserSubscription.findOne({ 
      user: session.user.id,
      status: { $in: ['active', 'trial'] }
    });

    if (!userSubscription) {
      return NextResponse.json({ error: 'Aucun abonnement actif trouvé' }, { status: 404 });
    }

    if (!userSubscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'Abonnement Stripe non trouvé' }, { status: 404 });
    }

    // Annuler l'abonnement Stripe
    const canceledSubscription = await stripe.subscriptions.update(
      userSubscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Mettre à jour l'abonnement utilisateur
    await UserSubscription.findByIdAndUpdate(userSubscription._id, {
      status: 'canceled',
    });

    return NextResponse.json({
      success: true,
      message: 'Abonnement annulé avec succès',
      cancelAt: canceledSubscription.cancel_at,
    });

  } catch (error) {
    console.error('Erreur annulation abonnement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'annulation de l\'abonnement' },
      { status: 500 }
    );
  }
} 