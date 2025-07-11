import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// POST /api/messages/accept
export async function POST(request: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { conversationId } = await request.json();
  if (!conversationId) {
    return NextResponse.json({ error: 'ID de conversation manquant' }, { status: 400 });
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  // Vérifier que l'utilisateur fait partie de la conversation
  if (!conversation.participants.includes(session.user.id)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  if (conversation.accepted) {
    return NextResponse.json({ error: 'Déjà acceptée' }, { status: 409 });
  }

  conversation.accepted = true;
  await conversation.save();

  return NextResponse.json({ success: true });
} 