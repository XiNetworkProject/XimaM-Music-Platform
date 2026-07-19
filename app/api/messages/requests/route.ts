import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  MAX_REQUEST_LENGTH,
  acceptPendingMessageRequest,
  findDirectConversation,
  formatMessagingProfile,
  getMessagingProfiles,
  usersAreBlocked,
  usersAreFriends,
} from '@/lib/messaging';
import { markMessageRequestNotificationResolved, notifyMessageRequest, notifyMessageRequestAccepted } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function requestDto(row: any, profile: any, direction: 'received' | 'sent') {
  return {
    id: String(row.id),
    _id: String(row.id),
    direction,
    user: profile,
    from: direction === 'received' ? profile : undefined,
    message: typeof row.message === 'string' ? row.message : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const userId = session.user.id;

    const [{ data: received, error: receivedError }, { data: sent, error: sentError }] = await Promise.all([
      supabaseAdmin
        .from('message_requests')
        .select('id, requester_id, target_id, message, status, created_at, updated_at')
        .eq('target_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('message_requests')
        .select('id, requester_id, target_id, message, status, created_at, updated_at')
        .eq('requester_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    if (receivedError || sentError) {
      console.error('[messages/requests] read failed:', receivedError?.message || sentError?.message);
      return NextResponse.json({ error: 'Demandes indisponibles' }, { status: 500 });
    }

    const profiles = await getMessagingProfiles([
      ...(received || []).map((row) => row.requester_id),
      ...(sent || []).map((row) => row.target_id),
    ]);
    const receivedItems = (received || []).map((row) => requestDto(
      row,
      profiles.get(row.requester_id) || formatMessagingProfile({ id: row.requester_id }),
      'received',
    ));
    const sentItems = (sent || []).map((row) => requestDto(
      row,
      profiles.get(row.target_id) || formatMessagingProfile({ id: row.target_id }),
      'sent',
    ));

    return NextResponse.json({
      received: receivedItems,
      sent: sentItems,
      requests: receivedItems,
      counts: { received: receivedItems.length, sent: sentItems.length },
    });
  } catch (error) {
    console.error('[messages/requests] GET failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const requesterId = session.user.id;
    const body = await request.json().catch(() => null);
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, MAX_REQUEST_LENGTH) : '';

    if (!targetId) return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 });
    if (targetId === requesterId) return NextResponse.json({ error: 'Tu ne peux pas t’ajouter toi-meme' }, { status: 400 });

    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, avatar, is_verified, last_seen, preferences')
      .eq('id', targetId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if (await usersAreBlocked(requesterId, targetId)) {
      return NextResponse.json({ error: 'Cette demande ne peut pas etre envoyee' }, { status: 403 });
    }

    const existingConversation = await findDirectConversation(requesterId, targetId);
    if (await usersAreFriends(requesterId, targetId)) {
      return NextResponse.json({ alreadyConnected: true, conversationId: existingConversation?.id || null });
    }

    const privacy = String(target.preferences?.messagingPrivacy || 'everyone');
    if (privacy === 'nobody') {
      return NextResponse.json({ error: 'Cette personne n’accepte pas de nouvelles demandes' }, { status: 403 });
    }
    if (privacy === 'following') {
      const { data: followsRequester } = await supabaseAdmin
        .from('user_follows')
        .select('id')
        .eq('follower_id', targetId)
        .eq('following_id', requesterId)
        .maybeSingle();
      if (!followsRequester) {
        return NextResponse.json({ error: 'Cette personne accepte uniquement les demandes des comptes suivis' }, { status: 403 });
      }
    }

    const { data: outgoing } = await supabaseAdmin
      .from('message_requests')
      .select('id, status')
      .eq('requester_id', requesterId)
      .eq('target_id', targetId)
      .eq('status', 'pending')
      .maybeSingle();
    if (outgoing) return NextResponse.json({ alreadySent: true, requestId: outgoing.id });

    const { data: incoming } = await supabaseAdmin
      .from('message_requests')
      .select('id, requester_id, target_id, message, status')
      .eq('requester_id', targetId)
      .eq('target_id', requesterId)
      .eq('status', 'pending')
      .maybeSingle();

    if (incoming) {
      const conversation = await acceptPendingMessageRequest(incoming);
      await markMessageRequestNotificationResolved(incoming.target_id, incoming.id);
      const currentProfile = await getMessagingProfiles([requesterId]);
      const accepter = currentProfile.get(requesterId);
      void notifyMessageRequestAccepted(
        requesterId,
        targetId,
        accepter?.name || session.user.name || 'Un contact',
        conversation.id,
      );
      return NextResponse.json({ alreadyConnected: true, autoAccepted: true, conversationId: conversation.id });
    }

    const { data: created, error } = await supabaseAdmin
      .from('message_requests')
      .insert({ requester_id: requesterId, target_id: targetId, message: message || null, status: 'pending' })
      .select('id')
      .single();
    if (error || !created) {
      if (error?.code === '23505') {
        const [{ data: racedOutgoing }, { data: racedIncoming }] = await Promise.all([
          supabaseAdmin
            .from('message_requests')
            .select('id, requester_id, target_id, message, status')
            .eq('requester_id', requesterId)
            .eq('target_id', targetId)
            .eq('status', 'pending')
            .maybeSingle(),
          supabaseAdmin
            .from('message_requests')
            .select('id, requester_id, target_id, message, status')
            .eq('requester_id', targetId)
            .eq('target_id', requesterId)
            .eq('status', 'pending')
            .maybeSingle(),
        ]);
        if (racedIncoming) {
          const conversation = await acceptPendingMessageRequest(racedIncoming);
          await markMessageRequestNotificationResolved(racedIncoming.target_id, racedIncoming.id);
          const currentProfile = await getMessagingProfiles([requesterId]);
          const accepter = currentProfile.get(requesterId);
          void notifyMessageRequestAccepted(
            requesterId,
            targetId,
            accepter?.name || session.user.name || 'Un contact',
            conversation.id,
          );
          return NextResponse.json({ alreadyConnected: true, autoAccepted: true, conversationId: conversation.id });
        }
        if (racedOutgoing) return NextResponse.json({ alreadySent: true, requestId: racedOutgoing.id });
      }
      console.error('[messages/requests] create failed:', error?.message);
      return NextResponse.json({ error: 'Demande impossible a envoyer' }, { status: 500 });
    }

    const requesterProfiles = await getMessagingProfiles([requesterId]);
    const requester = requesterProfiles.get(requesterId);
    void notifyMessageRequest(
      requesterId,
      targetId,
      requester?.name || session.user.name || 'Quelqu’un',
      requester?.username || session.user.username || 'utilisateur',
      created.id,
    );

    return NextResponse.json({ success: true, requestId: created.id }, { status: 201 });
  } catch (error) {
    console.error('[messages/requests] POST failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
