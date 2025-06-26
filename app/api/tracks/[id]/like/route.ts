import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Track from '@/models/Track';
import User from '@/models/User';

// POST - Liker/Unliker une piste
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();
    const trackId = params.id;

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké
    const isLiked = track.likes.includes(session.user.id);

    if (isLiked) {
      // Retirer le like
      await Track.findByIdAndUpdate(trackId, {
        $pull: { likes: session.user.id }
      });
    } else {
      // Ajouter le like
      await Track.findByIdAndUpdate(trackId, {
        $addToSet: { likes: session.user.id }
      });
    }

    // Récupérer la piste mise à jour
    const updatedTrack = await Track.findById(trackId)
      .populate('artist', 'name username avatar');

    return NextResponse.json({
      success: true,
      isLiked: !isLiked,
      likesCount: updatedTrack.likes.length,
      track: updatedTrack
    });

  } catch (error) {
    console.error('Erreur like/unlike:', error);
    return NextResponse.json(
      { error: 'Erreur lors du like/unlike' },
      { status: 500 }
    );
  }
}

// GET - Vérifier si l'utilisateur a liké la piste
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    const isLiked = track.likes.includes(session.user.id);

    return NextResponse.json({ 
      liked: isLiked,
      likesCount: track.likesCount
    });

  } catch (error) {
    console.error('Erreur vérification like:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
} 