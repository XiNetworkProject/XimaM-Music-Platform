import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';

// POST - Suivre/Ne plus suivre un utilisateur
export async function POST(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    await dbConnect();
    if (!isConnected()) await dbConnect();
    const { username } = params;
    const userToFollow = await User.findOne({ username });
    const currentUser = await User.findById(session.user.id);
    if (!userToFollow || !currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    if (userToFollow._id.equals(currentUser._id)) {
      return NextResponse.json({ error: 'Impossible de se suivre soi-même' }, { status: 400 });
    }
    const isFollowing = currentUser.following.includes(userToFollow._id);
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter((id: any) => !id.equals(userToFollow._id));
      userToFollow.followers = userToFollow.followers.filter((id: any) => !id.equals(currentUser._id));
    } else {
      // Follow
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
    }
    await currentUser.save();
    await userToFollow.save();
    return NextResponse.json({ success: true, following: !isFollowing });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors du follow' }, { status: 500 });
  }
}

// GET - Vérifier si l'utilisateur suit cet utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    const targetUser = await User.findOne({ username: params.username });
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const isFollowing = currentUser.following.includes(targetUser._id);

    return NextResponse.json({
      following: isFollowing,
      followersCount: targetUser.followersCount,
      followingCount: targetUser.followingCount
    });

  } catch (error) {
    console.error('Erreur vérification follow:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
} 