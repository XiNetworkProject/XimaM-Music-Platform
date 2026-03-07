import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api, type Conversation } from '../services/api';

const BG = '#020017';
const CARD = 'rgba(15,23,42,0.9)';
const ACCENT = '#7B61FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.6)';
const BORDER = 'rgba(255,255,255,0.08)';
const ONLINE_GREEN = '#22C55E';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  if (diff < 0) return "à l'instant";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks}sem`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months}mo`;
  return `il y a ${Math.floor(months / 12)}a`;
}

function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    const res = await api.getConversations();
    if (res.success) setConversations(res.data.conversations);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const other = c.participants.find((p) => p._id !== user?.id);
      if (!other) return false;
      return (
        (other.name ?? '').toLowerCase().includes(q) ||
        other.username.toLowerCase().includes(q) ||
        (c.lastMessage?.content ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, search, user?.id]);

  const getOtherParticipant = useCallback(
    (c: Conversation) => c.participants.find((p) => p._id !== user?.id) ?? c.participants[0],
    [user?.id],
  );

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => {
      const other = getOtherParticipant(item);
      const unread = item.unreadCount ?? 0;

      return (
        <Pressable
          style={({ pressed }) => [styles.conversationRow, pressed && styles.rowPressed]}
          onPress={() => navigation.navigate('Conversation', { id: item._id })}
        >
          <View style={styles.avatarWrap}>
            {other.avatar ? (
              <Image source={{ uri: other.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {(other.name ?? other.username)?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            {isOnline(undefined) ? null : null}
          </View>

          <View style={styles.conversationBody}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, unread > 0 && styles.nameBold]} numberOfLines={1}>
                {other.name ?? other.username}
              </Text>
              {item.lastMessage?.createdAt && (
                <Text style={styles.timeText}>{relativeTime(item.lastMessage.createdAt)}</Text>
              )}
            </View>
            <View style={styles.previewRow}>
              <Text
                style={[styles.previewText, unread > 0 && styles.previewUnread]}
                numberOfLines={1}
              >
                {item.lastMessage?.content ?? 'Nouvelle conversation'}
              </Text>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [getOtherParticipant, navigation],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          hitSlop={12}
          style={styles.newBtn}
        >
          <Ionicons name="add-circle-outline" size={26} color={ACCENT} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={TEXT_SECONDARY} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation…"
          placeholderTextColor={TEXT_SECONDARY}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={TEXT_SECONDARY} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={56} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyDesc}>
              Envoyez un message à quelqu'un pour démarrer une conversation.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="add" size={18} color={TEXT_PRIMARY} />
              <Text style={styles.emptyBtnText}>Nouvelle conversation</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 50 },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 14,
  },
  newBtn: { padding: 4 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    paddingVertical: 0,
  },

  listContent: { paddingBottom: 32 },

  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowPressed: { opacity: 0.65 },

  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '700' },

  conversationBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  nameText: { flex: 1, color: TEXT_PRIMARY, fontSize: 15 },
  nameBold: { fontWeight: '700' },
  timeText: { color: TEXT_SECONDARY, fontSize: 12, marginLeft: 8 },

  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewText: { flex: 1, color: TEXT_SECONDARY, fontSize: 13 },
  previewUnread: { color: TEXT_PRIMARY, fontWeight: '600' },

  badge: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '700' },

  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyDesc: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
    gap: 6,
  },
  emptyBtnText: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
});

export default MessagesScreen;
