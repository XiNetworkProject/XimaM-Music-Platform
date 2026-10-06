import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { getUnreadMessages } from '@/lib/messagingReceipts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const userId = session.user.id;
    const { data: participations } = await dbAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .is('archived_at', null);
    const ids = (participations || []).map((row) => row.conversation_id);
    const [messagesResult, requestsResult] = await Promise.all([
      getUnreadMessages(userId,ids),
      dbAdmin
        .from('message_requests')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', userId)
        .eq('status', 'pending'),
    ]);
    const messages = messagesResult.reduce((sum,row)=>sum+row.count,0);
    const requestsCount = Number(requestsResult.count || 0);
    return NextResponse.json({ messages, requests: requestsCount, total: messages + requestsCount });
  } catch (error) {
    console.error('[messages/unread] failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
