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
  { id: 'music', label: 'Music' },
  { id: 'system', label: 'System' },
] as const;

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  React.useEffect(() => {
    load();
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
      <View style={[styles.screen, { paddingTop: insets.top + 64 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{unread} non lues</Text>
            <Text style={styles.title}>Notifications</Text>
          </View>
          <Pressable onPress={markAll} style={styles.markBtn}><Text style={styles.markText}>Tout lu</Text></Pressable>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>Aucune notification pour le moment.</Text> : null}
          renderItem={({ item }) => (
            <Pressable onPress={() => openNotification(item)} style={[styles.card, !item.isRead && styles.cardUnread]}>
              <View style={[styles.dot, item.isRead && styles.dotRead]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.meta}>{item.category} · {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Pressable onPress={() => remove(item.id)} style={styles.trash}>
                <Ionicons name="trash-outline" size={17} color="#B91C1C" />
              </Pressable>
            </Pressable>
          )}
        />
      </View>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.76)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#8B5CF6', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: '#171313', fontSize: 28, fontWeight: '900' },
  markBtn: { borderRadius: 999, backgroundColor: '#171313', paddingHorizontal: 12, paddingVertical: 9 },
  markText: { color: '#FFF7ED', fontSize: 12, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.66)', paddingHorizontal: 12, paddingVertical: 9 },
  tabActive: { backgroundColor: '#171313' },
  tabText: { color: '#6B5F5A', fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: '#FFF7ED' },
  list: { paddingBottom: 140, gap: 10 },
  card: { flexDirection: 'row', gap: 10, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', padding: 14 },
  cardUnread: { borderColor: 'rgba(139,92,246,0.32)', backgroundColor: 'rgba(255,250,244,0.94)' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#8B5CF6', marginTop: 6 },
  dotRead: { backgroundColor: 'rgba(23,19,19,0.18)' },
  cardTitle: { color: '#171313', fontSize: 15, fontWeight: '900' },
  message: { color: '#5A4E49', fontSize: 13, lineHeight: 19, marginTop: 3 },
  meta: { color: '#9B8F89', fontSize: 11, fontWeight: '800', marginTop: 8, textTransform: 'uppercase' },
  trash: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(185,28,28,0.08)', alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#6B5F5A', marginTop: 42, fontWeight: '800' },
  error: { color: '#B91C1C', fontWeight: '800', marginBottom: 10 },
});
