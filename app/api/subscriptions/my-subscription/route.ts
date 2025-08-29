import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

    // Retourner un abonnement par défaut pour l'instant
    const defaultSubscription = {
      hasActiveSubscription: false,
      subscription: null,
      limits: {
        maxTracks: 5,
        maxPlaylists: 3,
        maxStorageGB: 0.5
      }
    };

    console.log('✅ Abonnement par défaut retourné pour l\'utilisateur:', userId);
    return NextResponse.json(defaultSubscription);

  } catch (error) {
    console.error('❌ Erreur serveur subscription:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
