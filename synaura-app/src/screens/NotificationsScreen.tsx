import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/client';
import type { SynauraNotification } from '@/api/types';
import { CollectionEmpty, CollectionHeader, CollectionIconButton, CollectionSurface, CollectionTabs } from '@/components/mobile/CollectionUI';
import { useSurfaceColors } from '@/components/mobile/useSurfaceColors';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { createNotificationRequestGate } from '@/notifications/requestGate';
import { openInternalLink } from '@/navigation/internalLinks';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';
import { useAuth } from '@/auth/AuthProvider';

const NOTIFICATIONS_REFRESH_MS = 60_000;

const tabs = [
  { id: 'all', label: 'Toutes' },
  { id: 'social', label: 'Social' },
  { id: 'music', label: 'Musique' },
  { id: 'message', label: 'Messages' },
  { id: 'system', label: 'Système' },
] as const;

type NotificationSection = { title: string; data: SynauraNotification[] };

function notificationVisual(item: SynauraNotification, colors: ReturnType<typeof useSurfaceColors>) {
  if (item.type.includes('like')) return { icon: 'heart' as const, color: colors.coral, background: 'rgba(217,109,99,0.13)', action: 'Voir le son' };
  if (item.type.includes('comment') || item.type.includes('message')) return { icon: 'chatbubble-ellipses' as const, color: colors.violet, background: 'rgba(115,87,198,0.12)', action: 'Répondre' };
  if (item.type.includes('follower')) return { icon: 'person-add' as const, color: colors.cyan, background: 'rgba(74,158,170,0.13)', action: 'Voir le profil' };
  if (item.type.includes('milestone')) return { icon: 'sparkles' as const, color: '#A65D35', background: 'rgba(217,150,99,0.14)', action: 'Voir les stats' };
  if (item.category === 'music') return { icon: 'musical-notes' as const, color: '#327E68', background: 'rgba(74,158,170,0.12)', action: 'Écouter' };
  return { icon: 'notifications' as const, color: '#8A672A', background: 'rgba(214,166,62,0.13)', action: 'Ouvrir' };
}

function relativeDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

function groupNotifications(items: SynauraNotification[]): NotificationSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = today - 6 * 24 * 60 * 60 * 1000;
  const groups: NotificationSection[] = [
    { title: "Aujourd'hui", data: [] },
    { title: 'Cette semaine', data: [] },
    { title: 'Plus tôt', data: [] },
  ];
  items.forEach((item) => {
    const timestamp = new Date(item.createdAt).getTime();
    if (Number.isFinite(timestamp) && timestamp >= today) groups[0].data.push(item);
    else if (Number.isFinite(timestamp) && timestamp >= weekStart) groups[1].data.push(item);
    else groups[2].data.push(item);
  });
  return groups.filter((group) => group.data.length > 0);
}

