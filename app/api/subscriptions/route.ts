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
        name: 'Gratuit',
        price: 0,
        currency: 'EUR',
        interval: 'mois',
        description: 'Accès limité aux fonctionnalités de base',
        features: [
          '5 pistes maximum',
          '3 playlists maximum',
          '500MB de stockage',
          'Qualité audio standard',
          'Support communautaire'
        ],
        limits: {
          maxTracks: 5,
          maxPlaylists: 3,
          maxStorageGB: 0.5,
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
          '10GB de stockage',
          'Qualité audio HD',
          'Sans publicités',
          'Analytics avancées',
          'Support prioritaire'
        ],
        limits: {
          maxTracks: 100,
          maxPlaylists: 50,
          maxStorageGB: 10,
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
          '100GB de stockage',
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
          maxStorageGB: 100,
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
