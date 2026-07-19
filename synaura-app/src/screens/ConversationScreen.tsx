import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Video from 'react-native-video';
import {
  blockMessageUser,
  deleteConversationMessage,
  getConversationMessages,
  markConversationSeen,
  reactToConversationMessage,
  removeMessageContact,
  sendConversationMessage,
  updateConversationState,
  uploadMessageMedia,
  type MessageMediaType,
  type MessagingMessage,
  type MessagingReactionName,
  type MessagingUser,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { MessagingAvatar } from '@/components/messaging/MessagingAvatar';
import { MotionPressable } from '@/components/motion/Motion';
import { usePlayer } from '@/player/PlayerProvider';
import { openInternalLink } from '@/navigation/internalLinks';
import { messagingKeys } from '@/messaging/useMessagingUnread';
import { colors, radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const REACTIONS: Array<{ value: MessagingReactionName; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'heart', label: 'J’aime', icon: 'heart-outline' },
  { value: 'fire', label: 'Fort', icon: 'flame-outline' },
  { value: 'wow', label: 'Waouh', icon: 'sparkles-outline' },
  { value: 'support', label: 'Soutien', icon: 'hand-left-outline' },
  { value: 'laugh', label: 'Drôle', icon: 'happy-outline' },
];

function mergeMessages(previous: MessagingMessage[], incoming: MessagingMessage[]) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
}

