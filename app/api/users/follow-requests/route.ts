import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// GET /api/users/follow-requests - Récupérer les demandes de suivi reçues
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await dbConnect();

    // Récupérer l'utilisateur actuel
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les demandes de suivi reçues
    const followRequests = await User.aggregate([
      {
        $match: {
          _id: { $in: currentUser.followRequests || [] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          email: 1
        }
      }
    ]);

    // Formater les demandes
    const formattedRequests = followRequests.map(user => ({
      _id: user._id.toString(),
      from: {
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        avatar: user.avatar
      },
      to: currentUser._id.toString(),
      status: 'pending',
      createdAt: new Date().toISOString() // Pour l'instant, on utilise la date actuelle
    }));

    return NextResponse.json({ 
      requests: formattedRequests,
      count: formattedRequests.length
    });

  } catch (error) {
    console.error('Erreur récupération demandes de suivi:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
}

// POST /api/users/follow-requests - Envoyer une demande de suivi
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    await dbConnect();

    // Récupérer l'utilisateur actuel
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer l'utilisateur cible
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

    // Vérifier si la demande existe déjà
    if (targetUser.followRequests?.includes(currentUser._id)) {
      return NextResponse.json(
        { error: 'Demande de suivi déjà envoyée' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur suit déjà
    if (currentUser.following.includes(targetUser._id)) {
      return NextResponse.json(
        { error: 'Vous suivez déjà cet utilisateur' },
        { status: 400 }
      );
    }

    // Ajouter la demande de suivi
    await targetUser.addFollowRequest(currentUser._id.toString());

    return NextResponse.json({
      success: true,
      message: 'Demande de suivi envoyée'
    });

  } catch (error) {
    console.error('Erreur envoi demande de suivi:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la demande' },
      { status: 500 }
    );
  }
} 