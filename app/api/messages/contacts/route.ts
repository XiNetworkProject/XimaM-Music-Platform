import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { directConversationKey, findDirectConversation, getMessagingProfiles, removeFriendship } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const userId = session.user.id;
    const [{ data: asUser }, { data: asFriend }] = await Promise.all([
      supabaseAdmin.from('friendships').select('id, friend_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('friendships').select('id, user_id, created_at').eq('friend_id', userId).order('created_at', { ascending: false }),
    ]);
    const rows = [
      ...(asUser || []).map((row) => ({ id: row.id, userId: row.friend_id, createdAt: row.created_at })),
      ...(asFriend || []).map((row) => ({ id: row.id, userId: row.user_id, createdAt: row.created_at })),
    ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
    const profiles = await getMessagingProfiles(rows.map((row) => row.userId));
    const directKeys = rows.map((row) => directConversationKey(userId, row.userId));
    const conversationsByKey = new Map<string, string>();
    if (directKeys.length) {
      const { data: conversations } = await supabaseAdmin
        .from('conversations')
        .select('id, direct_key')
        .in('direct_key', directKeys)
        .eq('is_group', false);
      (conversations || []).forEach((conversation) => conversationsByKey.set(conversation.direct_key, conversation.id));
    }

    return NextResponse.json({
      contacts: rows.map((row) => ({
        friendshipId: row.id,
        user: profiles.get(row.userId),
        conversationId: conversationsByKey.get(directConversationKey(userId, row.userId)) || null,
        friendsSince: row.createdAt,
      })).filter((contact) => Boolean(contact.user)),
    });
  } catch (error) {
    console.error('[messages/contacts] GET failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
    if (!targetId || targetId === session.user.id) return NextResponse.json({ error: 'Contact invalide' }, { status: 400 });
    await removeFriendship(session.user.id, targetId);
    const conversation = await findDirectConversation(session.user.id, targetId);
    if (conversation) {
      await supabaseAdmin
        .from('conversation_participants')
        .update({ archived_at: new Date().toISOString() })
        .eq('conversation_id', conversation.id)
        .eq('user_id', session.user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages/contacts] DELETE failed:', error);
    return NextResponse.json({ error: 'Suppression du contact impossible' }, { status: 500 });
  }
}
