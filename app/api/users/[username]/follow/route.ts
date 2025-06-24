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
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    // Trouver l'utilisateur à suivre
    const userToFollow = await User.findOne({ username: params.username });
    if (!userToFollow) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Trouver l'utilisateur connecté
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Utilisateur connecté non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si on suit déjà cet utilisateur
    const isFollowing = currentUser.following.includes(userToFollow._id);
    
    if (isFollowing) {
      // Ne plus suivre
      await User.findByIdAndUpdate(currentUser._id, {
        $pull: { following: userToFollow._id }
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $pull: { followers: currentUser._id }
      });
    } else {
      // Suivre
      await User.findByIdAndUpdate(currentUser._id, {
        $addToSet: { following: userToFollow._id }
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $addToSet: { followers: currentUser._id }
      });
    }

    return NextResponse.json({ 
      success: true, 
      following: !isFollowing 
    });
  } catch (error) {
    console.error('Erreur follow/unfollow:', error);
    return NextResponse.json(
      { error: 'Erreur lors du follow/unfollow' },
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