import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';

export type MessagingProfile = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  lastSeen: string | null;
};

export const MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_LENGTH = 2_000;
export const MAX_REQUEST_LENGTH = 280;
export const MAX_GROUP_PARTICIPANTS = 24;
export const CONVERSATION_THEME_KEYS = ['aura', 'ocean', 'coral', 'rose', 'graphite'] as const;
export const CONVERSATION_BACKGROUND_KEYS = ['quiet', 'aurora', 'cover', 'midnight'] as const;
export const CONVERSATION_ACCENTS = ['#7357C6', '#4A9EAA', '#D96D63', '#C85D82', '#111111'] as const;

export type ConversationPreferences = {
  nickname: string | null;
  themeKey: typeof CONVERSATION_THEME_KEYS[number];
  accentColor: typeof CONVERSATION_ACCENTS[number];
  backgroundKey: typeof CONVERSATION_BACKGROUND_KEYS[number];
  wallpaperUrl: string | null;
  bubbleEnabled: boolean;
};

export function sanitizeConversationPreferences(value: unknown): ConversationPreferences {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const nickname = typeof source.nickname === 'string' ? source.nickname.trim().slice(0, 48) : '';
  const themeKey = CONVERSATION_THEME_KEYS.includes(source.themeKey as any)
    ? source.themeKey as ConversationPreferences['themeKey']
    : 'aura';
  const accentColor = CONVERSATION_ACCENTS.includes(String(source.accentColor || '').toUpperCase() as any)
    ? String(source.accentColor).toUpperCase() as ConversationPreferences['accentColor']
    : '#7357C6';
  const backgroundKey = CONVERSATION_BACKGROUND_KEYS.includes(source.backgroundKey as any)
    ? source.backgroundKey as ConversationPreferences['backgroundKey']
    : 'quiet';
  const wallpaperUrl = typeof source.wallpaperUrl === 'string' && /^https:\/\//i.test(source.wallpaperUrl.trim())
    ? source.wallpaperUrl.trim().slice(0, 800)
    : null;
  return {
    nickname: nickname || null,
    themeKey,
    accentColor,
    backgroundKey,
    wallpaperUrl,
    bubbleEnabled: Boolean(source.bubbleEnabled),
  };
}

export function formatConversationPreferences(row: any): ConversationPreferences {
  return sanitizeConversationPreferences({
    nickname: row?.nickname,
    themeKey: row?.theme_key,
    accentColor: row?.accent_color,
    backgroundKey: row?.background_key,
    wallpaperUrl: row?.wallpaper_url,
    bubbleEnabled: row?.bubble_enabled,
  });
}

export function directConversationKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(':');
}

export function friendshipPair(firstUserId: string, secondUserId: string) {
  const [userId, friendId] = [firstUserId, secondUserId].sort();
  return { userId, friendId };
}

export function formatMessagingProfile(profile: any): MessagingProfile {
  return {
    id: String(profile?.id || ''),
    name: String(profile?.name || profile?.username || 'Utilisateur Synaura'),
    username: String(profile?.username || 'utilisateur'),
    avatar: typeof profile?.avatar === 'string' && profile.avatar ? profile.avatar : null,
    isVerified: Boolean(profile?.is_verified),
    lastSeen: typeof profile?.last_seen === 'string' ? profile.last_seen : null,
  };
}

export async function getMessagingProfiles(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const profiles = new Map<string, MessagingProfile>();
  if (!uniqueIds.length) return profiles;

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, avatar, is_verified, last_seen')
    .in('id', uniqueIds);

  (data || []).forEach((profile) => profiles.set(profile.id, formatMessagingProfile(profile)));
  return profiles;
}

export async function usersAreBlocked(firstUserId: string, secondUserId: string) {
  const { data } = await supabaseAdmin
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .in('blocker_id', [firstUserId, secondUserId])
    .in('blocked_id', [firstUserId, secondUserId]);

  return (data || []).some((row) => row.blocker_id !== row.blocked_id);
}

export async function getBlockState(currentUserId: string, targetUserId: string) {
  const { data } = await supabaseAdmin
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .in('blocker_id', [currentUserId, targetUserId])
    .in('blocked_id', [currentUserId, targetUserId]);

  return {
    blockedByMe: Boolean((data || []).some((row) => row.blocker_id === currentUserId && row.blocked_id === targetUserId)),
    blockedMe: Boolean((data || []).some((row) => row.blocker_id === targetUserId && row.blocked_id === currentUserId)),
  };
}

export async function usersAreFriends(firstUserId: string, secondUserId: string) {
  const pair = friendshipPair(firstUserId, secondUserId);
  const { data } = await supabaseAdmin
    .from('friendships')
    .select('id')
    .eq('user_id', pair.userId)
    .eq('friend_id', pair.friendId)
    .maybeSingle();
  return Boolean(data);
}

