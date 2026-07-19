import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  MAX_GROUP_PARTICIPANTS,
  ensureDirectConversation,
  formatConversationPreferences,
  formatMessagingProfile,
  getMessagingProfiles,
  usersAreBlocked,
  usersAreFriends,
} from '@/lib/messaging';

export const dynamic = 'force-dynamic';

function lastMessagePreview(message: any) {
  if (!message) return null;
  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata : {};
  return {
    id: String(message.id),
    _id: String(message.id),
    content: message.deleted_at ? 'Message supprime' : String(message.content || ''),
    type: message.deleted_at ? 'deleted' : String(message.message_type || 'text'),
    mediaUrl: message.deleted_at ? null : message.media_url || null,
    sharedEntityType: message.deleted_at ? null : message.shared_entity_type || null,
    sharedEntityId: message.deleted_at ? null : message.shared_entity_id || null,
    metadata: message.deleted_at ? {} : metadata,
    createdAt: message.created_at,
    senderId: String(message.sender_id),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const userId = session.user.id;
    const includeArchived = request.nextUrl.searchParams.get('archived') === '1';

    let participationQuery = supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id, last_read_at, archived_at, muted_until, role, nickname, theme_key, accent_color, background_key, wallpaper_url, bubble_enabled')
      .eq('user_id', userId);
    if (!includeArchived) participationQuery = participationQuery.is('archived_at', null);
    const { data: myParticipations, error: participationError } = await participationQuery;
    if (participationError) return NextResponse.json({ error: 'Conversations indisponibles' }, { status: 500 });

    const conversationIds = (myParticipations || []).map((row) => row.conversation_id);
    if (!conversationIds.length) return NextResponse.json({ conversations: [], total: 0, unread: 0 });

    const { data: conversations, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select('id, name, description, avatar_url, owner_id, is_group, created_at, updated_at, last_message_at, last_message_id, is_active')
      .in('id', conversationIds)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });
    if (conversationError) return NextResponse.json({ error: 'Conversations indisponibles' }, { status: 500 });

    const activeIds = (conversations || []).map((row) => row.id);
    if (!activeIds.length) return NextResponse.json({ conversations: [], total: 0, unread: 0 });

    const [{ data: participantRows }, { data: unreadRows }] = await Promise.all([
      supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, user_id, last_read_at, role, nickname')
        .in('conversation_id', activeIds),
      supabaseAdmin
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', activeIds)
        .neq('sender_id', userId)
        .eq('is_read', false)
        .is('deleted_at', null),
    ]);

    const participantsByConversation = new Map<string, any[]>();
    (participantRows || []).forEach((row) => {
      const list = participantsByConversation.get(row.conversation_id) || [];
      list.push(row);
      participantsByConversation.set(row.conversation_id, list);
    });
    const profileIds = Array.from(new Set((participantRows || []).map((row) => row.user_id)));
    const profiles = await getMessagingProfiles(profileIds);

    const messageIds = (conversations || []).map((row) => row.last_message_id).filter(Boolean);
    const latestMessages = new Map<string, any>();
    if (messageIds.length) {
      const { data } = await supabaseAdmin
        .from('messages')
        .select('id, conversation_id, sender_id, content, message_type, media_url, shared_entity_type, shared_entity_id, metadata, deleted_at, created_at')
        .in('id', messageIds);
      (data || []).forEach((message) => latestMessages.set(message.id, message));
    }

    const unreadByConversation = new Map<string, number>();
    (unreadRows || []).forEach((row) => {
      unreadByConversation.set(row.conversation_id, (unreadByConversation.get(row.conversation_id) || 0) + 1);
    });

    const otherUserIds = Array.from(new Set((participantRows || [])
      .map((row) => row.user_id)
      .filter((participantId) => participantId !== userId)));
    const [{ data: friendshipsAsUser }, { data: friendshipsAsFriend }, { data: blockRows }] = await Promise.all([
      supabaseAdmin.from('friendships').select('friend_id').eq('user_id', userId),
      supabaseAdmin.from('friendships').select('user_id').eq('friend_id', userId),
      otherUserIds.length
        ? supabaseAdmin.from('user_blocks').select('blocker_id, blocked_id').in('blocker_id', [userId, ...otherUserIds]).in('blocked_id', [userId, ...otherUserIds])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const friendIds = new Set([
      ...(friendshipsAsUser || []).map((row) => row.friend_id),
      ...(friendshipsAsFriend || []).map((row) => row.user_id),
    ]);

    const myParticipationMap = new Map((myParticipations || []).map((row) => [row.conversation_id, row]));
    const result = (conversations || []).map((conversation) => {
      const rows = participantsByConversation.get(conversation.id) || [];
      const participants = rows.map((row) => profiles.get(row.user_id) || formatMessagingProfile({ id: row.user_id }));
      const other = rows.find((row) => row.user_id !== userId);
      const blocked = other ? (blockRows || []).some((row: any) => (
        row.blocker_id === userId && row.blocked_id === other.user_id
      ) || (
        row.blocker_id === other.user_id && row.blocked_id === userId
      )) : false;
      const ownParticipation = myParticipationMap.get(conversation.id);
      const unreadCount = unreadByConversation.get(conversation.id) || 0;
      return {
        id: conversation.id,
        _id: conversation.id,
        name: conversation.name,
        description: conversation.description || null,
        avatarUrl: conversation.avatar_url || null,
        ownerId: conversation.owner_id || null,
        type: conversation.is_group ? 'group' : 'direct',
        participants,
        participantRoles: rows.map((row) => ({ userId: row.user_id, role: row.role || 'member', nickname: row.nickname || null })),
        otherUser: !conversation.is_group && other ? profiles.get(other.user_id) || formatMessagingProfile({ id: other.user_id }) : null,
        lastMessage: conversation.last_message_id ? lastMessagePreview(latestMessages.get(conversation.last_message_id)) : null,
        unreadCount,
        canMessage: Boolean(conversation.is_group || (other && friendIds.has(other.user_id) && !blocked)),
        blocked,
        muted: Boolean(ownParticipation?.muted_until && new Date(ownParticipation.muted_until).getTime() > Date.now()),
        archived: Boolean(ownParticipation?.archived_at),
        preferences: formatConversationPreferences(ownParticipation),
        createdAt: conversation.created_at,
        updatedAt: conversation.last_message_at || conversation.updated_at,
      };
    });

    return NextResponse.json({
      conversations: result,
      total: result.length,
      unread: result.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    });
  } catch (error) {
    console.error('[messages/conversations] GET failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const requestedParticipants: string[] = Array.isArray(body?.participantIds)
      ? Array.from(new Set(body.participantIds.filter((value: unknown): value is string => typeof value === 'string').map((value: string) => value.trim()).filter(Boolean)))
      : [];
    if (requestedParticipants.length) {
      const participantIds = requestedParticipants.filter((id) => id !== session.user.id).slice(0, MAX_GROUP_PARTICIPANTS - 1);
      const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 64) : '';
      if (!name || participantIds.length < 2) {
        return NextResponse.json({ error: 'Choisis un nom et au moins deux amis' }, { status: 400 });
      }
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id').in('id', participantIds);
      if ((profiles || []).length !== participantIds.length) {
        return NextResponse.json({ error: 'Un participant est introuvable' }, { status: 404 });
      }
      const relationshipChecks = await Promise.all(participantIds.map(async (participantId) => ({
        participantId,
        blocked: await usersAreBlocked(session.user.id, participantId),
        friend: await usersAreFriends(session.user.id, participantId),
      })));
      if (relationshipChecks.some((entry) => entry.blocked || !entry.friend)) {
        return NextResponse.json({ error: 'Tous les membres doivent faire partie de tes amis' }, { status: 403 });
      }

      const now = new Date().toISOString();
      const conversationId = crypto.randomUUID();
      const { error: conversationError } = await supabaseAdmin.from('conversations').insert({
        id: conversationId,
        name,
        description: typeof body?.description === 'string' ? body.description.trim().slice(0, 180) || null : null,
        is_group: true,
        owner_id: session.user.id,
        created_at: now,
        updated_at: now,
        last_message_at: now,
        is_active: true,
      });
      if (conversationError) return NextResponse.json({ error: 'Salon impossible a creer' }, { status: 500 });

      const { error: participantError } = await supabaseAdmin.from('conversation_participants').insert([
        { conversation_id: conversationId, user_id: session.user.id, role: 'owner', last_read_at: now },
        ...participantIds.map((userId) => ({ conversation_id: conversationId, user_id: userId, role: 'member', last_read_at: null })),
      ]);
      if (participantError) {
        await supabaseAdmin.from('conversations').delete().eq('id', conversationId);
        return NextResponse.json({ error: 'Membres impossibles a ajouter' }, { status: 500 });
      }

      const { data: rooms, error: roomError } = await supabaseAdmin.from('conversation_rooms').insert([
        { conversation_id: conversationId, name: 'general', room_type: 'text', position: 0, created_by: session.user.id },
        { conversation_id: conversationId, name: 'vocaux', room_type: 'voice_notes', position: 1, created_by: session.user.id },
      ]).select('id, name, room_type, position, created_at');
      if (roomError) {
        await supabaseAdmin.from('conversations').delete().eq('id', conversationId);
        return NextResponse.json({ error: 'Salons impossibles a preparer' }, { status: 500 });
      }
      return NextResponse.json({ id: conversationId, _id: conversationId, type: 'group', rooms }, { status: 201 });
    }

    const participantId = typeof body?.participantId === 'string' ? body.participantId.trim() : '';
    if (!participantId || participantId === session.user.id) {
      return NextResponse.json({ error: 'Participant invalide' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', participantId).maybeSingle();
    if (!profile) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if (await usersAreBlocked(session.user.id, participantId)) {
      return NextResponse.json({ error: 'Conversation indisponible' }, { status: 403 });
    }
    if (!await usersAreFriends(session.user.id, participantId)) {
      return NextResponse.json({ error: 'Une demande de contact doit d’abord etre acceptee' }, { status: 403 });
    }

    const conversation = await ensureDirectConversation(session.user.id, participantId);
    await supabaseAdmin
      .from('conversation_participants')
      .update({ archived_at: null })
      .eq('conversation_id', conversation.id)
      .eq('user_id', session.user.id);
    return NextResponse.json({ id: conversation.id, _id: conversation.id, type: 'direct', exists: true }, { status: 200 });
  } catch (error) {
    console.error('[messages/conversations] POST failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
