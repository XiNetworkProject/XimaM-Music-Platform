import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { acceptPendingMessageRequest, getMessagingProfiles } from '@/lib/messaging';
import { markMessageRequestNotificationResolved, notifyMessageRequestAccepted } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function mutateRequest(request: NextRequest, id: string, forcedAction?: 'cancel') {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = forcedAction ? null : await request.json().catch(() => null);
  const action = forcedAction || body?.action;
  if (!['accept', 'reject', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  const { data: messageRequest } = await supabaseAdmin
    .from('message_requests')
    .select('id, requester_id, target_id, message, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (!messageRequest) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  if (messageRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Cette demande a deja ete traitee' }, { status: 409 });
  }

  const currentUserId = session.user.id;
  if (action === 'cancel') {
    if (messageRequest.requester_id !== currentUserId) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  } else if (messageRequest.target_id !== currentUserId) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  }

  if (action === 'accept') {
    try {
      const conversation = await acceptPendingMessageRequest(messageRequest);
      await markMessageRequestNotificationResolved(messageRequest.target_id, messageRequest.id);
      const profiles = await getMessagingProfiles([currentUserId]);
      const accepter = profiles.get(currentUserId);
      void notifyMessageRequestAccepted(
        currentUserId,
        messageRequest.requester_id,
        accepter?.name || session.user.name || 'Ton nouveau contact',
        conversation.id,
      );
      return NextResponse.json({ success: true, action: 'accepted', conversationId: conversation.id });
    } catch (error) {
      console.error('[messages/requests/id] accept failed:', error);
      return NextResponse.json({ error: 'Cette demande ne peut pas etre acceptee' }, { status: 409 });
    }
  }

  const nextStatus = action === 'reject' ? 'rejected' : 'cancelled';
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('message_requests')
    .update({ status: nextStatus, updated_at: now, resolved_at: now })
    .eq('id', id)
    .eq('status', 'pending');
  if (error) return NextResponse.json({ error: 'Demande impossible a mettre a jour' }, { status: 500 });
  await markMessageRequestNotificationResolved(messageRequest.target_id, messageRequest.id);
  return NextResponse.json({ success: true, action: nextStatus });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return mutateRequest(request, params.id);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return mutateRequest(request, params.id);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return mutateRequest(request, params.id, 'cancel');
}
