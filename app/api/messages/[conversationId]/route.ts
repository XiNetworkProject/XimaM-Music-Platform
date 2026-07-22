import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_PAGE_SIZE,
  formatConversationPreferences,
  formatMessagingProfile,
  getConversationParticipantIds,
  getMessagingProfiles,
  requireConversationParticipant,
  sanitizeConversationPreferences,
  sanitizeMessageMetadata,
  usersAreBlocked,
  usersAreFriends,
} from '@/lib/messaging';
import { notifyNewMessage } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const MESSAGE_TYPES = new Set(['text', 'image', 'audio', 'video', 'track', 'clip', 'post', 'playlist']);

type ReplyMessageRow = {
  id: string;
  sender_id: string;
  content: string | null;
  message_type: string | null;
  deleted_at: string | null;
};

function attachmentDto(attachment: any) {
  return {
    id: String(attachment.id),
    type: String(attachment.attachment_type || 'file'),
    url: String(attachment.url || ''),
    previewUrl: attachment.preview_url || null,
    mimeType: attachment.mime_type || null,
    fileName: attachment.file_name || null,
    sizeBytes: Number.isFinite(Number(attachment.size_bytes)) ? Number(attachment.size_bytes) : null,
    width: Number.isFinite(Number(attachment.width)) ? Number(attachment.width) : null,
    height: Number.isFinite(Number(attachment.height)) ? Number(attachment.height) : null,
    durationMs: Number.isFinite(Number(attachment.duration_ms)) ? Number(attachment.duration_ms) : null,
    waveform: Array.isArray(attachment.waveform) ? attachment.waveform : [],
    position: Number(attachment.position || 0),
    metadata: attachment.metadata || {},
  };
}

