import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL } from '@/api/client';
import {
  MOBILE_AUTH_EXPIRES_AT_KEY,
  MOBILE_AUTH_REFRESH_TOKEN_KEY,
  MOBILE_AUTH_SESSION_REFRESHED_EVENT,
  MOBILE_AUTH_TOKEN_KEY,
} from '@/auth/storageKeys';

export const MESSAGE_NOTIFICATION_CATEGORY = 'synaura_message';
export const MESSAGE_REPLY_ACTION = 'reply_message';
export const MESSAGE_MARK_READ_ACTION = 'mark_read_message';

const PENDING_ACTIONS_KEY = 'synaura.notifications.message-actions.v2';
const HANDLED_ACTIONS_KEY = 'synaura.notifications.message-actions.handled.v2';
const ACTION_TIMEOUT_MS = 12_000;
const HANDLED_ACTION_TTL_MS = 7 * 24 * 60 * 60_000;
const MAX_RECORDED_ACTIONS = 120;

type MessageNotificationResponse = Pick<Notifications.NotificationResponse, 'actionIdentifier' | 'userText' | 'notification'>;
type PendingMessageAction = {
  key: string;
  action: 'reply' | 'read';
  conversationId: string;
  roomId: string | null;
  content: string;
  notificationId: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt: number | null;
};
type HandledMessageAction = { key: string; handledAt: number };

let storageLock: Promise<void> = Promise.resolve();
let flushPromise: Promise<{ delivered: number; pending: number }> | null = null;
let refreshPromise: Promise<string | null> | null = null;

function notificationData(response: MessageNotificationResponse) {
  const data = response.notification?.request?.content?.data;
  return data && typeof data === 'object' ? data as Record<string, unknown> : {};
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const current = storageLock.catch(() => {}).then(operation);
  storageLock = current.then(() => undefined, () => undefined);
  return current;
}

async function readJsonArray<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    await AsyncStorage.removeItem(key).catch(() => {});
    return [];
  }
}

async function readPendingActions() {
  return withStorageLock(() => readJsonArray<PendingMessageAction>(PENDING_ACTIONS_KEY));
}

async function upsertPendingAction(action: PendingMessageAction) {
  await withStorageLock(async () => {
    const current = await readJsonArray<PendingMessageAction>(PENDING_ACTIONS_KEY);
    const next = [...current.filter((item) => item.key !== action.key), action].slice(-MAX_RECORDED_ACTIONS);
    await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(next));
  });
}

async function updatePendingAction(key: string, update: (action: PendingMessageAction) => PendingMessageAction | null) {
  await withStorageLock(async () => {
    const current = await readJsonArray<PendingMessageAction>(PENDING_ACTIONS_KEY);
    const next = current.flatMap((item) => {
      if (item.key !== key) return [item];
      const changed = update(item);
      return changed ? [changed] : [];
    });
    if (next.length) await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
  });
}

async function isActionHandled(key: string) {
  return withStorageLock(async () => {
    const cutoff = Date.now() - HANDLED_ACTION_TTL_MS;
    const handled = (await readJsonArray<HandledMessageAction>(HANDLED_ACTIONS_KEY))
      .filter((item) => item?.key && Number(item.handledAt) >= cutoff);
    return handled.some((item) => item.key === key);
  });
}

async function markActionHandled(key: string) {
  await withStorageLock(async () => {
    const cutoff = Date.now() - HANDLED_ACTION_TTL_MS;
    const current = (await readJsonArray<HandledMessageAction>(HANDLED_ACTIONS_KEY))
      .filter((item) => item?.key && item.key !== key && Number(item.handledAt) >= cutoff);
    await AsyncStorage.setItem(
      HANDLED_ACTIONS_KEY,
      JSON.stringify([...current, { key, handledAt: Date.now() }].slice(-MAX_RECORDED_ACTIONS)),
    );
  });
}

