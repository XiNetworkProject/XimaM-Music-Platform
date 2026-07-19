import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const userId = session.user.id;
    const { data: participations } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .is('archived_at', null);
    const ids = (participations || []).map((row) => row.conversation_id);
    const [messagesResult, requestsResult] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', ids)
            .neq('sender_id', userId)
            .eq('is_read', false)
            .is('deleted_at', null)
        : Promise.resolve({ count: 0, error: null }),
      supabaseAdmin
        .from('message_requests')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', userId)
        .eq('status', 'pending'),
    ]);
    const messages = Number(messagesResult.count || 0);
    const requestsCount = Number(requestsResult.count || 0);
    return NextResponse.json({ messages, requests: requestsCount, total: messages + requestsCount });
  } catch (error) {
    console.error('[messages/unread] failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
