import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCommentsCount, getPopularTracks, getTrackById, getTrackLikeStatus, setTrackLike } from '@/api/client';
import type { Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { SoftCard } from '@/components/ui/SoftCard';
import { TrackActionsSheet } from '@/components/ui/TrackActionsSheet';
import { TrackListItem } from '@/components/ui/TrackListItem';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';

export function TrackDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const library = useLibrary();
  const initial = route.params?.track as Track | undefined;
  const trackId = String(route.params?.trackId || initial?._id || '');
  const [track, setTrack] = React.useState<Track | null>(initial || null);
  const [similar, setSimilar] = React.useState<Track[]>([]);
  const [loading, setLoading] = React.useState(!initial);
  const [error, setError] = React.useState<string | null>(null);
  const [liked, setLiked] = React.useState(Boolean(initial?.isLiked));
  const [likes, setLikes] = React.useState(Number(initial?.likesCount || 0));
  const [comments, setComments] = React.useState(Number(initial?.commentsCount || 0));
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!trackId) return;
    setLoading(true);
    setError(null);
    try {
      const [next, popular, likeState, commentCounts] = await Promise.all([
        getTrackById(trackId),
        getPopularTracks().catch(() => []),
        getTrackLikeStatus(trackId).catch(() => null),
        getCommentsCount([trackId]).catch(() => ({} as Record<string, number>)),
      ]);
      if (!next && !initial) throw new Error('Morceau introuvable');
      setTrack(mergeTrackDetail(next, initial));
      setSimilar(popular.filter((item) => item._id !== trackId).slice(0, 6));
      if (likeState) {
        setLiked(likeState.liked);
        setLikes(likeState.likesCount);
      }
      setComments(commentCounts[trackId] ?? next?.commentsCount ?? initial?.commentsCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger ce morceau');
    } finally {
      setLoading(false);
    }
  }, [initial, trackId]);

  React.useEffect(() => { void load(); }, [load]);

  const toggleLike = async () => {
    if (!track) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    const result = await setTrackLike(track._id, nextLiked).catch(() => null);
    if (result) {
      setLiked(result.liked);
      setLikes(result.likesCount);
    }
  };

  if (loading && !track) {
    return <SynauraBackground><AppHeader title="Morceau" onBack={() => navigation.goBack()} /><LoadingSkeleton rows={5} style={styles.loading} /></SynauraBackground>;
  }

  if (!track) {
    return <SynauraBackground><AppHeader title="Morceau" onBack={() => navigation.goBack()} /><View style={styles.loading}><EmptyState icon="alert-circle-outline" title="Morceau introuvable" text={error || 'Ce contenu n’est plus disponible.'} actionLabel="Réessayer" onAction={() => void load()} /></View></SynauraBackground>;
  }

  const active = player.current?._id === track._id && player.isPlaying;
  const artist = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';

  return (
    <SynauraBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title="Morceau" subtitle={artist} onBack={() => navigation.goBack()} action={{ icon: 'ellipsis-horizontal', label: 'Plus', onPress: () => setActionsOpen(true) }} />
        <View style={styles.hero}>
          {track.coverUrl ? <Image source={{ uri: track.coverUrl }} blurRadius={35} style={StyleSheet.absoluteFillObject} /> : null}
          <LinearGradient colors={['rgba(17,17,17,0.16)', 'rgba(17,17,17,0.82)']} style={StyleSheet.absoluteFillObject} />
          <TrackCover track={track} active={active} autoPlayVideo={active} style={styles.cover} />
          <View style={styles.heroCopy}>
            <Text numberOfLines={2} style={styles.title}>{track.title}</Text>
            <Pressable onPress={() => track.artist?.username && navigation.navigate('PublicProfile', { username: track.artist.username })}>
              <Text style={styles.artist}>{artist}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityLabel={active ? 'Pause' : 'Lecture'} onPress={() => active ? void player.togglePlayPause() : void player.playTrack(track)} style={styles.play}>
            <Ionicons name={active ? 'pause' : 'play'} size={27} color={colors.black} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Action icon={liked ? 'heart' : 'heart-outline'} label={`${likes}`} active={liked} onPress={() => void toggleLike()} />
          <Action icon="chatbubble-outline" label={`${comments}`} onPress={() => setCommentsOpen(true)} />
          <Action icon="share-social-outline" label="Partager" onPress={() => setShareOpen(true)} />
          <Action icon={library.isFavorite(track._id) ? 'bookmark' : 'bookmark-outline'} label="Sauver" active={library.isFavorite(track._id)} onPress={() => library.toggleFavorite(track)} />
        </View>

        <SoftCard style={styles.stats}>
          <Stat value={track.plays || 0} label="écoutes" />
          <Stat value={likes} label="likes" />
          <Stat value={comments} label="commentaires" />
        </SoftCard>

        {track.lyrics ? <SoftCard><Text style={styles.sectionTitle}>Paroles</Text><Text numberOfLines={8} style={styles.description}>{track.lyrics}</Text></SoftCard> : null}
        {track.genre?.length ? <View><Text style={styles.sectionTitle}>Ambiance</Text><View style={styles.chips}>{track.genre.slice(0, 5).map((genre) => <Text key={genre} style={styles.chip}>{genre}</Text>)}</View></View> : null}

        <View>
          <Text style={styles.sectionTitle}>À écouter ensuite</Text>
          <View style={styles.similar}>
            {similar.map((item) => <TrackListItem key={item._id} track={item} active={player.current?._id === item._id} favorite={library.isFavorite(item._id)} onPlay={() => void player.playTrack(item)} onToggleFavorite={() => library.toggleFavorite(item)} onMore={() => navigation.navigate('TrackDetail', { trackId: item._id, track: item })} />)}
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <CommentsSheet visible={commentsOpen} track={track} commentCount={comments} onClose={() => setCommentsOpen(false)} onCountChange={(_id, next) => setComments(next)} />
      <ShareSheet visible={shareOpen} track={track} onClose={() => setShareOpen(false)} />
      <TrackActionsSheet track={actionsOpen ? track : null} onClose={() => setActionsOpen(false)} />
    </SynauraBackground>
  );
}