export async function createFriendship(firstUserId: string, secondUserId: string, sourceRequestId?: string | null) {
  const pair = friendshipPair(firstUserId, secondUserId);
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .upsert({
      user_id: pair.userId,
      friend_id: pair.friendId,
      source_request_id: sourceRequestId || null,
    }, { onConflict: 'user_id,friend_id' })
    .select('id, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function removeFriendship(firstUserId: string, secondUserId: string) {
  const pair = friendshipPair(firstUserId, secondUserId);
  const { error } = await supabaseAdmin
    .from('friendships')
    .delete()
    .eq('user_id', pair.userId)
    .eq('friend_id', pair.friendId);
  if (error) throw error;
}

export async function findDirectConversation(firstUserId: string, secondUserId: string) {
  const directKey = directConversationKey(firstUserId, secondUserId);
  const { data: keyedConversation } = await supabaseAdmin
    .from('conversations')
    .select('id, name, is_group, created_at, updated_at, last_message_at, last_message_id, is_active')
    .eq('direct_key', directKey)
    .eq('is_group', false)
    .maybeSingle();
  if (keyedConversation) return keyedConversation;

  const { data: firstParticipations } = await supabaseAdmin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', firstUserId);
  const ids = (firstParticipations || []).map((row) => row.conversation_id);
  if (!ids.length) return null;

  const { data: sharedParticipations } = await supabaseAdmin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', secondUserId)
    .in('conversation_id', ids);
  const sharedIds = (sharedParticipations || []).map((row) => row.conversation_id);
  if (!sharedIds.length) return null;

  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('id, name, is_group, created_at, updated_at, last_message_at, last_message_id, is_active')
    .in('id', sharedIds)
    .eq('is_group', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return conversation || null;
}

export async function ensureDirectConversation(firstUserId: string, secondUserId: string) {
  const existing = await findDirectConversation(firstUserId, secondUserId);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const directKey = directConversationKey(firstUserId, secondUserId);
  const now = new Date().toISOString();
  const { data: conversation, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      id,
      name: null,
      is_group: false,
      direct_key: directKey,
      created_at: now,
      updated_at: now,
      last_message_at: now,
      is_active: true,
    })
    .select('id, name, is_group, created_at, updated_at, last_message_at, last_message_id, is_active')
    .single();

  if (error || !conversation) {
    const concurrent = await findDirectConversation(firstUserId, secondUserId);
    if (concurrent) return concurrent;
    throw error || new Error('Conversation impossible a creer');
  }

  const { error: participantError } = await supabaseAdmin
    .from('conversation_participants')
    .upsert([
      { conversation_id: conversation.id, user_id: firstUserId, last_read_at: now },
      { conversation_id: conversation.id, user_id: secondUserId, last_read_at: null },
    ], { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
  if (participantError) throw participantError;
  return conversation;
}

export async function acceptPendingMessageRequest(requestRow: {
  id: string;
  requester_id: string;
  target_id: string;
  message?: string | null;
}) {
  if (await usersAreBlocked(requestRow.requester_id, requestRow.target_id)) {
    throw new Error('Cette demande ne peut pas etre acceptee');
  }

  await createFriendship(requestRow.requester_id, requestRow.target_id, requestRow.id);
  const conversation = await ensureDirectConversation(requestRow.requester_id, requestRow.target_id);

  if (requestRow.message?.trim()) {
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .upsert({
        id: `request-${requestRow.id}`,
        conversation_id: conversation.id,
        sender_id: requestRow.requester_id,
        content: requestRow.message.trim().slice(0, MAX_REQUEST_LENGTH),
        message_type: 'text',
        is_read: false,
        metadata: { source: 'contact_request', requestId: requestRow.id },
      }, { onConflict: 'id', ignoreDuplicates: true });
    if (messageError) throw messageError;
  }

  const now = new Date().toISOString();
  const { error: requestError } = await supabaseAdmin
    .from('message_requests')
    .update({ status: 'accepted', updated_at: now, resolved_at: now })
    .eq('id', requestRow.id)
    .eq('status', 'pending');
  if (requestError) throw requestError;

  return conversation;
}

export async function requireConversationParticipant(conversationId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('conversation_participants')
    .select('id, conversation_id, user_id, last_read_at, archived_at, muted_until, role, nickname, theme_key, accent_color, background_key, wallpaper_url, bubble_enabled')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

export async function getConversationParticipantIds(conversationId: string) {
  const { data } = await supabaseAdmin
    .from('conversation_participants')
    .select('user_id, last_read_at, muted_until, role, nickname')
    .eq('conversation_id', conversationId);
  return data || [];
}

export function sanitizeMessageMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed = ['title', 'subtitle', 'coverUrl', 'artistName', 'duration', 'url'];
  return allowed.reduce<Record<string, string | number>>((result, key) => {
    const entry = source[key];
    if (typeof entry === 'string' && entry.trim()) result[key] = entry.trim().slice(0, 600);
    if (typeof entry === 'number' && Number.isFinite(entry)) result[key] = entry;
    return result;
  }, {});
}
