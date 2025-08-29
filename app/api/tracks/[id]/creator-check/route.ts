import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

// GET /api/tracks/[id]/creator-check - Vérifier si l'utilisateur est le créateur de la piste
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;
    const userId = session.user.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({
        isCreator: false,
        trackId,
        userId,
        message: 'Radio - pas de créateur'
      });
    }

    // Vérifier si la piste existe et récupérer le créateur
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, creator_id')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Piste non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur est le créateur
    const isCreator = track.creator_id === userId;

    return NextResponse.json({
      isCreator,
      trackId,
      userId
    });

  } catch (error) {
    console.error('❌ Erreur vérification créateur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