function mergeTrackDetail(next: Track | null, initial?: Track) {
  if (!next) return initial || null;
  if (!initial) return next;

  const nextArtist = next.artist?.artistName || next.artist?.name || next.artist?.username || '';
  const shouldKeepInitialArtist = !nextArtist || nextArtist === 'Artiste inconnu';

  return {
    ...initial,
    ...next,
    artist: shouldKeepInitialArtist ? initial.artist : next.artist,
  };
}

function Action({ icon, label, active, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; active?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.action}><View style={[styles.actionIcon, active && styles.actionIconActive]}><Ionicons name={icon} size={20} color={active ? colors.white : colors.text} /></View><Text style={styles.actionLabel}>{label}</Text></Pressable>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 170, gap: spacing.lg },
  loading: { paddingHorizontal: spacing.lg },
  hero: { minHeight: 390, marginHorizontal: spacing.lg, overflow: 'hidden', borderRadius: radius.xl, justifyContent: 'flex-end', padding: spacing.lg, backgroundColor: colors.black },
  cover: { width: 170, height: 170, alignSelf: 'center', marginBottom: spacing.xl, borderRadius: radius.lg },
  heroCopy: { paddingRight: 64 },
  title: { color: colors.white, fontSize: 26, lineHeight: 31, fontWeight: '900' },
  artist: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800' },
  play: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.lg },
  action: { alignItems: 'center', gap: spacing.xs },
  actionIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionIconActive: { backgroundColor: colors.black },
  actionLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '800' },
  stats: { marginHorizontal: spacing.lg, flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '900' },
  statLabel: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  sectionTitle: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, color: colors.text, fontSize: 17, fontWeight: '900' },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  similar: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', fontSize: 11, fontWeight: '700' },
});
