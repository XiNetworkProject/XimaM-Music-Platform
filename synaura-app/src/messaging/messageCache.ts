import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MessagingConversation, MessagingMessage } from '@/api/client';

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

export async function readConversationCache(userId: string, conversationId: string, roomId?: string | null) {
  const raw = await AsyncStorage.getItem(key(userId, conversationId, roomId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CACHE_VERSION || !parsed?.data?.conversation || !Array.isArray(parsed?.data?.messages)) return null;
    return parsed.data as CachedConversation;
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
