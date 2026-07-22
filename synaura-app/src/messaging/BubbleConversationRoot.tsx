import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Video from 'react-native-video';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getConversationMessages,
  markConversationSeen,
  reactToConversationMessage,
  setAuthRefreshHandler,
  setAuthTokenProvider,
  type MessagingMessage,
  type MessagingReactionName,
} from '@/api/client';
import { readConversationCache, writeConversationCache } from '@/messaging/messageCache';
import { createMessageClientId, deliverOutboxMessage, enqueueMessage } from '@/messaging/messageOutbox';
import { subscribeToConversationRealtime } from '@/messaging/realtime';
import { getStoredMobileAccessToken } from '@/notifications/messageNotificationReply';

type BubbleProps = {
  conversationId?: string;
  title?: string;
  accent?: string;
  avatarUrl?: string;
};

type StoredUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  isVerified?: boolean;
};

const REACTIONS: Array<{ value: MessagingReactionName; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'heart', icon: 'heart' },
  { value: 'fire', icon: 'flame' },
  { value: 'wow', icon: 'sparkles' },
  { value: 'support', icon: 'hand-left' },
  { value: 'laugh', icon: 'happy' },
];

function mergeMessages(previous: MessagingMessage[], incoming: MessagingMessage[]) {
  const values = new Map(previous.map((message) => [message.id, message]));
  const localByClient = new Map(previous.filter((message) => message.clientId).map((message) => [message.clientId as string, message.id]));
  incoming.forEach((message) => {
    const localId = message.clientId ? localByClient.get(message.clientId) : null;
    if (localId && localId !== message.id) values.delete(localId);
    values.set(message.id, message);
  });
  return [...values.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function safeAccent(value?: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#7357C6';
}

function clock(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return "Aujourd'hui";
  if (dayKey(value) === dayKey(yesterday.toISOString())) return 'Hier';
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

function optimisticText(content: string, clientId: string, user: StoredUser): MessagingMessage {
  return {
    id: `local:${clientId}`,
    clientId,
    sender: {
      id: user.id,
      name: user.name || user.username || 'Moi',
      username: user.username || 'moi',
      avatar: user.avatar || null,
      isVerified: Boolean(user.isVerified),
      lastSeen: new Date().toISOString(),
    },
    type: 'text',
    content,
    mediaUrl: null,
    attachments: [],
    sharedEntityType: null,
    sharedEntityId: null,
    metadata: {},
    replyToId: null,
    replyTo: null,
    roomId: null,
    seenBy: [user.id],
    reactions: [],
    createdAt: new Date().toISOString(),
    editedAt: null,
    pinned: false,
    deleted: false,
    localState: 'sending',
    localError: null,
  };
}

export function BubbleConversationRoot(props: BubbleProps) {
  return <SafeAreaProvider><BubbleConversation {...props} /></SafeAreaProvider>;
}

function BubbleConversation({ conversationId = '', title = 'Discussion Synaura', accent, avatarUrl }: BubbleProps) {
  const insets = useSafeAreaInsets();
  const color = safeAccent(accent);
  const listRef = useRef<FlashListRef<MessagingMessage>>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [conversationTitle, setConversationTitle] = useState(title);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<MessagingMessage | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) return;
    const page = await getConversationMessages(conversationId);
    setMessages((current) => mergeMessages(current, page.messages));
    setConversationTitle(page.conversation.preferences?.nickname || page.conversation.otherUser?.name || page.conversation.name || title);
    if (user?.id) {
      void writeConversationCache(user.id, conversationId, page.conversation.activeRoomId || null, {
        conversation: page.conversation,
        messages: page.messages,
      }).catch(() => {});
      if (page.messages.some((message) => message.sender.id !== user.id && !message.seenBy.includes(user.id))) {
        void markConversationSeen(conversationId).catch(() => {});
      }
    }
  }, [conversationId, title, user?.id]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      const [token, rawUser] = await Promise.all([
        getStoredMobileAccessToken(),
        AsyncStorage.getItem('synaura.mobile.auth.user'),
      ]);
      if (cancelled) return;
      const storedUser = rawUser ? JSON.parse(rawUser) as StoredUser : null;
      if (!token || !storedUser?.id) {
        setError('Reconnecte-toi dans Synaura pour ouvrir cette discussion.');
        setLoading(false);
        return;
      }
      setUser(storedUser);
      setAuthTokenProvider(() => token);
      setAuthRefreshHandler(async () => {
        const refreshed = await getStoredMobileAccessToken();
        if (refreshed) setAuthTokenProvider(() => refreshed);
        return Boolean(refreshed);
      });
      const cached = await readConversationCache(storedUser.id, conversationId).catch(() => null);
      if (cached && !cancelled) {
        setMessages(cached.messages);
        setConversationTitle(cached.conversation.preferences?.nickname || cached.conversation.otherUser?.name || cached.conversation.name || title);
        setLoading(false);
      }
      await refresh().catch((cause) => {
        if (!cached) setError(cause instanceof Error ? cause.message : 'Discussion indisponible');
      });
      if (cancelled) return;
      setLoading(false);
      unsubscribe = await subscribeToConversationRealtime(conversationId, token, {
        onMessageChange: scheduleRefresh,
        onReactionChange: scheduleRefresh,
        onReadStateChange: (payload) => {
          const participant = payload.new as Record<string, any> | undefined;
          if (participant?.user_id !== storedUser.id) scheduleRefresh();
        },
        onAttachmentChange: scheduleRefresh,
        onPinChange: scheduleRefresh,
      });
    })().catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Discussion indisponible');
      setLoading(false);
    });
    function scheduleRefresh() {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => void refresh().catch(() => {}), 100);
    }
    return () => {
      cancelled = true;
      unsubscribe?.();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [conversationId, refresh, title]);

  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content || !user || sending) return;
    const clientId = createMessageClientId();
    const input = { type: 'text' as const, content, clientId, roomId: null };
    const queued = { conversationId, clientId, input, createdAt: Date.now(), attempts: 0, lastError: null };
    setDraft('');
    setSending(true);
    setError('');
    setMessages((current) => mergeMessages(current, [optimisticText(content, clientId, user)]));
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    await enqueueMessage(user.id, queued);
    try {
      const message = await deliverOutboxMessage(user.id, queued);
      setMessages((current) => mergeMessages(current, [message]));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (cause) {
      setMessages((current) => current.map((message) => message.clientId === clientId ? { ...message, localState: 'failed' } : message));
      setError(cause instanceof Error ? cause.message : 'Message non envoye');
    } finally {
      setSending(false);
    }
  };

  const react = async (reaction: MessagingReactionName) => {
    if (!selectedMessage || !user) return;
    const target = selectedMessage;
    const selected = target.reactions.some((item) => item.userId === user.id && item.reaction === reaction);
    setSelectedMessage(null);
    setMessages((current) => current.map((message) => message.id === target.id ? {
      ...message,
      reactions: selected
        ? message.reactions.filter((item) => item.userId !== user.id)
        : [...message.reactions.filter((item) => item.userId !== user.id), { userId: user.id, reaction }],
    } : message));
    await reactToConversationMessage(conversationId, target.id, selected ? null : reaction).catch(() => void refresh());
  };

  const openFullConversation = () => Linking.openURL(`synaura://messages/${encodeURIComponent(conversationId)}`).catch(() => {});

  const empty = useMemo(() => !loading && !messages.length, [loading, messages.length]);
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
      <Pressable accessibilityLabel="Reduire" onPress={() => BackHandler.exitApp()} style={styles.iconButton}><Ionicons name="chevron-down" size={21} color="#F7F6F3" /></Pressable>
      {avatarUrl ? <Image source={{ uri: avatarUrl }} contentFit="cover" style={[styles.avatar, { borderColor: color }]} /> : <View style={[styles.avatarFallback, { backgroundColor: color }]}><Text style={styles.avatarLetter}>{conversationTitle.trim().slice(0, 1).toUpperCase() || 'S'}</Text></View>}
      <View style={styles.headerCopy}><Text numberOfLines={1} style={styles.title}>{conversationTitle}</Text><Text style={styles.subtitle}>Conversation Synaura</Text></View>
      <Pressable accessibilityLabel="Ouvrir dans Synaura" onPress={() => void openFullConversation()} style={styles.iconButton}><Ionicons name="expand-outline" size={19} color="#F7F6F3" /></Pressable>
    </View>

    {error ? <Pressable onPress={() => setError('')} style={styles.error}><Ionicons name="alert-circle-outline" size={15} color="#D96D63" /><Text numberOfLines={2} style={styles.errorText}>{error}</Text></Pressable> : null}
    {loading && !messages.length ? <View style={styles.center}><ActivityIndicator color={color} /></View> : null}
    {empty ? <View style={styles.center}><Ionicons name="chatbubble-ellipses-outline" size={27} color={color} /><Text style={styles.emptyTitle}>La discussion commence ici</Text></View> : null}
    {messages.length ? <FlashList
      ref={listRef}
      data={messages}
      keyExtractor={(message) => message.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.25 }}
      drawDistance={720}
      renderItem={({ item, index }) => {
        const own = item.sender.id === user?.id;
        const previous = messages[index - 1];
        const grouped = previous?.sender.id === item.sender.id && new Date(item.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60_000;
        const startsDay = !previous || dayKey(previous.createdAt) !== dayKey(item.createdAt);
        return <>
          {startsDay ? <View style={styles.dayDivider}><View style={styles.dayLine} /><Text style={styles.dayText}>{dayLabel(item.createdAt)}</Text><View style={styles.dayLine} /></View> : null}
          <View style={[styles.messageRow, own && styles.messageRowOwn, !grouped && styles.messageGroup]}>
          <View style={[styles.messageColumn, own && styles.messageColumnOwn]}>
            {!own && !grouped ? <Text style={styles.sender}>{item.sender.name}</Text> : null}
            <Pressable delayLongPress={300} onLongPress={() => { setSelectedMessage(item); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}>
              {item.replyTo ? <View style={[styles.replyPreview, own && { borderLeftColor: '#F7F6F3' }]}><Text numberOfLines={1} style={styles.replyName}>{item.replyTo.senderName}</Text><Text numberOfLines={1} style={styles.replyText}>{item.replyTo.content || 'Contenu partage'}</Text></View> : null}
              <BubbleMessage message={item} own={own} accent={color} onOpen={openFullConversation} />
            </Pressable>
            <View style={[styles.meta, own && styles.metaOwn]}><Text style={styles.time}>{clock(item.createdAt)}{item.editedAt ? ' · modifie' : ''}</Text>{item.localState === 'sending' ? <ActivityIndicator size={8} color="#8A858C" /> : item.localState === 'failed' ? <Ionicons name="alert-circle" size={11} color="#D96D63" /> : own ? <Ionicons name="checkmark-done" size={12} color={item.seenBy.some((id) => id !== user?.id) ? '#4A9EAA' : '#8A858C'} /> : null}</View>
            {item.reactions.length ? <View style={[styles.reactionSummary, own && styles.metaOwn]}>{REACTIONS.map((reaction) => { const count = item.reactions.filter((value) => value.reaction === reaction.value).length; return count ? <View key={reaction.value} style={styles.reactionChip}><Ionicons name={reaction.icon} size={11} color={color} /><Text style={styles.reactionCount}>{count}</Text></View> : null; })}</View> : null}
          </View>
          </View>
        </>;
      }}
    /> : null}

    {selectedMessage ? <Pressable style={styles.reactionOverlay} onPress={() => setSelectedMessage(null)}><Pressable onPress={() => {}} style={styles.reactionMenu}>{REACTIONS.map((reaction) => <Pressable key={reaction.value} onPress={() => void react(reaction.value)} style={styles.reactionButton}><Ionicons name={reaction.icon} size={24} color={selectedMessage.reactions.some((item) => item.userId === user?.id && item.reaction === reaction.value) ? color : '#F7F6F3'} /></Pressable>)}</Pressable></Pressable> : null}

    <View style={[styles.composer, { paddingBottom: Math.max(8, insets.bottom) }]}>
      <Pressable accessibilityLabel="Ouvrir toutes les options" onPress={() => void openFullConversation()} style={styles.addButton}><Ionicons name="add" size={22} color="#B9B4BC" /></Pressable>
      <View style={styles.inputShell}><TextInput value={draft} onChangeText={(value) => setDraft(value.slice(0, 2_000))} multiline maxLength={2_000} placeholder="Ecrire un message..." placeholderTextColor="#79747C" style={styles.input} selectionColor={color} /></View>
      <Pressable disabled={!draft.trim() || sending} onPress={() => void send()} style={[styles.send, { backgroundColor: draft.trim() ? color : '#29262B' }]}>{sending ? <ActivityIndicator size="small" color="#F7F6F3" /> : <Ionicons name="arrow-up" size={19} color="#F7F6F3" />}</Pressable>
    </View>
  </KeyboardAvoidingView>;
}

