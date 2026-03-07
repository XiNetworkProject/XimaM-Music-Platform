import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type ApiTrack, type ApiPlaylist } from '../services/api';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');
const HISTORY_KEY = 'synaura.history.v1';
const MAX_HISTORY = 100;

type TabId = 'favorites' | 'playlists' | 'history' | 'queue';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'favorites', label: 'Favoris', icon: 'heart' },
  { id: 'playlists', label: 'Playlists', icon: 'disc' },
  { id: 'history', label: 'Historique', icon: 'time' },
  { id: 'queue', label: "File d'attente", icon: 'list' },
];

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const getArtistName = (track: ApiTrack) =>
  track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste inconnu';

// ---------- TRACK ROW ----------

const TrackRow: React.FC<{
  track: ApiTrack;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
}> = React.memo(({ track, index, isActive, isPlaying, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.trackRow,
      isActive && styles.trackRowActive,
      pressed && { opacity: 0.85 },
    ]}
  >
    <View style={styles.trackCover}>
      {track.coverUrl ? (
        <Image source={{ uri: track.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['rgba(123,97,255,0.6)', 'rgba(0,208,187,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>

    <View style={styles.trackInfo}>
      <Text numberOfLines={1} style={[styles.trackTitle, isActive && styles.trackTitleActive]}>
        {track.title || 'Sans titre'}
      </Text>
      <Text numberOfLines={1} style={styles.trackArtist}>
        {getArtistName(track)}
      </Text>
    </View>

    <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>

    <View style={[styles.trackPlayBtn, isActive && styles.trackPlayBtnActive]}>
      <Ionicons
        name={isActive && isPlaying ? 'pause' : 'play'}
        size={14}
        color={isActive ? '#7B61FF' : '#f9fafb'}
      />
    </View>
  </Pressable>
));

// ---------- PLAYLIST CARD ----------

const PlaylistCard: React.FC<{
  playlist: ApiPlaylist;
  onPress: () => void;
}> = React.memo(({ playlist, onPress }) => {
  const name = playlist.name || playlist.title || 'Playlist';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.playlistCard, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.playlistCover}>
        {playlist.coverUrl ? (
          <Image source={{ uri: playlist.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['rgba(123,97,255,0.7)', 'rgba(0,208,187,0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.playlistCoverOverlay}>
          <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.85)" />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.playlistName}>{name}</Text>
      <Text style={styles.playlistCount}>
        {playlist.trackCount ?? playlist.tracks?.length ?? 0} titre{(playlist.trackCount ?? playlist.tracks?.length ?? 0) !== 1 ? 's' : ''}
      </Text>
    </Pressable>
  );
});

// ---------- EMPTY STATE ----------

const EmptyState: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name={icon} size={32} color="rgba(123,97,255,0.6)" />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);

// ---------- TABS CONTENT ----------

const FavoritesTab: React.FC<{
  searchQuery: string;
  current: ApiTrack | null;
  isPlaying: boolean;
  onPlay: (tracks: ApiTrack[], index: number) => void;
}> = ({ searchQuery, current, isPlaying, onPlay }) => {
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const r = await api.getForYouFeed(50, true);
    if (r.success) {
      const liked = r.data.tracks?.filter((t) => t.isLiked) ?? [];
      setTracks(liked.length > 0 ? liked : r.data.tracks?.slice(0, 30) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        getArtistName(t).toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  if (!filtered.length) {
    return (
      <EmptyState
        icon="heart-outline"
        title="Aucun favori"
        subtitle={searchQuery ? 'Aucun résultat pour cette recherche' : 'Tes morceaux likés apparaîtront ici'}
      />
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item._id}
      renderItem={({ item, index }) => (
        <TrackRow
          track={item}
          index={index}
          isActive={current?._id === item._id}
          isPlaying={current?._id === item._id && isPlaying}
          onPress={() => onPlay(filtered, index)}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#7B61FF"
          colors={['#7B61FF']}
        />
      }
    />
  );
};

const PlaylistsTab: React.FC<{
  searchQuery: string;
}> = ({ searchQuery }) => {
  const navigation = useNavigation<any>();
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const r = await api.getPlaylists();
    if (r.success) setPlaylists(r.data.playlists ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const r = await api.createPlaylist({ name });
    setCreating(false);
    if (r.success) {
      setModalVisible(false);
      setNewName('');
      load();
    } else {
      Alert.alert('Erreur', r.error || 'Impossible de créer la playlist');
    }
  }, [newName, load]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase();
    return playlists.filter((p) =>
      (p.name || p.title || '').toLowerCase().includes(q)
    );
  }, [playlists, searchQuery]);

  const renderHeader = () => (
    <Pressable
      style={styles.createPlaylistBtn}
      onPress={() => setModalVisible(true)}
    >
      <LinearGradient
        colors={['rgba(123,97,255,0.3)', 'rgba(0,208,187,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="add-circle-outline" size={22} color="#7B61FF" />
      <Text style={styles.createPlaylistText}>Créer une playlist</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.playlistGrid}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PlaylistCard
            playlist={item}
            onPress={() => navigation.navigate('Playlist', { id: item._id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="disc-outline"
            title="Aucune playlist"
            subtitle={searchQuery ? 'Aucun résultat' : 'Crée ta première playlist !'}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#7B61FF"
            colors={['#7B61FF']}
          />
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Nouvelle playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de la playlist"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={60}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateBtn, !newName.trim() && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>Créer</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const HistoryTab: React.FC<{
  searchQuery: string;
  current: ApiTrack | null;
  isPlaying: boolean;
  onPlay: (tracks: ApiTrack[], index: number) => void;
  onTrackPlayed?: ApiTrack | null;
}> = ({ searchQuery, current, isPlaying, onPlay, onTrackPlayed }) => {
  const [history, setHistory] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as ApiTrack[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!onTrackPlayed?._id) return;
    setHistory((prev) => {
      const without = prev.filter((t) => t._id !== onTrackPlayed._id);
      const next = [onTrackPlayed, ...without].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [onTrackPlayed?._id]);

  const clearHistory = useCallback(() => {
    Alert.alert('Effacer l\'historique', 'Supprimer tout l\'historique de lecture ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(HISTORY_KEY);
          setHistory([]);
        },
      },
    ]);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        getArtistName(t).toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color="#7B61FF" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item, i) => `${item._id}-${i}`}
      renderItem={({ item, index }) => (
        <TrackRow
          track={item}
          index={index}
          isActive={current?._id === item._id}
          isPlaying={current?._id === item._id && isPlaying}
          onPress={() => onPlay(filtered, index)}
        />
      )}
      ListHeaderComponent={
        history.length > 0 ? (
          <Pressable style={styles.clearBtn} onPress={clearHistory}>
            <Ionicons name="trash-outline" size={16} color="#f87171" />
            <Text style={styles.clearBtnText}>Effacer l'historique</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="time-outline"
          title="Aucun historique"
          subtitle={searchQuery ? 'Aucun résultat' : 'Les morceaux écoutés apparaîtront ici'}
        />
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const QueueTab: React.FC<{
  searchQuery: string;
  queue: ApiTrack[];
  currentIndex: number;
  current: ApiTrack | null;
  isPlaying: boolean;
  onPlay: (tracks: ApiTrack[], index: number) => void;
}> = ({ searchQuery, queue, currentIndex, current, isPlaying, onPlay }) => {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        getArtistName(t).toLowerCase().includes(q)
    );
  }, [queue, searchQuery]);

  if (!queue.length) {
    return (
      <EmptyState
        icon="list-outline"
        title="File d'attente vide"
        subtitle="Lance un morceau pour remplir la file d'attente"
      />
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item, i) => `${item._id}-q-${i}`}
      renderItem={({ item, index }) => {
        const realIndex = queue.indexOf(item);
        const isCurrent = realIndex === currentIndex;
        return (
          <View>
            {isCurrent && (
              <View style={styles.nowPlayingBadge}>
                <Ionicons name="musical-note" size={12} color="#00D0BB" />
                <Text style={styles.nowPlayingText}>En cours de lecture</Text>
              </View>
            )}
            <TrackRow
              track={item}
              index={index}
              isActive={current?._id === item._id}
              isPlaying={current?._id === item._id && isPlaying}
              onPress={() => onPlay(queue, realIndex >= 0 ? realIndex : index)}
            />
          </View>
        );
      }}
      ListEmptyComponent={
        searchQuery ? (
          <EmptyState icon="search-outline" title="Aucun résultat" subtitle="Essaie un autre terme" />
        ) : null
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

// ---------- MAIN SCREEN ----------

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { current, queue, currentIndex, isPlaying, setQueueAndPlay } = usePlayer();
  const [activeTab, setActiveTab] = useState<TabId>('favorites');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePlay = useCallback(
    (tracks: ApiTrack[], index: number) => {
      setQueueAndPlay(tracks, index).catch(() => {});
      const parent = navigation.getParent?.();
      (parent || navigation).navigate('Player', { tracks, startIndex: index, title: 'Bibliothèque' });
    },
    [navigation, setQueueAndPlay]
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#020017', '#050214', '#05010b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="library" size={22} color="#7B61FF" />
            <Text style={styles.headerTitle}>Bibliothèque</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              >
                <Ionicons
                  name={active ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                  size={16}
                  color={active ? '#7B61FF' : '#94a3b8'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher dans la bibliothèque..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#64748b" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentArea}>
          {activeTab === 'favorites' && (
            <FavoritesTab
              searchQuery={searchQuery}
              current={current}
              isPlaying={isPlaying}
              onPlay={handlePlay}
            />
          )}
          {activeTab === 'playlists' && (
            <PlaylistsTab searchQuery={searchQuery} />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              searchQuery={searchQuery}
              current={current}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onTrackPlayed={current}
            />
          )}
          {activeTab === 'queue' && (
            <QueueTab
              searchQuery={searchQuery}
              queue={queue}
              currentIndex={currentIndex}
              current={current}
              isPlaying={isPlaying}
              onPlay={handlePlay}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default LibraryScreen;

// ---------- STYLES ----------

const CARD_WIDTH = (width - 16 * 2 - 12) / 2;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020017',
  },
  safeArea: {
    flex: 1,
    paddingTop: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9fafb',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: 'rgba(123,97,255,0.1)',
  },
  tabLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#7B61FF',
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 20,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: '#7B61FF',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#f9fafb',
    paddingVertical: 0,
  },

  // Content
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },

  // Track row
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  trackRowActive: {
    backgroundColor: 'rgba(123,97,255,0.12)',
    borderColor: 'rgba(123,97,255,0.3)',
  },
  trackCover: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f9fafb',
  },
  trackTitleActive: {
    color: '#7B61FF',
  },
  trackArtist: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  trackDuration: {
    fontSize: 11,
    color: '#64748b',
    marginRight: 2,
  },
  trackPlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.25)',
  },
  trackPlayBtnActive: {
    backgroundColor: 'rgba(123,97,255,0.2)',
    borderColor: 'rgba(123,97,255,0.4)',
  },

  // Playlist grid
  playlistGrid: {
    gap: 12,
  },
  playlistCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  playlistCover: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playlistCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playlistName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f9fafb',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  playlistCount: {
    fontSize: 11,
    color: '#94a3b8',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },

  // Create playlist button
  createPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.35)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  createPlaylistText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7B61FF',
  },

  // Clear button
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },

  // Now playing badge
  nowPlayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,208,187,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,208,187,0.25)',
    alignSelf: 'flex-start',
  },
  nowPlayingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D0BB',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(123,97,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#f9fafb',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modalCreateBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(123,97,255,0.85)',
  },
  modalCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
