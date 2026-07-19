import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { findDirectConversation, getBlockState, usersAreFriends } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const targetId = request.nextUrl.searchParams.get('targetId')?.trim();
    if (!targetId) return NextResponse.json({ error: 'targetId requis' }, { status: 400 });

    const userId = session.user.id;
    if (targetId === userId) return NextResponse.json({ relationship: 'self', status: 'self' });

    const block = await getBlockState(userId, targetId);
    if (block.blockedByMe || block.blockedMe) {
      return NextResponse.json({
        relationship: 'blocked',
        status: 'blocked',
        blockedByMe: block.blockedByMe,
        blockedMe: block.blockedMe,
      });
    }

    const conversation = await findDirectConversation(userId, targetId);
    if (await usersAreFriends(userId, targetId)) {
      return NextResponse.json({
        relationship: 'friends',
        status: 'accepted',
        conversationId: conversation?.id || null,
      });
    }

    const [{ data: outgoingRows }, { data: incomingRows }] = await Promise.all([
      supabaseAdmin
        .from('message_requests')
        .select('id, requester_id, target_id, status, created_at')
        .eq('requester_id', userId)
        .eq('target_id', targetId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1),
      supabaseAdmin
        .from('message_requests')
        .select('id, requester_id, target_id, status, created_at')
        .eq('requester_id', targetId)
        .eq('target_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    const pending = [...(outgoingRows || []), ...(incomingRows || [])]
      .sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime())[0];
    if (pending) {
      const incoming = pending.target_id === userId;
      return NextResponse.json({
        relationship: incoming ? 'incoming' : 'outgoing',
        status: 'pending',
        direction: incoming ? 'incoming' : 'outgoing',
        requestId: pending.id,
      });
    }

    return NextResponse.json({ relationship: 'none', status: 'none', conversationId: conversation?.id || null });
  } catch (error) {
    console.error('[messages/requests/status] failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
