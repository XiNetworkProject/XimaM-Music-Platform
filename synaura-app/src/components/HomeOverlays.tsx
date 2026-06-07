import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL, deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead, searchEverything } from '@/api/client';
import type { SearchResults, SynauraNotification, Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, spacing } from '@/theme/tokens';

const emptyResults: SearchResults = { tracks: [], posts: [], artists: [], playlists: [] };
const notificationCategories = ['all', 'social', 'music', 'system'] as const;

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

function SheetHeader({ title, subtitle, onClose, action }: { title: string; subtitle: string; onClose: () => void; action?: React.ReactNode }) {
  return (
    <View style={styles.sheetHeader}>
      <View style={styles.sheetTitleWrap}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <Text style={styles.sheetSubtitle}>{subtitle}</Text>
      </View>
      {action}
      <Pressable onPress={onClose} style={styles.iconButton}>
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export function UniversalSearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!visible || q.length < 2) {
      setResults(emptyResults);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const next = await searchEverything(q);
        if (!cancelled) setResults(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 240);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible]);

  const total = results.tracks.length + results.posts.length + results.artists.length + results.playlists.length;
  const openPath = (path: string) => Linking.openURL(`${API_BASE_URL}${path}`).catch(() => {});

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <SheetHeader title="Recherche Synaura" subtitle={loading ? 'Recherche...' : total ? `${total} resultats` : 'sons, posts, playlists et createurs'} onClose={onClose} />
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={19} color={colors.textTertiary} />
            <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Rechercher sur Synaura..." placeholderTextColor={colors.textTertiary} style={styles.searchInput} />
            {query ? <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={colors.textTertiary} /></Pressable> : null}
          </View>
          <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
            {query.trim().length < 2 ? <Empty icon="search" title="Recherche universelle" text="Tape au moins deux caracteres." /> : null}
            {!loading && query.trim().length >= 2 && total === 0 ? <Empty icon="search" title="Aucun resultat" text={`Rien pour "${query.trim()}".`} /> : null}
            {results.tracks.length ? <ResultTitle label="Sons" icon="musical-notes" /> : null}
            {results.tracks.map((track) => (
              <Pressable key={track._id} onPress={() => player.playTrack(track)} style={styles.resultRow}>
                <TrackCover track={track} active={visible} style={styles.resultImage} />
                <View style={styles.resultCopy}><Text numberOfLines={1} style={styles.resultTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.resultMeta}>{artistName(track)}</Text></View>
                <View style={styles.playCircle}><Ionicons name="play" size={14} color={colors.paper} /></View>
              </Pressable>
            ))}
            {results.posts.length ? <ResultTitle label="Posts" icon="chatbubble" /> : null}
            {results.posts.map((post) => <Pressable key={post.id} onPress={() => openPath(`/posts/${post.id}`)} style={styles.resultRow}><Avatar text={post.avatar} /><View style={styles.resultCopy}><Text style={styles.resultTitle}>{post.author}</Text><Text numberOfLines={2} style={styles.resultMeta}>{post.text}</Text></View></Pressable>)}
            {results.artists.length ? <ResultTitle label="Createurs" icon="people" /> : null}
            {results.artists.map((artist) => <Pressable key={artist.id} onPress={() => openPath(`/profile/${artist.handle.replace(/^@/, '')}`)} style={styles.resultRow}><Avatar text={artist.avatar} color={artist.tint} /><View style={styles.resultCopy}><Text style={styles.resultTitle}>{artist.name}</Text><Text style={styles.resultMeta}>{artist.handle}</Text></View></Pressable>)}
            {results.playlists.length ? <ResultTitle label="Playlists" icon="albums" /> : null}
            {results.playlists.map((playlist) => <Pressable key={playlist.id} onPress={() => openPath(`/playlists/${playlist.id}`)} style={styles.resultRow}><Image source={{ uri: playlist.covers[0] }} style={styles.resultImage} /><View style={styles.resultCopy}><Text style={styles.resultTitle}>{playlist.title}</Text><Text style={styles.resultMeta}>{playlist.tracks}</Text></View></Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function NotificationModal({ visible, onClose, onUnreadChange }: { visible: boolean; onClose: () => void; onUnreadChange: (count: number) => void }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SynauraNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [category, setCategory] = useState<(typeof notificationCategories)[number]>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(category);
      setItems(data.notifications);
      setUnread(data.unread);
      onUnreadChange(data.unread);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void load();
  }, [category, visible]);

  const markAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnread(0);
    onUnreadChange(0);
    await markAllNotificationsRead().catch(() => {});
  };

  const openNotification = async (item: SynauraNotification) => {
    if (!item.isRead) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
      setUnread((count) => Math.max(0, count - 1));
      onUnreadChange(Math.max(0, unread - 1));
      await markNotificationRead(item.id).catch(() => {});
    }
    if (item.actionUrl) Linking.openURL(item.actionUrl.startsWith('http') ? item.actionUrl : `${API_BASE_URL}${item.actionUrl}`).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <SheetHeader title="Notifications" subtitle={unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est a jour'} onClose={onClose} action={unread ? <Pressable onPress={markAll} style={styles.iconButton}><Ionicons name="checkmark-done" size={19} color={colors.textSecondary} /></Pressable> : undefined} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {notificationCategories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item === 'all' ? 'Toutes' : item}</Text></Pressable>)}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.results}>
            {loading ? <ActivityIndicator color={colors.black} style={{ marginTop: 40 }} /> : null}
            {!loading && !items.length ? <Empty icon="notifications-outline" title="Aucune notification" text="Les nouvelles activites apparaitront ici." /> : null}
            {items.map((item) => (
              <Pressable key={item.id} onPress={() => openNotification(item)} style={[styles.notification, !item.isRead && styles.notificationUnread]}>
                <View style={styles.notificationIcon}><Ionicons name={item.type.includes('like') ? 'heart' : item.type.includes('follow') ? 'person-add' : item.type.includes('music') ? 'musical-note' : 'notifications'} size={18} color={item.isRead ? colors.textSecondary : colors.violet} /></View>
                <View style={styles.resultCopy}><View style={styles.notificationTitleRow}><Text style={styles.resultTitle}>{item.title}</Text>{!item.isRead ? <View style={styles.unreadDot} /> : null}</View><Text style={styles.resultMeta}>{item.message}</Text><Text style={styles.notificationTime}>{relativeTime(item.createdAt)}</Text></View>
                <Pressable onPress={() => { setItems((current) => current.filter((entry) => entry.id !== item.id)); void deleteNotification(item.id).catch(() => {}); }} style={styles.deleteButton}><Ionicons name="close" size={15} color={colors.textTertiary} /></Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ResultTitle({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.resultSectionTitle}><Ionicons name={icon} size={15} color={colors.textTertiary} /><Text style={styles.resultSectionText}>{label}</Text></View>;
}

function Avatar({ text, color = colors.black }: { text: string; color?: string }) {
  return <View style={[styles.avatar, { backgroundColor: color }]}><Text style={styles.avatarText}>{text.slice(0, 1)}</Text></View>;
}

function Empty({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return <View style={styles.empty}><Ionicons name={icon} size={28} color={colors.textTertiary} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(23,19,19,0.34)', justifyContent: 'flex-start', padding: spacing.md },
  sheet: { maxHeight: '88%', overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: '#D8CBB8', backgroundColor: '#FFF7EC', shadowColor: '#1E1914', shadowOpacity: 0.28, shadowRadius: 35, elevation: 14 },
  sheetHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderColor: '#E2D6C4', backgroundColor: '#FFFAF2' },
  sheetTitleWrap: { flex: 1 }, sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, sheetSubtitle: { marginTop: 2, color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
  searchInputWrap: { margin: spacing.md, height: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 24, backgroundColor: '#EFE4D4', paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' },
  results: { padding: spacing.md, paddingBottom: 50, gap: spacing.sm },
  resultSectionTitle: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  resultSectionText: { color: colors.textTertiary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  resultRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 17, backgroundColor: '#EFE4D4', padding: spacing.sm },
  resultImage: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(23,19,19,0.08)' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.paper, fontSize: 15, fontWeight: '900' },
  resultCopy: { flex: 1, minWidth: 0 }, resultTitle: { color: colors.text, fontSize: 13, fontWeight: '900' }, resultMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  playCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  empty: { alignItems: 'center', paddingVertical: 50 }, emptyTitle: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: 14, fontWeight: '900' }, emptyText: { marginTop: 4, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  categories: { gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderColor: '#E2D6C4' },
  category: { height: 34, justifyContent: 'center', borderRadius: 17, backgroundColor: '#EFE4D4', paddingHorizontal: 14 }, categoryActive: { backgroundColor: colors.black },
  categoryText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'capitalize' }, categoryTextActive: { color: colors.paper },
  notification: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: 17, borderWidth: 1, borderColor: '#DCCFBB', backgroundColor: '#FFF8EE', padding: spacing.md },
  notificationUnread: { borderColor: 'rgba(124,92,255,0.18)', backgroundColor: 'rgba(124,92,255,0.08)' },
  notificationIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.violet },
  notificationTime: { marginTop: 5, color: colors.textTertiary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  deleteButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
