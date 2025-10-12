import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(request: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getServerSession(authOptions);
    
    // Pour le développement, utiliser un ID par défaut si pas de session
    const userId = session?.user?.id || 'default-user-id';
    
    if (!session?.user?.id) {
      console.log('⚠️ Pas de session, utilisation d\'un ID par défaut pour le développement');
    }

    const { subscriptionId } = await request.json();
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'ID d\'abonnement requis' },
        { status: 400 }
      );
    }

    // Récupérer les plans d'abonnement disponibles
    const subscriptionPlans = [
      {
        id: 'free',
        name: 'Gratuit',
        price: 0,
        currency: 'EUR',
        interval: 'mois',
        description: 'Accès limité aux fonctionnalités de base',
        features: [
          '5 pistes maximum',
          '3 playlists maximum',
          'Qualité audio standard',
          'Support communautaire'
        ],
        limits: {
          maxTracks: 5,
          maxPlaylists: 3,
          audioQuality: 'Standard',
          ads: true,
          analytics: false,
          collaborations: false,
          apiAccess: false,
          support: 'Communautaire'
        },
        popular: false,
        recommended: false
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        currency: 'EUR',
        interval: 'mois',
        description: 'Pour les créateurs sérieux',
        features: [
          '100 pistes maximum',
          '50 playlists maximum',
          'Qualité audio HD',
          'Sans publicités',
          'Analytics avancées',
          'Support prioritaire'
        ],
        limits: {
          maxTracks: 100,
          maxPlaylists: 50,
          audioQuality: 'HD',
          ads: false,
          analytics: true,
          collaborations: false,
          apiAccess: false,
          support: 'Prioritaire'
        },
        popular: true,
        recommended: true
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 19.99,
        currency: 'EUR',
        interval: 'mois',
        description: 'Pour les artistes professionnels',
        features: [
          'Pistes illimitées',
          'Playlists illimitées',
          'Qualité audio Ultra HD',
          'Sans publicités',
          'Analytics complètes',
          'Collaborations',
          'Accès API',
          'Support dédié'
        ],
        limits: {
          maxTracks: -1, // Illimité
          maxPlaylists: -1, // Illimité
          audioQuality: 'Ultra HD',
          ads: false,
          analytics: true,
          collaborations: true,
          apiAccess: true,
          support: 'Dédié'
        },
        popular: false,
        recommended: false
      }
    ];

    // Trouver le plan demandé
    const selectedPlan = subscriptionPlans.find(plan => plan.id === subscriptionId);
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Plan d\'abonnement non trouvé' },
        { status: 404 }
      );
    }

    // Pour le moment, simuler une session de paiement
    // En production, vous intégreriez Stripe ici
    const checkoutSession = {
      id: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `/subscriptions/success?session_id=${Date.now()}`,
      amount_total: selectedPlan.price * 100, // En centimes
      currency: selectedPlan.currency,
      status: 'open',
      customer: userId,
      subscription: {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'incomplete',
        plan: selectedPlan
      }
    };

    console.log('✅ Session de paiement créée:', {
      userId: userId,
      planId: subscriptionId,
      planName: selectedPlan.name,
      amount: selectedPlan.price
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      amount: selectedPlan.price,
      currency: selectedPlan.currency,
      plan: selectedPlan
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création de la session de paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    );
  }
}
