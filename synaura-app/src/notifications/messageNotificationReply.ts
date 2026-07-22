import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/api/client';
import {
  MOBILE_AUTH_EXPIRES_AT_KEY,
  MOBILE_AUTH_REFRESH_TOKEN_KEY,
  MOBILE_AUTH_TOKEN_KEY,
} from '@/auth/storageKeys';

export const MESSAGE_NOTIFICATION_CATEGORY = 'synaura_message';
export const MESSAGE_REPLY_ACTION = 'reply_message';
export const MESSAGE_MARK_READ_ACTION = 'mark_read_message';

type MessageNotificationResponse = Pick<Notifications.NotificationResponse, 'actionIdentifier' | 'userText' | 'notification'>;

function notificationData(response: MessageNotificationResponse) {
  const data = response.notification?.request?.content?.data;
  return data && typeof data === 'object' ? data as Record<string, unknown> : {};
}

export async function getStoredMobileAccessToken() {
  let token = await SecureStore.getItemAsync(MOBILE_AUTH_TOKEN_KEY).catch(() => null);
  const expiresAt = Number(await SecureStore.getItemAsync(MOBILE_AUTH_EXPIRES_AT_KEY).catch(() => 0) || 0);
  const expiresAtMs = expiresAt > 1_000_000_000_000 ? expiresAt : expiresAt * 1_000;
  if (token && (!expiresAt || expiresAtMs > Date.now() + 30_000)) return token;

  const refreshToken = await SecureStore.getItemAsync(MOBILE_AUTH_REFRESH_TOKEN_KEY).catch(() => null);
  if (!refreshToken) return token;
  const response = await fetch(`${API_BASE_URL}/api/auth/mobile/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);
  const payload = response ? await response.json().catch(() => null) : null;
  const session = payload?.data;
  if (!response?.ok || !session?.token) return token;
  token = String(session.token);
  await Promise.all([
    SecureStore.setItemAsync(MOBILE_AUTH_TOKEN_KEY, token),
    session.refreshToken ? SecureStore.setItemAsync(MOBILE_AUTH_REFRESH_TOKEN_KEY, String(session.refreshToken)) : Promise.resolve(),
    session.expiresAt ? SecureStore.setItemAsync(MOBILE_AUTH_EXPIRES_AT_KEY, String(session.expiresAt)) : Promise.resolve(),
  ]).catch(() => {});
  return token;
}

export function isMessageNotificationAction(response: MessageNotificationResponse) {
  return response.actionIdentifier === MESSAGE_REPLY_ACTION || response.actionIdentifier === MESSAGE_MARK_READ_ACTION;
}

export async function handleMessageNotificationAction(response: MessageNotificationResponse) {
  if (!isMessageNotificationAction(response)) return false;
  const data = notificationData(response);
  const conversationId = String(data.conversation_id || data.conversationId || '');
  if (!conversationId) return true;
  const token = await getStoredMobileAccessToken();
  if (!token) return true;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (response.actionIdentifier === MESSAGE_REPLY_ACTION) {
    const content = String(response.userText || '').trim().slice(0, 2_000);
    if (!content) return true;
    const roomId = typeof data.room_id === 'string' && data.room_id ? data.room_id : null;
    const notificationId = String(response.notification.request.identifier || conversationId).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60);
    const result = await fetch(`${API_BASE_URL}/api/messages/${encodeURIComponent(conversationId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'text', content, roomId, clientId: `notification-${notificationId}` }),
    });
    if (!result.ok) throw new Error('Reponse non envoyee');
  } else {
    const result = await fetch(`${API_BASE_URL}/api/messages/${encodeURIComponent(conversationId)}/seen`, {
      method: 'PUT',
      headers,
    });
    if (!result.ok) throw new Error('Lecture non synchronisee');
  }

  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
  return true;
}
