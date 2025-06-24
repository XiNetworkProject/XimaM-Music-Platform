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

    const track = await Track.findById(params.id);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const isLiked = track.likes.includes(session.user.id);

    if (isLiked) {
      // Unliker
      await Track.findByIdAndUpdate(params.id, {
        $pull: { likes: session.user.id },
        $inc: { likesCount: -1 }
      });
      
      await User.findByIdAndUpdate(session.user.id, {
        $pull: { likedTracks: params.id }
      });

      return NextResponse.json({ 
        success: true, 
        liked: false,
        likesCount: track.likesCount - 1
      });
    } else {
      // Liker
      await Track.findByIdAndUpdate(params.id, {
        $addToSet: { likes: session.user.id },
        $inc: { likesCount: 1 }
      });
      
      await User.findByIdAndUpdate(session.user.id, {
        $addToSet: { likedTracks: params.id }
      });

      return NextResponse.json({ 
        success: true, 
        liked: true,
        likesCount: track.likesCount + 1
      });
    }

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