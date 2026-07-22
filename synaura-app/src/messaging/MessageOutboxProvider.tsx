import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import {
  deliverOutboxMessage,
  getOutboxRetryAt,
  MESSAGE_OUTBOX_CHANGED_EVENT,
  readMessageOutbox,
} from '@/messaging/messageOutbox';
import { messagingKeys } from '@/messaging/useMessagingUnread';

const MAX_AUTOMATIC_ATTEMPTS = 6;
const FOREGROUND_FLUSH_INTERVAL_MS = 45_000;

export function MessageOutboxProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const flushingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleFlushRef = useRef<(delay?: number) => void>(() => {});

  const flush = useCallback(async () => {
    if (!auth.user?.id || !auth.token || flushingRef.current || AppState.currentState !== 'active') return;
    flushingRef.current = true;
    let delivered = false;
    try {
      const outbox = await readMessageOutbox(auth.user.id);
      const now = Date.now();
      const pending = outbox.filter((item) => (
        item.attempts < MAX_AUTOMATIC_ATTEMPTS && getOutboxRetryAt(item) <= now
      ));
      for (const item of pending) {
        try {
          await deliverOutboxMessage(auth.user.id, item);
          delivered = true;
          void queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(item.conversationId) });
        } catch {
          // The message remains in the durable outbox with its retry metadata.
        }
      }
      if (delivered) {
        void queryClient.invalidateQueries({ queryKey: messagingKeys.inbox() });
        void queryClient.invalidateQueries({ queryKey: messagingKeys.unread() });
      }
      const remaining = await readMessageOutbox(auth.user.id);
      const nextRetryAt = remaining
        .filter((item) => item.attempts < MAX_AUTOMATIC_ATTEMPTS)
        .reduce((earliest, item) => Math.min(earliest, getOutboxRetryAt(item)), Number.POSITIVE_INFINITY);
      if (Number.isFinite(nextRetryAt)) {
        scheduleFlushRef.current(Math.max(250, nextRetryAt - Date.now() + 100));
      }
    } finally {
      flushingRef.current = false;
    }
  }, [auth.token, auth.user?.id, queryClient]);

  useEffect(() => {
    if (!auth.user?.id || !auth.token) return undefined;
    const schedule = (delay = 0) => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => void flush(), delay);
    };
    scheduleFlushRef.current = schedule;
    schedule(250);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule(200);
    });
    const outboxSubscription = DeviceEventEmitter.addListener(MESSAGE_OUTBOX_CHANGED_EVENT, (event) => {
      if (event?.userId === auth.user?.id) schedule(1_500);
    });
    const interval = setInterval(() => void flush(), FOREGROUND_FLUSH_INTERVAL_MS);
    return () => {
      appStateSubscription.remove();
      outboxSubscription.remove();
      clearInterval(interval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      scheduleFlushRef.current = () => {};
    };
  }, [auth.token, auth.user?.id, flush]);

  return <>{children}</>;
}
