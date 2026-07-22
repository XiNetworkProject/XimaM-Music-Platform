import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SendConversationMessageInput } from '@/api/client';

const OUTBOX_PREFIX = 'synaura.messaging.outbox.v2';

export type OutboxMessage = {
  conversationId: string;
  clientId: string;
  input: SendConversationMessageInput;
  createdAt: number;
  attempts: number;
  lastError: string | null;
};

function key(userId: string) {
  return `${OUTBOX_PREFIX}:${userId}`;
}

export function createMessageClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function readMessageOutbox(userId: string): Promise<OutboxMessage[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.conversationId && entry?.clientId && entry?.input) : [];
  } catch {
    return [];
  }
}

async function writeMessageOutbox(userId: string, items: OutboxMessage[]) {
  if (!items.length) {
    await AsyncStorage.removeItem(key(userId));
    return;
  }
  await AsyncStorage.setItem(key(userId), JSON.stringify(items.slice(-100)));
}

export async function enqueueMessage(userId: string, item: OutboxMessage) {
  const current = await readMessageOutbox(userId);
  const next = [...current.filter((entry) => entry.clientId !== item.clientId), item];
  await writeMessageOutbox(userId, next);
}

export async function resolveOutboxMessage(userId: string, clientId: string) {
  const current = await readMessageOutbox(userId);
  await writeMessageOutbox(userId, current.filter((entry) => entry.clientId !== clientId));
}

export async function failOutboxMessage(userId: string, clientId: string, error: unknown) {
  const current = await readMessageOutbox(userId);
  const message = error instanceof Error ? error.message : 'Envoi impossible';
  await writeMessageOutbox(userId, current.map((entry) => entry.clientId === clientId
    ? { ...entry, attempts: entry.attempts + 1, lastError: message }
    : entry));
}
