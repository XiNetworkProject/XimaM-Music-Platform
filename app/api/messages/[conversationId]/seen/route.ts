import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// POST /api/messages/[conversationId]/seen
export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { conversationId } = params;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.participants.includes(session.user.id)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Marquer tous les messages non lus comme lus par l'utilisateur
  await Message.updateMany(
    { conversation: conversationId, seenBy: { $ne: session.user.id } },
    { $addToSet: { seenBy: session.user.id } }
  );

  return NextResponse.json({ success: true });
} 