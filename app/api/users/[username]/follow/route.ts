import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
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

    const { username } = params;
    const currentUserId = session.user.id;

    await dbConnect();
    
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findOne({ username });

    if (!currentUser || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Empêcher de se suivre soi-même
    if (currentUser._id.equals(targetUser._id)) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous suivre vous-même' }, { status: 400 });
    }

    const isFollowing = currentUser.following?.includes(targetUser._id);
    
    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetUser._id }
      });
      await User.findByIdAndUpdate(targetUser._id, {
        $pull: { followers: currentUserId }
      });
    } else {
      // Follow
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetUser._id }
      });
      await User.findByIdAndUpdate(targetUser._id, {
        $addToSet: { followers: currentUserId }
      });
    }

    return NextResponse.json({ 
      success: true, 
      isFollowing: !isFollowing 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
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