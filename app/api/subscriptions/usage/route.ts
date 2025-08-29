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

    // Données d'utilisation par défaut pour le développement
    const usage = {
      tracks: {
        used: 2, // Exemple : 2 tracks utilisées
        limit: 5, // Limite par défaut
        percentage: 40
      },
      playlists: {
        used: 1, // Exemple : 1 playlist créée
        limit: 3, // Limite par défaut
        percentage: 33
      },
      storage: {
        used: 0.1, // Exemple : 100MB utilisés
        limit: 0.5, // 500MB par défaut
        percentage: 20
      }
    };

    console.log('✅ Données d\'utilisation récupérées pour l\'utilisateur:', userId, usage);
    return NextResponse.json(usage);

  } catch (error) {
    console.error('❌ Erreur serveur usage:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
