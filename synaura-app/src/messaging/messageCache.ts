import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MessagingConversation, MessagingMessage } from '@/api/client';
import { toPublicMediaUrl } from '@/media/mediaUrls';

const CACHE_VERSION = 2;
const CACHE_PREFIX = 'synaura.messaging.cache.v2';
const MAX_CACHED_MESSAGES = 120;

export type CachedConversation = {
  conversation: Omit<MessagingConversation, 'lastMessage' | 'unreadCount' | 'createdAt' | 'updatedAt'>;
  messages: MessagingMessage[];
  savedAt: number;
};

function key(userId: string, conversationId: string, roomId?: string | null) {
  return `${CACHE_PREFIX}:${userId}:${conversationId}:${roomId || 'main'}`;
}

function normalizeCachedMessage(message: MessagingMessage): MessagingMessage {
  const metadata = { ...message.metadata };
  if (typeof metadata.coverUrl === 'string') metadata.coverUrl = toPublicMediaUrl(metadata.coverUrl) || '';
  return {
    ...message,
    sender: { ...message.sender, avatar: toPublicMediaUrl(message.sender.avatar) },
    mediaUrl: toPublicMediaUrl(message.mediaUrl),
    metadata,
    attachments: message.attachments
      .map((attachment) => ({
        ...attachment,
        url: toPublicMediaUrl(attachment.url) || '',
        previewUrl: toPublicMediaUrl(attachment.previewUrl),
      }))
      .filter((attachment) => Boolean(attachment.url)),
  };
}

function normalizeCachedConversation(
  conversation: CachedConversation['conversation'],
): CachedConversation['conversation'] {
  return {
    ...conversation,
    avatarUrl: toPublicMediaUrl(conversation.avatarUrl),
    participants: conversation.participants.map((user) => ({
      ...user,
      avatar: toPublicMediaUrl(user.avatar),
    })),
    otherUser: conversation.otherUser ? {
      ...conversation.otherUser,
      avatar: toPublicMediaUrl(conversation.otherUser.avatar),
    } : null,
    preferences: {
      ...conversation.preferences,
      wallpaperUrl: toPublicMediaUrl(conversation.preferences.wallpaperUrl),
    },
  };
}

export async function readConversationCache(userId: string, conversationId: string, roomId?: string | null) {
  const raw = await AsyncStorage.getItem(key(userId, conversationId, roomId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CACHE_VERSION || !parsed?.data?.conversation || !Array.isArray(parsed?.data?.messages)) return null;
    const cached = parsed.data as CachedConversation;
    return {
      ...cached,
      conversation: normalizeCachedConversation(cached.conversation),
      messages: cached.messages.map(normalizeCachedMessage),
    };
  } catch {
    await AsyncStorage.removeItem(key(userId, conversationId, roomId)).catch(() => {});
    return null;
  }
}

export async function writeConversationCache(
  userId: string,
  conversationId: string,
  roomId: string | null | undefined,
  data: Omit<CachedConversation, 'savedAt'>,
) {
  await AsyncStorage.setItem(key(userId, conversationId, roomId), JSON.stringify({
    version: CACHE_VERSION,
    data: {
      ...data,
      messages: data.messages.filter((message) => message.localState !== 'sending').slice(-MAX_CACHED_MESSAGES),
      savedAt: Date.now(),
    },
  }));
}