function BubbleMessage({ message, own, accent, onOpen }: { message: MessagingMessage; own: boolean; accent: string; onOpen: () => void }) {
  const mediaUrl = message.mediaUrl || message.attachments[0]?.url || '';
  if (message.deleted) return <View style={[styles.bubble, own ? { backgroundColor: accent } : styles.otherBubble]}><Text style={styles.deleted}>Message supprime</Text></View>;
  if (message.type === 'image') return <View style={[styles.mediaBubble, own ? { backgroundColor: accent } : styles.otherBubble]}><Image source={{ uri: mediaUrl }} contentFit="cover" style={styles.photo} /></View>;
  if (message.type === 'video') return <View style={[styles.mediaBubble, own ? { backgroundColor: accent } : styles.otherBubble]}><Video source={{ uri: mediaUrl }} controls paused resizeMode="contain" style={styles.video} /></View>;
  if (message.type === 'audio') return <BubbleAudio url={mediaUrl} own={own} accent={accent} duration={Number(message.metadata?.duration || 0)} />;
  if (['track', 'clip', 'post', 'playlist'].includes(message.type)) {
    const cover = typeof message.metadata?.coverUrl === 'string' ? message.metadata.coverUrl : '';
    return <Pressable onPress={onOpen} style={[styles.shared, own ? { backgroundColor: accent } : styles.otherBubble]}>{cover ? <Image source={{ uri: cover }} contentFit="cover" style={styles.sharedCover} /> : <View style={styles.sharedCoverFallback}><Ionicons name="musical-notes" size={18} color={own ? '#F7F6F3' : accent} /></View>}<View style={styles.sharedCopy}><Text numberOfLines={1} style={styles.sharedTitle}>{String(message.metadata?.title || 'Contenu Synaura')}</Text><Text numberOfLines={1} style={styles.sharedSubtitle}>{String(message.metadata?.artistName || message.metadata?.subtitle || 'Ouvrir dans Synaura')}</Text></View><Ionicons name="arrow-forward-circle" size={22} color="#F7F6F3" /></Pressable>;
  }
  return <View style={[styles.bubble, own ? { backgroundColor: accent } : styles.otherBubble]}><Text selectable style={styles.messageText}>{message.content}</Text></View>;
}

