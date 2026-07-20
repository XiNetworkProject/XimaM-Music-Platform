import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

type NativeMessagingModule = {
  canDrawOverlays: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<boolean>;
  configureChatBubble?: (enabled: boolean, conversationId: string, title: string, accentColor: string) => Promise<boolean>;
  showChatBubble: (conversationId: string, title: string, accentColor: string) => Promise<boolean>;
  hideChatBubble: () => Promise<boolean>;
};

const nativeMessaging = NativeModules.SynauraMessaging as NativeMessagingModule | undefined;

export type ConversationBubbleConfig = {
  userId: string;
  conversationId: string;
  title: string;
  accentColor: string;
};

const CONVERSATION_BUBBLE_KEY = 'synaura.messaging.bubble.v1';
export const CONVERSATION_BUBBLE_CHANGED = 'synaura:conversation-bubble-changed';
let cachedConfig: ConversationBubbleConfig | null | undefined;

function sanitizeBubbleConfig(value: unknown): ConversationBubbleConfig | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ConversationBubbleConfig>;
  if (typeof candidate.userId !== 'string' || !candidate.userId.trim()) return null;
  if (typeof candidate.conversationId !== 'string' || !candidate.conversationId.trim()) return null;
  return {
    userId: candidate.userId.trim(),
    conversationId: candidate.conversationId.trim(),
    title: typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim().slice(0, 80)
      : 'Discussion Synaura',
    accentColor: typeof candidate.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(candidate.accentColor)
      ? candidate.accentColor
      : '#7357C6',
  };
}

export function supportsConversationBubble() {
  return Platform.OS === 'android' && Boolean(nativeMessaging);
}

export async function hasConversationBubblePermission() {
  if (!supportsConversationBubble()) return false;
  return nativeMessaging!.canDrawOverlays();
}

export async function requestConversationBubblePermission() {
  if (!supportsConversationBubble()) return false;
  if (await hasConversationBubblePermission()) return true;
  await nativeMessaging!.requestOverlayPermission();
  return false;
}

export async function getPreferredConversationBubble() {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    const raw = await AsyncStorage.getItem(CONVERSATION_BUBBLE_KEY);
    cachedConfig = raw ? sanitizeBubbleConfig(JSON.parse(raw)) : null;
  } catch {
    cachedConfig = null;
    await AsyncStorage.removeItem(CONVERSATION_BUBBLE_KEY).catch(() => {});
  }
  return cachedConfig;
}

export async function setPreferredConversationBubble(config: ConversationBubbleConfig | null) {
  const next = sanitizeBubbleConfig(config);
  cachedConfig = next;
  if (next) await AsyncStorage.setItem(CONVERSATION_BUBBLE_KEY, JSON.stringify(next));
  else await AsyncStorage.removeItem(CONVERSATION_BUBBLE_KEY);
  await configureNativeConversationBubble(next);
  DeviceEventEmitter.emit(CONVERSATION_BUBBLE_CHANGED, next);
}

export async function configureNativeConversationBubble(config: ConversationBubbleConfig | null) {
  if (!supportsConversationBubble() || !nativeMessaging?.configureChatBubble) return false;
  return nativeMessaging.configureChatBubble(
    Boolean(config),
    config?.conversationId || '',
    config?.title || 'Discussion Synaura',
    config?.accentColor || '#7357C6',
  ).catch(() => false);
}

export async function clearPreferredConversationBubble(conversationId?: string) {
  const current = await getPreferredConversationBubble();
  if (conversationId && current?.conversationId !== conversationId) return;
  await setPreferredConversationBubble(null);
}

export async function showConversationBubble(conversationId: string, title: string, accentColor: string) {
  if (!supportsConversationBubble()) return false;
  if (!await hasConversationBubblePermission()) return false;
  return nativeMessaging!.showChatBubble(conversationId, title, accentColor);
}

export async function hideConversationBubble() {
  if (!supportsConversationBubble()) return false;
  return nativeMessaging!.hideChatBubble();
}
