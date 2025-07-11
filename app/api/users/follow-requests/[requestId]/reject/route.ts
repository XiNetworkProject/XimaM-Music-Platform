import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// POST /api/users/follow-requests/[requestId]/reject - Rejeter une demande de suivi
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

    // Supprimer la demande de suivi
    currentUser.followRequests = currentUser.followRequests.filter(
      (id: any) => id.toString() !== requestingUser._id.toString()
    );
    await currentUser.save();

    return NextResponse.json({
      success: true,
      message: 'Demande de suivi refusée'
    });

  } catch (error) {
    console.error('Erreur rejet demande de suivi:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rejet de la demande' },
      { status: 500 }
    );
  }
} 