function BubbleAudio({ url, own, accent, duration }: { url: string; own: boolean; accent: string; duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(duration);
  return <View style={[styles.audio, own ? { backgroundColor: accent } : styles.otherBubble]}><Pressable onPress={() => setPlaying((value) => !value)} style={styles.audioPlay}><Ionicons name={playing ? 'pause' : 'play'} size={17} color={accent} /></Pressable><View style={styles.audioCopy}><Text style={styles.audioTitle}>Message vocal</Text><View style={styles.audioTrack}><View style={[styles.audioValue, { width: `${Math.min(100, Math.round(position / Math.max(total, 1) * 100))}%` as `${number}%` }]} /></View></View>{playing ? <Video source={{ uri: url }} paused={false} onProgress={({ currentTime, seekableDuration }) => { setPosition(currentTime); if (seekableDuration) setTotal(seekableDuration); }} onEnd={() => { setPlaying(false); setPosition(0); }} onError={() => setPlaying(false)} progressUpdateInterval={300} style={styles.hiddenMedia} /> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#100F11' },
  header: { minHeight: 66, paddingHorizontal: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2B282D', backgroundColor: '#151316' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242126' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#F7F6F3', fontSize: 16, fontWeight: '900' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: '#F7F6F3', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  subtitle: { marginTop: 2, color: '#8A858C', fontSize: 9, fontWeight: '700' },
  error: { minHeight: 38, marginHorizontal: 10, marginTop: 8, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#2A1818' },
  errorText: { flex: 1, color: '#D96D63', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 10, color: '#F7F6F3', fontSize: 13, fontWeight: '900' },
  list: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 11, paddingVertical: 12 },
  dayDivider: { minHeight: 30, marginVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#353138' },
  dayText: { color: '#8A858C', fontSize: 8, fontWeight: '900', textTransform: 'capitalize' },
  messageRow: { flexDirection: 'row', marginBottom: 3 },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageGroup: { marginTop: 8 },
  messageColumn: { maxWidth: '84%', alignItems: 'flex-start' },
  messageColumnOwn: { alignItems: 'flex-end' },
  sender: { marginLeft: 5, marginBottom: 3, color: '#8A858C', fontSize: 8, fontWeight: '800' },
  replyPreview: { maxWidth: 260, marginHorizontal: 5, marginBottom: 3, borderLeftWidth: 2, borderLeftColor: '#7357C6', paddingLeft: 7 },
  replyName: { color: '#B9B4BC', fontSize: 8, fontWeight: '900' },
  replyText: { marginTop: 1, color: '#777179', fontSize: 8, fontWeight: '700' },
  bubble: { minHeight: 35, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 8 },
  otherBubble: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#353138', backgroundColor: '#242126' },
  messageText: { color: '#F7F6F3', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  deleted: { color: '#8A858C', fontSize: 11, fontStyle: 'italic' },
  mediaBubble: { overflow: 'hidden', borderRadius: 15, padding: 3 },
  photo: { width: 210, height: 190, borderRadius: 12, backgroundColor: '#242126' },
  video: { width: 220, height: 190, borderRadius: 12, backgroundColor: '#050505' },
  shared: { minWidth: 230, maxWidth: 290, minHeight: 64, borderRadius: 15, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sharedCover: { width: 50, height: 50, borderRadius: 9 },
  sharedCoverFallback: { width: 50, height: 50, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  sharedCopy: { flex: 1, minWidth: 0 },
  sharedTitle: { color: '#F7F6F3', fontSize: 10, fontWeight: '900' },
  sharedSubtitle: { marginTop: 3, color: '#D1CDD3', fontSize: 8, fontWeight: '700' },
  audio: { minWidth: 215, minHeight: 55, borderRadius: 15, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioPlay: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3' },
  audioCopy: { flex: 1 },
  audioTitle: { color: '#F7F6F3', fontSize: 9, fontWeight: '900' },
  audioTrack: { height: 3, marginTop: 7, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.22)' },
  audioValue: { height: '100%', backgroundColor: '#F7F6F3' },
  hiddenMedia: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  meta: { minHeight: 14, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaOwn: { justifyContent: 'flex-end' },
  time: { color: '#777179', fontSize: 7, fontWeight: '700' },
  reactionSummary: { marginTop: 2, flexDirection: 'row', gap: 3 },
  reactionChip: { height: 20, borderRadius: 10, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: '#353138', backgroundColor: '#1C191E' },
  reactionCount: { color: '#B9B4BC', fontSize: 8, fontWeight: '900' },
  reactionOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.54)' },
  reactionMenu: { width: 286, height: 62, borderRadius: 31, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: StyleSheet.hairlineWidth, borderColor: '#3A363D', backgroundColor: '#242126' },
  reactionButton: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  composer: { minHeight: 61, paddingTop: 8, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'flex-end', gap: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2B282D', backgroundColor: '#151316' },
  addButton: { width: 41, height: 41, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242126' },
  inputShell: { flex: 1, minHeight: 41, maxHeight: 105, borderRadius: 19, paddingHorizontal: 11, justifyContent: 'center', backgroundColor: '#242126' },
  input: { minHeight: 39, maxHeight: 99, paddingTop: 9, paddingBottom: 8, color: '#F7F6F3', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  send: { width: 41, height: 41, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
