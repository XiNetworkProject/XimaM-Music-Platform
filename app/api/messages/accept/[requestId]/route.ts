import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { acceptPendingMessageRequest, getMessagingProfiles } from '@/lib/messaging';
import { markMessageRequestNotificationResolved, notifyMessageRequestAccepted } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Route conservee pour les anciennes versions web. Les nouveaux clients utilisent
// /api/messages/requests/[id] avec action=accept.
export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const { data: messageRequest } = await supabaseAdmin
      .from('message_requests')
      .select('id, requester_id, target_id, message, status')
      .eq('id', params.requestId)
      .maybeSingle();
    if (!messageRequest) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    if (messageRequest.target_id !== session.user.id) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    if (messageRequest.status !== 'pending') return NextResponse.json({ error: 'Demande deja traitee' }, { status: 409 });
    const conversation = await acceptPendingMessageRequest(messageRequest);
    await markMessageRequestNotificationResolved(messageRequest.target_id, messageRequest.id);
    const profiles = await getMessagingProfiles([session.user.id]);
    void notifyMessageRequestAccepted(
      session.user.id,
      messageRequest.requester_id,
      profiles.get(session.user.id)?.name || session.user.name || 'Ton nouveau contact',
      conversation.id,
    );
    return NextResponse.json({
      success: true,
      message: 'Demande acceptee',
      conversationId: conversation.id,
      conversation: { id: conversation.id, _id: conversation.id },
    });
  } catch (error) {
    console.error('[messages/accept] failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
