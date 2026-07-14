import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCommentsCount, getPopularTracks, getTrackById, getTrackLikeStatus, getTrackPosts, recordClipFunnelEvent, setTrackLike, togglePostLike } from '@/api/client';
import { canOpenAiVariation, canUseSoundClientSide, type HomePost, type Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { openClipComposerForSound } from '@/navigation/clipEntry';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';
import { PostShareSheet } from '@/components/social/PostShareSheet';
import { MomentWaveform } from '@/components/mobile/MomentWaveform';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { SoftCard } from '@/components/ui/SoftCard';
import { TrackActionsSheet } from '@/components/ui/TrackActionsSheet';
import { TrackListItem } from '@/components/ui/TrackListItem';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function TrackDetailScreen() {
  const responsive = useResponsiveLayout();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const playerProgress = usePlayerProgress(500);
  const library = useLibrary();
  const auth = useAuth();
  const initial = route.params?.track as Track | undefined;
  const trackId = String(route.params?.trackId || initial?._id || '');
  const [track, setTrack] = React.useState<Track | null>(initial || null);
  const [similar, setSimilar] = React.useState<Track[]>([]);
  const [trackPosts, setTrackPosts] = React.useState<HomePost[]>([]);
  const [loading, setLoading] = React.useState(!initial);
  const [error, setError] = React.useState<string | null>(null);
  const [liked, setLiked] = React.useState(Boolean(initial?.isLiked));
  const [likes, setLikes] = React.useState(Number(initial?.likesCount || 0));
  const [comments, setComments] = React.useState(Number(initial?.commentsCount || 0));
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [remixOpen, setRemixOpen] = React.useState(false);

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
      void getTrackPosts(trackId, 12).then(setTrackPosts).catch(() => setTrackPosts([]));
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
  const isCurrentTrack = player.current?._id === track._id;
  const isRadio = track._id.startsWith('radio-');
  const isAi = track._id.startsWith('ai-');
  const momentsEnabled = Boolean(track._id) && !isRadio && !isAi;
  const artist = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
  const isOwnTrack = Boolean(auth.user?.id) && track.artist?._id === auth.user?.id;
  const canUseSound = canUseSoundClientSide({
    isOwner: isOwnTrack,
    allowClips: Boolean(track.allowClips),
    remixVisibility: track.remixVisibility || 'disabled',
  });
  const useThisSound = () => {
    void recordClipFunnelEvent(track._id, 'clip_use_sound_started');
    openClipComposerForSound(navigation, Boolean(auth.user), track._id, track._id.startsWith('ai-') ? 'ai_track' : 'track');
  };
  const createPostWithSound = () => {
    if (!auth.user) {
      navigation.getParent()?.navigate('Login', { returnTo: { screen: 'Tabs', params: { screen: 'TrackDetail', params: { trackId: track._id, track } } } });
      return;
    }
    navigation.navigate('CreatePost', { track });
  };
  const openRemixStudio = () => {
    navigation.navigate('AIStudio', { sourceTrackId: track._id, sourceTrackType: track._id.startsWith('ai-') ? 'ai_track' : 'track', mode: 'remix' });
  };
  const seekTrackMoment = async (seconds: number) => {
    if (!isCurrentTrack) await player.playTrack(track);
    await player.seekTo(seconds);
  };

  return (
    <SynauraBackground>
      <ScrollView
        contentContainerStyle={[styles.content, responsive.contentFrame, { paddingBottom: responsive.miniPlayerClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
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
          {canOpenAiVariation(track) ? <Action icon="color-wand-outline" label="Remixer" onPress={openRemixStudio} /> : null}
          {canUseSound ? <Action icon="film-outline" label={isOwnTrack ? 'Clip officiel' : 'Ce son'} onPress={useThisSound} /> : null}
        </View>

        <SoftCard style={styles.stats}>
          <Stat value={track.plays || 0} label="écoutes" />
          <Stat value={likes} label="likes" />
          <Stat value={comments} label="commentaires" />
        </SoftCard>

        {!isRadio ? (
          <View style={styles.waveformSection}>
            <MomentWaveform
              track={track}
              position={isCurrentTrack ? playerProgress.positionSec : 0}
              duration={(isCurrentTrack ? playerProgress.durationSec : 0) || track.duration || 0}
              isPlaying={active}
              momentsEnabled={momentsEnabled}
              compact
              onSeek={(seconds) => void seekTrackMoment(seconds)}
              onCommentCreated={() => setComments((value) => value + 1)}
            />
          </View>
        ) : null}

        {track.lyrics ? <SoftCard><Text style={styles.sectionTitle}>Paroles</Text><Text numberOfLines={8} style={styles.description}>{track.lyrics}</Text></SoftCard> : null}
        {track.remixAttribution ? (
          <SoftCard>
            <Text style={styles.sectionTitle}>Inspiré de {track.remixAttribution.title}</Text>
            <Text style={styles.description}>Création originale par @{track.remixAttribution.artistUsername || track.remixAttribution.artist}</Text>
          </SoftCard>
        ) : null}
        {track.linkedChallenge ? (
          <Pressable onPress={() => navigation.navigate('ChallengeDetail', { challengeId: track.linkedChallenge!.id })}>
            <SoftCard style={styles.clipsCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={styles.challengeIcon}>
                  <Ionicons name="trophy" size={18} color="#FFFAF2" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.sectionTitleInline}>
                    {track.linkedChallenge.status === 'active' ? 'Défi en cours' : track.linkedChallenge.status === 'upcoming' ? 'Défi à venir' : 'Défi terminé'}
                  </Text>
                  <Text numberOfLines={1} style={styles.description}>{track.linkedChallenge.title}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
              </View>
            </SoftCard>
          </Pressable>
        ) : null}
        {Number(track.variationsCount || 0) > 0 ? <Text style={styles.sectionTitle}>{track.variationsCount} Variations</Text> : null}
        {Number(track.musicClipsCount || 0) > 0 ? (
          <SoftCard style={styles.clipsCard}>
            <View>
              <Text style={styles.sectionTitleInline}>Clips utilisant ce son</Text>
              <Text style={styles.description}>{track.musicClipsCount} clip{Number(track.musicClipsCount || 0) > 1 ? 's' : ''} publie{Number(track.musicClipsCount || 0) > 1 ? 's' : ''}</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Swipe', { mode: 'clips', sourceTrackId: track._id })} style={styles.clipsButton}>
              <Text style={styles.clipsButtonText}>Ouvrir</Text>
            </Pressable>
          </SoftCard>
        ) : null}
        {track.genre?.length ? <View><Text style={styles.sectionTitle}>Ambiance</Text><View style={styles.chips}>{track.genre.slice(0, 5).map((genre) => <Text key={genre} style={styles.chip}>{genre}</Text>)}</View></View> : null}

        <View>
          <View style={styles.postsHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sectionTitleNoMargin}>Posts autour de ce son</Text>
              <Text style={styles.postsSubtitle}>Contexte, passages favoris et histoires attachées au morceau.</Text>
            </View>
            <Pressable onPress={createPostWithSound} style={styles.postsButton}>
              <Ionicons name="create-outline" size={15} color={colors.paper} />
              <Text style={styles.postsButtonText}>Publier</Text>
            </Pressable>
          </View>
          <View style={styles.trackPosts}>
            {trackPosts.length ? trackPosts.map((post) => (
              <TrackPostCard
                key={post.id}
                post={post}
                activeId={player.current?._id}
                isPlaying={player.isPlaying}
                onOpen={() => navigation.navigate('PostDetail', { postId: post.id })}
                onOpenProfile={() => navigation.navigate('PublicProfile', { username: post.handle.replace(/^@/, '') })}
                onPlay={(postTrack) => void player.playTrack(postTrack)}
              />
            )) : (
              <SoftCard style={styles.emptyPosts}>
                <Ionicons name="chatbubbles-outline" size={22} color={colors.textTertiary} />
                <Text style={styles.emptyPostsTitle}>Aucun post attaché pour le moment.</Text>
                <Text style={styles.emptyPostsText}>Le premier post peut raconter l’histoire du son ou pointer un passage précis.</Text>
              </SoftCard>
            )}
          </View>
        </View>

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
      {remixOpen ? (
        <View style={styles.remixOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRemixOpen(false)} />
          <View style={styles.remixSheet}>
            <View style={styles.remixHead}>
              {track.coverUrl ? <Image source={{ uri: track.coverUrl }} style={styles.remixCover} /> : <View style={styles.remixCover} />}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.remixTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.remixArtist}>{artist}</Text>
              </View>
            </View>
            <Text style={styles.remixText}>Créer une variation IA inspirée de ce morceau</Text>
            <Text style={styles.remixCredit}>Le créateur original sera toujours crédité</Text>
            <Pressable
              onPress={() => {
                setRemixOpen(false);
                navigation.navigate('AIStudio', { sourceTrackId: track._id, sourceTrackType: track._id.startsWith('ai-') ? 'ai_track' : 'track', mode: 'remix' });
              }}
              style={styles.remixPrimary}
            >
              <Ionicons name="color-wand-outline" size={18} color={colors.paper} />
              <Text style={styles.remixPrimaryText}>Ouvrir dans Studio</Text>
            </Pressable>
            <Pressable onPress={() => setRemixOpen(false)} style={styles.remixSecondary}><Text style={styles.remixSecondaryText}>Annuler</Text></Pressable>
          </View>
        </View>
      ) : null}
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

function TrackPostCard({
  post,
  activeId,
  isPlaying,
  onOpen,
  onOpenProfile,
  onPlay,
}: {
  post: HomePost;
  activeId?: string;
  isPlaying: boolean;
  onOpen: () => void;
  onOpenProfile: () => void;
  onPlay: (track: Track) => void;
}) {
  const [liked, setLiked] = React.useState(post.isLiked);
  const [likes, setLikes] = React.useState(post.likesCount);
  const [shareOpen, setShareOpen] = React.useState(false);
  const playingThis = post.track ? activeId === post.track._id && isPlaying : false;

  const like = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      await togglePostLike(post.id);
    } catch {
      setLiked(!next);
      setLikes((value) => Math.max(0, value + (next ? -1 : 1)));
    }
  };

  return (
    <View style={styles.trackPostCard}>
      <Pressable onPress={onOpenProfile} style={styles.trackPostHead}>
        <View style={styles.trackPostAvatar}>
          {post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.trackPostAvatarText}>{post.avatar || post.author.slice(0, 1)}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.trackPostAuthor}>{post.author}</Text>
          <Text numberOfLines={1} style={styles.trackPostMeta}>{post.handle} · {post.time}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onOpen}>
        <Text numberOfLines={4} style={styles.trackPostText}>{post.text}</Text>
      </Pressable>
      {post.track ? (
        <PostAttachedTrackCard
          track={post.track}
          playing={playingThis}
          compact
          onPlay={() => onPlay(post.track!)}
          onOpen={() => onPlay(post.track!)}
        />
      ) : null}
      <View style={styles.trackPostActions}>
        <Pressable onPress={like} style={[styles.trackPostAction, liked && styles.trackPostActionActive]}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? colors.paper : colors.textSecondary} />
          <Text style={[styles.trackPostActionText, liked && styles.trackPostActionTextActive]}>{likes || 'Like'}</Text>
        </Pressable>
        <Pressable onPress={onOpen} style={styles.trackPostAction}>
          <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.trackPostActionText}>{post.commentsCount || 'Avis'}</Text>
        </Pressable>
        <Pressable onPress={() => setShareOpen(true)} style={styles.trackPostAction}>
          <Ionicons name="share-social-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.trackPostActionText}>Partager</Text>
        </Pressable>
      </View>
      <PostShareSheet visible={shareOpen} post={post} onClose={() => setShareOpen(false)} />
    </View>
  );
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
  waveformSection: { marginHorizontal: spacing.lg },
  sectionTitle: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionTitleNoMargin: { color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionTitleInline: { color: colors.text, fontSize: 17, fontWeight: '900' },
  description: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  clipsCard: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  clipsButton: { height: 40, justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: spacing.md, backgroundColor: colors.black },
  challengeIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  clipsButtonText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  postsHeader: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  postsSubtitle: { marginTop: 4, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  postsButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, backgroundColor: colors.black, paddingHorizontal: spacing.md },
  postsButtonText: { color: colors.paper, fontSize: 11, fontWeight: '900' },
  trackPosts: { gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  emptyPosts: { alignItems: 'center', gap: 6, paddingVertical: spacing.xl },
  emptyPostsTitle: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  emptyPostsText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  trackPostCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  trackPostHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trackPostAvatar: { width: 38, height: 38, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  trackPostAvatarText: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  trackPostAuthor: { color: colors.text, fontSize: 13, fontWeight: '900' },
  trackPostMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  trackPostText: { marginTop: spacing.sm, color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  trackPostActions: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trackPostAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: 'rgba(17,17,17,0.055)', paddingHorizontal: spacing.sm },
  trackPostActionActive: { backgroundColor: colors.black },
  trackPostActionText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  trackPostActionTextActive: { color: colors.paper },
  similar: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  remixOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  remixSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#F7F6F3', padding: 18, gap: 12 },
  remixHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remixCover: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(17,17,17,0.08)' },
  remixTitle: { color: '#111111', fontSize: 18, fontWeight: '900' },
  remixArtist: { color: 'rgba(17,17,17,0.52)', fontSize: 13, fontWeight: '800' },
  remixText: { color: '#111111', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  remixCredit: { color: 'rgba(17,17,17,0.5)', fontSize: 12, fontWeight: '700' },
  remixPrimary: { height: 50, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111111' },
  remixPrimaryText: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  remixSecondary: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)' },
  remixSecondaryText: { color: 'rgba(17,17,17,0.62)', fontSize: 13, fontWeight: '900' },
});
