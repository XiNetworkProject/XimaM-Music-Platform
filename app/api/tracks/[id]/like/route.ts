import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

// GET /api/tracks/[id]/like - Vérifier l'état du like (version simplifiée)
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
        liked: false,
        likesCount: 0,
        message: 'Radio - pas de likes'
      });
    }

    // Vérifier si la piste existe
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, likes')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Piste non trouvée' },
        { status: 404 }
      );
    }

    // Version simplifiée : toujours retourner false pour isLiked
    // car nous n'avons pas encore la table track_likes
    const likesCount = track.likes || 0;

    return NextResponse.json({
      liked: false, // Temporairement false
      likesCount: likesCount
    });

  } catch (error) {
    console.error('❌ Erreur vérification like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// POST /api/tracks/[id]/like - Basculer le like (version simplifiée)
export async function POST(
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
        success: false,
        isLiked: false,
        likesCount: 0,
        message: 'Radio - pas de likes'
      });
    }

    // Vérifier si la piste existe
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, likes')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Piste non trouvée' },
        { status: 404 }
      );
    }

    // Version simplifiée : incrémenter le compteur de likes
    // sans vérifier si l'utilisateur a déjà liké
    const currentLikes = track.likes || 0;
    const newLikesCount = currentLikes + 1;

    // Mettre à jour le compteur de likes dans la table tracks
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ likes: newLikesCount })
      .eq('id', trackId);

    if (updateError) {
      console.error('❌ Erreur mise à jour compteur likes:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des likes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isLiked: true, // Temporairement toujours true
      likesCount: newLikesCount,
      track: {
        id: trackId,
        likes: newLikesCount
      }
    });

  } catch (error) {
    console.error('❌ Erreur toggle like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
