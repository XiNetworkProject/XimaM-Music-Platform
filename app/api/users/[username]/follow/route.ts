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
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    if (!isConnected()) {
      await dbConnect();
    }
    
    const { username } = params;
    
    // Récupérer l'utilisateur actuel
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer l'utilisateur à suivre
    const userToFollow = await User.findOne({ username });
    if (!userToFollow) {
      return NextResponse.json(
        { error: 'Utilisateur à suivre non trouvé' },
        { status: 404 }
      );
    }

    // Empêcher de se suivre soi-même
    if (currentUser._id.toString() === userToFollow._id.toString()) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous suivre vous-même' },
        { status: 400 }
      );
    }
    
    // Vérifier si l'utilisateur suit déjà
    const isFollowing = currentUser.following.includes(userToFollow._id);
    
    if (isFollowing) {
      // Unfollow
      await currentUser.unfollow(userToFollow._id.toString());
      await userToFollow.removeFollower(currentUser._id.toString());
      
      return NextResponse.json({
        success: true,
        action: 'unfollowed',
        message: `Vous ne suivez plus ${userToFollow.name}`
      });
    } else {
      // Follow
      await currentUser.follow(userToFollow._id.toString());
      await userToFollow.addFollower(currentUser._id.toString());

    return NextResponse.json({ 
      success: true, 
        action: 'followed',
        message: `Vous suivez maintenant ${userToFollow.name}`
    });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de l\'action follow/unfollow' },
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