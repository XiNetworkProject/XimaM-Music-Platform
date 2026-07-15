import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { ActivityIndicator, Animated, FlatList, PanResponder, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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

const NOTIFICATIONS_REFRESH_MS = 60_000;

const tabs = [
  { id: 'all', label: 'Toutes' },
  { id: 'social', label: 'Social' },
  { id: 'music', label: 'Musique' },
  { id: 'system', label: 'Système' },
] as const;

function notificationVisual(item: SynauraNotification) {
  if (item.type.includes('like')) return { icon: 'heart' as const, color: '#EC4899', background: 'rgba(236,72,153,0.12)', action: 'Voir le son' };
  if (item.type.includes('comment') || item.type.includes('message')) return { icon: 'chatbubble-ellipses' as const, color: '#8B5CF6', background: 'rgba(139,92,246,0.12)', action: 'Répondre' };
  if (item.type.includes('follower')) return { icon: 'person-add' as const, color: '#0891B2', background: 'rgba(34,211,238,0.13)', action: 'Voir le profil' };
  if (item.type.includes('milestone')) return { icon: 'flame' as const, color: '#FF6B6B', background: 'rgba(255,107,107,0.14)', action: 'Voir les stats' };
  if (item.category === 'music') return { icon: 'musical-notes' as const, color: '#16A34A', background: 'rgba(34,197,94,0.12)', action: 'Écouter' };
  return { icon: 'notifications' as const, color: '#B7791F', background: 'rgba(245,184,75,0.14)', action: 'Ouvrir' };
}

function relativeDate(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
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
        // A broken cache must never block the live Supabase request.
      }
    }

    try {
      const data = await getNotifications(category);
      setItems(data.notifications);
      setUnread(data.unread);
      void nativeNotifications.refreshUnread(data.unread);
      if (cacheKey) {
        void AsyncStorage.setItem(cacheKey, JSON.stringify({
          notifications: data.notifications,
          unread: data.unread,
          total: data.total,
          cachedAt: Date.now(),
        })).catch(() => {});
      }
    } catch (nextError) {
      setError(hasCachedData
        ? 'Actualisation interrompue. Les dernières notifications restent affichées.'
        : nextError instanceof Error ? nextError.message : 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey, category, nativeNotifications.refreshUnread]);

  useFocusEffect(React.useCallback(() => {
    void load();
    const interval = setInterval(() => void load('background'), NOTIFICATIONS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]));

  const openNotification = async (item: SynauraNotification) => {
    if (!item.isRead) {
      setItems((current) => current.map((next) => next.id === item.id ? { ...next, isRead: true } : next));
      setUnread((count) => Math.max(0, count - 1));
      markNotificationRead(item.id).catch(() => {});
      void nativeNotifications.refreshUnread();
    }
    if (item.actionUrl) {
      await openInternalLink(navigation, item.actionUrl, { playTrack: (track) => player.playTrack(track) });
    }
  };

  const markAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnread(0);
    await markAllNotificationsRead();
    await nativeNotifications.refreshUnread();
  };

  const remove = async (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    await deleteNotification(id);
    await nativeNotifications.refreshUnread();
  };

  return (
    <SynauraBackground variant="warm">
      <View style={[styles.screen, responsive.pageContent]}>
        <AppHeader
          flush
          compact
          title="Notifications"
          subtitle={unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}
          onBack={() => navigation.goBack()}
          action={{ icon: 'checkmark-done', label: 'Tout marquer comme lu', onPress: () => { if (unread) void markAll(); } }}
        />
        <SegmentedControl value={category} options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))} onChange={setCategory} compact />
        <View style={[styles.syncStatus, nativeNotifications.syncError && styles.syncStatusError]}>
          <View style={styles.syncIcon}>
            <Ionicons name={nativeNotifications.syncError ? 'cloud-offline-outline' : nativeNotifications.lastSyncedAt ? 'cloud-done-outline' : 'sync-outline'} size={17} color={nativeNotifications.syncError ? '#B91C1C' : '#7357C6'} />
          </View>
          <View style={styles.syncCopy}>
            <Text style={styles.syncTitle}>{nativeNotifications.syncError ? 'Synchronisation interrompue' : nativeNotifications.lastSyncedAt ? 'Centre Supabase synchronisé' : 'Synchronisation Supabase'}</Text>
            <Text style={styles.syncText}>{nativeNotifications.syncError || (!nativeNotifications.lastSyncedAt ? 'Connexion au centre de notifications…' : nativeNotifications.status === 'ready' ? 'Téléphone enregistré pour le push Android' : 'Les alertes restent disponibles dans cette cloche')}</Text>
          </View>
          <View style={[styles.syncDot, Boolean(nativeNotifications.lastSyncedAt) && !nativeNotifications.syncError && styles.syncDotReady, nativeNotifications.syncError && styles.syncDotError]} />
        </View>
        {loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 36 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: responsive.bottomDockClearance + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><Ionicons name="notifications-off-outline" size={24} color="#8B5CF6" /></View>
              <Text style={styles.emptyTitle}>Tout est calme</Text>
              <Text style={styles.empty}>Tes likes, commentaires, votes et nouveaux sons apparaîtront ici.</Text>
            </View>
          ) : null}
          renderItem={({ item }) => {
            const visual = notificationVisual(item);
            return <NotificationRow item={item} visual={visual} onOpen={() => void openNotification(item)} onRemove={() => void remove(item.id)} />;
          }}
        />
      </View>
    </SynauraBackground>
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
    <View style={styles.rowShell}>
      <View style={styles.deleteBehind}><Ionicons name="trash-outline" size={19} color="#FFFFFF" /><Text style={styles.deleteBehindText}>Supprimer</Text></View>
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX }] }}>
        <Pressable onPress={onOpen} style={[styles.card, !item.isRead && styles.cardUnread]}>
          <View style={[styles.visual, { backgroundColor: visual.background }]}>
            <Ionicons name={visual.icon} size={19} color={visual.color} />
            {!item.isRead ? <View style={styles.unreadDot} /> : null}
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.actionText}>{item.actionUrl ? visual.action : item.category}</Text>
              <Text style={styles.meta}>{relativeDate(item.createdAt)}</Text>
            </View>
          </View>
          <Pressable accessibilityLabel="Supprimer" onPress={(event) => { event.stopPropagation(); onRemove(); }} style={styles.trash}>
            <Ionicons name="close" size={16} color="rgba(23,19,19,0.42)" />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18 },
  list: { paddingTop: 12, paddingBottom: 120, gap: 8 },
  rowShell: { overflow: 'hidden', borderRadius: 10, backgroundColor: '#C94F4F' },
  deleteBehind: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-end', justifyContent: 'center', gap: 3, paddingRight: 18 },
  deleteBehindText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  card: { minHeight: 82, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)', padding: 12 },
  cardUnread: { borderColor: 'rgba(115,87,198,0.32)', backgroundColor: '#FCFAFF' },
  visual: { width: 42, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, minWidth: 0 },
  unreadDot: { position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: '#8B5CF6', borderWidth: 2, borderColor: '#FFF9EF' },
  cardTitle: { color: '#171313', fontSize: 15, fontWeight: '900' },
  message: { color: '#5A4E49', fontSize: 13, lineHeight: 19, marginTop: 3 },
  cardFooter: { marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actionText: { color: '#8B5CF6', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  meta: { color: '#9B8F89', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  trash: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(23,19,19,0.04)', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { marginTop: 42, alignItems: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', padding: 24 },
  emptyIcon: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.12)' },
  emptyTitle: { marginTop: 12, color: '#171313', fontSize: 17, fontWeight: '900' },
  empty: { marginTop: 5, textAlign: 'center', color: '#6B5F5A', lineHeight: 18, fontWeight: '700' },
  error: { color: '#B91C1C', fontWeight: '800', marginBottom: 10 },
  syncStatus: { minHeight: 58, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(115,87,198,0.16)', backgroundColor: 'rgba(115,87,198,0.07)', paddingHorizontal: 11 },
  syncStatusError: { borderColor: 'rgba(185,28,28,0.18)', backgroundColor: 'rgba(185,28,28,0.06)' },
  syncIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  syncCopy: { flex: 1, minWidth: 0 },
  syncTitle: { color: '#171313', fontSize: 11, fontWeight: '900' },
  syncText: { marginTop: 2, color: '#6B5F5A', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D6A63E' },
  syncDotReady: { backgroundColor: '#16A34A' },
  syncDotError: { backgroundColor: '#B91C1C' },
});
