import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { requireConversationParticipant } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

async function messageAccess(request: NextRequest, conversationId: string, messageId: string) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return { response: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }) };
  if (!await requireConversationParticipant(conversationId, session.user.id)) {
    return { response: NextResponse.json({ error: 'Acces refuse' }, { status: 403 }) };
  }
  const { data: message } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, content, message_type, deleted_at, created_at')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (!message) return { response: NextResponse.json({ error: 'Message introuvable' }, { status: 404 }) };
  return { userId: session.user.id, message };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { conversationId: string; messageId: string } },
) {
  try {
    const checked = await messageAccess(request, params.conversationId, params.messageId);
    if (checked.response) return checked.response;
    const body = await request.json().catch(() => null);
    const action = String(body?.action || '');

    if (action === 'edit') {
      if (checked.message.sender_id !== checked.userId || checked.message.deleted_at || checked.message.message_type !== 'text') {
        return NextResponse.json({ error: 'Ce message ne peut pas etre modifie' }, { status: 403 });
      }
      const content = typeof body?.content === 'string' ? body.content.trim().slice(0, 2_000) : '';
      if (!content) return NextResponse.json({ error: 'Message vide' }, { status: 400 });
      const editedAt = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from('messages')
        .update({ content, edited_at: editedAt, updated_at: editedAt })
        .eq('id', params.messageId)
        .eq('sender_id', checked.userId);
      if (error) return NextResponse.json({ error: 'Modification impossible' }, { status: 500 });
      return NextResponse.json({ success: true, content, editedAt });
    }

    if (action === 'pin') {
      const { error } = await supabaseAdmin.from('message_pins').upsert({
        conversation_id: params.conversationId,
        message_id: params.messageId,
        pinned_by: checked.userId,
      }, { onConflict: 'conversation_id,message_id' });
      if (error) return NextResponse.json({ error: 'Epinglage impossible' }, { status: 500 });
      return NextResponse.json({ success: true, pinned: true });
    }

    if (action === 'unpin') {
      const { error } = await supabaseAdmin
        .from('message_pins')
        .delete()
        .eq('conversation_id', params.conversationId)
        .eq('message_id', params.messageId);
      if (error) return NextResponse.json({ error: 'Message impossible a desepingler' }, { status: 500 });
      return NextResponse.json({ success: true, pinned: false });
    }

    if (action === 'hide' || action === 'unhide') {
      const query = supabaseAdmin.from('message_hidden_users');
      const { error } = action === 'hide'
        ? await query.upsert({ message_id: params.messageId, user_id: checked.userId }, { onConflict: 'message_id,user_id' })
        : await query.delete().eq('message_id', params.messageId).eq('user_id', checked.userId);
      if (error) return NextResponse.json({ error: 'Action impossible' }, { status: 500 });
      return NextResponse.json({ success: true, hidden: action === 'hide' });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch (error) {
    console.error('[messages/message] PATCH failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string; messageId: string } },
) {
  try {
    const checked = await messageAccess(request, params.conversationId, params.messageId);
    if (checked.response) return checked.response;
    if (request.nextUrl.searchParams.get('scope') === 'me') {
      const { error } = await supabaseAdmin.from('message_hidden_users').upsert({
        message_id: params.messageId,
        user_id: checked.userId,
      }, { onConflict: 'message_id,user_id' });
      if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
      return NextResponse.json({ success: true, scope: 'me' });
    }
    if (checked.message.sender_id !== checked.userId) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
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
