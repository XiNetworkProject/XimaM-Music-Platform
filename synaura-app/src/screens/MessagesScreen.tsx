import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  createDirectConversation,
  createGroupConversation,
  getMessageContacts,
  getMessageConversations,
  getMessageRequests,
  mutateMessageRequest,
  removeMessageContact,
  sendConversationMessage,
  type MessagingContact,
  type MessagingConversation,
  type MessagingRequest,
  type MessagingUser,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { AppHeader } from '@/components/ui/AppHeader';
import { MessagingAvatar } from '@/components/messaging/MessagingAvatar';
import { MotionPressable } from '@/components/motion/Motion';
import { messagingKeys } from '@/messaging/useMessagingUnread';
import { colors, radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { MessagingSharePayload } from '@/navigation/Tabs';

type InboxTab = 'conversations' | 'requests' | 'contacts';
type ListRow =
  | { kind: 'conversation'; value: MessagingConversation }
  | { kind: 'request'; value: MessagingRequest }
  | { kind: 'requestHeader'; id: string; label: string }
  | { kind: 'contact'; value: MessagingContact };

function routeTab(value: unknown): InboxTab {
  return value === 'requests' || value === 'contacts' ? value : 'conversations';
}

function relativeDate(value?: string | null) {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isActive(user?: MessagingUser | null) {
  if (!user?.lastSeen) return false;
  const value = new Date(user.lastSeen).getTime();
  return Number.isFinite(value) && Date.now() - value < 5 * 60_000;
}

function preview(conversation: MessagingConversation) {
  const message = conversation.lastMessage;
  if (!message) return 'Commencez la discussion';
  if (message.type === 'image') return 'Image';
  if (message.type === 'video') return 'Vidéo';
  if (message.type === 'audio') return 'Message audio';
  if (message.type === 'track') return 'Son partagé';
  if (message.type === 'clip') return 'Clip partagé';
  if (message.type === 'post') return 'Post partagé';
  if (message.type === 'playlist') return 'Playlist partagée';
  if (message.type === 'deleted') return 'Message supprimé';
  return message.content || 'Nouveau message';
}

export function MessagesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const auth = useAuth();
  const layout = useResponsiveLayout();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<InboxTab>(() => routeTab(route.params?.tab));
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [contactToRemove, setContactToRemove] = useState<MessagingContact | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pendingShare = route.params?.share as MessagingSharePayload | undefined;

  useEffect(() => {
    setTab(routeTab(route.params?.tab));
  }, [route.params?.tab]);

  const inbox = useQuery({
    queryKey: messagingKeys.inbox(),
    queryFn: async () => {
      const [conversations, requests, contacts] = await Promise.all([
        getMessageConversations(),
        getMessageRequests(),
        getMessageContacts(),
      ]);
      return { conversations, requests, contacts };
    },
    enabled: Boolean(auth.user && auth.token),
    staleTime: 8_000,
    retry: 1,
  });

  useFocusEffect(useCallback(() => {
    if (auth.user && auth.token) void inbox.refetch();
  }, [auth.token, auth.user?.id]));

  const normalized = search.trim().toLocaleLowerCase('fr-FR');
  const matches = useCallback((user?: MessagingUser | null) => !normalized || Boolean(
    user?.name.toLocaleLowerCase('fr-FR').includes(normalized)
      || user?.username.toLocaleLowerCase('fr-FR').includes(normalized),
  ), [normalized]);

  const conversations = inbox.data?.conversations.conversations || [];
  const requests = inbox.data?.requests || { received: [], sent: [] };
  const contacts = inbox.data?.contacts || [];
  const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

  const rows = useMemo<ListRow[]>(() => {
    if (tab === 'conversations') return conversations.filter((item) => matches(item.otherUser) || Boolean(normalized && item.name?.toLocaleLowerCase('fr-FR').includes(normalized))).map((value) => ({ kind: 'conversation', value }));
    if (tab === 'contacts') return contacts.filter((item) => matches(item.user)).map((value) => ({ kind: 'contact', value }));
    const received = requests.received.filter((item) => matches(item.user));
    const sent = requests.sent.filter((item) => matches(item.user));
    return [
      ...(received.length ? [{ kind: 'requestHeader' as const, id: 'received', label: 'Demandes reçues' }] : []),
      ...received.map((value) => ({ kind: 'request' as const, value })),
      ...(sent.length ? [{ kind: 'requestHeader' as const, id: 'sent', label: 'Demandes envoyées' }] : []),
      ...sent.map((value) => ({ kind: 'request' as const, value })),
    ];
  }, [contacts, conversations, matches, requests.received, requests.sent, tab]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: messagingKeys.inbox() }),
      queryClient.invalidateQueries({ queryKey: messagingKeys.unread() }),
    ]);
  };

  const openConversation = async (conversationId: string, busyKey: string) => {
    setBusyId(busyKey);
    setErrorMessage('');
    try {
      if (pendingShare) {
        await sendConversationMessage(conversationId, {
          type: pendingShare.type,
          sharedEntityId: pendingShare.entityId,
          metadata: pendingShare.metadata,
        });
        navigation.setParams({ share: undefined });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      navigation.navigate('Conversation', { conversationId });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Partage impossible');
    } finally {
      setBusyId(null);
    }
  };

  const handleRequest = async (request: MessagingRequest, action: 'accept' | 'reject' | 'cancel') => {
    setBusyId(request.id);
    setErrorMessage('');
    try {
      const result = await mutateMessageRequest(request.id, action);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await invalidate();
      if (action === 'accept' && result.conversationId) await openConversation(result.conversationId, request.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Action impossible');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusyId(null);
    }
  };

  const openContact = async (contact: MessagingContact) => {
    setBusyId(contact.friendshipId);
    setErrorMessage('');
    try {
      const conversationId = contact.conversationId || await createDirectConversation(contact.user.id);
      await openConversation(conversationId, contact.friendshipId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Conversation impossible');
    } finally {
      setBusyId(null);
    }
  };

  const removeContact = async () => {
    if (!contactToRemove) return;
    setBusyId(contactToRemove.friendshipId);
    try {
      await removeMessageContact(contactToRemove.user.id);
      setContactToRemove(null);
      await invalidate();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Suppression impossible');
    } finally {
      setBusyId(null);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length < 2 || groupBusy) return;
    setGroupBusy(true);
    setErrorMessage('');
    try {
      const conversationId = await createGroupConversation(groupName.trim(), groupMembers);
      setGroupOpen(false);
      setGroupName('');
      setGroupMembers([]);
      await invalidate();
      navigation.navigate('Conversation', { conversationId });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Groupe impossible à créer');
    } finally {
      setGroupBusy(false);
    }
  };

  if (!auth.loading && !auth.user) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Messages" onBack={() => navigation.goBack()} eyebrow="Liens musicaux" />
        <View style={styles.authEmpty}>
          <View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.violet} /></View>
          <Text style={styles.emptyTitle}>Tes discussions Synaura</Text>
          <Text style={styles.emptyText}>Connecte-toi pour retrouver tes amis et parler des sons que vous aimez.</Text>
          <MotionPressable style={styles.primaryButton} onPress={() => navigation.navigate('Login', { returnTo: { screen: 'Messages' } })}><Text style={styles.primaryButtonText}>Se connecter</Text></MotionPressable>
        </View>
      </View>
    );
  }

  const tabs: Array<{ id: InboxTab; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }> = [
    { id: 'conversations', label: 'Discussions', icon: 'chatbubble-ellipses-outline', count: totalUnread },
    { id: 'requests', label: 'Demandes', icon: 'person-add-outline', count: requests.received.length },
    { id: 'contacts', label: 'Amis', icon: 'people-outline', count: contacts.length },
  ];

  const emptyCopy = tab === 'conversations'
    ? ['Aucune discussion', search ? 'Aucune discussion ne correspond à ta recherche.' : 'Ajoute un créateur à tes amis pour commencer à échanger.']
    : tab === 'requests'
      ? ['Aucune demande', search ? 'Aucune demande ne correspond à ta recherche.' : 'Les nouvelles demandes d’amis apparaîtront ici.']
      : ['Aucun ami', search ? 'Aucun ami ne correspond à ta recherche.' : 'Tes demandes acceptées formeront ici ton cercle musical.'];

  return (
    <View style={styles.screen}>
      <AppHeader title="Messages" subtitle={pendingShare ? `Choisis un ami pour envoyer « ${pendingShare.metadata.title} ».` : 'Partage ce qui mérite d’être écouté.'} eyebrow="Liens musicaux" onBack={() => navigation.goBack()} compact={layout.isShort} />
      <View style={[styles.frame, layout.contentFrame, { paddingHorizontal: layout.gutter }]}>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {tabs.map((item) => {
            const selected = tab === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { setTab(item.id); setSearch(''); void Haptics.selectionAsync().catch(() => {}); }} style={[styles.tab, selected && styles.tabActive]}>
                <Ionicons name={item.icon} size={16} color={selected ? colors.text : colors.textTertiary} />
                {!layout.isUltraNarrow ? <Text numberOfLines={1} maxFontSizeMultiplier={1.08} style={[styles.tabText, selected && styles.tabTextActive]}>{item.label}</Text> : null}
                {item.count > 0 ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{item.count > 99 ? '99+' : item.count}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>

        {tab === 'conversations' && contacts.length >= 2 ? <MotionPressable onPress={() => setGroupOpen(true)} style={styles.groupLauncher}><View style={styles.groupLauncherIcon}><Ionicons name="people" size={18} color={colors.cyan} /></View><View style={styles.groupLauncherCopy}><Text style={styles.groupLauncherTitle}>Créer un groupe</Text><Text style={styles.groupLauncherText}>Ouvre des salons pour vos sons, messages et vocaux.</Text></View><Ionicons name="add-circle" size={23} color={colors.violet} /></MotionPressable> : null}

        <View style={styles.search}>
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <TextInput value={search} onChangeText={setSearch} placeholder={tab === 'contacts' ? 'Rechercher un ami' : tab === 'requests' ? 'Rechercher une demande' : 'Rechercher une discussion'} placeholderTextColor={colors.textTertiary} style={styles.searchInput} returnKeyType="search" maxFontSizeMultiplier={1.15} />
          {search ? <Pressable hitSlop={8} onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></Pressable> : null}
        </View>
        {errorMessage ? <Pressable onPress={() => setErrorMessage('')} style={styles.errorBanner}><Ionicons name="alert-circle-outline" size={17} color={colors.coral} /><Text style={styles.errorText}>{errorMessage}</Text><Ionicons name="close" size={16} color={colors.textTertiary} /></Pressable> : null}
        {pendingShare ? <View style={styles.shareBanner}><Ionicons name="musical-notes" size={17} color={colors.cyan} /><View style={styles.shareBannerCopy}><Text numberOfLines={1} style={styles.shareBannerTitle}>{pendingShare.metadata.title}</Text><Text style={styles.shareBannerText}>Sera envoyé dans la discussion choisie.</Text></View><Pressable hitSlop={8} onPress={() => navigation.setParams({ share: undefined })}><Ionicons name="close" size={18} color={colors.textTertiary} /></Pressable></View> : null}
      </View>

      {inbox.isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.violet} /></View>
      ) : inbox.isError ? (
        <View style={styles.authEmpty}><Text style={styles.emptyTitle}>Messagerie indisponible</Text><Text style={styles.emptyText}>{inbox.error instanceof Error ? inbox.error.message : 'Réessaie dans un instant.'}</Text><MotionPressable style={styles.secondaryButton} onPress={() => void inbox.refetch()}><Text style={styles.secondaryButtonText}>Réessayer</Text></MotionPressable></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.kind === 'requestHeader' ? row.id : row.kind === 'conversation' ? row.value.id : row.kind === 'request' ? row.value.id : row.value.friendshipId}
          contentContainerStyle={[styles.listContent, layout.contentFrame, { paddingHorizontal: layout.gutter, paddingBottom: layout.miniPlayerClearance + 20 }, !rows.length && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()} tintColor={colors.violet} colors={[colors.violet]} />}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          initialNumToRender={12}
          windowSize={7}
          ListEmptyComponent={<EmptyInbox icon={tab === 'conversations' ? 'chatbubble-ellipses-outline' : tab === 'requests' ? 'person-add-outline' : 'people-outline'} title={emptyCopy[0]} text={emptyCopy[1]} onDiscover={tab !== 'requests' && !search ? () => navigation.navigate('Tabs', { screen: 'Discover' }) : undefined} />}
          renderItem={({ item }) => {
            if (item.kind === 'requestHeader') return <Text style={styles.groupTitle}>{item.label}</Text>;
            if (item.kind === 'conversation') {
              const conversation = item.value;
              const user = conversation.otherUser;
              const group = conversation.type === 'group';
              const title = conversation.preferences?.nickname || (group ? conversation.name || 'Groupe Synaura' : user?.name || 'Discussion');
              return (
                <Pressable onPress={() => void openConversation(conversation.id, conversation.id)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  {user ? <MessagingAvatar user={user} active={isActive(user)} /> : <View style={styles.groupAvatar}><Ionicons name="people" size={21} color={colors.cyan} /></View>}
                  <View style={styles.rowCopy}>
                    <View style={styles.rowTitleLine}><Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>{group ? <View style={styles.groupBadge}><Text style={styles.groupBadgeText}>{conversation.participants.length} membres</Text></View> : null}{conversation.muted ? <Ionicons name="notifications-off-outline" size={13} color={colors.textTertiary} /> : null}<Text style={styles.rowTime}>{relativeDate(conversation.lastMessage?.createdAt || conversation.updatedAt)}</Text></View>
                    <View style={styles.rowTitleLine}><Text numberOfLines={1} style={[styles.rowSubtitle, conversation.unreadCount > 0 && styles.rowSubtitleUnread]}>{preview(conversation)}</Text>{conversation.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}</View>
                  </View>
                </Pressable>
              );
            }
            if (item.kind === 'request') {
              const request = item.value;
              return (
                <View style={styles.requestRow}>
                  <Pressable onPress={() => navigation.navigate('PublicProfile', { username: request.user.username })}><MessagingAvatar user={request.user} active={isActive(request.user)} /></Pressable>
                  <View style={styles.requestCopy}>
                    <Pressable onPress={() => navigation.navigate('PublicProfile', { username: request.user.username })}><Text numberOfLines={1} style={styles.rowTitle}>{request.user.name}</Text><Text numberOfLines={1} style={styles.rowSubtitle}>@{request.user.username}</Text></Pressable>
                    {request.message ? <Text numberOfLines={3} style={styles.requestMessage}>{request.message}</Text> : null}
                    <Text style={styles.requestDate}>{relativeDate(request.createdAt)}</Text>
                  </View>
                  {request.direction === 'received' ? <View style={styles.rowActions}><CircleButton icon="checkmark" filled disabled={busyId === request.id} label="Accepter" onPress={() => void handleRequest(request, 'accept')} /><CircleButton icon="close" disabled={busyId === request.id} label="Refuser" onPress={() => void handleRequest(request, 'reject')} /></View> : <MotionPressable disabled={busyId === request.id} onPress={() => void handleRequest(request, 'cancel')} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Annuler</Text></MotionPressable>}
                </View>
              );
            }
            const contact = item.value;
            return (
              <View style={styles.row}>
                <Pressable onPress={() => navigation.navigate('PublicProfile', { username: contact.user.username })}><MessagingAvatar user={contact.user} active={isActive(contact.user)} /></Pressable>
                <Pressable onPress={() => navigation.navigate('PublicProfile', { username: contact.user.username })} style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{contact.user.name}</Text><Text numberOfLines={1} style={styles.rowSubtitle}>@{contact.user.username}</Text></Pressable>
                <CircleButton icon="chatbubble-ellipses" filled disabled={busyId === contact.friendshipId} label="Écrire" onPress={() => void openContact(contact)} />
                <CircleButton icon="person-remove-outline" disabled={false} label="Retirer de mes amis" danger onPress={() => setContactToRemove(contact)} />
              </View>
            );
          }}
        />
      )}

      <Modal visible={groupOpen} transparent animationType="slide" onRequestClose={() => setGroupOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setGroupOpen(false)}>
          <Pressable style={[styles.groupSheet, { paddingBottom: Math.max(layout.insets.bottom, spacing.lg) }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.groupSheetHeader}><View><Text style={styles.modalTitle}>Nouveau groupe</Text><Text style={styles.modalText}>Choisis au moins deux amis. Deux salons seront prêts dès l’ouverture.</Text></View><Pressable accessibilityLabel="Fermer" onPress={() => setGroupOpen(false)} style={styles.sheetClose}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>
            <View style={styles.groupNameInput}><Ionicons name="people-outline" size={18} color={colors.textTertiary} /><TextInput autoFocus value={groupName} onChangeText={(value) => setGroupName(value.slice(0, 64))} placeholder="Nom du groupe" placeholderTextColor={colors.textTertiary} style={styles.searchInput} /></View>
            <Text style={styles.groupSelectionLabel}>{groupMembers.length} ami{groupMembers.length > 1 ? 's' : ''} sélectionné{groupMembers.length > 1 ? 's' : ''}</Text>
            <ScrollView style={styles.groupContacts} showsVerticalScrollIndicator={false}>
              {contacts.map((contact) => { const selected = groupMembers.includes(contact.user.id); return <Pressable key={contact.user.id} onPress={() => setGroupMembers((current) => selected ? current.filter((id) => id !== contact.user.id) : current.length < 23 ? [...current, contact.user.id] : current)} style={[styles.groupContactRow, selected && styles.groupContactRowSelected]}><MessagingAvatar user={contact.user} size={42} active={isActive(contact.user)} /><View style={styles.rowCopy}><Text numberOfLines={1} style={styles.rowTitle}>{contact.user.name}</Text><Text numberOfLines={1} style={styles.rowSubtitle}>@{contact.user.username}</Text></View><View style={[styles.groupCheck, selected && styles.groupCheckSelected]}>{selected ? <Ionicons name="checkmark" size={15} color={colors.paper} /> : null}</View></Pressable>; })}
            </ScrollView>
            <MotionPressable disabled={!groupName.trim() || groupMembers.length < 2 || groupBusy} onPress={() => void createGroup()} style={[styles.groupCreateButton, (!groupName.trim() || groupMembers.length < 2 || groupBusy) && styles.disabled]}>{groupBusy ? <ActivityIndicator color={colors.paper} /> : <><Ionicons name="sparkles" size={17} color={colors.paper} /><Text style={styles.groupCreateText}>Créer le groupe</Text></>}</MotionPressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(contactToRemove)} transparent animationType="fade" onRequestClose={() => setContactToRemove(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setContactToRemove(null)}>
          <Pressable style={[styles.modalCard, { marginBottom: Math.max(layout.insets.bottom, spacing.md) }]} onPress={() => {}}>
            <View style={styles.modalIcon}><Ionicons name="person-remove-outline" size={22} color={colors.coral} /></View>
            <Text style={styles.modalTitle}>Retirer {contactToRemove?.user.name} ?</Text>
            <Text style={styles.modalText}>La discussion restera dans tes archives, mais vous devrez accepter une nouvelle demande pour vous écrire à nouveau.</Text>
            <View style={styles.modalActions}><MotionPressable style={styles.secondaryButton} onPress={() => setContactToRemove(null)}><Text style={styles.secondaryButtonText}>Annuler</Text></MotionPressable><MotionPressable disabled={busyId === contactToRemove?.friendshipId} style={styles.dangerButton} onPress={() => void removeContact()}><Text style={styles.dangerButtonText}>Retirer</Text></MotionPressable></View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CircleButton({ icon, label, onPress, filled = false, danger = false, disabled = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; filled?: boolean; danger?: boolean; disabled?: boolean }) {
  return <MotionPressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.circleButton, filled && styles.circleButtonFilled, danger && styles.circleButtonDanger, disabled && styles.disabled]}><Ionicons name={icon} size={17} color={filled ? colors.background : danger ? colors.coral : colors.textSecondary} /></MotionPressable>;
}

function EmptyInbox({ icon, title, text, onDiscover }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onDiscover?: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={25} color={colors.violet} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text>{onDiscover ? <MotionPressable style={styles.primaryButton} onPress={onDiscover}><Ionicons name="compass-outline" size={17} color={colors.background} /><Text style={styles.primaryButtonText}>Découvrir des créateurs</Text></MotionPressable> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  frame: { width: '100%' },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, gap: 3 },
  tab: { flex: 1, minWidth: 0, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  tabActive: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  tabText: { flexShrink: 1, color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  tabTextActive: { color: colors.text },
  tabBadge: { minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  tabBadgeText: { color: colors.paper, fontSize: 8, fontWeight: '900' },
  groupLauncher: { minHeight: 62, marginTop: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupLauncherIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyanSoft },
  groupLauncherCopy: { flex: 1, minWidth: 0 },
  groupLauncherTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  groupLauncherText: { marginTop: 2, color: colors.textTertiary, fontSize: 8, lineHeight: 12, fontWeight: '600' },
  search: { height: 46, marginTop: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minWidth: 0, height: 44, color: colors.text, fontSize: 13, fontWeight: '600', paddingVertical: 0 },
  errorBanner: { marginTop: spacing.sm, minHeight: 42, borderRadius: radius.sm, backgroundColor: colors.coralSoft, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorText: { flex: 1, color: colors.coral, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  shareBanner: { minHeight: 52, marginTop: spacing.sm, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(74,158,170,0.3)', backgroundColor: colors.cyanSoft, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shareBannerCopy: { flex: 1, minWidth: 0 },
  shareBannerTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  shareBannerText: { marginTop: 2, color: colors.textSecondary, fontSize: 9, fontWeight: '600' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { width: '100%', paddingTop: spacing.md },
  listEmpty: { flexGrow: 1 },
  row: { minHeight: 70, paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  groupAvatar: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyanSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(74,158,170,0.28)' },
  groupBadge: { height: 19, borderRadius: 10, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyanSoft },
  groupBadgeText: { color: colors.cyan, fontSize: 7, fontWeight: '900' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitleLine: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowTitle: { flexShrink: 1, color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  rowSubtitle: { flex: 1, minWidth: 0, color: colors.textTertiary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  rowSubtitleUnread: { color: colors.text, fontWeight: '800' },
  rowTime: { marginLeft: 'auto', color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  unreadDot: { marginLeft: 'auto', width: 9, height: 9, borderRadius: 5, backgroundColor: colors.violet },
  groupTitle: { marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 4, color: colors.textSecondary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  requestRow: { paddingVertical: 13, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: colors.surface },
  requestCopy: { flex: 1, minWidth: 0 },
  requestMessage: { marginTop: 7, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 7, color: colors.textSecondary, backgroundColor: colors.surfaceMuted, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  requestDate: { marginTop: 6, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 6 },
  circleButton: { width: 39, height: 39, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  circleButtonFilled: { backgroundColor: colors.text, borderColor: colors.text },
  circleButtonDanger: { backgroundColor: colors.coralSoft, borderColor: colors.coralSoft },
  disabled: { opacity: 0.4 },
  cancelButton: { minHeight: 38, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancelButtonText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  authEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 80 },
  empty: { flex: 1, minHeight: 340, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  emptyTitle: { marginTop: spacing.md, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '900' },
  emptyText: { maxWidth: 340, marginTop: 7, color: colors.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  primaryButton: { minHeight: 43, marginTop: spacing.lg, borderRadius: radius.pill, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.text },
  primaryButtonText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  secondaryButton: { minHeight: 43, flex: 1, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  secondaryButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  dangerButton: { minHeight: 43, flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.coral },
  dangerButtonText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  groupSheet: { width: '100%', maxWidth: 680, maxHeight: '88%', alignSelf: 'center', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: colors.borderStrong, backgroundColor: colors.elevatedSurface, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md, backgroundColor: colors.textTertiary },
  groupSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  sheetClose: { width: 38, height: 38, marginLeft: 'auto', borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  groupNameInput: { height: 48, marginTop: spacing.lg, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surfaceStrong, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupSelectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.textSecondary, fontSize: 9, textTransform: 'uppercase', fontWeight: '900' },
  groupContacts: { maxHeight: 360 },
  groupContactRow: { minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupContactRowSelected: { backgroundColor: colors.violetSoft },
  groupCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  groupCheckSelected: { borderColor: colors.violet, backgroundColor: colors.violet },
  groupCreateButton: { minHeight: 48, marginTop: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.violet, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  groupCreateText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  modalCard: { width: '100%', maxWidth: 440, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, padding: spacing.lg, backgroundColor: colors.elevatedSurface },
  modalIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralSoft },
  modalTitle: { marginTop: spacing.md, color: colors.text, fontSize: 18, fontWeight: '900' },
  modalText: { marginTop: 7, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  modalActions: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
});
