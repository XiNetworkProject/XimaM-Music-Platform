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

    // Validation de l'ID
    if (!trackId || trackId.length !== 24) {
      return NextResponse.json({ error: 'ID de piste invalide' }, { status: 400 });
    }

    // Vérifier si la piste existe
    const track = await Track.findById(trackId);
    if (!track) {
      return NextResponse.json({ error: 'Piste non trouvée' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké
    const isLiked = track.likes.some((likeId: any) => likeId.toString() === session.user.id);

    let updatedTrack;
    
    if (isLiked) {
      // Retirer le like
      updatedTrack = await Track.findByIdAndUpdate(
        trackId,
        { $pull: { likes: session.user.id } },
        { new: true }
      ).populate('artist', 'name username avatar');
    } else {
      // Ajouter le like
      updatedTrack = await Track.findByIdAndUpdate(
        trackId,
        { $addToSet: { likes: session.user.id } },
        { new: true }
      ).populate('artist', 'name username avatar');
    }

    if (!updatedTrack) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    // Mettre à jour les statistiques de l'utilisateur si nécessaire
    try {
      const user = await User.findById(session.user.id);
      if (user) {
        if (isLiked) {
          // Retirer de la liste des likes de l'utilisateur
          user.likes = user.likes.filter((likeId: any) => likeId.toString() !== trackId);
        } else {
          // Ajouter à la liste des likes de l'utilisateur
          if (!user.likes.some((likeId: any) => likeId.toString() === trackId)) {
            user.likes.push(trackId);
          }
        }
        await user.save();
      }
    } catch (userError) {
      console.error('Erreur mise à jour utilisateur:', userError);
      // Ne pas faire échouer la requête principale
    }

    return NextResponse.json({
      success: true,
      isLiked: !isLiked,
      likes: updatedTrack.likes,
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