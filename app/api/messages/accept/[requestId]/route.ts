import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import User from '@/models/User';

// POST /api/messages/accept/[requestId] - Accepter une demande de messagerie
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

    // Récupérer la conversation
    const conversation = await Conversation.findById(requestId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est participant
    if (!conversation.participants.includes(currentUser._id)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier que la conversation n'est pas déjà acceptée
    if (conversation.accepted) {
      return NextResponse.json(
        { error: 'Conversation déjà acceptée' },
        { status: 400 }
      );
    }

    // Accepter la conversation
    conversation.accepted = true;
    await conversation.save();

    return NextResponse.json({
      success: true,
      message: 'Demande de conversation acceptée',
      conversationId: conversation._id.toString()
    });

  } catch (error) {
    console.error('Erreur acceptation demande de messagerie:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'acceptation de la demande' },
      { status: 500 }
    );
  }
} 