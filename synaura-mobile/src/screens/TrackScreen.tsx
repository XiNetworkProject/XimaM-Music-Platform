import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  FlatList,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { api, type ApiTrack, type TrackComment } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_SIZE = SCREEN_W;

type TrackRouteParams = { Track: { id: string } };

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const formatPlays = (n?: number) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return `il y a ${Math.floor(days / 30)}mo`;
};

const TrackScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<TrackRouteParams, 'Track'>>();
  const trackId = route.params.id;
  const { user } = useAuth();
  const { current, isPlaying, playTrack, setQueueAndPlay, togglePlayPause } = usePlayer();

  const [track, setTrack] = useState<ApiTrack | null>(null);
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [similar, setSimilar] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCurrentTrack = current?._id === trackId;
  const isTrackPlaying = isCurrentTrack && isPlaying;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [trackRes, commentsRes, similarRes] = await Promise.all([
      api.getTrack(trackId),
      api.getTrackComments(trackId),
      api.getSimilarTracks(trackId),
    ]);
    if (trackRes.success) {
      setTrack(trackRes.data.track);
      setLiked(trackRes.data.track.isLiked ?? false);
    }
    if (commentsRes.success) setComments(commentsRes.data.comments);
    if (similarRes.success) setSimilar(similarRes.data.tracks);
    setLoading(false);
  }, [trackId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlayPause = async () => {
    if (!track) return;
    if (isCurrentTrack) {
      await togglePlayPause();
    } else {
      await playTrack(track);
    }
  };

  const handleLike = async () => {
    setLiked(prev => !prev);
    await api.likeTrack(trackId);
  };

  const handleShare = async () => {
    if (!track) return;
    try {
      await Share.share({ message: `Écoute "${track.title}" sur Synaura !`, title: track.title });
    } catch {}
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    const res = await api.addTrackComment(trackId, text);
    if (res.success) {
      setComments(prev => [res.data.comment, ...prev]);
      setCommentText('');
    }
    setSubmitting(false);
  };

  const handlePlaySimilar = async (t: ApiTrack, idx: number) => {
    await setQueueAndPlay(similar, idx);
  };

  const artistDisplayName = track?.artist?.artistName || track?.artist?.name || track?.artist?.username || 'Artiste';

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accentBrand} />
      </View>
    );
  }

  if (!track) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.errorText}>Piste introuvable</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ---- COVER + GRADIENT ---- */}
        <View style={styles.coverWrapper}>
          <Image
            source={{ uri: track.coverUrl || undefined }}
            style={styles.coverImage}
            defaultSource={require('../../assets/icon.png')}
          />
          <LinearGradient
            colors={['transparent', 'rgba(2,0,23,0.6)', colors.background]}
            style={styles.coverGradient}
          />

          <Pressable style={styles.floatingBack} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* ---- TRACK INFO ---- */}
        <View style={styles.infoSection}>
          <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>

          <Pressable
            onPress={() => {
              if (track.artist?.username) {
                navigation.navigate('PublicProfile', { username: track.artist.username });
              }
            }}
          >
            <View style={styles.artistRow}>
              {track.artist?.avatar ? (
                <Image source={{ uri: track.artist.avatar }} style={styles.artistAvatar} />
              ) : (
                <View style={[styles.artistAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={14} color={colors.textTertiary} />
                </View>
              )}
              <Text style={styles.artistName}>{artistDisplayName}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </View>
          </Pressable>

          {/* ---- META ROW ---- */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.metaText}>{formatDuration(track.duration)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="play-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.metaText}>{formatPlays(track.plays)} écoutes</Text>
            </View>
          </View>

          {/* ---- GENRE TAGS ---- */}
          {track.genre && track.genre.length > 0 && (
            <View style={styles.genreRow}>
              {track.genre.map((g, i) => {
                const label = typeof g === 'string' ? g : ((g as any)?.name || String(g));
                return (
                  <View key={`genre-${i}-${label}`} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ---- ACTIONS ---- */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.playMainBtn} onPress={handlePlayPause}>
              <LinearGradient
                colors={['#7B61FF', '#6F4CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playMainGradient}
              >
                <Ionicons
                  name={isTrackPlaying ? 'pause' : 'play'}
                  size={28}
                  color="#fff"
                  style={isTrackPlaying ? undefined : { marginLeft: 3 }}
                />
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={handleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#FF4D6A' : colors.textSecondary}
              />
              <Text style={[styles.actionLabel, liked && { color: '#FF4D6A' }]}>
                {liked ? 'Aimé' : 'Aimer'}
              </Text>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={() => {/* TODO: add to playlist modal */}}>
              <Ionicons name="add-circle-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.actionLabel}>Playlist</Text>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.actionLabel}>Partager</Text>
            </Pressable>
          </View>
        </View>

        {/* ---- COMMENTS ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Commentaires ({comments.length})
          </Text>

          {user && (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Écrire un commentaire…"
                placeholderTextColor={colors.textTertiary}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline
              />
              <Pressable
                style={[styles.commentSendBtn, (!commentText.trim() || submitting) && { opacity: 0.4 }]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </Pressable>
            </View>
          )}

          {comments.length === 0 ? (
            <Text style={styles.emptyText}>Aucun commentaire pour le moment.</Text>
          ) : (
            comments.map(c => (
              <View key={c._id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  {c.user.avatar ? (
                    <Image source={{ uri: c.user.avatar }} style={styles.commentAvatar} />
                  ) : (
                    <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={10} color={colors.textTertiary} />
                    </View>
                  )}
                  <Text style={styles.commentUser}>{c.user.name || c.user.username}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
              </View>
            ))
          )}
        </View>

        {/* ---- SIMILAR TRACKS ---- */}
        {similar.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Titres similaires</Text>
            <FlatList
              data={similar}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item._id}
              contentContainerStyle={{ paddingRight: 16 }}
              renderItem={({ item, index }) => (
                <Pressable style={styles.similarCard} onPress={() => handlePlaySimilar(item, index)}>
                  <Image
                    source={{ uri: item.coverUrl || undefined }}
                    style={styles.similarCover}
                    defaultSource={require('../../assets/icon.png')}
                  />
                  <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.similarArtist} numberOfLines={1}>
                    {item.artist?.artistName || item.artist?.name || item.artist?.username || 'Artiste'}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.accentBrand,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  coverWrapper: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: COVER_SIZE * 0.55,
  },
  floatingBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    paddingHorizontal: 20,
    marginTop: -60,
  },
  trackTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  artistAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistName: {
    color: colors.accentBrand,
    fontSize: 15,
    fontWeight: '600',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textTertiary,
    fontSize: 13,
  },

  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(123,97,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.3)',
  },
  genreTagText: {
    color: colors.accentBrand,
    fontSize: 12,
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 28,
    marginTop: 4,
  },
  playMainBtn: {
    marginRight: 6,
  },
  playMainGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 80,
    paddingVertical: 4,
  },
  commentSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentBrand,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },

  commentCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  commentUser: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  commentTime: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  commentContent: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  similarCard: {
    width: 140,
    marginRight: 12,
  },
  similarCover: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  similarTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  similarArtist: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
});

export default TrackScreen;
