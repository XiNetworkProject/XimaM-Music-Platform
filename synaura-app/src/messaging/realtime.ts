import {
  getMessagingRealtimeSnapshot,
  publishMessagingEphemeral,
} from '@/api/client';

export type MessagingRealtimeState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type MessagingRealtimeCallbacks = {
  onState?: (state: MessagingRealtimeState) => void;
  onMessageChange?: (payload: Record<string, any>) => void;
  onReactionChange?: (payload: Record<string, any>) => void;
  onReadStateChange?: (payload: Record<string, any>) => void;
  onAttachmentChange?: (payload: Record<string, any>) => void;
  onPinChange?: (payload: Record<string, any>) => void;
  onConversationChange?: (payload: Record<string, any>) => void;
  onRoomChange?: (payload: Record<string, any>) => void;
  onEphemeral?: (payload: Record<string, any>) => void;
};

type InboxTable = 'messages' | 'conversations' | 'participants' | 'requests' | 'friendships' | 'blocks';
const activeTimers = new Set<ReturnType<typeof setInterval>>();

export async function subscribeToConversationRealtime(
  conversationId: string,
  _token: string,
  callbacks: MessagingRealtimeCallbacks,
) {
  callbacks.onState?.('connecting');
  let stopped = false;
  let running = false;
  let since = new Date(Date.now() - 5_000).toISOString();
  let connected = false;

  const poll = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const snapshot = await getMessagingRealtimeSnapshot(conversationId, since);
      since = snapshot.now || new Date().toISOString();
      if (!connected) {
        connected = true;
        callbacks.onState?.('connected');
      }
      callbacks.onMessageChange?.({ source: 'postgres-poll', conversationId });
      for (const event of snapshot.events || []) {
        callbacks.onEphemeral?.({ new: event, eventType: 'INSERT' });
      }
    } catch {
      callbacks.onState?.('error');
    } finally {
      running = false;
    }
  };
  await poll();
  const timer = setInterval(() => void poll(), 2_000);
  activeTimers.add(timer);
  return () => {
    stopped = true;
    clearInterval(timer);
    activeTimers.delete(timer);
    callbacks.onState?.('disconnected');
  };
}

export async function publishConversationEphemeralEvent(input: {
  conversationId: string;
  userId: string;
  token: string;
  type: 'typing' | 'recording' | 'presence';
  active: boolean;
}) {
  await publishMessagingEphemeral({
    conversationId: input.conversationId,
    type: input.type,
    active: input.active,
  });
}

export async function subscribeToMessagingInboxRealtime(
  _token: string,
  _userId: string,
  onChange: (table: InboxTable) => void,
) {
  const emit = () => {
    (['messages', 'conversations', 'participants', 'requests', 'friendships', 'blocks'] as InboxTable[])
      .forEach(onChange);
  };
  const timer = setInterval(emit, 4_000);
  activeTimers.add(timer);
  return () => {
    clearInterval(timer);
    activeTimers.delete(timer);
  };
}

export async function disposeMessagingRealtime() {
  for (const timer of activeTimers) clearInterval(timer);
  activeTimers.clear();
}
