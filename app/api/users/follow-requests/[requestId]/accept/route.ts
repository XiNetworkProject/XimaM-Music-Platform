import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// POST /api/users/follow-requests/[requestId]/accept - Accepter une demande de suivi
export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { requestId } = params;
    if (!requestId) {
      return NextResponse.json({ error: 'ID de demande requis' }, { status: 400 });
    }

    await dbConnect();

    // Récupérer l'utilisateur actuel
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer l'utilisateur qui a envoyé la demande
    const requestingUser = await User.findById(requestId);
    if (!requestingUser) {
      return NextResponse.json({ error: 'Utilisateur demandeur non trouvé' }, { status: 404 });
    }

    // Vérifier si la demande existe
    if (!currentUser.followRequests?.includes(requestingUser._id)) {
      return NextResponse.json(
        { error: 'Demande de suivi non trouvée' },
        { status: 404 }
      );
    }

    // Accepter la demande de suivi
    // 1. Supprimer la demande de la liste des demandes
    await currentUser.removeFollowRequest(requestingUser._id.toString());

    // 2. Ajouter l'utilisateur demandeur aux followers
    if (!currentUser.followers.includes(requestingUser._id)) {
      currentUser.followers.push(requestingUser._id);
      await currentUser.save();
    }

    // 3. Ajouter l'utilisateur actuel aux following de l'utilisateur demandeur
    if (!requestingUser.following.includes(currentUser._id)) {
      requestingUser.following.push(currentUser._id);
      await requestingUser.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Demande de suivi acceptée'
    });

  } catch (error) {
    console.error('Erreur acceptation demande de suivi:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'acceptation de la demande' },
      { status: 500 }
    );
  }
} 