function clock(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 120);
  const listRef = useRef<FlatList<MessagingMessage>>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<MessagingMessage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'block' | null>(null);
  const [muted, setMuted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPositions, setAudioPositions] = useState<Record<string, { current: number; duration: number }>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const initializedRef = useRef(false);

  const conversationQuery = useQuery({
    queryKey: messagingKeys.conversation(conversationId),
    queryFn: () => getConversationMessages(conversationId),
    enabled: Boolean(auth.user && auth.token && conversationId),
    staleTime: 2_000,
    retry: 1,
  });

  useEffect(() => {
    const data = conversationQuery.data;
    if (!data) return;
    setMessages((previous) => mergeMessages(previous, data.messages));
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
    initializedRef.current = true;
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, [messages.length]);

  useFocusEffect(useCallback(() => {
    if (!auth.user || !auth.token || !conversationId) return undefined;
    void conversationQuery.refetch();
    const timer = setInterval(() => void conversationQuery.refetch(), 4_000);
    return () => clearInterval(timer);
  }, [auth.token, auth.user?.id, conversationId]));

  useEffect(() => () => {
    if (recorder.isRecording) void recorder.stop().catch(() => {});
    void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [recorder]);

  const conversation = conversationQuery.data?.conversation;
  const other = conversation?.otherUser;
  const canMessage = Boolean(conversation?.canMessage && !conversation?.blocked);
  const ownId = auth.user?.id || '';
  const lastOwnMessageId = useMemo(() => [...messages].reverse().find((message) => message.sender.id === ownId && !message.deleted)?.id, [messages, ownId]);

  const invalidateInbox = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: messagingKeys.inbox() }),
    queryClient.invalidateQueries({ queryKey: messagingKeys.unread() }),
  ]);

  const send = async (input: Parameters<typeof sendConversationMessage>[1]) => {
    const message = await sendConversationMessage(conversationId, input);
    setMessages((previous) => mergeMessages(previous, [message]));
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
    if (uploading || !canMessage) return;
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Pièce jointe non envoyée');
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

  const startRecording = async () => {
    if (uploading || recordingBusy || recorderState.isRecording || !canMessage) return;
    setAttachmentOpen(false);
    setRecordingBusy(true);
    setErrorMessage('');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Autorise le microphone pour enregistrer un message vocal.');
      await player.pause().catch(() => {});
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      setErrorMessage(error instanceof Error ? error.message : 'Enregistrement impossible');
    } finally {
      setRecordingBusy(false);
    }
  };

  const finishRecording = async (shouldSend: boolean) => {
    if (!recorderState.isRecording || recordingBusy) return;
    const duration = recorderState.durationMillis / 1_000;
    setRecordingBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri || recorder.getStatus().url;
      await setAudioModeAsync({ allowsRecording: false });
      if (shouldSend && uri && duration >= 0.5) {
        await uploadAndSendMedia({
          uri,
          name: `vocal-synaura-${Date.now()}.m4a`,
          type: 'audio/mp4',
        }, 'audio', duration);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Message vocal non envoyé');
    } finally {
      setRecordingBusy(false);
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  };

  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await getConversationMessages(conversationId, nextCursor);
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
      void Haptics.selectionAsync().catch(() => {});
    } catch {
      void conversationQuery.refetch();
      setErrorMessage('La réaction n’a pas pu être enregistrée.');
    }
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
    const groupedReactions = REACTIONS.map((definition) => ({
      ...definition,
      users: message.reactions.filter((reaction) => reaction.reaction === definition.value),
    })).filter((group) => group.users.length);
    return (
      <View style={[styles.messageRow, own && styles.messageRowOwn, startsGroup && index > 0 && styles.messageGroupStart]}>
        {!own ? <View style={styles.avatarSlot}>{startsGroup ? <MessagingAvatar user={message.sender} size={28} /> : null}</View> : null}
        <View style={[styles.messageColumn, own && styles.messageColumnOwn]}>
          {startsGroup && !own ? <Text style={styles.senderName}>{message.sender.name}</Text> : null}
          <Pressable delayLongPress={260} onLongPress={() => { setActionMessage(message); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}>
            <NativeMessageBubble
              message={message}
              own={own}
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
          </Pressable>
          {groupedReactions.length ? <View style={[styles.reactionSummary, own && styles.reactionSummaryOwn]}>{groupedReactions.map((group) => { const selected = group.users.some((entry) => entry.userId === ownId); return <Pressable key={group.value} onPress={() => void chooseReaction(group.value, message)} style={[styles.reactionChip, selected && styles.reactionChipSelected]}><Ionicons name={group.icon} size={12} color={selected ? colors.violet : colors.textSecondary} /><Text style={[styles.reactionCount, selected && styles.reactionCountSelected]}>{group.users.length}</Text></Pressable>; })}</View> : null}
          <View style={[styles.timeRow, own && styles.timeRowOwn]}><Text style={styles.time}>{clock(message.createdAt)}</Text>{own && message.id === lastOwnMessageId ? <Ionicons name={message.seenBy.some((id) => id !== ownId) ? 'checkmark-done' : 'checkmark'} size={13} color={message.seenBy.some((id) => id !== ownId) ? colors.cyan : colors.textTertiary} /> : null}</View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <ConversationHeader navigation={navigation} user={other || null} title={other?.name || conversation.participants.map((item) => item.name).join(', ')} subtitle={other ? (recentlyActive(other) ? 'Actif récemment' : `@${other.username}`) : 'Discussion Synaura'} onMenu={() => setMenuOpen(true)} layout={layout} />
      {errorMessage ? <Pressable onPress={() => setErrorMessage('')} style={[styles.errorBanner, layout.contentFrame, { marginHorizontal: layout.gutter }]}><Ionicons name="alert-circle-outline" size={17} color={colors.coral} /><Text style={styles.errorText}>{errorMessage}</Text><Ionicons name="close" size={16} color={colors.textTertiary} /></Pressable> : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messages, layout.contentFrame, { paddingHorizontal: layout.gutter }, !messages.length && styles.messagesEmpty]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => { if (!initializedRef.current) listRef.current?.scrollToEnd({ animated: false }); }}
        ListHeaderComponent={hasMore ? <MotionPressable disabled={loadingOlder || !nextCursor} onPress={() => void loadOlder()} style={styles.olderButton}>{loadingOlder ? <ActivityIndicator size="small" color={colors.violet} /> : <Text style={styles.olderButtonText}>Messages précédents</Text>}</MotionPressable> : null}
        ListEmptyComponent={<View style={styles.center}><View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={25} color={colors.violet} /></View><Text style={styles.emptyTitle}>Une discussion qui commence par la musique</Text><Text style={styles.emptyText}>Partage un son, un contexte ou simplement ce que tu as envie de dire.</Text></View>}
        initialNumToRender={24}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(layout.insets.bottom, 10) }]}>
        <View style={[styles.composerFrame, layout.contentFrame, { paddingHorizontal: layout.gutter }]}>
          {!canMessage ? <View style={styles.cannotSend}><Text style={styles.cannotSendText}>{conversation.blocked ? 'Cette discussion est bloquée.' : 'Vous devez être amis pour continuer cette discussion.'}</Text></View> : (
            <>
              {recorderState.isRecording ? (
                <View style={styles.recordingRow}>
                  <MotionPressable accessibilityLabel="Annuler le vocal" disabled={recordingBusy} onPress={() => void finishRecording(false)} style={styles.recordingCancel}><Ionicons name="trash-outline" size={19} color={colors.coral} /></MotionPressable>
                  <View style={styles.recordingStatus}><View style={styles.recordingDot} /><View style={styles.recordingCopy}><Text style={styles.recordingTitle}>Message vocal</Text><Text style={styles.recordingTime}>{recordingClock(recorderState.durationMillis)}</Text></View><View style={styles.recordingBars}>{[10, 19, 13, 24, 16, 21, 11, 18].map((height, index) => <View key={`${height}-${index}`} style={[styles.recordingBar, { height }]} />)}</View></View>
                  <MotionPressable accessibilityLabel="Envoyer le vocal" disabled={recordingBusy || recorderState.durationMillis < 500} onPress={() => void finishRecording(true)} style={[styles.sendButton, (recordingBusy || recorderState.durationMillis < 500) && styles.sendButtonDisabled]}>{recordingBusy ? <ActivityIndicator size="small" color={colors.background} /> : <Ionicons name="arrow-up" size={20} color={colors.background} />}</MotionPressable>
                </View>
              ) : (
                <View style={styles.composerRow}>
                  <MotionPressable accessibilityLabel="Ajouter une pièce jointe" disabled={uploading || recordingBusy} onPress={() => setAttachmentOpen(true)} style={[styles.attachButton, (uploading || recordingBusy) && styles.disabled]}>{uploading ? <ActivityIndicator size="small" color={colors.violet} /> : <Ionicons name="add" size={22} color={colors.textSecondary} />}</MotionPressable>
                  <View style={styles.inputShell}><TextInput value={draft} onChangeText={(value) => setDraft(value.slice(0, 2_000))} placeholder="Écrire un message…" placeholderTextColor={colors.textTertiary} multiline maxLength={2_000} style={styles.input} maxFontSizeMultiplier={1.2} /></View>
                  <MotionPressable accessibilityLabel={draft.trim() ? 'Envoyer' : 'Enregistrer un vocal'} disabled={sending || uploading || recordingBusy} onPress={() => draft.trim() ? void sendText() : void startRecording()} style={[styles.sendButton, (sending || uploading || recordingBusy) && styles.sendButtonDisabled]}>{sending || recordingBusy ? <ActivityIndicator size="small" color={colors.background} /> : <Ionicons name={draft.trim() ? 'arrow-up' : 'mic'} size={20} color={colors.background} />}</MotionPressable>
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
              <AttachmentOption icon="mic-outline" label="Vocal" tint={colors.text} onPress={() => void startRecording()} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={Boolean(actionMessage)} animationType="fade" onRequestClose={() => setActionMessage(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionMessage(null)}>
          <Pressable style={[styles.actionSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Réagir au message</Text>
            <View style={styles.reactionPicker}>{REACTIONS.map((reaction) => { const selected = actionMessage?.reactions.some((item) => item.userId === ownId && item.reaction === reaction.value); return <MotionPressable key={reaction.value} accessibilityLabel={reaction.label} onPress={() => void chooseReaction(reaction.value)} style={[styles.reactionButton, selected && styles.reactionButtonSelected]}><Ionicons name={reaction.icon} size={22} color={selected ? colors.violet : colors.text} /><Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>{reaction.label}</Text></MotionPressable>; })}</View>
            {actionMessage?.sender.id === ownId && !actionMessage.deleted ? <MotionPressable onPress={() => void deleteMessage()} style={styles.sheetDangerRow}><Ionicons name="trash-outline" size={19} color={colors.coral} /><Text style={styles.sheetDangerText}>Supprimer le message</Text></MotionPressable> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.actionSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {other ? <SheetRow icon="person-outline" label="Voir le profil" onPress={() => { setMenuOpen(false); navigation.navigate('PublicProfile', { username: other.username }); }} /> : null}
            <SheetRow icon={muted ? 'notifications-outline' : 'notifications-off-outline'} label={muted ? 'Réactiver les notifications' : 'Mettre en sourdine'} onPress={() => void updateConversation(muted ? 'unmute' : 'mute')} />
            <SheetRow icon="archive-outline" label="Archiver la discussion" onPress={() => void updateConversation('archive')} />
            {other ? <SheetRow icon="person-remove-outline" label="Retirer de mes amis" danger onPress={() => { setMenuOpen(false); setConfirmAction('remove'); }} /> : null}
            {other ? <SheetRow icon="ban-outline" label="Bloquer" danger onPress={() => { setMenuOpen(false); setConfirmAction('block'); }} /> : null}
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

function ConversationHeader({ navigation, user, title, subtitle, onMenu, layout }: { navigation: any; user: MessagingUser | null; title: string; subtitle: string; onMenu: () => void; layout: ReturnType<typeof useResponsiveLayout> }) {
  return <View style={[styles.header, { paddingTop: layout.insets.top + 6 }]}><View style={[styles.headerFrame, layout.contentFrame, { paddingHorizontal: layout.gutter }]}><MotionPressable accessibilityLabel="Retour" onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="chevron-back" size={21} color={colors.text} /></MotionPressable>{user ? <Pressable onPress={() => navigation.navigate('PublicProfile', { username: user.username })}><MessagingAvatar user={user} size={40} active={recentlyActive(user)} /></Pressable> : null}<Pressable disabled={!user} onPress={() => user && navigation.navigate('PublicProfile', { username: user.username })} style={styles.headerCopy}><Text numberOfLines={1} style={styles.headerTitle}>{title}</Text><Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text></Pressable><MotionPressable accessibilityLabel="Options de la discussion" onPress={onMenu} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={20} color={colors.text} /></MotionPressable></View></View>;
}

function NativeMessageBubble({ message, own, playing, audioPosition, onPlayAudio, onAudioProgress, onAudioEnd, onImage, onShared }: { message: MessagingMessage; own: boolean; playing: boolean; audioPosition: { current: number; duration: number }; onPlayAudio: () => void; onAudioProgress: (current: number, duration: number) => void; onAudioEnd: () => void; onImage: () => void; onShared: () => void }) {
  const audioRef = useRef<any>(null);
  const mediaUrl = message.mediaUrl || message.content;
  if (message.deleted) return <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}><Text style={[styles.deletedText, own && styles.bubbleTextOwn]}>Message supprimé</Text></View>;
  if (message.type === 'image') return <Pressable onPress={onImage} style={[styles.mediaBubble, own ? styles.bubbleOwn : styles.bubbleOther]}><Image source={{ uri: mediaUrl }} contentFit="cover" transition={120} style={styles.messageImage} /></Pressable>;
  if (message.type === 'video') return <View style={[styles.mediaBubble, own ? styles.bubbleOwn : styles.bubbleOther]}><Video source={{ uri: mediaUrl }} controls paused resizeMode="contain" style={styles.messageVideo} /></View>;
  if (message.type === 'audio') {
    const progress = audioPosition.duration > 0 ? Math.min(1, audioPosition.current / audioPosition.duration) : 0;
    return <Pressable onPress={onPlayAudio} style={[styles.audioBubble, own ? styles.bubbleOwn : styles.bubbleOther]}><View style={[styles.audioPlay, own && styles.audioPlayOwn]}><Ionicons name={playing ? 'pause' : 'play'} size={17} color={own ? colors.violet : colors.background} /></View><View style={styles.audioCopy}><View style={styles.audioTitleRow}><Text style={[styles.audioTitle, own && styles.bubbleTextOwn]}>Message audio</Text>{audioPosition.duration > 0 ? <Text style={[styles.audioDuration, own && styles.sharedSubtitleOwn]}>{recordingClock((playing ? audioPosition.current : audioPosition.duration) * 1_000)}</Text> : null}</View><View style={[styles.audioProgress, own && styles.audioProgressOwn]}><View style={[styles.audioProgressValue, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} /></View></View>{playing ? <Video ref={audioRef} source={{ uri: mediaUrl }} paused={false} onLoad={() => { if (audioPosition.current > 0.25) audioRef.current?.seek(audioPosition.current); }} onProgress={({ currentTime, seekableDuration }) => onAudioProgress(currentTime, seekableDuration || audioPosition.duration)} onEnd={onAudioEnd} onError={onAudioEnd} progressUpdateInterval={250} style={styles.hiddenAudio} /> : null}</Pressable>;
  }
  if (['track', 'clip', 'post', 'playlist'].includes(message.type)) {
    const cover = typeof message.metadata?.coverUrl === 'string' ? message.metadata.coverUrl : '';
    const title = String(message.metadata?.title || (message.type === 'track' ? 'Son partagé' : message.type === 'clip' ? 'Clip partagé' : message.type === 'playlist' ? 'Playlist partagée' : 'Post partagé'));
    const subtitle = String(message.metadata?.artistName || message.metadata?.subtitle || 'Synaura');
    return <Pressable onPress={onShared} style={[styles.sharedBubble, own ? styles.bubbleOwn : styles.bubbleOther]}>{cover ? <Image source={{ uri: cover }} contentFit="cover" style={styles.sharedCover} /> : <View style={styles.sharedCoverFallback}><Ionicons name="musical-notes" size={20} color={own ? colors.paper : colors.violet} /></View>}<View style={styles.sharedCopy}><Text numberOfLines={1} style={[styles.sharedTitle, own && styles.bubbleTextOwn]}>{title}</Text><Text numberOfLines={1} style={[styles.sharedSubtitle, own && styles.sharedSubtitleOwn]}>{subtitle}</Text></View><View style={[styles.sharedPlay, own && styles.sharedPlayOwn]}><Ionicons name="play" size={14} color={own ? colors.violet : colors.background} /></View></Pressable>;
  }
  return <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}><Text selectable style={[styles.bubbleText, own && styles.bubbleTextOwn]}>{message.content}</Text></View>;
}

function SheetRow({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return <MotionPressable onPress={onPress} style={styles.sheetRow}><Ionicons name={icon} size={19} color={danger ? colors.coral : colors.textSecondary} /><Text style={[styles.sheetRowText, danger && styles.sheetDangerText]}>{label}</Text><Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /></MotionPressable>;
}

function AttachmentOption({ icon, label, tint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) {
  return <MotionPressable accessibilityLabel={label} onPress={onPress} style={styles.attachmentOption}><View style={[styles.attachmentIcon, { backgroundColor: `${tint}20` }]}><Ionicons name={icon} size={23} color={tint} /></View><Text style={styles.attachmentLabel}>{label}</Text></MotionPressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { zIndex: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.background },
  headerFrame: { width: '100%', height: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  headerSubtitle: { marginTop: 2, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  errorBanner: { minHeight: 40, marginTop: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.coralSoft, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorText: { flex: 1, color: colors.coral, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  messages: { width: '100%', flexGrow: 1, justifyContent: 'flex-end', paddingTop: spacing.lg, paddingBottom: spacing.md },
  messagesEmpty: { justifyContent: 'center' },
  olderButton: { minHeight: 38, alignSelf: 'center', marginBottom: spacing.lg, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  olderButtonText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageGroupStart: { marginTop: spacing.sm },
  avatarSlot: { width: 28, minHeight: 1 },
  messageColumn: { maxWidth: '80%', alignItems: 'flex-start' },
  messageColumnOwn: { alignItems: 'flex-end' },
  senderName: { marginBottom: 4, marginLeft: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
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
  timeRow: { minHeight: 14, marginTop: 2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeRowOwn: { justifyContent: 'flex-end' },
  time: { color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background, paddingTop: 9 },
  composerFrame: { width: '100%' },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  recordingRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingCancel: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.coral },
  recordingStatus: { flex: 1, minWidth: 0, height: 43, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral },
  recordingCopy: { minWidth: 58 },
  recordingTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  recordingTime: { marginTop: 1, color: colors.textSecondary, fontSize: 9, fontVariant: ['tabular-nums'], fontWeight: '700' },
  recordingBars: { flex: 1, minWidth: 0, height: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: 2 },
  recordingBar: { flex: 1, maxWidth: 3, borderRadius: 2, backgroundColor: colors.cyan },
  attachButton: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  inputShell: { flex: 1, minHeight: 43, maxHeight: 118, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, justifyContent: 'center', paddingHorizontal: 11 },
  input: { minHeight: 41, maxHeight: 112, paddingTop: 10, paddingBottom: 9, color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sendButton: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  sendButtonDisabled: { opacity: 0.28 },
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
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md, backgroundColor: colors.textTertiary },
  sheetTitle: { marginBottom: spacing.md, color: colors.text, fontSize: 14, fontWeight: '900' },
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
