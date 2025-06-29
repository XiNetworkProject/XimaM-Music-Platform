import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Track from '@/models/Track';
import Playlist from '@/models/Playlist';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { username } = params;

    await dbConnect();

    const user = await User.findOne({ username })
      .select('-password -email');

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur connecté suit cet utilisateur
    let isFollowing = false;
    let isOwnProfile = false;

    if (session?.user?.id) {
      const currentUser = await User.findById(session.user.id).select('following');
      isFollowing = currentUser?.following?.includes(user._id) || false;
      isOwnProfile = user._id.toString() === session.user.id;
    }

    // Compter les statistiques
    const trackCount = await Track.countDocuments({ artist: user._id });
    const playlistCount = await Playlist.countDocuments({ createdBy: user._id });
    
    const tracks = await Track.find({ artist: user._id });
    const totalPlays = tracks.reduce((sum, track) => sum + (track.plays || 0), 0);
    const totalLikes = tracks.reduce((sum, track) => sum + (track.likes?.length || 0), 0);

    const userData = {
      ...user.toObject(),
      isFollowing,
      isOwnProfile,
      trackCount,
      playlistCount,
      totalPlays,
      totalLikes,
    };

    return NextResponse.json({ user: userData });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 