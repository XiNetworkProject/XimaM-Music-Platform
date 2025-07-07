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

    // Code Stripe normal (à décommenter quand Stripe sera configuré)
    /*
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
    */

    return NextResponse.json({
      error: 'Stripe en cours de configuration',
      message: 'Veuillez configurer les clés Stripe pour activer les paiements'
    }, { status: 503 });

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