import { NativeModules, Platform } from 'react-native';

type NativeMessagingModule = {
  canDrawOverlays: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<boolean>;
  showChatBubble: (conversationId: string, title: string, accentColor: string) => Promise<boolean>;
  hideChatBubble: () => Promise<boolean>;
};

const nativeMessaging = NativeModules.SynauraMessaging as NativeMessagingModule | undefined;

export function supportsConversationBubble() {
  return Platform.OS === 'android' && Boolean(nativeMessaging);
}

export async function requestConversationBubblePermission() {
  if (!supportsConversationBubble()) return false;
  if (await nativeMessaging!.canDrawOverlays()) return true;
  await nativeMessaging!.requestOverlayPermission();
  return false;
}

export async function showConversationBubble(conversationId: string, title: string, accentColor: string) {
  if (!supportsConversationBubble()) return false;
  if (!await nativeMessaging!.canDrawOverlays()) return false;
  return nativeMessaging!.showChatBubble(conversationId, title, accentColor);
}

export async function hideConversationBubble() {
  if (!supportsConversationBubble()) return false;
  return nativeMessaging!.hideChatBubble();
}
