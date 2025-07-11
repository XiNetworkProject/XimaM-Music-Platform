import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Conversation from '@/models/Conversation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET /api/messages/conversations
export async function GET(request: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const conversations = await Conversation.find({
    participants: session.user.id
  })
    .populate('participants', 'name username avatar')
    .populate('lastMessage')
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ conversations });
} 