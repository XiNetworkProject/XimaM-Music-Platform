import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { isConnected } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import User from '@/models/User';
import Track from '@/models/Track';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    await dbConnect();
    if (!isConnected()) {
      await dbConnect();
    }
    const user = await User.findOne({ email: session.user.email }).lean() as any;
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    // Récupérer les likes et bookmarks
    const likedTracks = await Track.find({ likes: user._id }).distinct('_id');
    const bookmarkedTracks = user.bookmarkedTracks || [];
    return NextResponse.json({
      following: user.following || [],
      likedTracks,
      bookmarkedTracks
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur infos utilisateur' }, { status: 500 });
  }
} 