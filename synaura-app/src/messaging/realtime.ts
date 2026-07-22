import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { getMessagingRealtimeConfig } from '@/api/client';

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

let configPromise: ReturnType<typeof getMessagingRealtimeConfig> | null = null;
let activeClient: SupabaseClient | null = null;
let activeToken = '';
let clientBuildPromise: Promise<SupabaseClient> | null = null;
let clientBuildToken = '';
let clientEpoch = 0;
type InboxTable = 'messages' | 'conversations' | 'participants' | 'requests' | 'friendships' | 'blocks';
let inboxChannel: RealtimeChannel | null = null;
let inboxChannelKey = '';
const inboxListeners = new Set<(table: InboxTable) => void>();
let inboxCloseTimer: ReturnType<typeof setTimeout> | null = null;

async function messagingClient(token: string) {
  if (activeClient && activeToken === token) return activeClient;
  if (clientBuildPromise) {
    if (clientBuildToken === token) return clientBuildPromise;
    await clientBuildPromise.catch(() => {});
    return messagingClient(token);
  }

  const epoch = clientEpoch;
  clientBuildToken = token;
  const build = (async () => {
    if (activeClient) await activeClient.removeAllChannels().catch(() => {});
    activeClient = null;
    activeToken = '';
    inboxChannel = null;
    inboxChannelKey = '';
    inboxListeners.clear();
    if (!configPromise) configPromise = getMessagingRealtimeConfig().catch((error) => {
      configPromise = null;
      throw error;
    });
    const config = await configPromise;
    const client = createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: `Bearer ${token}` } },
      realtime: { params: { eventsPerSecond: 20 } },
    });
    await Promise.resolve(client.realtime.setAuth(token));
    if (epoch !== clientEpoch) {
      await client.removeAllChannels().catch(() => {});
      throw new Error('Messaging realtime reset');
    }
    activeClient = client;
    activeToken = token;
    return client;
  })();
  clientBuildPromise = build;
  try {
    return await build;
  } finally {
    if (clientBuildPromise === build) {
      clientBuildPromise = null;
      clientBuildToken = '';
    }
  }
}

export async function subscribeToConversationRealtime(
  conversationId: string,
  token: string,
  callbacks: MessagingRealtimeCallbacks,
) {
  callbacks.onState?.('connecting');
  const client = await messagingClient(token);
  const filter = `conversation_id=eq.${conversationId}`;
  const channel: RealtimeChannel = client
    .channel(`messaging:${conversationId}:${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter }, (payload) => callbacks.onMessageChange?.(payload as any))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter }, (payload) => callbacks.onReactionChange?.(payload as any))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter }, (payload) => callbacks.onReadStateChange?.(payload as any))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_attachments', filter }, (payload) => callbacks.onAttachmentChange?.(payload as any))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_pins', filter }, (payload) => callbacks.onPinChange?.(payload as any))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` }, (payload) => callbacks.onConversationChange?.(payload as any))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_rooms', filter }, (payload) => callbacks.onRoomChange?.(payload as any))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_realtime_events', filter }, (payload) => callbacks.onEphemeral?.(payload as any));

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') callbacks.onState?.('connected');
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') callbacks.onState?.('error');
    else if (status === 'CLOSED') callbacks.onState?.('disconnected');
  });

  return () => {
    void client.removeChannel(channel).catch(() => {});
  };
}

export async function publishConversationEphemeralEvent(input: {
  conversationId: string;
  userId: string;
  token: string;
  type: 'typing' | 'recording' | 'presence';
  active: boolean;
}) {
  const client = await messagingClient(input.token);
  const { error } = await client.from('conversation_realtime_events').insert({
    conversation_id: input.conversationId,
    user_id: input.userId,
    event_type: input.type,
    payload: { active: input.active },
    expires_at: new Date(Date.now() + (input.active ? 45_000 : 2_000)).toISOString(),
  });
  if (error) throw error;
}

export async function subscribeToMessagingInboxRealtime(
  token: string,
  userId: string,
  onChange: (table: InboxTable) => void,
) {
  const client = await messagingClient(token);
  const key = `${activeToken}:${userId}`;
  if (inboxCloseTimer) clearTimeout(inboxCloseTimer);
  if (inboxChannel && inboxChannelKey !== key) {
    await client.removeChannel(inboxChannel).catch(() => {});
    inboxChannel = null;
    inboxChannelKey = '';
  }
  inboxListeners.add(onChange);
  const emit = (table: InboxTable) => inboxListeners.forEach((listener) => listener(table));
  if (!inboxChannel) {
    inboxChannelKey = key;
    inboxChannel = client
      .channel(`messaging-inbox:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => emit('messages'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => emit('conversations'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => emit('participants'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_requests' }, () => emit('requests'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => emit('friendships'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_blocks' }, () => emit('blocks'));
    inboxChannel.subscribe();
  }
  return () => {
    inboxListeners.delete(onChange);
    if (inboxListeners.size || !inboxChannel) return;
    inboxCloseTimer = setTimeout(() => {
      if (inboxListeners.size || !inboxChannel) return;
      const channel = inboxChannel;
      inboxChannel = null;
      inboxChannelKey = '';
      void client.removeChannel(channel).catch(() => {});
    }, 1_000);
  };
}

export async function disposeMessagingRealtime() {
  clientEpoch += 1;
  const pendingClient = await clientBuildPromise?.catch(() => null);
  if (pendingClient && pendingClient !== activeClient) await pendingClient.removeAllChannels().catch(() => {});
  if (activeClient) await activeClient.removeAllChannels().catch(() => {});
  clientBuildPromise = null;
  clientBuildToken = '';
  activeClient = null;
  activeToken = '';
  inboxChannel = null;
  inboxChannelKey = '';
  inboxListeners.clear();
  if (inboxCloseTimer) clearTimeout(inboxCloseTimer);
  inboxCloseTimer = null;
}
