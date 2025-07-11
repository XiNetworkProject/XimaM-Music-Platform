import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/messages/[conversationId] : Récupérer les messages
export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
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

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name username avatar')
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/messages/[conversationId] : Envoyer un message
export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { conversationId } = params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(session.user.id) || !conversation.accepted) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { type, content, duration } = await request.json();
    if (!type || !content) {
      return NextResponse.json({ error: 'Type ou contenu manquant' }, { status: 400 });
    }

    // Limite vidéo/audio : 60s max
    if ((type === 'video' || type === 'audio') && duration && duration > 60) {
      return NextResponse.json({ error: 'Durée maximale dépassée (1 min)' }, { status: 400 });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: session.user.id,
      type,
      content,
      duration,
      seenBy: [session.user.id],
    });

    // Peupler les informations de l'expéditeur
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .lean();

    conversation.lastMessage = message._id;
    await conversation.save();

    return NextResponse.json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 