async function fetchWithTimeout(path: string, token: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshStoredMobileAccessToken() {
  if (refreshPromise) return refreshPromise;
  const operation = (async () => {
    const refreshToken = await SecureStore.getItemAsync(MOBILE_AUTH_REFRESH_TOKEN_KEY).catch(() => null);
    if (!refreshToken) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/mobile/refresh`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = await response.json().catch(() => null);
      const session = payload?.data;
      if (!response.ok || !session?.token) return null;
      const token = String(session.token);
      await Promise.all([
        SecureStore.setItemAsync(MOBILE_AUTH_TOKEN_KEY, token),
        session.refreshToken
          ? SecureStore.setItemAsync(MOBILE_AUTH_REFRESH_TOKEN_KEY, String(session.refreshToken))
          : Promise.resolve(),
        session.expiresAt
          ? SecureStore.setItemAsync(MOBILE_AUTH_EXPIRES_AT_KEY, String(session.expiresAt))
          : Promise.resolve(),
      ]);
      DeviceEventEmitter.emit(MOBILE_AUTH_SESSION_REFRESHED_EVENT, {
        token,
        refreshToken: session.refreshToken ? String(session.refreshToken) : refreshToken,
        expiresAt: Number(session.expiresAt || 0),
        user: session.user || null,
      });
      return token;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();
  refreshPromise = operation;
  try {
    return await operation;
  } finally {
    if (refreshPromise === operation) refreshPromise = null;
  }
}

export async function getStoredMobileAccessToken(forceRefresh = false) {
  const token = await SecureStore.getItemAsync(MOBILE_AUTH_TOKEN_KEY).catch(() => null);
  const expiresAt = Number(await SecureStore.getItemAsync(MOBILE_AUTH_EXPIRES_AT_KEY).catch(() => 0) || 0);
  const expiresAtMs = expiresAt > 1_000_000_000_000 ? expiresAt : expiresAt * 1_000;
  if (!forceRefresh && token && (!expiresAt || expiresAtMs > Date.now() + 30_000)) return token;
  return (await refreshStoredMobileAccessToken()) || (forceRefresh ? null : token);
}

export function isMessageNotificationAction(response: MessageNotificationResponse) {
  return response.actionIdentifier === MESSAGE_REPLY_ACTION || response.actionIdentifier === MESSAGE_MARK_READ_ACTION;
}

function pendingActionFromResponse(response: MessageNotificationResponse): PendingMessageAction | null {
  if (!isMessageNotificationAction(response)) return null;
  const data = notificationData(response);
  const conversationId = String(data.conversation_id || data.conversationId || '').trim();
  if (!conversationId) return null;
  const notificationId = String(response.notification.request.identifier || conversationId);
  const sourceId = String(data.notification_id || data.message_id || notificationId);
  const action = response.actionIdentifier === MESSAGE_REPLY_ACTION ? 'reply' : 'read';
  const content = action === 'reply' ? String(response.userText || '').trim().slice(0, 2_000) : '';
  if (action === 'reply' && !content) return null;
  const roomId = typeof data.room_id === 'string' && data.room_id ? data.room_id : null;
  const key = `${action}:${sourceId}:${conversationId}:${hash(content)}`;
  return {
    key,
    action,
    conversationId,
    roomId,
    content,
    notificationId,
    createdAt: Date.now(),
    attempts: 0,
    lastAttemptAt: null,
  };
}

function retryAt(action: PendingMessageAction) {
  if (!action.lastAttemptAt || action.attempts <= 0) return 0;
  return action.lastAttemptAt + Math.min(5 * 60_000, 2_000 * (2 ** Math.min(action.attempts - 1, 7)));
}

async function deliverPendingAction(action: PendingMessageAction) {
  let token = await getStoredMobileAccessToken();
  if (!token) throw new Error('Session indisponible');
  const path = action.action === 'reply'
    ? `/api/messages/${encodeURIComponent(action.conversationId)}`
    : `/api/messages/${encodeURIComponent(action.conversationId)}/seen`;
  const init: RequestInit = action.action === 'reply'
    ? {
      method: 'POST',
      body: JSON.stringify({
        type: 'text',
        content: action.content,
        roomId: action.roomId,
        clientId: `notification-${hash(action.key)}`,
      }),
    }
    : { method: 'PUT' };

  let response = await fetchWithTimeout(path, token, init);
  if (response.status === 401 || response.status === 403) {
    token = await getStoredMobileAccessToken(true);
    if (!token) throw new Error('Session expirée');
    response = await fetchWithTimeout(path, token, init);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || (action.action === 'reply' ? 'Réponse non envoyée' : 'Lecture non synchronisée'));
  }

  await markActionHandled(action.key);
  await updatePendingAction(action.key, () => null);
  await Notifications.dismissNotificationAsync(action.notificationId).catch(() => {});
}

export async function flushPendingMessageNotificationActions(options: { force?: boolean } = {}) {
  if (flushPromise) return flushPromise;
  const operation = (async () => {
    let delivered = 0;
    const actions = await readPendingActions();
    for (const action of actions) {
      if (!options.force && retryAt(action) > Date.now()) continue;
      if (await isActionHandled(action.key)) {
        await updatePendingAction(action.key, () => null);
        continue;
      }
      try {
        await deliverPendingAction(action);
        delivered += 1;
      } catch {
        await updatePendingAction(action.key, (current) => ({
          ...current,
          attempts: current.attempts + 1,
          lastAttemptAt: Date.now(),
        }));
      }
    }
    return { delivered, pending: (await readPendingActions()).length };
  })();
  flushPromise = operation;
  try {
    return await operation;
  } finally {
    if (flushPromise === operation) flushPromise = null;
  }
}

export async function handleMessageNotificationAction(response: MessageNotificationResponse) {
  if (!isMessageNotificationAction(response)) return false;
  const action = pendingActionFromResponse(response);
  if (!action) return true;
  if (await isActionHandled(action.key)) {
    await Notifications.dismissNotificationAsync(action.notificationId).catch(() => {});
    return true;
  }
  await upsertPendingAction(action);
  await flushPendingMessageNotificationActions({ force: true });
  return true;
}
