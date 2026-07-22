import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  sendConversationMessage,
  type MessagingMessage,
  type SendConversationMessageInput,
} from '@/api/client';

const OUTBOX_PREFIX = 'synaura.messaging.outbox.v2';
export const MESSAGE_OUTBOX_CHANGED_EVENT = 'synaura:messaging-outbox-changed';
const outboxLocks = new Map<string, Promise<void>>();
const activeDeliveries = new Map<string, Promise<MessagingMessage>>();

export type OutboxMessage = {
  conversationId: string;
  clientId: string;
  input: SendConversationMessageInput;
  createdAt: number;
  attempts: number;
  lastError: string | null;
  lastAttemptAt?: number | null;
};

function key(userId: string) {
  return `${OUTBOX_PREFIX}:${userId}`;
}

export function createMessageClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readMessageOutboxUnsafe(userId: string): Promise<OutboxMessage[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.conversationId && entry?.clientId && entry?.input) : [];
  } catch {
    return [];
  }
}

async function writeMessageOutboxUnsafe(userId: string, items: OutboxMessage[]) {
  if (!items.length) {
    await AsyncStorage.removeItem(key(userId));
    return;
  }
  await AsyncStorage.setItem(key(userId), JSON.stringify(items.slice(-100)));
}

function withOutboxLock<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const previous = outboxLocks.get(userId) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  const settled = current.then(() => undefined, () => undefined);
  outboxLocks.set(userId, settled);
  return current.finally(() => {
    if (outboxLocks.get(userId) === settled) outboxLocks.delete(userId);
  });
}

function notifyOutboxChanged(userId: string) {
  DeviceEventEmitter.emit(MESSAGE_OUTBOX_CHANGED_EVENT, { userId });
}

export function getOutboxRetryAt(item: OutboxMessage) {
  if (!item.lastAttemptAt || item.attempts <= 0) return 0;
  const delay = Math.min(5 * 60_000, 2_000 * (2 ** Math.min(item.attempts - 1, 7)));
  return item.lastAttemptAt + delay;
}

export function readMessageOutbox(userId: string): Promise<OutboxMessage[]> {
  return withOutboxLock(userId, () => readMessageOutboxUnsafe(userId));
}

export async function enqueueMessage(userId: string, item: OutboxMessage) {
  await withOutboxLock(userId, async () => {
    const current = await readMessageOutboxUnsafe(userId);
    const next = [...current.filter((entry) => entry.clientId !== item.clientId), item];
    await writeMessageOutboxUnsafe(userId, next);
  });
  notifyOutboxChanged(userId);
}

export async function resolveOutboxMessage(userId: string, clientId: string) {
  await withOutboxLock(userId, async () => {
    const current = await readMessageOutboxUnsafe(userId);
    await writeMessageOutboxUnsafe(userId, current.filter((entry) => entry.clientId !== clientId));
  });
  notifyOutboxChanged(userId);
}

export async function failOutboxMessage(userId: string, clientId: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Envoi impossible';
  await withOutboxLock(userId, async () => {
    const current = await readMessageOutboxUnsafe(userId);
    await writeMessageOutboxUnsafe(userId, current.map((entry) => entry.clientId === clientId
      ? { ...entry, attempts: entry.attempts + 1, lastError: message, lastAttemptAt: Date.now() }
      : entry));
  });
  notifyOutboxChanged(userId);
}

export function deliverOutboxMessage(userId: string, item: OutboxMessage): Promise<MessagingMessage> {
  const deliveryKey = `${userId}:${item.clientId}`;
  const active = activeDeliveries.get(deliveryKey);
  if (active) return active;

  const delivery = sendConversationMessage(item.conversationId, item.input)
    .then(async (message) => {
      await resolveOutboxMessage(userId, item.clientId);
      return message;
    })
    .catch(async (error) => {
      await failOutboxMessage(userId, item.clientId, error);
      throw error;
    })
    .finally(() => {
      if (activeDeliveries.get(deliveryKey) === delivery) activeDeliveries.delete(deliveryKey);
    });
  activeDeliveries.set(deliveryKey, delivery);
  return delivery;
}
