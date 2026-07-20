import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Video from 'react-native-video';
import {
  blockMessageUser,
  createConversationRoom,
  deleteConversationRoom,
  deleteConversationMessage,
  getConversationMessages,
  markConversationSeen,
  reactToConversationMessage,
  removeMessageContact,
  sendConversationMessage,
  updateConversationState,
  updateConversationPreferences,
  uploadMessageMedia,
  type MessageMediaType,
  type MessagingMessage,
  type MessagingConversationPreferences,
  type MessagingReactionName,
  type MessagingUser,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { MessagingAvatar } from '@/components/messaging/MessagingAvatar';
import { MotionPressable } from '@/components/motion/Motion';
import { usePlayer } from '@/player/PlayerProvider';
import { openInternalLink } from '@/navigation/internalLinks';
import { messagingKeys } from '@/messaging/useMessagingUnread';
import {
  clearPreferredConversationBubble,
  hasConversationBubblePermission,
  hideConversationBubble,
  requestConversationBubblePermission,
  setPreferredConversationBubble,
  supportsConversationBubble,
} from '@/messaging/conversationBubble';
import { useVoiceMessageRecorder } from '@/messaging/useVoiceMessageRecorder';
import { colors, radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const REACTIONS: Array<{ value: MessagingReactionName; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'heart', label: 'J’aime', icon: 'heart-outline' },
  { value: 'fire', label: 'Fort', icon: 'flame-outline' },
  { value: 'wow', label: 'Waouh', icon: 'sparkles-outline' },
  { value: 'support', label: 'Soutien', icon: 'hand-left-outline' },
  { value: 'laugh', label: 'Drôle', icon: 'happy-outline' },
];

const THEME_OPTIONS: Array<{ key: MessagingConversationPreferences['themeKey']; label: string; color: string }> = [
  { key: 'aura', label: 'Aura', color: '#7357C6' },
  { key: 'ocean', label: 'Onde', color: '#4A9EAA' },
  { key: 'coral', label: 'Corail', color: '#D96D63' },
  { key: 'rose', label: 'Velours', color: '#C85D82' },
  { key: 'graphite', label: 'Graphite', color: '#111111' },
];

const BACKGROUND_OPTIONS: Array<{ key: MessagingConversationPreferences['backgroundKey']; label: string }> = [
  { key: 'quiet', label: 'Calme' },
  { key: 'aurora', label: 'Aura' },
  { key: 'cover', label: 'Pochette' },
  { key: 'midnight', label: 'Minuit' },
];

function mergeMessages(previous: MessagingMessage[], incoming: MessagingMessage[]) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
}

