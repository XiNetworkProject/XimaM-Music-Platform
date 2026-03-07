import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { api, type AppNotification } from '../services/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const NOTIF_ICON_MAP: Record<string, { icon: IoniconsName; color: string }> = {
  like:    { icon: 'heart',       color: '#FF4D6A' },
  follow:  { icon: 'person-add',  color: '#7B61FF' },
  comment: { icon: 'chatbubble',  color: '#00D0BB' },
  track:   { icon: 'musical-note', color: '#FFB84D' },
  ai:      { icon: 'sparkles',    color: '#7B61FF' },
  message: { icon: 'mail',        color: '#00D0BB' },
  system:  { icon: 'information-circle', color: colors.textSecondary },
};

const getNotifMeta = (type: string) =>
  NOTIF_ICON_MAP[type] || NOTIF_ICON_MAP.system;

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks}sem`;
  const months = Math.floor(days / 30);
  return `il y a ${months}mois`;
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const res = await api.getNotifications(50);
    if (res.success) {
      setNotifications(res.data.notifications);
    }
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => api.markNotificationRead(n._id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const handlePress = useCallback(
    async (notif: AppNotification) => {
      if (!notif.read) {
        api.markNotificationRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)),
        );
      }

      switch (notif.type) {
        case 'like':
        case 'comment':
          if (notif.data?.trackId) {
            navigation.navigate('Track', { id: notif.data.trackId });
          }
          break;
        case 'follow':
          if (notif.fromUser?.username) {
            navigation.navigate('PublicProfile', { username: notif.fromUser.username });
          }
          break;
        case 'message':
          navigation.navigate('Messages');
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const meta = getNotifMeta(item.type);
    const isUnread = !item.read;

    return (
      <Pressable
        style={[styles.notifItem, isUnread && styles.notifItemUnread]}
        onPress={() => handlePress(item)}
      >
        {isUnread && <View style={styles.unreadBar} />}

        <View style={[styles.notifIconWrap, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>

        {item.fromUser?.avatar ? (
          <Image source={{ uri: item.fromUser.avatar }} style={styles.avatar} />
        ) : item.fromUser ? (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(item.fromUser.name || item.fromUser.username || '?')[0].toUpperCase()}
            </Text>
          </View>
        ) : null}

        <View style={styles.notifBody}>
          <Text style={[styles.notifMessage, isUnread && styles.notifMessageUnread]} numberOfLines={3}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={56} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>Aucune notification</Text>
      <Text style={styles.emptySubtitle}>
        Vos notifications apparaîtront ici lorsque quelqu'un interagira avec votre contenu.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done" size={16} color={colors.accentBlue} />
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accentBrand} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentBrand}
              colors={[colors.accentBrand]}
              progressBackgroundColor={colors.background}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.accentBrand,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,208,187,0.1)',
  },
  markAllText: {
    color: colors.accentBlue,
    fontSize: 12,
    fontWeight: '600',
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Notification item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    position: 'relative',
  },
  notifItemUnread: {
    backgroundColor: 'rgba(123,97,255,0.04)',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accentBrand,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(123,97,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.accentBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  notifBody: {
    flex: 1,
  },
  notifMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  notifMessageUnread: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  notifTime: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 3,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginLeft: 64,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