export function NotificationsScreen() {
  const colors = useSurfaceColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const requestGate = React.useRef(createNotificationRequestGate());
  const responsive = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const auth = useAuth();
  const nativeNotifications = useNativeNotifications();
  const [category, setCategory] = React.useState<(typeof tabs)[number]['id']>('all');
  const [items, setItems] = React.useState<SynauraNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const cacheKey = React.useMemo(
    () => auth.user?.id ? `synaura.notifications.cache.v1.${auth.user.id}.${category}` : null,
    [auth.user?.id, category],
  );
  const sections = React.useMemo(() => groupNotifications(items), [items]);

  const persistCache = React.useCallback((nextItems: SynauraNotification[], nextUnread: number) => {
    if (!cacheKey) return;
    void AsyncStorage.setItem(cacheKey, JSON.stringify({
      notifications: nextItems,
      unread: nextUnread,
      total: nextItems.length,
      cachedAt: Date.now(),
    })).catch(() => {});
  }, [cacheKey]);

  const load = React.useCallback(async (mode: 'initial' | 'refresh' | 'background' = 'initial') => {
    const isCurrent = requestGate.current.begin();
    if (!auth.user || !auth.token) { setItems([]); setUnread(0); setLoading(false); setRefreshing(false); return; }
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial') setLoading(true);
    setError(null);
    let hasCachedData = false;
    if (mode === 'initial') setItems([]);

    if (mode === 'initial' && cacheKey) {
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (!isCurrent()) return;
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
        if (Array.isArray(cached?.notifications)) {
          setItems(cached.notifications);
          setUnread(Math.max(0, Number(cached.unread || 0)));
          hasCachedData = true;
          setLoading(false);
        }
      } catch {
        // Le cache ne doit jamais bloquer la requête en direct.
      }
    }

    try {
      if (!isCurrent()) return;
      const data = await getNotifications(category);
      if (!isCurrent()) return;
      setItems(data.notifications);
      setUnread(data.unread);
      void nativeNotifications.refreshUnread(data.unread);
      persistCache(data.notifications, data.unread);
    } catch (nextError) {
      if (!isCurrent()) return;
      setError(hasCachedData
        ? 'Actualisation interrompue. Ton activité récente reste disponible.'
        : nextError instanceof Error ? nextError.message : 'Impossible de charger ton activité.');
    } finally {
      if (isCurrent()) { setLoading(false); setRefreshing(false); }
    }
  }, [auth.user?.id, auth.token, cacheKey, category, nativeNotifications.refreshUnread, persistCache]);

  useFocusEffect(React.useCallback(() => {
    void load();
    const interval = auth.user && auth.token ? setInterval(() => void load('background'), NOTIFICATIONS_REFRESH_MS) : null;
    return () => { if (interval) clearInterval(interval); requestGate.current.invalidate(); };
  }, [load, auth.user?.id, auth.token]));

  const openNotification = async (item: SynauraNotification) => {
    if (!item.isRead) {
      const nextItems = items.map((next) => next.id === item.id ? { ...next, isRead: true } : next);
      const nextUnread = Math.max(0, unread - 1);
      setItems(nextItems);
      setUnread(nextUnread);
      persistCache(nextItems, nextUnread);
      markNotificationRead(item.id).catch(() => {});
      void nativeNotifications.refreshUnread();
    }
    if (item.actionUrl) {
      await openInternalLink(navigation, item.actionUrl, { playTrack: (track) => player.playTrack(track) });
    }
  };

  const markAll = async () => {
    if (!unread) return;
    const isCurrent = requestGate.current.begin();
    setLoading(false);
    setRefreshing(false);
    const previousUnread = unread;
    const previousItems = items;
    const nextItems = items.map((item) => ({ ...item, isRead: true }));
    setItems(nextItems);
    setUnread(0);
    persistCache(nextItems, 0);
    try {
      await markAllNotificationsRead();
      await nativeNotifications.refreshUnread(0);
    } catch {
      if (!isCurrent()) return;
      setItems(previousItems);
      setUnread(previousUnread);
      persistCache(previousItems, previousUnread);
      setError("Impossible de marquer toute l'activité comme lue.");
    }
  };

  const remove = async (item: SynauraNotification) => {
    const isCurrent = requestGate.current.begin();
    setLoading(false);
    setRefreshing(false);
    const previousItems = items;
    const previousUnread = unread;
    const nextItems = items.filter((next) => next.id !== item.id);
    const nextUnread = Math.max(0, unread - (item.isRead ? 0 : 1));
    setItems(nextItems);
    setUnread(nextUnread);
    persistCache(nextItems, nextUnread);
    try {
      await deleteNotification(item.id);
      await nativeNotifications.refreshUnread(nextUnread);
    } catch {
      if (!isCurrent()) return;
      setItems(previousItems);
      setUnread(previousUnread);
      persistCache(previousItems, previousUnread);
      setError('Suppression impossible pour le moment.');
    }
  };

  const connectionIssue = error || (nativeNotifications.syncError ? 'La mise à jour automatique est momentanément indisponible.' : null);

  if (!auth.loading && !auth.user) return <CollectionSurface>
    <View style={[responsive.pageContent, { paddingTop: responsive.insets.top }]}><CollectionHeader title="Activité" onBack={() => navigation.goBack()} /></View>
    <View style={[responsive.pageContent, styles.guest]}><CollectionEmpty icon="notifications-outline" title="Ne manque rien." text="Tes réactions, tes nouveaux abonnés et les sorties des artistes que tu suis, réunis ici." action="Se connecter" onPress={() => navigation.navigate('Login', { returnTo: { screen: 'Notifications' } })} /></View>
  </CollectionSurface>;

  return (
    <CollectionSurface>
      <View style={[styles.screen, responsive.pageContent, { paddingTop: responsive.insets.top }]}>
        <CollectionHeader title="Activité" eyebrow={unread ? `${unread} À LIRE` : 'AUTOUR DE TOI'} onBack={() => navigation.goBack()} actions={<>
          {unread > 0 ? <CollectionIconButton icon="checkmark-done-outline" label="Tout marquer comme lu" onPress={() => void markAll()} /> : null}
          <CollectionIconButton icon="options-outline" label="Préférences de notifications" onPress={() => navigation.navigate('Settings', { section: 'notifications' })} />
        </>} />
        <View><CollectionTabs value={category} options={tabs.map(tab => ({ value: tab.id, label: tab.label }))} onChange={setCategory} /></View>
        {connectionIssue ? (
          <Pressable onPress={() => void load('refresh')} style={styles.connectionBanner}>
            <Ionicons name="cloud-offline-outline" size={17} color={colors.coral} />
            <Text numberOfLines={2} style={styles.connectionText}>{connectionIssue}</Text>
            <Ionicons name="refresh" size={17} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        {loading && !items.length ? <ActivityIndicator color={colors.violet} style={styles.loader} /> : null}
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(responsive.insets.bottom + 24, 36) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={colors.violet} colors={[colors.violet]} />}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          ListEmptyComponent={!loading ? <CollectionEmpty icon={error ? 'cloud-offline-outline' : 'notifications-outline'} title={error ? 'Activité indisponible' : 'Tout est calme'} text={error ? 'Réessaie pour retrouver tes notifications.' : category === 'all' ? 'Tes prochaines nouvelles apparaîtront ici.' : 'Aucune notification dans cette catégorie.'} action={error ? 'Réessayer' : undefined} onPress={error ? () => void load('refresh') : undefined} /> : null}
          renderItem={({ item }) => {
            const visual = notificationVisual(item, colors);
            return (
              <NotificationRow
                item={item}
                visual={visual}
                onOpen={() => void openNotification(item)}
                onRemove={() => void remove(item)}
              />
            );
          }}
        />
      </View>
    </CollectionSurface>
  );
}

