import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// POST /api/users/[id]/follow - Accepter une demande de suivi (suivre l'utilisateur)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: targetUserId } = params;
    if (!targetUserId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    await dbConnect();

    // Récupérer l'utilisateur actuel
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer l'utilisateur à suivre
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur cible non trouvé' }, { status: 404 });
    }

    // Empêcher de se suivre soi-même
    if (currentUser._id.toString() === targetUser._id.toString()) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous suivre vous-même' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur suit déjà
    const isFollowing = currentUser.following.includes(targetUser._id);
    
    if (isFollowing) {
      return NextResponse.json({
        success: true,
        action: 'already_following',
        message: `Vous suivez déjà ${targetUser.name}`
      });
    } else {
      // Suivre l'utilisateur
      await currentUser.follow(targetUser._id.toString());
      await targetUser.addFollower(currentUser._id.toString());

      // Supprimer la demande de suivi si elle existe
      if (targetUser.followRequests?.includes(currentUser._id)) {
        targetUser.followRequests = targetUser.followRequests.filter(
          (id: any) => id.toString() !== currentUser._id.toString()
        );
        await targetUser.save();
      }

      return NextResponse.json({ 
        success: true, 
        action: 'followed',
        message: `Vous suivez maintenant ${targetUser.name}`
      });
    }
  } catch (error) {
    console.error('Erreur follow:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'action follow' },
      { status: 500 }
    );
  }
}

// GET /api/users/[id]/follow - Vérifier si l'utilisateur suit cet utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    const targetUser = await User.findById(params.id);
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