import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { api, type ApiPlaylist, type ApiTrack } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const HEADER_COVER = SCREEN_W * 0.52;

type PlaylistRouteParams = { Playlist: { id: string } };

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const formatTotalDuration = (sec?: number) => {
  if (!sec) return '0 min';
  const totalMin = Math.floor(sec / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const PlaylistScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PlaylistRouteParams, 'Playlist'>>();
  const playlistId = route.params.id;
  const { user } = useAuth();
  const { current, isPlaying, setQueueAndPlay, playTrack, togglePlayPause } = usePlayer();

  const [playlist, setPlaylist] = useState<ApiPlaylist | null>(null);
  const [loading, setLoading] = useState(true);

  const tracks = playlist?.tracks ?? [];
  const isOwner = !!(user && playlist?.creator?._id === user.id);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await api.getPlaylist(playlistId);
    if (res.success) setPlaylist(res.data.playlist);
    setLoading(false);
  }, [playlistId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlayAll = async () => {
    if (!tracks.length) return;
    await setQueueAndPlay(tracks, 0);
    navigation.navigate('Player');
  };

  const handleShuffle = async () => {
    if (!tracks.length) return;
    const shuffled = shuffleArray(tracks);
    await setQueueAndPlay(shuffled, 0);
    navigation.navigate('Player');
  };

  const handleShare = async () => {
    if (!playlist) return;
    const name = playlist.name || playlist.title || 'Playlist';
    try {
      await Share.share({ message: `Découvre la playlist "${name}" sur Synaura !`, title: name });
    } catch {}
  };

  const handlePlayTrack = async (track: ApiTrack, index: number) => {
    if (current?._id === track._id) {
      await togglePlayPause();
    } else {
      await setQueueAndPlay(tracks, index);
    }
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      'Supprimer la playlist',
      'Es-tu sûr de vouloir supprimer cette playlist ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await api.deletePlaylist(playlistId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const playlistName = playlist?.name || playlist?.title || 'Playlist';
  const creatorName = playlist?.creator?.name || playlist?.creator?.username || 'Utilisateur';

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accentBrand} />
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.errorText}>Playlist introuvable</Text>
        <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const renderTrack = ({ item, index }: { item: ApiTrack; index: number }) => {
    const isActive = current?._id === item._id;
    const artistLabel = item.artist?.artistName || item.artist?.name || item.artist?.username || 'Artiste';

    return (
      <Pressable style={styles.trackRow} onPress={() => handlePlayTrack(item, index)}>
        <Text style={[styles.trackNumber, isActive && { color: colors.accentBrand }]}>
          {index + 1}
        </Text>

        <Image
          source={{ uri: item.coverUrl || undefined }}
          style={styles.trackCover}
          defaultSource={require('../../assets/icon.png')}
        />

        <View style={styles.trackInfo}>
          <Text
            style={[styles.trackTitle, isActive && { color: colors.accentBrand }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{artistLabel}</Text>
        </View>

        <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>

        <Pressable
          style={styles.trackPlayBtn}
          onPress={() => handlePlayTrack(item, index)}
          hitSlop={8}
        >
          <Ionicons
            name={isActive && isPlaying ? 'pause' : 'play'}
            size={18}
            color={isActive ? colors.accentBrand : colors.textSecondary}
          />
        </Pressable>
      </Pressable>
    );
  };

  const ListHeader = () => (
    <View>
      {/* ---- HEADER / COVER ---- */}
      <LinearGradient
        colors={playlist.coverUrl ? ['transparent', colors.background] : ['#6F4CFF', '#00D0BB', colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        <Pressable style={styles.floatingBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>

        {isOwner && (
          <View style={styles.ownerActions}>
            <Pressable style={styles.ownerBtn} onPress={() => {/* TODO: edit modal */}}>
              <Ionicons name="pencil-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.ownerBtn} onPress={handleDeletePlaylist}>
              <Ionicons name="trash-outline" size={20} color="#FF4D6A" />
            </Pressable>
          </View>
        )}

        {playlist.coverUrl ? (
          <Image source={{ uri: playlist.coverUrl }} style={styles.headerCover} />
        ) : (
          <View style={[styles.headerCover, styles.coverPlaceholder]}>
            <Ionicons name="musical-notes" size={56} color="rgba(255,255,255,0.35)" />
          </View>
        )}
      </LinearGradient>

      {/* ---- PLAYLIST INFO ---- */}
      <View style={styles.infoSection}>
        <Text style={styles.playlistName} numberOfLines={2}>{playlistName}</Text>

        {playlist.description ? (
          <Text style={styles.playlistDesc} numberOfLines={3}>{playlist.description}</Text>
        ) : null}

        {/* ---- CREATOR ---- */}
        <Pressable
          style={styles.creatorRow}
          onPress={() => {
            if (playlist.creator?.username) {
              navigation.navigate('PublicProfile', { username: playlist.creator.username });
            }
          }}
        >
          {playlist.creator?.avatar ? (
            <Image source={{ uri: playlist.creator.avatar }} style={styles.creatorAvatar} />
          ) : (
            <View style={[styles.creatorAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={12} color={colors.textTertiary} />
            </View>
          )}
          <Text style={styles.creatorName}>{creatorName}</Text>
        </Pressable>

        {/* ---- STATS ---- */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="musical-note" size={14} color={colors.textTertiary} />
            <Text style={styles.statText}>
              {playlist.trackCount ?? tracks.length} titre{(playlist.trackCount ?? tracks.length) !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.statDot} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.statText}>{formatTotalDuration(playlist.totalDuration)}</Text>
          </View>
        </View>

        {/* ---- ACTION BUTTONS ---- */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.playAllBtn} onPress={handlePlayAll}>
            <LinearGradient
              colors={['#7B61FF', '#6F4CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playAllGradient}
            >
              <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
              <Text style={styles.playAllText}>Tout lire</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleShuffle}>
            <Ionicons name="shuffle" size={20} color={colors.accentBrand} />
            <Text style={styles.secondaryBtnText}>Aléatoire</Text>
          </Pressable>

          <Pressable style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ---- TRACKS HEADER ---- */}
        {tracks.length > 0 && (
          <Text style={styles.tracksHeader}>Titres</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={item => item._id}
        renderItem={renderTrack}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Cette playlist est vide.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.accentBrand,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  headerGradient: {
    width: SCREEN_W,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    alignItems: 'center',
    position: 'relative',
  },
  floatingBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  ownerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  ownerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCover: {
    width: HEADER_COVER,
    height: HEADER_COVER,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginTop: 20,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  playlistName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  playlistDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },

  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  creatorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  playAllBtn: {
    flex: 1,
  },
  playAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 24,
  },
  playAllText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.35)',
    backgroundColor: 'rgba(123,97,255,0.08)',
  },
  secondaryBtnText: {
    color: colors.accentBrand,
    fontSize: 14,
    fontWeight: '600',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  tracksHeader: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  trackNumber: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  trackCover: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  trackDuration: {
    color: colors.textTertiary,
    fontSize: 12,
    marginRight: 4,
  },
  trackPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 15,
  },
});

export default PlaylistScreen;