function NotificationRow({
  item,
  visual,
  onOpen,
  onRemove,
}: {
  item: SynauraNotification;
  visual: ReturnType<typeof notificationVisual>;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const colors = useSurfaceColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const motion = useEntryMotion();
  const translateX = React.useRef(new Animated.Value(0)).current;
  const revealed = React.useRef(false);
  const [deleteVisible, setDeleteVisible] = React.useState(false);
  const settle = React.useCallback((open: boolean) => {
    revealed.current = open;
    setDeleteVisible(open);
    translateX.stopAnimation();
    if (!motion) { translateX.setValue(open ? -88 : 0); return; }
    Animated.spring(translateX, { toValue: open ? -88 : 0, speed: 30, bounciness: 2, useNativeDriver: true, isInteraction: false }).start();
  }, [motion, translateX]);
  React.useEffect(() => () => translateX.stopAnimation(), [translateX]);
  const remove = () => { settle(false); onRemove(); };
  const responder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-88, Math.min(0, (revealed.current ? -88 : 0) + gesture.dx))),
    onPanResponderRelease: (_, gesture) => { const open = (revealed.current ? -88 : 0) + gesture.dx < -40; settle(open); if (open) void Haptics.selectionAsync().catch(() => {}); },
    onPanResponderTerminate: () => settle(false),
  }), [settle, translateX]);

  return <View style={styles.rowShell}>
    <Pressable accessible={deleteVisible} importantForAccessibility={deleteVisible ? 'yes' : 'no-hide-descendants'} accessibilityRole="button" accessibilityLabel={`Supprimer la notification : ${item.title}`} onPress={remove} style={styles.deleteBehind}><Ionicons name="trash-outline" size={22} color={colors.paper} /><Text style={styles.deleteText}>Supprimer</Text></Pressable>
    <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.isRead ? '' : 'Non lue. '}${item.title}. ${item.message}`}
        accessibilityActions={[{ name: 'delete', label: 'Supprimer' }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') remove(); }}
        onPress={() => revealed.current ? settle(false) : onOpen()}
        style={[styles.row, !item.isRead && styles.rowUnread]}>
        <View style={[styles.visual, { backgroundColor: visual.background }]}><Ionicons name={visual.icon} size={22} color={visual.color} /></View>
        <View style={styles.rowCopy}>
          <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
          <Text numberOfLines={3} style={styles.message}>{item.message}</Text>
          <View style={styles.metadata}><Text style={styles.time}>{relativeDate(item.createdAt)}</Text>{!item.isRead ? <View style={styles.unreadDot} /> : null}{item.actionUrl ? <Text style={styles.actionText}>{visual.action}</Text> : null}</View>
        </View>
        {item.actionUrl ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
      </Pressable>
    </Animated.View>
  </View>;
}

const createStyles = (colors: ReturnType<typeof useSurfaceColors>) => StyleSheet.create({
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  guest: { flex: 1, justifyContent: 'center' },
  screen: { flex: 1 },
  list: { paddingTop: 8, flexGrow: 1 },
  loader: { marginTop: 42 },
  sectionTitle: { marginTop: 22, marginBottom: 12, color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  connectionBanner: { minHeight: 54, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: colors.surfaceStrong, padding: 14 },
  connectionText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  rowShell: { overflow: 'hidden', borderRadius: 22, marginBottom: 10, backgroundColor: colors.destructive },
  rowShellFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowShellLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  deleteBehind: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 88, alignItems: 'center', justifyContent: 'center', gap: 7 },
  deleteText: { color: colors.paper, fontSize: 11, fontWeight: '700' },
  row: { minHeight: 106, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 16 },
  rowUnread: { backgroundColor: colors.surface },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  unreadRail: { position: 'absolute', left: 0, top: 13, bottom: 13, width: 3, borderRadius: 2, backgroundColor: colors.violet },
  visual: { width: 46, height: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  time: { color: colors.textTertiary, fontSize: 11, lineHeight: 18 },
  message: { marginTop: 5, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  actionText: { color: colors.cyan, fontSize: 12, lineHeight: 18, fontWeight: '700', marginLeft: 'auto' },
  empty: { marginTop: 74, alignItems: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.1)' },
  emptyTitle: { marginTop: 15, color: colors.text, fontSize: 19, lineHeight: 24, fontWeight: '900' },
  emptyText: { maxWidth: 320, marginTop: 6, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
});
