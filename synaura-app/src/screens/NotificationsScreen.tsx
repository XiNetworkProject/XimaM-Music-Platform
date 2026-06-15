import React from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/client';
import type { SynauraNotification } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { openInternalLink } from '@/navigation/internalLinks';
import { usePlayer } from '@/player/PlayerProvider';

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const [category, setCategory] = React.useState<(typeof tabs)[number]['id']>('all');
  const [items, setItems] = React.useState<SynauraNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(category);
      setItems(data.notifications);
      setUnread(data.unread);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openNotification = async (item: SynauraNotification) => {
    if (!item.isRead) {
      setItems((current) => current.map((next) => next.id === item.id ? { ...next, isRead: true } : next));
      setUnread((count) => Math.max(0, count - 1));
      markNotificationRead(item.id).catch(() => {});
    }
    if (item.actionUrl) {
      await openInternalLink(navigation, item.actionUrl, { playTrack: (track) => player.playTrack(track) });
    }
  };

  const markAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnread(0);
    await markAllNotificationsRead();
  };

  const remove = async (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    await deleteNotification(id);
  };

  return (
    <SynauraBackground variant="warm">
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}</Text>
            <Text style={styles.title}>Notifications</Text>
          </View>
          <Pressable onPress={markAll} disabled={!unread} style={[styles.markBtn, !unread && styles.markBtnDisabled]}><Text style={styles.markText}>Tout lu</Text></Pressable>
        </View>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable key={tab.id} onPress={() => setCategory(tab.id)} style={[styles.tab, category === tab.id && styles.tabActive]}>
              <Text style={[styles.tabText, category === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 36 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
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
            return (
              <Pressable onPress={() => void openNotification(item)} style={[styles.card, !item.isRead && styles.cardUnread]}>
                <View style={[styles.visual, { backgroundColor: visual.background }]}>
                  <Ionicons name={visual.icon} size={19} color={visual.color} />
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.actionText}>{item.actionUrl ? visual.action : item.category}</Text>
                    <Text style={styles.meta}>{relativeDate(item.createdAt)}</Text>
                  </View>
                </View>
                <Pressable onPress={(event) => { event.stopPropagation(); void remove(item.id); }} style={styles.trash}>
                  <Ionicons name="close" size={16} color="rgba(23,19,19,0.42)" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      </View>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#8B5CF6', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: '#171313', fontSize: 24, fontWeight: '900' },
  markBtn: { borderRadius: 10, backgroundColor: '#171313', paddingHorizontal: 12, paddingVertical: 9 },
  markBtnDisabled: { opacity: 0.32 },
  markText: { color: '#FFF7ED', fontSize: 12, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9 },
  tabActive: { backgroundColor: '#171313' },
  tabText: { color: '#6B5F5A', fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: '#FFF7ED' },
  list: { paddingBottom: 120, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)', padding: 12 },
  cardUnread: { borderColor: 'rgba(139,92,246,0.32)', backgroundColor: 'rgba(255,250,244,0.94)' },
  visual: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
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
});