function messageDto(
  message: any,
  profile: any,
  participants: any[],
  reactions: any[],
  replyTo?: any,
  replyProfile?: any,
  attachments: any[] = [],
  pinned = false,
) {
  const createdAt = message.created_at;
  const seenBy = participants
    .filter((participant) => participant.user_id === message.sender_id || (
      participant.last_read_at && new Date(participant.last_read_at).getTime() >= new Date(createdAt).getTime()
    ))
    .map((participant) => participant.user_id);
  const deleted = Boolean(message.deleted_at);
  return {
    id: String(message.id),
    _id: String(message.id),
    clientId: message.client_id || null,
    sender: profile,
    type: deleted ? 'deleted' : String(message.message_type || 'text'),
    content: deleted ? 'Message supprime' : String(message.content || ''),
    mediaUrl: deleted ? null : message.media_url || null,
    attachments: deleted ? [] : attachments.map(attachmentDto),
    sharedEntityType: deleted ? null : message.shared_entity_type || null,
    sharedEntityId: deleted ? null : message.shared_entity_id || null,
    metadata: deleted ? {} : (message.metadata || {}),
    replyToId: message.reply_to_id || null,
    replyTo: replyTo ? {
      id: String(replyTo.id),
      senderId: String(replyTo.sender_id),
      senderName: String(replyProfile?.name || replyProfile?.username || 'Message'),
      type: replyTo.deleted_at ? 'deleted' : String(replyTo.message_type || 'text'),
      content: replyTo.deleted_at ? 'Message supprime' : String(replyTo.content || ''),
    } : null,
    roomId: message.room_id || null,
    seenBy,
    reactions: reactions.map((reaction) => ({ userId: reaction.user_id, reaction: reaction.reaction })),
    createdAt,
    updatedAt: message.updated_at,
    editedAt: message.edited_at || null,
    pinned,
    deleted,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const conversationId = params.conversationId;
    const participation = await requireConversationParticipant(conversationId, session.user.id);
    if (!participation) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id, name, description, avatar_url, owner_id, is_group, is_active')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conversation) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

    const { data: roomRows } = await supabaseAdmin
      .from('conversation_rooms')
      .select('id, name, room_type, position, created_by, created_at, updated_at')
      .eq('conversation_id', conversationId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    const rooms = roomRows || [];
    const requestedRoomId = request.nextUrl.searchParams.get('roomId');
    const selectedRoom = conversation.is_group
      ? rooms.find((room) => room.id === requestedRoomId) || rooms[0] || null
      : null;

    const limit = Math.min(80, Math.max(10, Number(request.nextUrl.searchParams.get('limit') || MESSAGE_PAGE_SIZE)));
    const before = request.nextUrl.searchParams.get('before');
    let messagesQuery = supabaseAdmin
      .from('messages')
      .select('id, client_id, conversation_id, room_id, sender_id, content, message_type, media_url, shared_entity_type, shared_entity_id, metadata, reply_to_id, is_read, deleted_at, created_at, updated_at, edited_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    if (conversation.is_group && selectedRoom) {
      messagesQuery = selectedRoom === rooms[0]
        ? messagesQuery.or(`room_id.eq.${selectedRoom.id},room_id.is.null`)
        : messagesQuery.eq('room_id', selectedRoom.id);
    }
    if (before) messagesQuery = messagesQuery.lt('created_at', before);
    const { data: rows, error } = await messagesQuery;
    if (error) return NextResponse.json({ error: 'Messages indisponibles' }, { status: 500 });

    const hasMore = (rows || []).length > limit;
    let page = (rows || []).slice(0, limit).reverse();
    const candidateIds = page.map((message) => message.id);
    if (candidateIds.length) {
      const { data: hiddenRows } = await supabaseAdmin
        .from('message_hidden_users')
        .select('message_id')
        .eq('user_id', session.user.id)
        .in('message_id', candidateIds);
      const hiddenIds = new Set((hiddenRows || []).map((row) => String(row.message_id)));
      page = page.filter((message) => !hiddenIds.has(String(message.id)));
    }
    const participants = await getConversationParticipantIds(conversationId);
    const profiles = await getMessagingProfiles(participants.map((participant) => participant.user_id));
    const messageIds = page.map((message) => message.id);
    const replyIds = Array.from(new Set(page.map((message) => message.reply_to_id).filter(Boolean)));
    const replyById = new Map<string, ReplyMessageRow>(
      page.map((message) => [String(message.id), message]),
    );
    const missingReplyIds = replyIds.filter((id) => !replyById.has(id));
    if (missingReplyIds.length) {
      const { data: replyRows } = await supabaseAdmin
        .from('messages')
        .select('id, sender_id, content, message_type, deleted_at')
        .in('id', missingReplyIds)
        .eq('conversation_id', conversationId);
      (replyRows || []).forEach((message) => replyById.set(String(message.id), message));
    }
    const reactionsByMessage = new Map<string, any[]>();
    const attachmentsByMessage = new Map<string, any[]>();
    const pinnedMessageIds = new Set<string>();
    if (messageIds.length) {
      const [{ data: reactions }, { data: attachments }, { data: pins }] = await Promise.all([
        supabaseAdmin
          .from('message_reactions')
          .select('message_id, user_id, reaction')
          .in('message_id', messageIds),
        supabaseAdmin
          .from('message_attachments')
          .select('id, message_id, attachment_type, url, preview_url, mime_type, file_name, size_bytes, width, height, duration_ms, waveform, position, metadata')
          .in('message_id', messageIds)
          .order('position', { ascending: true }),
        supabaseAdmin
          .from('message_pins')
          .select('message_id')
          .eq('conversation_id', conversationId)
          .in('message_id', messageIds),
      ]);
      (reactions || []).forEach((reaction) => {
        const list = reactionsByMessage.get(reaction.message_id) || [];
        list.push(reaction);
        reactionsByMessage.set(reaction.message_id, list);
      });
      (attachments || []).forEach((attachment) => {
        const list = attachmentsByMessage.get(attachment.message_id) || [];
        list.push(attachment);
        attachmentsByMessage.set(attachment.message_id, list);
      });
      (pins || []).forEach((pin) => pinnedMessageIds.add(String(pin.message_id)));
    }

    const otherParticipant = participants.find((participant) => participant.user_id !== session.user.id);
    const blocked = otherParticipant ? await usersAreBlocked(session.user.id, otherParticipant.user_id) : false;
    const friends = conversation.is_group || !otherParticipant
      ? true
      : await usersAreFriends(session.user.id, otherParticipant.user_id);
    const messages = page.map((message) => {
      const replyTo = message.reply_to_id
        ? replyById.get(String(message.reply_to_id))
        : null;
      return messageDto(
        message,
        profiles.get(message.sender_id) || formatMessagingProfile({ id: message.sender_id }),
        participants,
        reactionsByMessage.get(message.id) || [],
        replyTo,
        replyTo ? profiles.get(replyTo.sender_id) : null,
        attachmentsByMessage.get(message.id) || [],
        pinnedMessageIds.has(String(message.id)),
      );
    });

    await supabaseAdmin
      .from('conversation_participants')
      .update({ last_delivered_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        name: conversation.name,
        description: conversation.description || null,
        avatarUrl: conversation.avatar_url || null,
        ownerId: conversation.owner_id || null,
        type: conversation.is_group ? 'group' : 'direct',
        participants: participants.map((participant) => profiles.get(participant.user_id) || formatMessagingProfile({ id: participant.user_id })),
        otherUser: !conversation.is_group && otherParticipant ? profiles.get(otherParticipant.user_id) || null : null,
        participantRoles: participants.map((participant) => ({ userId: participant.user_id, role: participant.role || 'member', nickname: participant.nickname || null })),
        canMessage: Boolean(conversation.is_active && friends && !blocked),
        blocked,
        muted: Boolean(participation.muted_until && new Date(participation.muted_until).getTime() > Date.now()),
        archived: Boolean(participation.archived_at),
        preferences: formatConversationPreferences(participation),
        rooms: rooms.map((room) => ({
          id: room.id,
          name: room.name,
          type: room.room_type,
          position: room.position,
          createdBy: room.created_by,
          createdAt: room.created_at,
        })),
        activeRoomId: selectedRoom?.id || null,
      },
      messages,
      hasMore,
      nextCursor: hasMore && page.length ? page[0].created_at : null,
    });
  } catch (error) {
    console.error('[messages/conversation] GET failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(
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

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id, is_group, is_active')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conversation?.is_active) return NextResponse.json({ error: 'Conversation indisponible' }, { status: 409 });

    const participants = await getConversationParticipantIds(conversationId);
    const recipientParticipants = participants.filter((participant) => participant.user_id !== session.user.id);
    const recipientIds = recipientParticipants.map((participant) => participant.user_id);
    if (!conversation.is_group && recipientIds[0]) {
      if (await usersAreBlocked(session.user.id, recipientIds[0])) {
        return NextResponse.json({ error: 'Conversation indisponible' }, { status: 403 });
      }
      if (!await usersAreFriends(session.user.id, recipientIds[0])) {
        return NextResponse.json({ error: 'Cette personne ne fait plus partie de tes contacts' }, { status: 403 });
      }
    }

    const body = await request.json().catch(() => null);
    const clientId = typeof body?.clientId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(body.clientId)
      ? body.clientId
      : null;
    let roomId: string | null = null;
    if (conversation.is_group) {
      const { data: rooms } = await supabaseAdmin
        .from('conversation_rooms')
        .select('id, name')
        .eq('conversation_id', conversationId)
        .order('position', { ascending: true });
      const requestedRoomId = typeof body?.roomId === 'string' ? body.roomId : '';
      const room = (rooms || []).find((entry) => entry.id === requestedRoomId) || (rooms || [])[0];
      if (!room) return NextResponse.json({ error: 'Salon introuvable' }, { status: 409 });
      roomId = room.id;
    }
    const type = MESSAGE_TYPES.has(body?.type) ? String(body.type) : 'text';
    let content = typeof body?.content === 'string' ? body.content.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
    let mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
    const attachments = (Array.isArray(body?.attachments) ? body.attachments : [])
      .slice(0, 10)
      .map((attachment: any, position: number) => ({
        attachment_type: ['image', 'video', 'audio', 'file'].includes(attachment?.type) ? attachment.type : 'file',
        url: typeof attachment?.url === 'string' && /^https:\/\//i.test(attachment.url.trim()) ? attachment.url.trim().slice(0, 1200) : '',
        preview_url: typeof attachment?.previewUrl === 'string' && /^https:\/\//i.test(attachment.previewUrl.trim()) ? attachment.previewUrl.trim().slice(0, 1200) : null,
        mime_type: typeof attachment?.mimeType === 'string' ? attachment.mimeType.trim().slice(0, 120) || null : null,
        file_name: typeof attachment?.fileName === 'string' ? attachment.fileName.trim().slice(0, 180) || null : null,
        size_bytes: Number.isFinite(Number(attachment?.sizeBytes)) ? Math.max(0, Number(attachment.sizeBytes)) : null,
        width: Number.isFinite(Number(attachment?.width)) ? Math.max(0, Number(attachment.width)) : null,
        height: Number.isFinite(Number(attachment?.height)) ? Math.max(0, Number(attachment.height)) : null,
        duration_ms: Number.isFinite(Number(attachment?.durationMs)) ? Math.max(0, Math.round(Number(attachment.durationMs))) : null,
        waveform: (Array.isArray(attachment?.waveform) ? attachment.waveform : []).map(Number).filter(Number.isFinite).slice(0, 160),
        position,
        metadata: sanitizeMessageMetadata(attachment?.metadata),
      }))
      .filter((attachment: any) => Boolean(attachment.url));
    if (!mediaUrl && ['image', 'audio', 'video'].includes(type)) {
      mediaUrl = attachments.find((attachment: any) => attachment.attachment_type === type)?.url || '';
    }
    if (['image', 'audio', 'video'].includes(type) && !mediaUrl && /^https:\/\//i.test(content)) {
      mediaUrl = content;
      content = '';
    }
    const sharedEntityType = ['track', 'clip', 'post', 'playlist'].includes(type) ? type : null;
    const sharedEntityId = sharedEntityType && typeof body?.sharedEntityId === 'string' ? body.sharedEntityId.trim() : '';

    if (type === 'text' && !content) return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    if (['image', 'audio', 'video'].includes(type) && !/^https:\/\//i.test(mediaUrl)) {
      return NextResponse.json({ error: 'Media invalide' }, { status: 400 });
    }
    if (sharedEntityType && !sharedEntityId) return NextResponse.json({ error: 'Contenu partage introuvable' }, { status: 400 });

    let replyToId: string | null = typeof body?.replyToId === 'string' ? body.replyToId : null;
    let replyTo: any = null;
    if (replyToId) {
      const { data: reply } = await supabaseAdmin
        .from('messages')
        .select('id, sender_id, content, message_type, deleted_at')
        .eq('id', replyToId)
        .eq('conversation_id', conversationId)
        .maybeSingle();
      if (!reply) replyToId = null;
      else replyTo = reply;
    }

    const { data: createdMessage, error } = await supabaseAdmin
      .from('messages')
      .insert({
        id: crypto.randomUUID(),
        client_id: clientId,
        conversation_id: conversationId,
        room_id: roomId,
        sender_id: session.user.id,
        content,
        message_type: type,
        media_url: mediaUrl || null,
        shared_entity_type: sharedEntityType,
        shared_entity_id: sharedEntityId || null,
        metadata: sanitizeMessageMetadata(body?.metadata),
        reply_to_id: replyToId,
        is_read: false,
      })
      .select('id, client_id, conversation_id, room_id, sender_id, content, message_type, media_url, shared_entity_type, shared_entity_id, metadata, reply_to_id, is_read, deleted_at, created_at, updated_at, edited_at')
      .single();
    let inserted = createdMessage;
    let createdNow = true;
    if (error?.code === '23505' && clientId) {
      const { data: existing } = await supabaseAdmin
        .from('messages')
        .select('id, client_id, conversation_id, room_id, sender_id, content, message_type, media_url, shared_entity_type, shared_entity_id, metadata, reply_to_id, is_read, deleted_at, created_at, updated_at, edited_at')
        .eq('conversation_id', conversationId)
        .eq('sender_id', session.user.id)
        .eq('client_id', clientId)
        .maybeSingle();
      inserted = existing;
      createdNow = false;
    }
    if (!inserted) {
      console.error('[messages/conversation] send failed:', error?.message);
      return NextResponse.json({ error: 'Envoi impossible' }, { status: 500 });
    }

    if (createdNow && attachments.length) {
      const { error: attachmentError } = await supabaseAdmin.from('message_attachments').insert(
        attachments.map((attachment: any) => ({
          ...attachment,
          message_id: inserted.id,
          conversation_id: conversationId,
        })),
      );
      if (attachmentError) {
        await supabaseAdmin.from('messages').delete().eq('id', inserted.id);
        console.error('[messages/conversation] attachments failed:', attachmentError.message);
        return NextResponse.json({ error: 'Pieces jointes impossibles a enregistrer' }, { status: 500 });
      }
    }

    const { data: storedAttachments } = await supabaseAdmin
      .from('message_attachments')
      .select('id, message_id, attachment_type, url, preview_url, mime_type, file_name, size_bytes, width, height, duration_ms, waveform, position, metadata')
      .eq('message_id', inserted.id)
      .order('position', { ascending: true });

    const now = new Date().toISOString();
    await supabaseAdmin
      .from('conversation_participants')
      .update({ last_read_at: now, archived_at: null })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);
    await supabaseAdmin
      .from('conversation_participants')
      .update({ archived_at: null })
      .eq('conversation_id', conversationId)
      .neq('user_id', session.user.id);

    const profiles = await getMessagingProfiles([session.user.id, replyTo?.sender_id].filter(Boolean));
    const sender = profiles.get(session.user.id) || formatMessagingProfile({
      id: session.user.id,
      name: session.user.name,
      username: session.user.username,
    });
    const preview = type === 'text'
      ? content
      : type === 'image'
        ? 'a partage une image'
        : type === 'audio'
          ? 'a envoye un message audio'
          : type === 'video'
            ? 'a partage une video'
            : `a partage ${type === 'track' ? 'un son' : type === 'clip' ? 'un Clip' : type === 'playlist' ? 'une playlist' : 'un post'}`;
    const notificationRecipientIds = recipientParticipants
      .filter((participant) => !participant.muted_until || new Date(participant.muted_until).getTime() <= Date.now())
      .map((participant) => participant.user_id);
    if (createdNow) {
      await Promise.allSettled(notificationRecipientIds.map((recipientId) => notifyNewMessage(
        session.user.id,
        recipientId,
        sender.name,
        conversationId,
        preview,
        roomId,
        inserted.id,
        sender.avatar,
      )));
    }

    return NextResponse.json({
      message: messageDto(inserted, sender, participants, [], replyTo, replyTo ? profiles.get(replyTo.sender_id) : null, storedAttachments || []),
    }, { status: createdNow ? 201 : 200 });
  } catch (error) {
    console.error('[messages/conversation] POST failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    if (!await requireConversationParticipant(params.conversationId, session.user.id)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (action === 'customize') {
      const preferences = sanitizeConversationPreferences(body?.preferences);
      const { error } = await supabaseAdmin
        .from('conversation_participants')
        .update({
          nickname: preferences.nickname,
          theme_key: preferences.themeKey,
          accent_color: preferences.accentColor,
          background_key: preferences.backgroundKey,
          wallpaper_url: preferences.wallpaperUrl,
          bubble_enabled: preferences.bubbleEnabled,
        })
        .eq('conversation_id', params.conversationId)
        .eq('user_id', session.user.id);
      if (error) return NextResponse.json({ error: 'Personnalisation impossible' }, { status: 500 });
      return NextResponse.json({ success: true, action, preferences });
    }
    if (action === 'update_group') {
      const participant = await requireConversationParticipant(params.conversationId, session.user.id);
      if (!participant || !['owner', 'moderator'].includes(participant.role || 'member')) {
        return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 });
      }
      const changes = {
        name: typeof body?.name === 'string' ? body.name.trim().slice(0, 64) : undefined,
        description: typeof body?.description === 'string' ? body.description.trim().slice(0, 180) || null : undefined,
        avatar_url: body?.avatarUrl === null
          ? null
          : typeof body?.avatarUrl === 'string' && /^https:\/\//i.test(body.avatarUrl) ? body.avatarUrl.slice(0, 800) : undefined,
      };
      const cleanChanges = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
      if (!Object.keys(cleanChanges).length) return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
      const { error } = await supabaseAdmin.from('conversations').update(cleanChanges).eq('id', params.conversationId).eq('is_group', true);
      if (error) return NextResponse.json({ error: 'Salon impossible a modifier' }, { status: 500 });
      return NextResponse.json({ success: true, action });
    }
    if (!['archive', 'unarchive', 'mute', 'unmute'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }
    const changes: Record<string, string | null> = {};
    if (action === 'archive') changes.archived_at = new Date().toISOString();
    if (action === 'unarchive') changes.archived_at = null;
    if (action === 'mute') {
      const hours = Math.min(24 * 365, Math.max(1, Number(body?.hours || 8)));
      changes.muted_until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }
    if (action === 'unmute') changes.muted_until = null;
    const { error } = await supabaseAdmin
      .from('conversation_participants')
      .update(changes)
      .eq('conversation_id', params.conversationId)
      .eq('user_id', session.user.id);
    if (error) return NextResponse.json({ error: 'Conversation impossible a mettre a jour' }, { status: 500 });
    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('[messages/conversation] PATCH failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
