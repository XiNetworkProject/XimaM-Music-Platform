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
import { SynauraBackground } from '@/components/SynauraBackground';
import { openInternalLink } from '@/navigation/internalLinks';
import { usePlayer } from '@/player/PlayerProvider';
import { AppHeader } from '@/components/ui/AppHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';

const NOTIFICATIONS_REFRESH_MS = 60_000;

const tabs = [
  { id: 'all', label: 'Toutes' },
  { id: 'social', label: 'Social' },
  { id: 'music', label: 'Musique' },
  { id: 'message', label: 'Messages' },
  { id: 'system', label: 'Système' },
] as const;

type NotificationSection = { title: string; data: SynauraNotification[] };

function notificationVisual(item: SynauraNotification) {
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
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial') setLoading(true);
    setError(null);
    let hasCachedData = false;

    if (mode === 'initial' && cacheKey) {
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
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
      const data = await getNotifications(category);
      setItems(data.notifications);
      setUnread(data.unread);
      void nativeNotifications.refreshUnread(data.unread);
      persistCache(data.notifications, data.unread);
    } catch (nextError) {
      setError(hasCachedData
        ? 'Actualisation interrompue. Ton activité récente reste disponible.'
        : nextError instanceof Error ? nextError.message : 'Impossible de charger ton activité.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey, category, nativeNotifications.refreshUnread, persistCache]);

  useFocusEffect(React.useCallback(() => {
    void load();
    const interval = setInterval(() => void load('background'), NOTIFICATIONS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]));

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
    const previousItems = items;
    const nextItems = items.map((item) => ({ ...item, isRead: true }));
    setItems(nextItems);
    setUnread(0);
    persistCache(nextItems, 0);
    try {
      await markAllNotificationsRead();
      await nativeNotifications.refreshUnread(0);
    } catch {
      setItems(previousItems);
      setUnread(previousItems.filter((item) => !item.isRead).length);
      setError("Impossible de marquer toute l'activité comme lue.");
    }
  };

  const remove = async (item: SynauraNotification) => {
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
      setItems(previousItems);
      setUnread(previousUnread);
      setError('Suppression impossible pour le moment.');
    }
  };

  const connectionIssue = error || (nativeNotifications.syncError ? 'La mise à jour automatique est momentanément indisponible.' : null);

  return (
    <SynauraBackground variant="warm">
      <View style={[styles.screen, responsive.pageContent]}>
        <AppHeader
          flush
          compact
          eyebrow="Synaura"
          title="Activité"
          subtitle={unread ? `${unread} nouvelle${unread > 1 ? 's' : ''} activité${unread > 1 ? 's' : ''}` : 'Tu es à jour'}
          onBack={() => navigation.goBack()}
          action={unread ? { icon: 'checkmark-done', label: 'Tout marquer comme lu', onPress: () => void markAll() } : undefined}
        />
        <SegmentedControl value={category} options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))} onChange={setCategory} compact />

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
          ListEmptyComponent={!loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="radio-outline" size={27} color={colors.violet} /></View>
              <Text style={styles.emptyTitle}>Tout est calme</Text>
              <Text style={styles.emptyText}>Les réactions à tes sons, les commentaires et les nouvelles sorties apparaîtront ici.</Text>
            </View>
          ) : null}
          renderItem={({ item, index, section }) => {
            const visual = notificationVisual(item);
            return (
              <NotificationRow
                item={item}
                visual={visual}
                first={index === 0}
                last={index === section.data.length - 1}
                onOpen={() => void openNotification(item)}
                onRemove={() => void remove(item)}
              />
            );
          }}
        />
      </View>
    </SynauraBackground>
  );
}

function NotificationRow({
  item,
  visual,
  first,
  last,
  onOpen,
  onRemove,
}: {
  item: SynauraNotification;
  visual: ReturnType<typeof notificationVisual>;
  first: boolean;
  last: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const responder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-132, Math.min(0, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -105 || gesture.vx < -1.2) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        Animated.timing(translateX, { toValue: -420, duration: 180, useNativeDriver: true }).start(onRemove);
      } else {
        Animated.spring(translateX, { toValue: 0, speed: 28, bounciness: 4, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, speed: 28, bounciness: 4, useNativeDriver: true }).start(),
  }), [onRemove, translateX]);

  return (
    <View style={[styles.rowShell, first && styles.rowShellFirst, last && styles.rowShellLast]}>
      <View style={styles.deleteBehind}><Ionicons name="trash-outline" size={19} color={colors.paper} /><Text style={styles.deleteText}>Supprimer</Text></View>
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX }] }}>
        <Pressable
          accessibilityActions={[{ name: 'delete', label: 'Supprimer' }]}
          onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'delete') onRemove(); }}
          onPress={onOpen}
          style={[styles.row, !item.isRead && styles.rowUnread, !last && styles.rowDivider]}
        >
          {!item.isRead ? <View style={styles.unreadRail} /> : null}
          <View style={[styles.visual, { backgroundColor: visual.background }]}>
            <Ionicons name={visual.icon} size={20} color={visual.color} />
          </View>
          <View style={styles.rowCopy}>
            <View style={styles.rowTitleLine}>
              <Text numberOfLines={1} style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.time}>{relativeDate(item.createdAt)}</Text>
            </View>
            <Text numberOfLines={3} style={styles.message}>{item.message}</Text>
            {item.actionUrl ? <Text style={styles.actionText}>{visual.action}</Text> : null}
          </View>
          {item.actionUrl ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18 },
  list: { paddingTop: 8, gap: 0 },
  loader: { marginTop: 42 },
  sectionTitle: { marginTop: 24, marginBottom: 8, color: colors.textSecondary, fontSize: 11, lineHeight: 14, fontWeight: '900', textTransform: 'uppercase' },
  connectionBanner: { minHeight: 46, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(217,109,99,0.2)', backgroundColor: 'rgba(217,109,99,0.07)', paddingHorizontal: 11 },
  connectionText: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  rowShell: { overflow: 'hidden', borderRadius: 0, backgroundColor: colors.coral },
  rowShellFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowShellLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  deleteBehind: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center', gap: 3, paddingRight: 18 },
  deleteText: { color: colors.paper, fontSize: 9, fontWeight: '900' },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 12 },
  rowUnread: { backgroundColor: '#1C1921' },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  unreadRail: { position: 'absolute', left: 0, top: 13, bottom: 13, width: 3, borderRadius: 2, backgroundColor: colors.violet },
  visual: { width: 43, height: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  time: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  message: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  actionText: { marginTop: 7, color: colors.cyan, fontSize: 9, lineHeight: 11, fontWeight: '900', textTransform: 'uppercase' },
  empty: { marginTop: 74, alignItems: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.1)' },
  emptyTitle: { marginTop: 15, color: colors.text, fontSize: 19, lineHeight: 24, fontWeight: '900' },
  emptyText: { maxWidth: 320, marginTop: 6, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
});
