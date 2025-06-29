import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect, { isConnected } from '@/lib/db';
import User from '@/models/User';

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
    if (!isConnected()) {
      await dbConnect();
    }

    const { id: userIdToFollow } = params;
    const currentUserId = session.user.id;

    // Ne pas se suivre soi-même
    if (userIdToFollow === currentUserId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous suivre vous-même' }, { status: 400 });
    }

    // Trouver l'utilisateur à suivre
    const userToFollow = await User.findById(userIdToFollow);
    if (!userToFollow) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Trouver l'utilisateur actuel
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur actuel non trouvé' }, { status: 404 });
    }

    // Vérifier si déjà suivi
    const isFollowing = currentUser.following.includes(userToFollow._id);

    if (isFollowing) {
      // Désuivre
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: userToFollow._id },
        $inc: { followingCount: -1 }
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $pull: { followers: currentUserId },
        $inc: { followersCount: -1 }
      });
    } else {
      // Suivre
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: userToFollow._id },
        $inc: { followingCount: 1 }
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $addToSet: { followers: currentUserId },
        $inc: { followersCount: 1 }
      });
    }

    return NextResponse.json({
      success: true,
      isFollowing: !isFollowing,
      message: isFollowing ? 'Désabonné avec succès' : 'Abonné avec succès'
    });

  } catch (error) {
    console.error('Erreur follow/unfollow:', error);
    return NextResponse.json(
      { error: 'Erreur lors du follow/unfollow' },
      { status: 500 }
    );
  }
} 