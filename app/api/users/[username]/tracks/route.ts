import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';

// GET - Récupérer les pistes d'un utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { username } = params;

    await dbConnect();

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const tracks = await Track.find({ artist: user._id })
      .populate('artist', 'name username avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Marquer les pistes likées par l'utilisateur connecté
    if (session?.user?.id) {
      tracks.forEach(track => {
        track.isLiked = track.likes?.includes(session.user.id) || false;
      });
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 