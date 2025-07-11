import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// POST /api/messages/request
export async function POST(request: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { recipientId } = await request.json();
  if (!recipientId) {
    return NextResponse.json({ error: 'Destinataire manquant' }, { status: 400 });
  }

  // Vérifier si une conversation existe déjà
  const existing = await Conversation.findOne({
    participants: { $all: [session.user.id, recipientId] }
  });
  if (existing) {
    return NextResponse.json({ 
      error: 'Conversation déjà existante', 
      conversationId: existing._id.toString(),
      accepted: existing.accepted 
    }, { status: 409 });
  }

  // Créer la conversation (acceptée = false)
  const conversation = await Conversation.create({
    participants: [session.user.id, recipientId],
    accepted: false,
  });

  return NextResponse.json({ success: true, conversationId: conversation._id });
} 