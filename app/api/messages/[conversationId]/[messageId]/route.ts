import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { requireConversationParticipant } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string; messageId: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    if (!await requireConversationParticipant(params.conversationId, session.user.id)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, created_at')
      .eq('id', params.messageId)
      .eq('conversation_id', params.conversationId)
      .maybeSingle();
    if (!message) return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });
    if (message.sender_id !== session.user.id) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    const { error } = await supabaseAdmin
      .from('messages')
      .update({ content: '', media_url: null, metadata: {}, deleted_at: new Date().toISOString() })
      .eq('id', params.messageId);
    if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages/message] DELETE failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