function clock(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function dayKey(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : value;
}

function dayLabel(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
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

function messagePreview(message: MessagingMessage) {
  if (message.deleted) return 'Message supprimé';
  if (message.type === 'text') return message.content || 'Message';
  if (message.type === 'audio') return 'Message vocal';
  if (message.type === 'image') return 'Photo';
  if (message.type === 'video') return 'Vidéo';
  return message.content || `Contenu ${message.type}`;
}

function recentlyActive(user?: MessagingUser | null) {
  if (!user?.lastSeen) return false;
  const timestamp = new Date(user.lastSeen).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < 5 * 60_000;
}

function recordingClock(durationMillis: number) {
  const seconds = Math.max(0, Math.floor(durationMillis / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ConversationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const conversationId = String(route.params?.conversationId || '');
  const auth = useAuth();
  const player = usePlayer();
  const layout = useResponsiveLayout();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<MessagingMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<MessagingMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessagingMessage | null>(null);
  const [reactionBurst, setReactionBurst] = useState<{ id: string; reaction: MessagingReactionName } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const [muted, setMuted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const [audioPositions, setAudioPositions] = useState<Record<string, { current: number; duration: number }>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    const value = route.params?.roomId;
    return typeof value === 'string' && value ? value : null;
  });
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [preferenceDraft, setPreferenceDraft] = useState<MessagingConversationPreferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [roomCreatorOpen, setRoomCreatorOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'text' | 'voice_notes'>('text');
  const [roomBusy, setRoomBusy] = useState(false);
  const initializedRef = useRef(false);
  const initialScrollPendingRef = useRef(false);
  const nearBottomRef = useRef(true);
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const reactionBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRoomRef = useRef<string | null>(null);
  const bubblePermissionPendingRef = useRef(false);

  const conversationQuery = useQuery({
    queryKey: [...messagingKeys.conversation(conversationId), activeRoomId],
    queryFn: () => getConversationMessages(conversationId, null, activeRoomId),
    enabled: Boolean(auth.user && auth.token && conversationId),
    staleTime: 2_000,
    retry: 1,
  });

  useEffect(() => {
    const data = conversationQuery.data;
    if (!data) return;
    const responseRoomId = data.conversation.activeRoomId || null;
    if (!activeRoomId && responseRoomId) setActiveRoomId(responseRoomId);
    if (loadedRoomRef.current !== responseRoomId) {
      loadedRoomRef.current = responseRoomId;
      initializedRef.current = false;
      initialScrollPendingRef.current = true;
      setMessages(data.messages);
    } else {
      setMessages((previous) => mergeMessages(previous, data.messages));
    }
    setHasMore(data.hasMore);
    setNextCursor(data.nextCursor);
    setMuted(Boolean(data.conversation.muted));
    const currentUserId = auth.user?.id;
    if (currentUserId && data.messages.some((message) => (
      message.sender.id !== currentUserId && !message.seenBy.includes(currentUserId)
    ))) {
      void markConversationSeen(conversationId)
        .then(() => queryClient.invalidateQueries({ queryKey: messagingKeys.unread() }))
        .catch(() => {});
    }
  }, [auth.user?.id, conversationId, conversationQuery.data, queryClient]);

  useEffect(() => {
    if (!messages.length || initializedRef.current) return;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, [messages.length]);

  useEffect(() => () => {
    if (reactionBurstTimerRef.current) clearTimeout(reactionBurstTimerRef.current);
  }, []);

  useFocusEffect(useCallback(() => {
    if (!auth.user || !auth.token || !conversationId) return undefined;
    void conversationQuery.refetch();
    const timer = setInterval(() => void conversationQuery.refetch(), 4_000);
    return () => clearInterval(timer);
  }, [auth.token, auth.user?.id, conversationId]));

  const conversation = conversationQuery.data?.conversation;
  const other = conversation?.otherUser;
  const canMessage = Boolean(conversation?.canMessage && !conversation?.blocked);
  const ownId = auth.user?.id || '';
  const lastOwnMessageId = useMemo(() => [...messages].reverse().find((message) => message.sender.id === ownId && !message.deleted)?.id, [messages, ownId]);
  const preferences = conversation?.preferences;
  const accentColor = preferences?.accentColor || colors.violet;
  const room = conversation?.rooms?.find((item) => item.id === (activeRoomId || conversation.activeRoomId));
  const ownRole = conversation?.participantRoles?.find((item) => item.userId === ownId)?.role || 'member';
  const canManageRooms = conversation?.type === 'group' && (ownRole === 'owner' || ownRole === 'moderator');
  const conversationTitle = preferences?.nickname || other?.name || conversation?.name || conversation?.participants.map((item) => item.name).join(', ') || 'Discussion';

  const voiceRecorder = useVoiceMessageRecorder({
    disabled: sending || uploading || !canMessage,
    onBeforeRecord: () => player.pause().catch(() => {}),
    onError: setErrorMessage,
  });

  useEffect(() => {
    if (!customizeOpen || !preferences) return;
    setPreferenceDraft(preferences);
  }, [customizeOpen, preferences]);

  useEffect(() => {
    if (!supportsConversationBubble() || !ownId || !conversationId || !preferences) return;
    if (preferences?.bubbleEnabled) {
      void setPreferredConversationBubble({ userId: ownId, conversationId, title: conversationTitle, accentColor, avatarUrl: conversation?.avatarUrl || other?.avatar || null });
    } else {
      void clearPreferredConversationBubble(conversationId);
    }
  }, [accentColor, conversation?.avatarUrl, conversationId, conversationTitle, other?.avatar, ownId, preferences?.bubbleEnabled]);

  useEffect(() => {
    if (!supportsConversationBubble()) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !bubblePermissionPendingRef.current) return;
      bubblePermissionPendingRef.current = false;
      void hasConversationBubblePermission().then((allowed) => {
        if (!allowed) {
          setErrorMessage('L’autorisation de bulle n’a pas été accordée.');
          return;
        }
        setPreferenceDraft((current) => current ? { ...current, bubbleEnabled: true } : current);
        setErrorMessage('');
      });
    });
    return () => subscription.remove();
  }, []);

  const invalidateInbox = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: messagingKeys.inbox() }),
    queryClient.invalidateQueries({ queryKey: messagingKeys.unread() }),
  ]);

  const send = async (input: Parameters<typeof sendConversationMessage>[1]) => {
    const message = await sendConversationMessage(conversationId, {
      ...input,
      replyToId: input.replyToId === undefined ? replyingTo?.id || null : input.replyToId,
      roomId: activeRoomId || conversation?.activeRoomId || null,
    });
    setMessages((previous) => mergeMessages(previous, [message]));
    setReplyingTo(null);
    nearBottomRef.current = true;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    void invalidateInbox();
  };

  const sendText = async () => {
    const content = draft.trim();
    if (!content || sending || !canMessage) return;
    setDraft('');
    setSending(true);
    setErrorMessage('');
    try {
      await send({ type: 'text', content });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      setDraft(content);
      setErrorMessage(error instanceof Error ? error.message : 'Message non envoyé');
    } finally {
      setSending(false);
    }
  };

  const uploadAndSendMedia = async (
    asset: { uri: string; name: string; type: string; size?: number | null },
    type: MessageMediaType,
    duration?: number,
  ) => {
    if (uploading || !canMessage) return false;
    setAttachmentOpen(false);
    setUploading(true);
    setUploadProgress(0);
    setErrorMessage('');
    try {
      const uploaded = await uploadMessageMedia(asset, type, { onProgress: setUploadProgress });
      await send({
        type,
        mediaUrl: uploaded.url,
        metadata: { duration: Number(uploaded.duration || duration || 0) },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Pièce jointe non envoyée');
      return false;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const pickVisual = async (type: 'image' | 'video') => {
    if (uploading || !canMessage) return;
    setAttachmentOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage(type === 'image' ? 'Autorise l’accès aux photos pour envoyer une image.' : 'Autorise l’accès aux vidéos pour envoyer un clip.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [type === 'image' ? 'images' : 'videos'],
      allowsEditing: false,
      quality: type === 'image' ? 0.86 : 1,
      selectionLimit: 1,
      videoMaxDuration: 90,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadAndSendMedia({
      uri: asset.uri,
      name: asset.fileName || `synaura-message-${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
      type: asset.mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
      size: asset.fileSize,
    }, type, type === 'video' && asset.duration ? asset.duration / 1_000 : undefined);
  };

  const pickAudio = async () => {
    if (uploading || !canMessage) return;
    setAttachmentOpen(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await uploadAndSendMedia({
      uri: asset.uri,
      name: asset.name || `synaura-audio-${Date.now()}.m4a`,
      type: asset.mimeType || 'audio/mp4',
      size: asset.size,
    }, 'audio');
  };

  const sendVoiceDraft = async () => {
    const voice = voiceRecorder.draft;
    if (!voice || uploading) return;
    setVoicePreviewPlaying(false);
    const sent = await uploadAndSendMedia({
      uri: voice.uri,
      name: `vocal-synaura-${Date.now()}.m4a`,
      type: 'audio/mp4',
    }, 'audio', voice.durationMs / 1_000);
    if (sent) voiceRecorder.consumeDraft();
  };

  const savePreferences = async () => {
    if (!preferenceDraft || savingPreferences) return;
    setSavingPreferences(true);
    setErrorMessage('');
    try {
      await updateConversationPreferences(conversationId, preferenceDraft);
      if (preferenceDraft.bubbleEnabled) {
        await setPreferredConversationBubble({ userId: ownId, conversationId, title: conversationTitle, accentColor: preferenceDraft.accentColor, avatarUrl: conversation?.avatarUrl || other?.avatar || null });
      } else {
        await clearPreferredConversationBubble(conversationId);
        await hideConversationBubble().catch(() => {});
      }
      setCustomizeOpen(false);
      await conversationQuery.refetch();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Personnalisation impossible');
    } finally {
      setSavingPreferences(false);
    }
  };

  const toggleBubbleDraft = async (enabled: boolean) => {
    if (!preferenceDraft) return;
    if (enabled) {
      const allowed = await requestConversationBubblePermission();
      if (!allowed) {
        bubblePermissionPendingRef.current = true;
        setErrorMessage('Autorise “Afficher par-dessus les autres applications”. La bulle sera cochée à ton retour.');
        return;
      }
    } else {
      await hideConversationBubble().catch(() => {});
    }
    setPreferenceDraft({ ...preferenceDraft, bubbleEnabled: enabled });
  };

  const openCustomization = () => {
    setPreferenceDraft(preferences ? { ...preferences } : null);
    setMenuOpen(false);
    setTimeout(() => setCustomizeOpen(true), Platform.OS === 'android' ? 120 : 0);
  };

  const createRoom = async () => {
    if (!roomName.trim() || roomBusy) return;
    setRoomBusy(true);
    try {
      const created = await createConversationRoom(conversationId, roomName, roomType);
      setRoomName('');
      setRoomCreatorOpen(false);
      setActiveRoomId(created.id);
      loadedRoomRef.current = null;
      setMessages([]);
      await conversationQuery.refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Salon impossible à créer');
    } finally {
      setRoomBusy(false);
    }
  };

  const removeRoom = async (roomId: string) => {
    if (roomBusy) return;
    setRoomBusy(true);
    try {
      const replacementRoomId = await deleteConversationRoom(conversationId, roomId);
      if (activeRoomId === roomId) setActiveRoomId(replacementRoomId || null);
      loadedRoomRef.current = null;
      setMessages([]);
      await conversationQuery.refetch();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Suppression impossible');
    } finally {
      setRoomBusy(false);
    }
  };

  const selectRoom = (roomId: string) => {
    if (roomId === activeRoomId) return;
    setActiveRoomId(roomId);
    loadedRoomRef.current = null;
    initializedRef.current = false;
    initialScrollPendingRef.current = true;
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
  };

  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await getConversationMessages(conversationId, nextCursor, activeRoomId || conversation?.activeRoomId || null);
      setMessages((previous) => mergeMessages(page.messages, previous));
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Messages précédents indisponibles');
    } finally {
      setLoadingOlder(false);
    }
  };

  const chooseReaction = async (reaction: MessagingReactionName, targetMessage?: MessagingMessage) => {
    const message = targetMessage || actionMessage;
    if (!message) return;
    const existing = message.reactions.find((item) => item.userId === ownId);
    const remove = existing?.reaction === reaction;
    setActionMessage(null);
    setMessages((previous) => previous.map((item) => item.id === message.id ? {
      ...item,
      reactions: remove
        ? item.reactions.filter((entry) => entry.userId !== ownId)
        : [...item.reactions.filter((entry) => entry.userId !== ownId), { userId: ownId, reaction }],
    } : item));
    try {
      await reactToConversationMessage(conversationId, message.id, remove ? null : reaction);
      if (!remove) {
        setReactionBurst({ id: message.id, reaction });
        if (reactionBurstTimerRef.current) clearTimeout(reactionBurstTimerRef.current);
        reactionBurstTimerRef.current = setTimeout(() => setReactionBurst(null), 620);
      }
      void Haptics.selectionAsync().catch(() => {});
    } catch {
      void conversationQuery.refetch();
      setErrorMessage('La réaction n’a pas pu être enregistrée.');
    }
  };

  const startReply = (message: MessagingMessage) => {
    setActionMessage(null);
    setReplyingTo(message);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 90);
  };

  const handleMessageTap = (message: MessagingMessage) => {
    if (message.deleted) return;
    const now = Date.now();
    if (lastTapRef.current?.id === message.id && now - lastTapRef.current.at < 280) {
      lastTapRef.current = null;
      void chooseReaction('heart', message);
      return;
    }
    lastTapRef.current = { id: message.id, at: now };
  };

  const deleteMessage = async () => {
    if (!actionMessage || actionMessage.sender.id !== ownId) return;
    const id = actionMessage.id;
    setActionMessage(null);
    try {
      await deleteConversationMessage(conversationId, id);
      setMessages((previous) => previous.map((message) => message.id === id ? { ...message, type: 'deleted', deleted: true, content: 'Message supprimé', mediaUrl: null, reactions: [] } : message));
      void invalidateInbox();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Suppression impossible');
    }
  };

  const updateConversation = async (action: 'archive' | 'mute' | 'unmute') => {
    setMenuOpen(false);
    try {
      await updateConversationState(conversationId, action);
      if (action === 'archive') navigation.replace('Messages');
      else setMuted(action === 'mute');
      void invalidateInbox();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action impossible');
    }
  };

  const runDangerAction = async () => {
    if (!other || !confirmAction) return;
    try {
      if (confirmAction === 'block') await blockMessageUser(other.id);
      else await removeMessageContact(other.id);
      setConfirmAction(null);
      await invalidateInbox();
      navigation.replace('Messages');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action impossible');
    }
  };

  const openSharedMessage = async (message: MessagingMessage) => {
    const metadataUrl = typeof message.metadata?.url === 'string' ? message.metadata.url : '';
    const fallback = message.sharedEntityId
      ? `/${message.type === 'track' ? 'track' : message.type}/${message.sharedEntityId}`
      : '';
    if (metadataUrl || fallback) await openInternalLink(navigation, metadataUrl || fallback, { playTrack: player.playTrack });
  };

  if (conversationQuery.isLoading) {
    return <View style={styles.loader}><ActivityIndicator color={colors.violet} /></View>;
  }

  if (conversationQuery.isError || !conversation) {
    return <View style={styles.screen}><ConversationHeader navigation={navigation} user={null} title="Discussion" subtitle="Indisponible" onMenu={() => {}} layout={layout} /><View style={styles.center}><Text style={styles.emptyTitle}>Discussion indisponible</Text><Text style={styles.emptyText}>{conversationQuery.error instanceof Error ? conversationQuery.error.message : 'Réessaie dans un instant.'}</Text><MotionPressable style={styles.secondaryButtonWide} onPress={() => void conversationQuery.refetch()}><Text style={styles.secondaryButtonText}>Réessayer</Text></MotionPressable></View></View>;
  }

  const renderMessage = ({ item: message, index }: ListRenderItemInfo<MessagingMessage>) => {
    const own = message.sender.id === ownId;
    const previous = messages[index - 1];
    const startsGroup = !previous || previous.sender.id !== message.sender.id || new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() > 5 * 60_000;
    const startsDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
    const replyTarget = message.replyToId ? messages.find((item) => item.id === message.replyToId) : null;
    const groupedReactions = REACTIONS.map((definition) => ({
      ...definition,
      users: message.reactions.filter((reaction) => reaction.reaction === definition.value),
    })).filter((group) => group.users.length);
    return (
      <>
      {startsDay ? <View style={styles.dayDivider}><View style={styles.dayDividerLine} /><Text style={styles.dayDividerText}>{dayLabel(message.createdAt)}</Text><View style={styles.dayDividerLine} /></View> : null}
      <SwipeToReply accentColor={accentColor} onReply={() => startReply(message)}>
      <View style={[styles.messageRow, own && styles.messageRowOwn, startsGroup && index > 0 && styles.messageGroupStart]}>
        {!own ? <View style={styles.avatarSlot}>{startsGroup ? <MessagingAvatar user={message.sender} size={28} /> : null}</View> : null}
        <View style={[styles.messageColumn, own && styles.messageColumnOwn]}>
          {startsGroup && !own ? <Text style={styles.senderName}>{message.sender.name}</Text> : null}
          {message.replyToId ? <View style={[styles.replySnippet, own && styles.replySnippetOwn]}><Text numberOfLines={1} style={[styles.replySnippetAuthor, own && styles.replySnippetTextOwn]}>{message.replyTo?.senderName || replyTarget?.sender.name || 'Message'}</Text><Text numberOfLines={1} style={[styles.replySnippetText, own && styles.replySnippetTextOwn]}>{message.replyTo?.content || (replyTarget ? messagePreview(replyTarget) : 'Message précédent')}</Text></View> : null}
          <Pressable onPress={() => handleMessageTap(message)} delayLongPress={260} onLongPress={() => { setActionMessage(message); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}>
            <NativeMessageBubble
              message={message}
              own={own}
              accentColor={accentColor}
              playing={playingAudioId === message.id}
              onPlayAudio={() => {
                if (playingAudioId !== message.id) void player.pause().catch(() => {});
                setPlayingAudioId((current) => current === message.id ? null : message.id);
              }}
              audioPosition={audioPositions[message.id] || { current: 0, duration: Number(message.metadata?.duration || 0) }}
              onAudioProgress={(current, duration) => setAudioPositions((positions) => ({ ...positions, [message.id]: { current, duration } }))}
              onAudioEnd={() => {
                setPlayingAudioId(null);
                setAudioPositions((positions) => ({ ...positions, [message.id]: { current: 0, duration: positions[message.id]?.duration || Number(message.metadata?.duration || 0) } }));
              }}
              onImage={() => setImagePreview(message.mediaUrl || message.content)}
              onShared={() => void openSharedMessage(message)}
            />
            {reactionBurst?.id === message.id ? <ReactionBurst accentColor={accentColor} reaction={reactionBurst.reaction} /> : null}
          </Pressable>
          {groupedReactions.length ? <View style={[styles.reactionSummary, own && styles.reactionSummaryOwn]}>{groupedReactions.map((group) => { const selected = group.users.some((entry) => entry.userId === ownId); return <Pressable key={group.value} onPress={() => void chooseReaction(group.value, message)} style={[styles.reactionChip, selected && styles.reactionChipSelected]}><Ionicons name={group.icon} size={12} color={selected ? colors.violet : colors.textSecondary} /><Text style={[styles.reactionCount, selected && styles.reactionCountSelected]}>{group.users.length}</Text></Pressable>; })}</View> : null}
          <View style={[styles.timeRow, own && styles.timeRowOwn]}><Text style={styles.time}>{clock(message.createdAt)}</Text>{own && message.id === lastOwnMessageId ? <Ionicons name={message.seenBy.some((id) => id !== ownId) ? 'checkmark-done' : 'checkmark'} size={13} color={message.seenBy.some((id) => id !== ownId) ? colors.cyan : colors.textTertiary} /> : null}</View>
        </View>
      </View>
      </SwipeToReply>
      </>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <ConversationBackdrop preferences={preferences} fallbackImage={conversation.avatarUrl || other?.avatar || null} />
      <ConversationHeader navigation={navigation} user={other || null} title={conversationTitle} subtitle={room ? `# ${room.name}${room.type === 'voice_notes' ? ' · vocaux asynchrones' : ''}` : other ? (recentlyActive(other) ? 'Actif récemment' : `@${other.username}`) : 'Groupe Synaura'} onMenu={() => setMenuOpen(true)} layout={layout} accentColor={accentColor} />
      {conversation.type === 'group' && conversation.rooms?.length ? (
        <View style={styles.roomBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.roomBarContent, { paddingHorizontal: layout.gutter }]}>
            {conversation.rooms.map((item) => {
              const selected = item.id === (activeRoomId || conversation.activeRoomId);
              return <MotionPressable key={item.id} onPress={() => selectRoom(item.id)} style={[styles.roomChip, selected && { borderColor: accentColor, backgroundColor: `${accentColor}22` }]}><Ionicons name={item.type === 'voice_notes' ? 'mic-outline' : 'chatbubble-outline'} size={13} color={selected ? accentColor : colors.textSecondary} /><Text style={[styles.roomChipText, selected && { color: accentColor }]}>#{item.name}</Text></MotionPressable>;
            })}
            {canManageRooms ? <MotionPressable accessibilityLabel="Créer un salon" onPress={() => setRoomCreatorOpen(true)} style={styles.roomAdd}><Ionicons name="add" size={17} color={colors.text} /></MotionPressable> : null}
          </ScrollView>
        </View>
      ) : null}
      {errorMessage ? <Pressable onPress={() => setErrorMessage('')} style={[styles.errorBanner, layout.contentFrame, { marginHorizontal: layout.gutter }]}><Ionicons name="alert-circle-outline" size={17} color={colors.coral} /><Text style={styles.errorText}>{errorMessage}</Text><Ionicons name="close" size={16} color={colors.textTertiary} /></Pressable> : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messages, layout.contentFrame, { paddingHorizontal: layout.gutter }, !messages.length && styles.messagesEmpty]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (initialScrollPendingRef.current || !initializedRef.current) {
            listRef.current?.scrollToEnd({ animated: false });
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
            initialScrollPendingRef.current = false;
            initializedRef.current = true;
            return;
          }
          if (nearBottomRef.current) {
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
          }
        }}
        onLayout={() => { if (initialScrollPendingRef.current) listRef.current?.scrollToEnd({ animated: false }); }}
        onScroll={({ nativeEvent }) => {
          nearBottomRef.current = nativeEvent.contentSize.height - nativeEvent.contentOffset.y - nativeEvent.layoutMeasurement.height < 120;
        }}
        scrollEventThrottle={32}
        ListHeaderComponent={hasMore ? <MotionPressable disabled={loadingOlder || !nextCursor} onPress={() => void loadOlder()} style={styles.olderButton}>{loadingOlder ? <ActivityIndicator size="small" color={colors.violet} /> : <Text style={styles.olderButtonText}>Messages précédents</Text>}</MotionPressable> : null}
        ListEmptyComponent={<View style={styles.center}><View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={25} color={colors.violet} /></View><Text style={styles.emptyTitle}>Une discussion qui commence par la musique</Text><Text style={styles.emptyText}>Partage un son, un contexte ou simplement ce que tu as envie de dire.</Text></View>}
        initialNumToRender={50}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(layout.insets.bottom, 10) }]}>
        <View style={[styles.composerFrame, layout.contentFrame, { paddingHorizontal: layout.gutter }]}>
          {!canMessage ? <View style={styles.cannotSend}><Text style={styles.cannotSendText}>{conversation.blocked ? 'Cette discussion est bloquée.' : 'Vous devez être amis pour continuer cette discussion.'}</Text></View> : (
            <>
              {replyingTo ? <View style={styles.replyComposer}><View style={[styles.replyComposerMark, { backgroundColor: accentColor }]} /><View style={styles.replyComposerCopy}><Text numberOfLines={1} style={[styles.replyComposerAuthor, { color: accentColor }]}>Réponse à {replyingTo.sender.id === ownId ? 'toi' : replyingTo.sender.name}</Text><Text numberOfLines={1} style={styles.replyComposerText}>{messagePreview(replyingTo)}</Text></View><MotionPressable accessibilityLabel="Annuler la réponse" onPress={() => setReplyingTo(null)} style={styles.replyComposerClose}><Ionicons name="close" size={17} color={colors.textSecondary} /></MotionPressable></View> : null}
              {voiceRecorder.phase === 'preview' && voiceRecorder.draft ? (
                <View style={styles.voicePreviewRow}>
                  <MotionPressable accessibilityLabel="Supprimer le vocal" onPress={() => { setVoicePreviewPlaying(false); void voiceRecorder.discardDraft(); }} style={styles.voiceUtilityButton}><Ionicons name="trash-outline" size={18} color={colors.coral} /></MotionPressable>
                  <MotionPressable accessibilityLabel={voicePreviewPlaying ? 'Mettre en pause' : 'Écouter le vocal'} onPress={() => setVoicePreviewPlaying((value) => !value)} style={[styles.voicePreviewPlay, { backgroundColor: accentColor }]}><Ionicons name={voicePreviewPlaying ? 'pause' : 'play'} size={18} color={colors.paper} /></MotionPressable>
                  <View style={styles.voicePreviewCopy}><View style={styles.voiceBars}>{Array.from({ length: 22 }, (_, index) => <View key={index} style={[styles.voiceBar, { height: 5 + ((index * 11) % 17), backgroundColor: index < 14 ? accentColor : colors.textTertiary }]} />)}</View><Text style={styles.voicePreviewDuration}>{recordingClock(voiceRecorder.durationMs)}</Text></View>
                  <MotionPressable accessibilityLabel="Réenregistrer" onPress={() => { setVoicePreviewPlaying(false); void voiceRecorder.discardDraft(); }} style={styles.voiceUtilityButton}><Ionicons name="refresh" size={18} color={colors.textSecondary} /></MotionPressable>
                  <MotionPressable accessibilityLabel="Envoyer le vocal" disabled={uploading} onPress={() => void sendVoiceDraft()} style={[styles.sendButton, { backgroundColor: accentColor }, uploading && styles.sendButtonDisabled]}>{uploading ? <ActivityIndicator size="small" color={colors.paper} /> : <Ionicons name="arrow-up" size={20} color={colors.paper} />}</MotionPressable>
                  <Video source={{ uri: voiceRecorder.draft.uri }} paused={!voicePreviewPlaying} onEnd={() => setVoicePreviewPlaying(false)} onError={() => { setVoicePreviewPlaying(false); setErrorMessage('Aperçu audio indisponible.'); }} style={styles.hiddenAudio} />
                </View>
              ) : (
                <View style={styles.composerRow}>
                  {voiceRecorder.phase === 'recording' ? (
                    <View style={[styles.voiceRecordingPanel, voiceRecorder.cancelArmed && styles.voiceRecordingCancel]}>
                      <View style={[styles.recordingDot, { backgroundColor: voiceRecorder.cancelArmed ? colors.coral : accentColor }]} />
                      <View style={styles.voiceRecordingCopy}><Text style={[styles.voiceRecordingTime, voiceRecorder.cancelArmed && { color: colors.coral }]}>{recordingClock(voiceRecorder.durationMs)}</Text><Text numberOfLines={1} style={styles.voiceRecordingHint}>{voiceRecorder.cancelArmed ? 'Relâche pour supprimer' : voiceRecorder.locked ? 'Enregistrement verrouillé' : 'Glisse à gauche pour annuler · en haut pour verrouiller'}</Text></View>
                      {voiceRecorder.locked ? <Ionicons name="lock-closed" size={16} color={accentColor} /> : <Ionicons name="arrow-up" size={16} color={colors.textTertiary} />}
                    </View>
                  ) : (
                    <>
                      <MotionPressable accessibilityLabel="Ajouter une pièce jointe" disabled={uploading} onPress={() => setAttachmentOpen(true)} style={[styles.attachButton, uploading && styles.disabled]}>{uploading ? <ActivityIndicator size="small" color={accentColor} /> : <Ionicons name="add" size={22} color={colors.textSecondary} />}</MotionPressable>
                      <View style={styles.inputShell}><TextInput ref={inputRef} value={draft} onChangeText={(value) => setDraft(value.slice(0, 2_000))} placeholder={room?.type === 'voice_notes' ? 'Ajoute un contexte au vocal…' : 'Écrire un message…'} placeholderTextColor={colors.textTertiary} multiline maxLength={2_000} style={styles.input} maxFontSizeMultiplier={1.2} /></View>
                    </>
                  )}
                  {draft.trim() && voiceRecorder.phase === 'idle' ? (
                    <MotionPressable accessibilityLabel="Envoyer" disabled={sending || uploading} onPress={() => void sendText()} style={[styles.sendButton, { backgroundColor: accentColor }, (sending || uploading) && styles.sendButtonDisabled]}>{sending ? <ActivityIndicator size="small" color={colors.paper} /> : <Ionicons name="arrow-up" size={20} color={colors.paper} />}</MotionPressable>
                  ) : voiceRecorder.locked ? (
                    <MotionPressable accessibilityLabel="Arrêter l’enregistrement" onPress={() => void voiceRecorder.stop()} style={[styles.sendButton, { backgroundColor: colors.coral }]}><Ionicons name="stop" size={18} color={colors.paper} /></MotionPressable>
                  ) : (
                    <View accessibilityLabel="Maintenir pour enregistrer" accessible key="voice-hold" {...voiceRecorder.panHandlers} style={[styles.sendButton, { backgroundColor: voiceRecorder.phase === 'recording' ? (voiceRecorder.cancelArmed ? colors.coral : accentColor) : colors.text }]}><Ionicons name={voiceRecorder.phase === 'recording' ? 'mic' : 'mic-outline'} size={20} color={colors.paper} /></View>
                  )}
                </View>
              )}
              {uploading ? <View style={styles.uploadStatus}><View style={styles.uploadTrack}><View style={[styles.uploadValue, { width: `${Math.max(5, Math.round(uploadProgress * 100))}%` }]} /></View><Text style={styles.uploadText}>Envoi {Math.round(uploadProgress * 100)} %</Text></View> : null}
            </>
          )}
        </View>
      </View>

      <Modal transparent visible={attachmentOpen} animationType="fade" onRequestClose={() => setAttachmentOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setAttachmentOpen(false)}>
          <Pressable style={[styles.actionSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Ajouter à la discussion</Text>
            <View style={styles.attachmentGrid}>
              <AttachmentOption icon="image-outline" label="Photo" tint={colors.violet} onPress={() => void pickVisual('image')} />
              <AttachmentOption icon="videocam-outline" label="Vidéo" tint={colors.coral} onPress={() => void pickVisual('video')} />
              <AttachmentOption icon="musical-note-outline" label="Audio" tint={colors.cyan} onPress={() => void pickAudio()} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={Boolean(actionMessage)} animationType="fade" onRequestClose={() => setActionMessage(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionMessage(null)}>
          <Pressable style={[styles.actionSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Message</Text>
            {actionMessage ? <SheetRow icon="return-up-back-outline" label="Répondre" onPress={() => startReply(actionMessage)} /> : null}
            {actionMessage?.type === 'text' && actionMessage.content ? <SheetRow icon="copy-outline" label="Copier le texte" onPress={() => { void Clipboard.setStringAsync(actionMessage.content); setActionMessage(null); }} /> : null}
            <Text style={styles.reactionSectionLabel}>Ajouter une réaction</Text>
            <View style={styles.reactionPicker}>{REACTIONS.map((reaction) => { const selected = actionMessage?.reactions.some((item) => item.userId === ownId && item.reaction === reaction.value); return <MotionPressable key={reaction.value} accessibilityLabel={reaction.label} onPress={() => void chooseReaction(reaction.value)} style={[styles.reactionButton, selected && styles.reactionButtonSelected]}><Ionicons name={reaction.icon} size={22} color={selected ? colors.violet : colors.text} /><Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>{reaction.label}</Text></MotionPressable>; })}</View>
            {actionMessage?.sender.id === ownId && !actionMessage.deleted ? <MotionPressable onPress={() => void deleteMessage()} style={styles.sheetDangerRow}><Ionicons name="trash-outline" size={19} color={colors.coral} /><Text style={styles.sheetDangerText}>Supprimer le message</Text></MotionPressable> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.actionSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <SheetRow icon="color-palette-outline" label="Personnaliser la discussion" onPress={openCustomization} />
            {other ? <SheetRow icon="person-outline" label="Voir le profil" onPress={() => { setMenuOpen(false); navigation.navigate('PublicProfile', { username: other.username }); }} /> : null}
            <SheetRow icon={muted ? 'notifications-outline' : 'notifications-off-outline'} label={muted ? 'Réactiver les notifications' : 'Mettre en sourdine'} onPress={() => void updateConversation(muted ? 'unmute' : 'mute')} />
            <SheetRow icon="archive-outline" label="Archiver la discussion" onPress={() => void updateConversation('archive')} />
            {other ? <SheetRow icon="person-remove-outline" label="Retirer de mes amis" danger onPress={() => { setMenuOpen(false); setConfirmAction('remove'); }} /> : null}
            {other ? <SheetRow icon="ban-outline" label="Bloquer" danger onPress={() => { setMenuOpen(false); setConfirmAction('block'); }} /> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={customizeOpen} animationType="slide" onRequestClose={() => setCustomizeOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setCustomizeOpen(false)}>
          <Pressable style={[styles.customizeSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.customizeHeader}><View><Text style={styles.sheetTitle}>Ta discussion, ton ambiance</Text><Text style={styles.customizeSubtitle}>Ces réglages ne changent que ton affichage.</Text></View><MotionPressable accessibilityLabel="Fermer" onPress={() => setCustomizeOpen(false)} style={styles.headerButton}><Ionicons name="close" size={19} color={colors.text} /></MotionPressable></View>
            {preferenceDraft ? <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.settingLabel}>Nom chez toi</Text>
              <View style={styles.settingInputShell}><TextInput value={preferenceDraft.nickname || ''} onChangeText={(nickname) => setPreferenceDraft({ ...preferenceDraft, nickname: nickname.slice(0, 48) || null })} placeholder={other?.name || conversation.name || 'Nom de la discussion'} placeholderTextColor={colors.textTertiary} style={styles.settingInput} /></View>

              <Text style={styles.settingLabel}>Couleur</Text>
              <View style={styles.themeGrid}>{THEME_OPTIONS.map((option) => { const selected = preferenceDraft.themeKey === option.key; return <MotionPressable key={option.key} onPress={() => setPreferenceDraft({ ...preferenceDraft, themeKey: option.key, accentColor: option.color as MessagingConversationPreferences['accentColor'] })} style={[styles.themeOption, selected && { borderColor: option.color, backgroundColor: `${option.color}18` }]}><View style={[styles.themeSwatch, { backgroundColor: option.color }]} /><Text style={[styles.themeLabel, selected && { color: option.color }]}>{option.label}</Text>{selected ? <Ionicons name="checkmark" size={15} color={option.color} /> : null}</MotionPressable>; })}</View>

              <Text style={styles.settingLabel}>Fond</Text>
              <View style={styles.backgroundGrid}>{BACKGROUND_OPTIONS.map((option) => { const selected = preferenceDraft.backgroundKey === option.key; return <MotionPressable key={option.key} onPress={() => setPreferenceDraft({ ...preferenceDraft, backgroundKey: option.key })} style={[styles.backgroundOption, selected && { borderColor: preferenceDraft.accentColor }]}><LinearGradient colors={option.key === 'quiet' ? ['#171717', '#111111'] : option.key === 'aurora' ? [preferenceDraft.accentColor, '#4A9EAA'] : option.key === 'cover' ? ['#D96D63', '#7357C6'] : ['#111111', '#050505']} style={StyleSheet.absoluteFill} /><Text style={styles.backgroundLabel}>{option.label}</Text>{selected ? <Ionicons name="checkmark-circle" size={17} color={colors.paper} /> : null}</MotionPressable>; })}</View>

              {supportsConversationBubble() ? <MotionPressable onPress={() => void toggleBubbleDraft(!preferenceDraft.bubbleEnabled)} style={styles.toggleRow}><View style={styles.toggleIcon}><Ionicons name="chatbubble-ellipses-outline" size={19} color={preferenceDraft.accentColor} /></View><View style={styles.toggleCopy}><Text style={styles.toggleTitle}>Bulle hors de Synaura</Text><Text style={styles.toggleText}>Elle apparaît quand Synaura passe en arrière-plan et rouvre cette discussion.</Text></View><View style={[styles.toggleTrack, preferenceDraft.bubbleEnabled && { backgroundColor: preferenceDraft.accentColor }]}><View style={[styles.toggleThumb, preferenceDraft.bubbleEnabled && styles.toggleThumbOn]} /></View></MotionPressable> : null}

              {conversation.type === 'group' ? <View style={styles.roomsSettings}><View style={styles.roomsSettingsHeader}><View><Text style={styles.settingLabelNoMargin}>Salons</Text><Text style={styles.customizeSubtitle}>Messages et vocaux restent asynchrones.</Text></View>{canManageRooms ? <MotionPressable onPress={() => setRoomCreatorOpen(true)} style={[styles.compactAction, { backgroundColor: preferenceDraft.accentColor }]}><Ionicons name="add" size={16} color={colors.paper} /><Text style={styles.compactActionText}>Ajouter</Text></MotionPressable> : null}</View>{conversation.rooms?.map((item) => <View key={item.id} style={styles.roomSettingRow}><Ionicons name={item.type === 'voice_notes' ? 'mic-outline' : 'chatbubble-outline'} size={17} color={colors.textSecondary} /><Text style={styles.roomSettingName}>#{item.name}</Text><Text style={styles.roomSettingType}>{item.type === 'voice_notes' ? 'Vocaux' : 'Texte'}</Text>{canManageRooms && (conversation.rooms?.length || 0) > 1 ? <MotionPressable accessibilityLabel={`Supprimer ${item.name}`} disabled={roomBusy} onPress={() => void removeRoom(item.id)} style={styles.roomDelete}><Ionicons name="trash-outline" size={16} color={colors.coral} /></MotionPressable> : null}</View>)}</View> : null}
            </ScrollView> : null}
            <MotionPressable disabled={!preferenceDraft || savingPreferences} onPress={() => void savePreferences()} style={[styles.savePreferences, { backgroundColor: preferenceDraft?.accentColor || accentColor }, savingPreferences && styles.disabled]}>{savingPreferences ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.savePreferencesText}>Enregistrer</Text>}</MotionPressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={roomCreatorOpen} animationType="fade" onRequestClose={() => setRoomCreatorOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRoomCreatorOpen(false)}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Nouveau salon</Text>
            <Text style={styles.confirmText}>Un espace dédié à un sujet ou aux messages vocaux.</Text>
            <View style={[styles.settingInputShell, { marginTop: spacing.lg }]}><TextInput autoFocus value={roomName} onChangeText={(value) => setRoomName(value.slice(0, 40))} placeholder="Nom du salon" placeholderTextColor={colors.textTertiary} style={styles.settingInput} /></View>
            <View style={styles.roomTypeRow}><MotionPressable onPress={() => setRoomType('text')} style={[styles.roomTypeOption, roomType === 'text' && { borderColor: accentColor, backgroundColor: `${accentColor}18` }]}><Ionicons name="chatbubble-outline" size={18} color={roomType === 'text' ? accentColor : colors.textSecondary} /><Text style={styles.roomTypeText}>Messages</Text></MotionPressable><MotionPressable onPress={() => setRoomType('voice_notes')} style={[styles.roomTypeOption, roomType === 'voice_notes' && { borderColor: accentColor, backgroundColor: `${accentColor}18` }]}><Ionicons name="mic-outline" size={18} color={roomType === 'voice_notes' ? accentColor : colors.textSecondary} /><Text style={styles.roomTypeText}>Vocaux</Text></MotionPressable></View>
            <View style={styles.confirmActions}><MotionPressable style={styles.secondaryButton} onPress={() => setRoomCreatorOpen(false)}><Text style={styles.secondaryButtonText}>Annuler</Text></MotionPressable><MotionPressable disabled={!roomName.trim() || roomBusy} style={[styles.dangerButton, { backgroundColor: accentColor }, (!roomName.trim() || roomBusy) && styles.disabled]} onPress={() => void createRoom()}>{roomBusy ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.dangerButtonText}>Créer</Text>}</MotionPressable></View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={Boolean(confirmAction)} animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmAction(null)}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <Text style={styles.confirmTitle}>{confirmAction === 'block' ? `Bloquer ${other?.name} ?` : `Retirer ${other?.name} de tes amis ?`}</Text>
            <Text style={styles.confirmText}>{confirmAction === 'block' ? 'Cette personne ne pourra plus t’envoyer de demande ni de message.' : 'Vous devrez accepter une nouvelle demande avant de pouvoir vous écrire à nouveau.'}</Text>
            <View style={styles.confirmActions}><MotionPressable style={styles.secondaryButton} onPress={() => setConfirmAction(null)}><Text style={styles.secondaryButtonText}>Annuler</Text></MotionPressable><MotionPressable style={styles.dangerButton} onPress={() => void runDangerAction()}><Text style={styles.dangerButtonText}>Confirmer</Text></MotionPressable></View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent={false} visible={Boolean(imagePreview)} animationType="fade" onRequestClose={() => setImagePreview(null)}>
        <View style={styles.imagePreview}><Image source={imagePreview ? { uri: imagePreview } : undefined} contentFit="contain" style={StyleSheet.absoluteFill} /><Pressable accessibilityLabel="Fermer" onPress={() => setImagePreview(null)} style={[styles.previewClose, { top: layout.insets.top + spacing.sm }]}><Ionicons name="close" size={22} color={colors.paper} /></Pressable></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ConversationBackdrop({ preferences, fallbackImage }: { preferences?: MessagingConversationPreferences; fallbackImage?: string | null }) {
  const background = preferences?.backgroundKey || 'quiet';
  const accent = preferences?.accentColor || '#7357C6';
  const image = preferences?.wallpaperUrl || fallbackImage;
  if (background === 'quiet') return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdropQuiet]} />;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {background === 'cover' && image ? <Image source={{ uri: image }} contentFit="cover" blurRadius={34} style={[StyleSheet.absoluteFill, styles.backdropImage]} /> : null}
    <LinearGradient
      colors={background === 'midnight' ? ['rgba(5,5,5,0.98)', `${accent}28`, 'rgba(5,5,5,0.99)'] : background === 'cover' ? ['rgba(13,13,13,0.52)', `${accent}35`, 'rgba(13,13,13,0.96)'] : [`${accent}3D`, 'rgba(74,158,170,0.16)', 'rgba(13,13,13,0.96)']}
      locations={[0, 0.48, 1]}
      style={StyleSheet.absoluteFill}
    />
  </View>;
}

function ConversationHeader({ navigation, user, title, subtitle, onMenu, layout, accentColor = colors.violet }: { navigation: any; user: MessagingUser | null; title: string; subtitle: string; onMenu: () => void; layout: ReturnType<typeof useResponsiveLayout>; accentColor?: string }) {
  return <View style={[styles.header, { paddingTop: layout.insets.top + 6 }]}><View style={[styles.headerFrame, layout.contentFrame, { paddingHorizontal: layout.gutter }]}><MotionPressable accessibilityLabel="Retour" onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="chevron-back" size={21} color={colors.text} /></MotionPressable>{user ? <Pressable onPress={() => navigation.navigate('PublicProfile', { username: user.username })}><MessagingAvatar user={user} size={40} active={recentlyActive(user)} /></Pressable> : <View style={[styles.groupAvatar, { backgroundColor: `${accentColor}28` }]}><Ionicons name="people" size={19} color={accentColor} /></View>}<Pressable disabled={!user} onPress={() => user && navigation.navigate('PublicProfile', { username: user.username })} style={styles.headerCopy}><Text numberOfLines={1} style={styles.headerTitle}>{title}</Text><Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text></Pressable><MotionPressable accessibilityLabel="Options de la discussion" onPress={onMenu} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={20} color={colors.text} /></MotionPressable></View></View>;
}

function NativeMessageBubble({ message, own, accentColor, playing, audioPosition, onPlayAudio, onAudioProgress, onAudioEnd, onImage, onShared }: { message: MessagingMessage; own: boolean; accentColor: string; playing: boolean; audioPosition: { current: number; duration: number }; onPlayAudio: () => void; onAudioProgress: (current: number, duration: number) => void; onAudioEnd: () => void; onImage: () => void; onShared: () => void }) {
  const audioRef = useRef<any>(null);
  const mediaUrl = message.mediaUrl || message.content;
  const ownAccent = own ? { backgroundColor: accentColor } : null;
  if (message.deleted) return <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther, ownAccent]}><Text style={[styles.deletedText, own && styles.bubbleTextOwn]}>Message supprimé</Text></View>;
  if (message.type === 'image') return <Pressable onPress={onImage} style={[styles.mediaBubble, own ? styles.bubbleOwn : styles.bubbleOther, ownAccent]}><Image source={{ uri: mediaUrl }} contentFit="cover" transition={120} style={styles.messageImage} /></Pressable>;
  if (message.type === 'video') return <View style={[styles.mediaBubble, own ? styles.bubbleOwn : styles.bubbleOther, ownAccent]}><Video source={{ uri: mediaUrl }} controls paused resizeMode="contain" style={styles.messageVideo} /></View>;
  if (message.type === 'audio') {
    const progress = audioPosition.duration > 0 ? Math.min(1, audioPosition.current / audioPosition.duration) : 0;
    return <Pressable onPress={onPlayAudio} style={[styles.audioBubble, own ? styles.bubbleOwn : styles.bubbleOther, ownAccent]}><View style={[styles.audioPlay, own && styles.audioPlayOwn]}><Ionicons name={playing ? 'pause' : 'play'} size={17} color={own ? accentColor : colors.background} /></View><View style={styles.audioCopy}><View style={styles.audioTitleRow}><Text style={[styles.audioTitle, own && styles.bubbleTextOwn]}>Message audio</Text>{audioPosition.duration > 0 ? <Text style={[styles.audioDuration, own && styles.sharedSubtitleOwn]}>{recordingClock((playing ? audioPosition.current : audioPosition.duration) * 1_000)}</Text> : null}</View><View style={[styles.audioProgress, own && styles.audioProgressOwn]}><View style={[styles.audioProgressValue, { width: `${Math.round(progress * 100)}%` as `${number}%`, backgroundColor: own ? colors.paper : accentColor }]} /></View></View>{playing ? <Video ref={audioRef} source={{ uri: mediaUrl }} paused={false} onLoad={() => { if (audioPosition.current > 0.25) audioRef.current?.seek(audioPosition.current); }} onProgress={({ currentTime, seekableDuration }) => onAudioProgress(currentTime, seekableDuration || audioPosition.duration)} onEnd={onAudioEnd} onError={onAudioEnd} progressUpdateInterval={250} style={styles.hiddenAudio} /> : null}</Pressable>;
  }
  if (['track', 'clip', 'post', 'playlist'].includes(message.type)) {
    const cover = typeof message.metadata?.coverUrl === 'string' ? message.metadata.coverUrl : '';
    const title = String(message.metadata?.title || (message.type === 'track' ? 'Son partagé' : message.type === 'clip' ? 'Clip partagé' : message.type === 'playlist' ? 'Playlist partagée' : 'Post partagé'));
    const subtitle = String(message.metadata?.artistName || message.metadata?.subtitle || 'Synaura');
    return <Pressable onPress={onShared} style={[styles.sharedBubble, own ? styles.bubbleOwn : styles.bubbleOther, ownAccent]}>{cover ? <Image source={{ uri: cover }} contentFit="cover" style={styles.sharedCover} /> : <View style={styles.sharedCoverFallback}><Ionicons name="musical-notes" size={20} color={own ? colors.paper : accentColor} /></View>}<View style={styles.sharedCopy}><Text numberOfLines={1} style={[styles.sharedTitle, own && styles.bubbleTextOwn]}>{title}</Text><Text numberOfLines={1} style={[styles.sharedSubtitle, own && styles.sharedSubtitleOwn]}>{subtitle}</Text></View><View style={[styles.sharedPlay, own && styles.sharedPlayOwn]}><Ionicons name="play" size={14} color={own ? accentColor : colors.background} /></View></Pressable>;
  }
  return <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther, ownAccent]}><Text selectable style={[styles.bubbleText, own && styles.bubbleTextOwn]}>{message.content}</Text></View>;
}

function SheetRow({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return <MotionPressable onPress={onPress} style={styles.sheetRow}><Ionicons name={icon} size={19} color={danger ? colors.coral : colors.textSecondary} /><Text style={[styles.sheetRowText, danger && styles.sheetDangerText]}>{label}</Text><Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /></MotionPressable>;
}

function AttachmentOption({ icon, label, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) {
  return <MotionPressable accessibilityLabel={label} onPress={onPress} style={styles.attachmentOption}><View style={[styles.attachmentIcon, { backgroundColor: `${tint}20` }]}><Ionicons name={icon} size={23} color={tint} /></View><Text style={styles.attachmentLabel}>{label}</Text></MotionPressable>;
}

function SwipeToReply({ children, onReply, accentColor }: { children: React.ReactNode; onReply: () => void; accentColor: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(0, Math.min(68, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx >= 48) onReply();
      Animated.spring(translateX, { toValue: 0, damping: 18, stiffness: 240, mass: 0.7, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
  }), [onReply, translateX]);
  const iconScale = translateX.interpolate({ inputRange: [0, 48, 68], outputRange: [0.6, 1, 1.08], extrapolate: 'clamp' });
  const iconOpacity = translateX.interpolate({ inputRange: [0, 22, 48], outputRange: [0, 0.5, 1], extrapolate: 'clamp' });
  return <View style={styles.swipeShell}><Animated.View pointerEvents="none" style={[styles.swipeReplyIcon, { backgroundColor: `${accentColor}22`, opacity: iconOpacity, transform: [{ scale: iconScale }] }]}><Ionicons name="return-up-back" size={16} color={accentColor} /></Animated.View><Animated.View style={{ transform: [{ translateX }] }} {...responder.panHandlers}>{children}</Animated.View></View>;
}

function ReactionBurst({ accentColor, reaction }: { accentColor: string; reaction: MessagingReactionName }) {
  const progress = useRef(new Animated.Value(0)).current;
  const icon = REACTIONS.find((entry) => entry.value === reaction)?.icon || 'heart';
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 560, useNativeDriver: true }).start();
  }, [progress]);
  return <Animated.View pointerEvents="none" style={[styles.reactionBurst, {
    opacity: progress.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, -34] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0.45, 1.25, 0.95] }) },
    ],
  }]}><Ionicons name={icon} size={30} color={accentColor} /></Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  backdropQuiet: { backgroundColor: colors.background },
  backdropImage: { opacity: 0.42, transform: [{ scale: 1.12 }] },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { zIndex: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.background },
  headerFrame: { width: '100%', height: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  groupAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  headerSubtitle: { marginTop: 2, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  roomBar: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.background },
  roomBarContent: { alignItems: 'center', gap: 7, paddingVertical: 7 },
  roomChip: { height: 33, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomChipText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  roomAdd: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong },
  errorBanner: { minHeight: 40, marginTop: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.coralSoft, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorText: { flex: 1, color: colors.coral, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  messages: { width: '100%', flexGrow: 1, justifyContent: 'flex-end', paddingTop: spacing.lg, paddingBottom: spacing.md },
  messagesEmpty: { justifyContent: 'center' },
  olderButton: { minHeight: 38, alignSelf: 'center', marginBottom: spacing.lg, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  olderButtonText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  dayDivider: { minHeight: 34, marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  dayDividerText: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', textTransform: 'capitalize' },
  swipeShell: { position: 'relative', width: '100%' },
  swipeReplyIcon: { position: 'absolute', left: 8, top: '50%', width: 34, height: 34, marginTop: -17, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageGroupStart: { marginTop: spacing.sm },
  avatarSlot: { width: 28, minHeight: 1 },
  messageColumn: { maxWidth: '80%', alignItems: 'flex-start' },
  messageColumnOwn: { alignItems: 'flex-end' },
  senderName: { marginBottom: 4, marginLeft: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  replySnippet: { maxWidth: 250, marginBottom: 3, borderLeftWidth: 3, borderLeftColor: colors.violet, borderRadius: 8, backgroundColor: colors.surfaceMuted, paddingHorizontal: 9, paddingVertical: 6 },
  replySnippetOwn: { borderLeftColor: colors.paper, backgroundColor: 'rgba(255,255,255,0.14)' },
  replySnippetAuthor: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  replySnippetText: { marginTop: 1, color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  replySnippetTextOwn: { color: colors.paper },
  bubble: { maxWidth: '100%', minHeight: 36, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleOwn: { backgroundColor: colors.violet, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  bubbleTextOwn: { color: colors.paper },
  deletedText: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontWeight: '600' },
  mediaBubble: { overflow: 'hidden', borderRadius: 15, padding: 3 },
  messageImage: { width: 238, maxWidth: '100%', height: 260, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  messageVideo: { width: 238, maxWidth: '100%', height: 260, borderRadius: 12, backgroundColor: colors.black },
  audioBubble: { minWidth: 220, minHeight: 58, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  audioPlay: { width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  audioPlayOwn: { backgroundColor: colors.paper },
  audioCopy: { flex: 1, minWidth: 0 },
  audioTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  audioTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  audioDuration: { color: colors.textSecondary, fontSize: 8, fontVariant: ['tabular-nums'], fontWeight: '800' },
  audioProgress: { height: 3, marginTop: 7, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.surfaceMuted },
  audioProgressOwn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  audioProgressValue: { height: '100%', borderRadius: 2, backgroundColor: colors.cyan },
  hiddenAudio: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  sharedBubble: { minWidth: 248, maxWidth: 310, minHeight: 68, borderRadius: 15, padding: 7, flexDirection: 'row', alignItems: 'center', gap: 9 },
  sharedCover: { width: 54, height: 54, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  sharedCoverFallback: { width: 54, height: 54, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  sharedCopy: { flex: 1, minWidth: 0 },
  sharedTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  sharedSubtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  sharedSubtitleOwn: { color: 'rgba(255,255,255,0.68)' },
  sharedPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  sharedPlayOwn: { backgroundColor: colors.paper },
  reactionSummary: { marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  reactionSummaryOwn: { justifyContent: 'flex-end' },
  reactionChip: { height: 23, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 3 },
  reactionChipSelected: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  reactionCount: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  reactionCountSelected: { color: colors.violet },
  reactionBurst: { position: 'absolute', alignSelf: 'center', top: '18%', zIndex: 12 },
  timeRow: { minHeight: 14, marginTop: 2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeRowOwn: { justifyContent: 'flex-end' },
  time: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background, paddingTop: 9 },
  composerFrame: { width: '100%' },
  replyComposer: { minHeight: 49, marginBottom: 7, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingRight: 5, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  replyComposerMark: { alignSelf: 'stretch', width: 3 },
  replyComposerCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  replyComposerAuthor: { fontSize: 10, fontWeight: '900' },
  replyComposerText: { marginTop: 2, color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  replyComposerClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  attachButton: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  inputShell: { flex: 1, minHeight: 43, maxHeight: 118, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: 11 },
  input: { minHeight: 41, maxHeight: 112, paddingTop: 10, paddingBottom: 9, color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sendButton: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  sendButtonDisabled: { opacity: 0.28 },
  voiceRecordingPanel: { flex: 1, minHeight: 43, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  voiceRecordingCancel: { borderColor: colors.coral, backgroundColor: colors.coralSoft },
  recordingDot: { width: 9, height: 9, borderRadius: 5 },
  voiceRecordingCopy: { flex: 1, minWidth: 0 },
  voiceRecordingTime: { color: colors.text, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '900' },
  voiceRecordingHint: { marginTop: 2, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  voicePreviewRow: { minHeight: 54, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  voiceUtilityButton: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  voicePreviewPlay: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  voicePreviewCopy: { flex: 1, minWidth: 0 },
  voiceBars: { height: 24, flexDirection: 'row', alignItems: 'center', gap: 2, overflow: 'hidden' },
  voiceBar: { width: 2, minHeight: 3, borderRadius: 1 },
  voicePreviewDuration: { marginTop: 2, color: colors.textTertiary, fontSize: 8, fontVariant: ['tabular-nums'], fontWeight: '800' },
  disabled: { opacity: 0.4 },
  uploadStatus: { minHeight: 19, paddingTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadTrack: { flex: 1, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.surfaceMuted },
  uploadValue: { height: '100%', borderRadius: 2, backgroundColor: colors.cyan },
  uploadText: { width: 60, color: colors.textTertiary, textAlign: 'right', fontSize: 8, fontVariant: ['tabular-nums'], fontWeight: '800' },
  cannotSend: { minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: colors.surfaceMuted },
  cannotSendText: { color: colors.textSecondary, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  center: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  emptyTitle: { marginTop: spacing.md, color: colors.text, textAlign: 'center', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  emptyText: { maxWidth: 330, marginTop: 7, color: colors.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  actionSheet: { width: '100%', maxWidth: 680, alignSelf: 'center', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.elevatedSurface },
  customizeSheet: { width: '100%', maxWidth: 680, maxHeight: '88%', alignSelf: 'center', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: colors.borderStrong, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.elevatedSurface },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md, backgroundColor: colors.textTertiary },
  sheetTitle: { marginBottom: spacing.md, color: colors.text, fontSize: 14, fontWeight: '900' },
  reactionSectionLabel: { marginTop: spacing.sm, marginBottom: 8, color: colors.textTertiary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  customizeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  customizeSubtitle: { marginTop: -6, color: colors.textTertiary, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  settingLabel: { marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: '900' },
  settingLabelNoMargin: { marginBottom: spacing.sm, color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: '900' },
  settingInputShell: { minHeight: 46, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, paddingHorizontal: spacing.md, justifyContent: 'center' },
  settingInput: { minHeight: 44, color: colors.text, fontSize: 13, fontWeight: '700' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  themeOption: { minWidth: '30%', flexGrow: 1, height: 42, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surfaceStrong, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  themeSwatch: { width: 18, height: 18, borderRadius: 9 },
  themeLabel: { flex: 1, color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  backgroundGrid: { flexDirection: 'row', gap: 7 },
  backgroundOption: { flex: 1, height: 72, overflow: 'hidden', borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent', padding: 8, justifyContent: 'flex-end' },
  backgroundLabel: { color: colors.paper, fontSize: 9, fontWeight: '900' },
  toggleRow: { minHeight: 67, marginTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleIcon: { width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  toggleCopy: { flex: 1, minWidth: 0 },
  toggleTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  toggleText: { marginTop: 2, color: colors.textTertiary, fontSize: 8, lineHeight: 12, fontWeight: '600' },
  toggleTrack: { width: 40, height: 23, borderRadius: 12, padding: 3, backgroundColor: colors.surfaceMuted },
  toggleThumb: { width: 17, height: 17, borderRadius: 9, backgroundColor: colors.paper },
  toggleThumbOn: { transform: [{ translateX: 17 }] },
  roomsSettings: { marginTop: spacing.lg },
  roomsSettingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  compactAction: { height: 34, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  compactActionText: { color: colors.paper, fontSize: 9, fontWeight: '900' },
  roomSettingRow: { minHeight: 45, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
  roomSettingName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '900' },
  roomSettingType: { color: colors.textTertiary, fontSize: 8, fontWeight: '800' },
  roomDelete: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  savePreferences: { minHeight: 47, marginTop: spacing.lg, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  savePreferencesText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  roomTypeRow: { marginTop: spacing.md, flexDirection: 'row', gap: 8 },
  roomTypeOption: { flex: 1, minHeight: 48, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  roomTypeText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  attachmentGrid: { flexDirection: 'row', gap: 8 },
  attachmentOption: { flex: 1, minWidth: 0, minHeight: 78, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  attachmentIcon: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachmentLabel: { color: colors.text, fontSize: 9, fontWeight: '900' },
  reactionPicker: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  reactionButton: { flex: 1, minWidth: 0, height: 62, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.surfaceStrong },
  reactionButtonSelected: { borderWidth: 1, borderColor: colors.violet, backgroundColor: colors.violetSoft },
  reactionLabel: { color: colors.textSecondary, fontSize: 8, fontWeight: '800' },
  reactionLabelSelected: { color: colors.violet },
  sheetDangerRow: { minHeight: 50, marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetDangerText: { color: colors.coral },
  sheetRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetRowText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.64)' },
  confirmCard: { width: '100%', maxWidth: 420, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.elevatedSurface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  confirmTitle: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  confirmText: { marginTop: 8, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  confirmActions: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  secondaryButton: { flex: 1, minHeight: 43, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonWide: { minHeight: 43, marginTop: spacing.lg, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  dangerButton: { flex: 1, minHeight: 43, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral },
  dangerButtonText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  imagePreview: { flex: 1, backgroundColor: colors.black },
  previewClose: { position: 'absolute', right: spacing.lg, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.58)' },
});
