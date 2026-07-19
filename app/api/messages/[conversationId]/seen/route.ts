import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { requireConversationParticipant } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const conversationId = params.conversationId;
    if (!await requireConversationParticipant(conversationId, session.user.id)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const [{ error: participantError }, { error: messageError }] = await Promise.all([
      supabaseAdmin
        .from('conversation_participants')
        .update({ last_read_at: now })
        .eq('conversation_id', conversationId)
        .eq('user_id', session.user.id),
      supabaseAdmin
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', session.user.id)
        .eq('is_read', false),
    ]);
    if (participantError || messageError) return NextResponse.json({ error: 'Lecture impossible a enregistrer' }, { status: 500 });
    return NextResponse.json({ success: true, seenAt: now });
  } catch (error) {
    console.error('[messages/seen] failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
