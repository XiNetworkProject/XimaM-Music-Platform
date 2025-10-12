import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getServerSession(authOptions);
    
    // Pour le développement, utiliser un ID par défaut si pas de session
    const userId = session?.user?.id || 'default-user-id';
    
    if (!session?.user?.id) {
      console.log('⚠️ Pas de session, utilisation d\'un ID par défaut pour le développement');
    }

    // Plans d'abonnement disponibles
    const subscriptionPlans = [
      {
        id: 'free',
        name: 'free',
        price: 0,
        currency: 'EUR',
        interval: 'mois',
        description: 'Essentiel pour démarrer',
        features: [
          '50 crédits offerts à l’inscription (≈ 4 générations)',
          '10 pistes maximum',
          '5 playlists maximum',
          'Qualité audio standard',
          'Support communautaire'
        ],
        limits: {
          maxTracks: 10,
          maxPlaylists: 5,
          audioQuality: 'Standard',
          fileMaxMb: 80,
          ads: true,
          analytics: false,
          collaborations: false,
          apiAccess: false,
          support: 'Communautaire'
        },
        popular: false,
        recommended: false,
        creditsMonthly: 0
      },
      {
        id: 'starter',
        name: 'starter',
        price: 9.99,
        currency: 'EUR',
        interval: 'mois',
        description: 'Pour créer régulièrement',
        features: [
          '120 crédits / mois (≈ 10 générations)',
          '20 pistes / mois',
          '20 playlists',
          'Qualité audio 256 kbps',
          'Sans publicités'
        ],
        limits: {
          maxTracks: 20,
          maxPlaylists: 20,
          audioQuality: '256kbps',
          fileMaxMb: 200,
          ads: false,
          analytics: true,
          collaborations: false,
          apiAccess: false,
          support: 'Standard'
        },
        popular: true,
        recommended: true,
        creditsMonthly: 120
      },
      {
        id: 'pro',
        name: 'pro',
        price: 19.99,
        currency: 'EUR',
        interval: 'mois',
        description: 'Pour les créateurs avancés',
        features: [
          '360 crédits / mois (≈ 30 générations)',
          '50 pistes / mois',
          'Playlists illimitées',
          'Qualité audio 320 kbps',
          'Analytics avancées',
          'Support prioritaire'
        ],
        limits: {
          maxTracks: 50,
          maxPlaylists: -1,
          audioQuality: '320kbps',
          fileMaxMb: 500,
          ads: false,
          analytics: true,
          collaborations: true,
          apiAccess: false,
          support: 'Prioritaire'
        },
        popular: false,
        recommended: false,
        creditsMonthly: 360
      },
      {
        id: 'enterprise',
        name: 'enterprise',
        price: 39.99,
        currency: 'EUR',
        interval: 'mois',
        description: 'Pour les équipes et studios',
        features: [
          '1200 crédits / mois (≈ 100 générations)',
          'Pistes illimitées',
          'Playlists illimitées',
          'Qualité audio Ultra HD',
          'Collaborations + API',
          'Support dédié'
        ],
        limits: {
          maxTracks: -1,
          maxPlaylists: -1,
          audioQuality: 'Ultra HD',
          fileMaxMb: 1000,
          ads: false,
          analytics: true,
          collaborations: true,
          apiAccess: true,
          support: 'Dédié'
        },
        popular: false,
        recommended: false,
        creditsMonthly: 1200
      }
    ];

    console.log('✅ Plans d\'abonnement récupérés pour l\'utilisateur:', userId);
    return NextResponse.json({
      plans: subscriptionPlans,
      currentUser: userId
    });

  } catch (error) {
    console.error('❌ Erreur serveur subscriptions:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
