import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { id: targetUserId } = params;
    const currentUserId = session.user.id;

    // Empêcher de se suivre soi-même
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous suivre vous-même' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Vérifier que l'utilisateur cible existe
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur suit déjà la cible
    const currentUser = await User.findById(currentUserId);
    const isFollowing = currentUser?.following?.includes(targetUserId);

    if (isFollowing) {
      // Ne plus suivre
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetUserId }
      });
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followers: currentUserId }
      });
    } else {
      // Suivre
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetUserId }
      });
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: currentUserId }
      });
    }

    return NextResponse.json({
      success: true,
      isFollowing: !isFollowing,
      message: isFollowing ? 'Ne suit plus' : 'Suit maintenant'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 