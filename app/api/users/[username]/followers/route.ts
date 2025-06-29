import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';

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

    const followers = await User.find({ following: user._id })
      .select('name username avatar bio isVerified')
      .lean();

    // Marquer si l'utilisateur connecté suit chaque follower
    if (session?.user?.id) {
      const currentUser = await User.findById(session.user.id).select('following');
      followers.forEach(follower => {
        follower.isFollowing = currentUser?.following?.includes(follower._id) || false;
      });
    }

    return NextResponse.json({ followers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 