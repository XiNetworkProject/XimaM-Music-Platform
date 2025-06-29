import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Playlist from '@/models/Playlist';

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

    const isOwnProfile = session?.user?.id === user._id.toString();

    // Construire la requête
    let query: any = { createdBy: user._id };
    
    // Si ce n'est pas son propre profil, ne montrer que les playlists publiques
    if (!isOwnProfile) {
      query.isPublic = true;
    }

    const playlists = await Playlist.find(query)
      .populate('createdBy', 'name username avatar')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ playlists });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 