import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import User from '@/models/User';

// GET /api/messages/requests - Récupérer les demandes de messagerie reçues
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

    // Récupérer les conversations avec des demandes en attente
    const pendingConversations = await Conversation.find({
      participants: currentUser._id,
      accepted: false
    })
    .populate('participants', 'name username avatar')
    .sort({ createdAt: -1 })
    .lean();

    // Formater les demandes
    const messageRequests = pendingConversations.map((conv: any) => {
      const otherParticipant = conv.participants.find(
        (p: any) => p._id.toString() !== currentUser._id.toString()
      );

      return {
        _id: conv._id.toString(),
        from: {
          _id: otherParticipant._id.toString(),
          name: otherParticipant.name,
          username: otherParticipant.username,
          avatar: otherParticipant.avatar
        },
        to: currentUser._id.toString(),
        status: 'pending',
        createdAt: conv.createdAt,
        conversationId: conv._id.toString()
      };
    });

    return NextResponse.json({ 
      requests: messageRequests,
      count: messageRequests.length
    });

  } catch (error) {
    console.error('Erreur récupération demandes de messagerie:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
} 