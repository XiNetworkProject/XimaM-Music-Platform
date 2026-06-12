import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createComment,
  createPost,
  deleteComment,
  getCommentsPage,
  getSynauraCity,
  getHomeData,
  getArtistFollowState,
  getNotifications,
  loadMixedPosts,
  loadRankingTracks,
  loadUnifiedFeed,
  sendRecommendationImpressions,
  togglePostLike,
  toggleTrackLike,
  toggleArtistFollow,
  uploadPostImage,
} from '@/api/client';
import type { Creator, HomeComment, HomeData, HomePost, Playlist, SynauraCityData, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { colors, radius, spacing } from '@/theme/tokens';
import { NotificationModal, UniversalSearchModal } from '@/components/HomeOverlays';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { openInternalLink } from '@/navigation/internalLinks';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { SHOW_SHUTDOWN_NOTICES } from '@/config/features';
import { CityHomeBanner } from '@/components/city/CityHomeBanner';

const filters = ['Pour toi', 'Sons', 'Communaute', 'Plus'] as const;
const quickActions = [
  { label: 'Ecouter', caption: 'Trouver ton prochain son', icon: 'musical-notes', tint: '#7C5CFF' },
  { label: 'Creer', caption: 'Ouvrir le studio IA', icon: 'sparkles', tint: '#00A7B2' },
  { label: 'Publier', caption: 'Partager une creation', icon: 'cloud-upload', tint: '#E65E54' },
  { label: 'Communaute', caption: 'Voir ce qui bouge', icon: 'mic', tint: '#D88A00' },
] as const;

type HomeFilter = (typeof filters)[number];
type FeedItem =
  | { id: string; kind: 'composer' }
  | { id: string; kind: 'city' }
  | { id: string; kind: 'post'; post: HomePost }
  | { id: string; kind: 'rail'; title: string; subtitle: string; label: string; tracks: Track[] }
  | { id: string; kind: 'track'; title: string; subtitle: string; label: string; track: Track }
  | { id: string; kind: 'playlist'; playlist: Playlist }
  | { id: string; kind: 'creator'; creators: Creator[] }
  | { id: string; kind: 'studio'; title: string; text: string }
  | { id: string; kind: 'booster'; title: string; text: string }
  | { id: string; kind: 'library' };

const emptyHome: HomeData = {
  forYou: [],
  trending: [],
  recent: [],
  boosted: [],
  playlists: [],
  creators: [],
  posts: [],
};

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function formatCompact(value: number | undefined) {
  const numberValue = Number(value || 0);
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return String(numberValue);
}

function uniqueTracks(tracks: Track[]) {
  const byId = new Map<string, Track>();
  tracks.forEach((track) => {
    if (!byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

function removeCommentTree(comments: HomeComment[], commentId: string): HomeComment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: removeCommentTree(comment.replies || [], commentId),
    }));
}

function buildFeed(data: HomeData): FeedItem[] {
  const items: FeedItem[] = [];
  if (data.forYou.length) {
    items.push({
      id: 'rail-for-you',
      kind: 'rail',
      title: 'Pour toi',
      subtitle: 'les titres et partages qui collent a ton humeur du moment',
      label: 'personnalise',
      tracks: data.forYou.slice(0, 8),
    });
  }

  const headline = data.boosted[0] || data.trending[0];
  if (headline) {
    items.push({
      id: 'headline-track',
      kind: 'track',
      title: 'A ecouter maintenant',
      subtitle: data.boosted[0] ? 'un titre qui pousse fort et donne le ton' : 'un morceau qui circule fort dans la communaute',
      label: data.boosted[0] ? 'boost' : 'recommande',
      track: headline,
    });
  }

  if (data.recent.length) {
    items.push({
      id: 'rail-recent',
      kind: 'rail',
      title: 'Fraichement publie',
      subtitle: 'les sorties recentes qui arrivent dans la home',
      label: 'nouveau',
      tracks: data.recent.slice(0, 8),
    });
  }

  items.push({ id: 'city-feed-pulse', kind: 'city' });
  items.push({ id: 'composer', kind: 'composer' });
  if (data.posts[0]) items.push({ id: `post-${data.posts[0].id}`, kind: 'post', post: data.posts[0] });
  if (data.posts[1]) items.push({ id: `post-${data.posts[1].id}`, kind: 'post', post: data.posts[1] });

  if (data.trending.length) {
    items.push({
      id: 'rail-trending',
      kind: 'rail',
      title: 'Tendances maintenant',
      subtitle: 'les pistes qui prennent de la vitesse en ce moment',
      label: 'trending',
      tracks: data.trending.slice(0, 8),
    });
  }

  if (data.creators.length) items.push({ id: 'creator-rail', kind: 'creator', creators: data.creators.slice(0, 8) });
  if (data.posts[2]) items.push({ id: `post-${data.posts[2].id}`, kind: 'post', post: data.posts[2] });
  items.push({ id: 'studio', kind: 'studio', title: 'Creer dans ce style', text: "Pars d'un son que tu aimes, remixe l'ambiance et publie ta version." });
  if (data.playlists[0]) items.push({ id: `playlist-${data.playlists[0].id}`, kind: 'playlist', playlist: data.playlists[0] });
  items.push({ id: 'booster', kind: 'booster', title: 'Boosters du jour', text: 'Active les mises en avant et les campagnes sans sortir de la logique Synaura.' });
  if (data.playlists[1]) items.push({ id: `playlist-${data.playlists[1].id}`, kind: 'playlist', playlist: data.playlists[1] });
  items.push({ id: 'library', kind: 'library' });
  if (data.posts[3]) items.push({ id: `post-${data.posts[3].id}`, kind: 'post', post: data.posts[3] });
  return items;
}

function matchesFilter(item: FeedItem, filter: HomeFilter) {
  if (filter === 'Pour toi') return true;
  if (filter === 'Sons') return item.kind === 'track' || item.kind === 'rail';
  if (filter === 'Communaute') return item.kind === 'composer' || item.kind === 'post' || item.kind === 'creator' || item.kind === 'city';
  return item.kind === 'playlist' || item.kind === 'library' || item.kind === 'studio' || item.kind === 'booster' || item.kind === 'city';
}

function shareTrack(track: Track) {
  Share.share({
    message: `Ecoute ${track.title} par ${artistName(track)} sur Synaura`,
  }).catch(() => {});
}

export function HomeScreen() {
  const [data, setData] = useState<HomeData>(emptyHome);
  const [filter, setFilter] = useState<HomeFilter>('Pour toi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [musicCursor, setMusicCursor] = useState(0);
  const [musicStrategy, setMusicStrategy] = useState<'reco' | 'trending'>('reco');
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreMusic, setHasMoreMusic] = useState(true);
  const [extraFeedItems, setExtraFeedItems] = useState<FeedItem[]>([]);
  const [commentTarget, setCommentTarget] = useState<{ kind: 'track' | 'post'; id: string; title: string } | null>(null);
  const [comments, setComments] = useState<HomeComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsCursor, setCommentsCursor] = useState<string | number | null>(null);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Track | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const impressionIdsRef = React.useRef<Set<string>>(new Set());
  const player = usePlayer();
  const library = useLibrary();
  const auth = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const openWebPath = useCallback(async (path: string) => {
    const handled = await openInternalLink(navigation, path, { playTrack: (track) => player.playTrack(track) });
    if (!handled) setError("Impossible d'ouvrir cette page Synaura");
  }, [navigation, player]);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await getHomeData();
      setData(next);
      setPostCursor(next.nextCursor || null);
      setMusicCursor(Number(next.nextCursor || 0) || next.forYou.length);
      setHasMorePosts(Boolean(next.hasMore));
      setHasMoreMusic(Boolean(next.hasMore));
      setMusicStrategy('reco');
      setExtraFeedItems([]);
      seenIdsRef.current = new Set(uniqueTracks([...next.forYou, ...next.trending, ...next.recent, ...next.boosted]).map((track) => track._id));
      impressionIdsRef.current.clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger Synaura');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!auth.token) {
      setUnreadNotifications(0);
      return;
    }
    let active = true;
    const refreshUnread = async () => {
      try {
        const next = await getNotifications();
        if (active) setUnreadNotifications(next.unread);
      } catch {
        // The feed remains usable when notifications are temporarily unavailable.
      }
    };
    void refreshUnread();
    const timer = setInterval(refreshUnread, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [auth.token]);

  const heroTracks = useMemo(() => uniqueTracks([...data.forYou, ...data.trending, ...data.recent]).slice(0, 5), [data]);
  const baseFeed = useMemo(() => buildFeed(data), [data]);
  const feed = useMemo(() => [...baseFeed, ...extraFeedItems].filter((item) => matchesFilter(item, filter)), [baseFeed, extraFeedItems, filter]);
  const allTracks = useMemo(() => {
    const extraTracks = extraFeedItems.flatMap((item) => item.kind === 'track' ? [item.track] : []);
    return uniqueTracks([...data.forYou, ...data.boosted, ...data.trending, ...data.recent, ...extraTracks]);
  }, [data, extraFeedItems]);

  const playQueue = useCallback(async (tracks: Track[], track: Track) => {
    const playable = tracks.filter((item) => item.audioUrl);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  const appendTrackItems = useCallback((tracks: Track[], strategy: 'reco' | 'trending') => {
    const offset = seenIdsRef.current.size;
    const unique = tracks.filter((track) => {
      if (seenIdsRef.current.has(track._id)) return false;
      seenIdsRef.current.add(track._id);
      return true;
    });
    return unique.map((track, index): FeedItem => ({
      id: `extra-${strategy}-${offset + index}-${track._id}`,
      kind: 'track',
      title: strategy === 'reco' ? 'Recommande pour toi' : 'Encore tendance',
      subtitle: strategy === 'reco' ? 'une suite personnalisee de ton feed' : 'quand les recommandations sont terminees',
      label: strategy,
      track,
    }));
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    const wantsPosts = filter !== 'Sons';
    const wantsMusic = filter !== 'Communaute';
    if ((!wantsPosts || !hasMorePosts) && (!wantsMusic || !hasMoreMusic)) return;
    setLoadingMore(true);
    try {
      let nextItems: FeedItem[] = [];
      if (filter === 'Pour toi' && hasMorePosts) {
        const result = await loadUnifiedFeed(postCursor);
        nextItems = result.items.flatMap((item, index): FeedItem[] => {
          if (item.kind === 'post') return [{ id: `extra-post-${item.post.id}-${index}`, kind: 'post', post: item.post }];
          return appendTrackItems([item.track], item.strategy);
        });
        setPostCursor(result.nextCursor);
        setMusicCursor(Number(result.nextCursor || musicCursor) || musicCursor);
        setHasMorePosts(result.hasMore);
        setHasMoreMusic(result.hasMore);
      } else {
        const [postsResult, musicResult] = await Promise.all([
          wantsPosts && hasMorePosts ? loadMixedPosts(postCursor) : Promise.resolve(null),
          wantsMusic && hasMoreMusic ? loadRankingTracks(musicStrategy, musicCursor) : Promise.resolve(null),
        ]);
        const postItems = postsResult?.items.flatMap((item, index): FeedItem[] => item.kind === 'post' ? [{ id: `extra-post-${item.post.id}-${index}`, kind: 'post', post: item.post }] : []) || [];
        const musicItems = musicResult?.items.flatMap((item) => item.kind === 'track' ? appendTrackItems([item.track], item.strategy) : []) || [];
        const max = Math.max(postItems.length, musicItems.length);
        for (let i = 0; i < max; i++) {
          if (musicItems[i]) nextItems.push(musicItems[i]);
          if (postItems[i]) nextItems.push(postItems[i]);
        }
        if (postsResult) {
          setPostCursor(postsResult.nextCursor);
          setHasMorePosts(postsResult.hasMore);
        }
        if (musicResult) {
          setMusicCursor(Number(musicResult.nextCursor || musicCursor + 18));
          if (!musicResult.hasMore && musicStrategy === 'reco') {
            setMusicStrategy('trending');
            setMusicCursor(0);
            setHasMoreMusic(true);
          } else {
            setHasMoreMusic(musicResult.hasMore);
          }
        }
      }
      if (nextItems.length) setExtraFeedItems((current) => [...current, ...nextItems]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger la suite du feed');
    } finally {
      setLoadingMore(false);
    }
  }, [appendTrackItems, filter, hasMoreMusic, hasMorePosts, loading, loadingMore, musicCursor, musicStrategy, postCursor]);

  const recordImpression = useCallback((item: FeedItem, index: number) => {
    if (item.kind !== 'track' && item.kind !== 'post') return;
    const id = item.kind === 'track' ? item.track._id : item.post.id;
    const key = `${item.kind}:${id}`;
    if (impressionIdsRef.current.has(key)) return;
    impressionIdsRef.current.add(key);
    sendRecommendationImpressions([{ id, kind: item.kind, position: index }]).catch(() => {});
  }, []);

  const openComments = useCallback(async (target: { kind: 'track' | 'post'; id: string; title: string }) => {
    setCommentTarget(target);
    setCommentsLoading(true);
    setComments([]);
    try {
      const page = await getCommentsPage(target.kind, target.id);
      setComments(page.comments);
      setCommentsCursor(page.nextCursor);
      setCommentsHasMore(page.hasMore);
    } catch {
      setComments([]);
      setCommentsCursor(null);
      setCommentsHasMore(false);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const loadMoreComments = useCallback(async () => {
    if (!commentTarget || !commentsHasMore || commentsLoadingMore) return;
    setCommentsLoadingMore(true);
    try {
      const page = await getCommentsPage(commentTarget.kind, commentTarget.id, commentsCursor);
      setComments((current) => [...current, ...page.comments.filter((comment) => !current.some((item) => item.id === comment.id))]);
      setCommentsCursor(page.nextCursor);
      setCommentsHasMore(page.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les commentaires suivants');
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [commentTarget, commentsCursor, commentsHasMore, commentsLoadingMore]);

  const submitComment = useCallback(async () => {
    if (!commentTarget || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const comment = await createComment(commentTarget.kind, commentTarget.id, commentText.trim());
      setComments((current) => [comment, ...current]);
      setCommentText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commentaire impossible');
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentTarget, commentText]);

  const removeComment = useCallback(async (comment: HomeComment) => {
    if (!commentTarget) return;
    try {
      await deleteComment(commentTarget.kind, commentTarget.id, comment.id);
      setComments((current) => removeCommentTree(current, comment.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    }
  }, [commentTarget]);

  const header = (
    <>
      <TopBar unread={unreadNotifications} onNotifications={() => setNotificationsOpen(true)} />
      <TopSearchStrip onSearch={() => setSearchOpen(true)} onStudio={() => navigation.navigate('AIStudio')} />
      {SHOW_SHUTDOWN_NOTICES ? <AnnouncementStrip onPress={() => openWebPath('/fermeture')} /> : null}
      {heroTracks.length ? (
        <MiniCarousel
          tracks={heroTracks}
          activeId={player.current?._id}
          isPlaying={player.isPlaying}
          onPlay={(track) => playQueue(heroTracks, track)}
          onCreate={() => navigation.navigate('AIStudio')}
        />
      ) : null}
      <QuickActions
        onListen={() => navigation.navigate('Discover')}
        onCreate={() => navigation.navigate('AIStudio')}
        onPublish={() => navigation.navigate('CreateHub')}
        onCommunity={() => navigation.navigate('Community')}
      />
      <CityHomeBanner onOpen={() => navigation.navigate('City')} />
      <FilterBar value={filter} onChange={setFilter} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !feed.length ? <LoadingCards /> : null}
    </>
  );

  return (
    <View style={styles.root}>
      <DecorativeBackground />
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(14, insets.top + 8) }]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.55}
        onViewableItemsChanged={({ viewableItems }) => {
          viewableItems.forEach((viewable) => {
            if (viewable.item) recordImpression(viewable.item as FeedItem, viewable.index || 0);
          });
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 55 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={warm.ink} />}
        ListFooterComponent={loadingMore ? <View style={styles.loadingMore}><ActivityIndicator color={warm.ink} /><Text style={styles.loadingMoreText}>Le feed charge la suite...</Text></View> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Rien a montrer pour "{filter}"</Text>
              <Text style={styles.emptyText}>Tire vers le bas pour recharger Synaura.</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Reveal delay={Math.min(index * 35, 210)} distance={10}>
            <FeedCard
              item={item}
              allTracks={allTracks}
              activeId={player.current?._id}
              isPlaying={player.isPlaying}
              onPlay={playQueue}
              isFavorite={library.isFavorite}
              onFavorite={(track) => library.toggleFavorite(track)}
              onNavigate={(target) => navigation.navigate(target)}
              onCommunity={() => setFilter('Communaute')}
              onQueueNext={(track) => player.addNext(track)}
              onOpenWeb={openWebPath}
              onComments={openComments}
              onShareTrack={setShareTarget}
              libraryStats={data.libraryStats || undefined}
              onPostCreated={(post) => {
                setData((current) => ({ ...current, posts: [post, ...current.posts] }));
                setFilter('Communaute');
              }}
            />
          </Reveal>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
      {loading && feed.length === 0 ? <ActivityIndicator color={warm.ink} style={styles.loader} /> : null}
      <CommentSheet
        target={commentTarget}
        comments={comments}
        loading={commentsLoading}
        value={commentText}
        submitting={commentSubmitting}
        loadingMore={commentsLoadingMore}
        hasMore={commentsHasMore}
        onChange={setCommentText}
        onSubmit={submitComment}
        onLoadMore={loadMoreComments}
        onDelete={removeComment}
        currentUserId={auth.user?.id}
        onClose={() => {
          setCommentTarget(null);
          setComments([]);
          setCommentText('');
          setCommentsCursor(null);
          setCommentsHasMore(false);
        }}
      />
      <TrackShareSheet
        track={shareTarget}
        onClose={() => setShareTarget(null)}
        onPostCreated={(post) => {
          setData((current) => ({ ...current, posts: [post, ...current.posts] }));
          setFilter('Communaute');
        }}
      />
      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} onUnreadChange={setUnreadNotifications} />
    </View>
  );
}

function DecorativeBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SynauraBackground variant="feed" />
    </View>
  );
}

function TopBar({ unread, onNotifications }: { unread: number; onNotifications: () => void }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.brandBox}>
        <Image source={require('../assets/synaura-symbol-2026.png')} style={styles.logo} />
      </View>
      <View style={styles.brandText}>
        <Text style={styles.brandTitle}>Synaura</Text>
        <Text style={styles.brandSubtitle}>ecoute · cree · remix</Text>
      </View>
      <MotionPressable accessibilityLabel="Notifications" onPress={onNotifications} style={styles.roundButton} scaleTo={0.9}>
        <Ionicons name="notifications-outline" size={20} color={warm.inkSoft} />
        {unread > 0 ? <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
      </MotionPressable>
      <MobileAccountButton />
    </View>
  );
}

function TopSearchStrip({ onSearch, onStudio }: { onSearch: () => void; onStudio: () => void }) {
  return (
    <View style={styles.searchStrip}>
      <MotionPressable onPress={onSearch} style={styles.searchPill}>
        <Ionicons name="search" size={17} color="rgba(23,19,19,0.40)" />
        <Text style={styles.searchPlaceholder}>Rechercher sons, artistes, playlists...</Text>
      </MotionPressable>
      <MotionPressable onPress={onStudio} style={styles.studioMiniButton}>
        <Ionicons name="sparkles" size={15} color={warm.inkSoft} />
        <Text style={styles.studioMiniText}>Studio</Text>
      </MotionPressable>
    </View>
  );
}

function AnnouncementStrip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.announcement}>
      <Ionicons name="alert-circle" size={15} color="rgba(127,29,29,0.78)" />
      <Text numberOfLines={2} style={styles.announcementText}>
        Synaura ferme le 24 juin 2026 - lire l'annonce officielle
      </Text>
    </Pressable>
  );
}

function RouteNav({
  active,
  onHome,
  onCommunity,
  onNavigate,
  onStudio,
  onPublish,
}: {
  active: 'home' | 'community';
  onHome: () => void;
  onCommunity: () => void;
  onNavigate: (target: 'Discover' | 'Library' | 'Search' | 'Profile') => void;
  onStudio: () => void;
  onPublish: () => void;
}) {
  const items = [
    ['Accueil', 'home', onHome],
    ['Decouvrir', 'compass', () => onNavigate('Discover')],
    ['Bibliotheque', 'library', () => onNavigate('Library')],
    ['Communaute', 'people', onCommunity],
    ['Studio', 'sparkles', onStudio],
    ['Publier', 'cloud-upload', onPublish],
  ] as const;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeNav}>
      {items.map(([label, icon, action], index) => {
        const isActive = (active === 'home' && index === 0) || (active === 'community' && index === 3);
        return (
        <Pressable key={label} onPress={action} style={[styles.routePill, isActive && styles.routePillActive]}>
          <Ionicons name={icon} size={15} color={isActive ? warm.paper : warm.inkSoft} />
          <Text style={[styles.routeText, isActive && styles.routeTextActive]}>{label}</Text>
        </Pressable>
      )})}
    </ScrollView>
  );
}

function MiniCarousel({
  tracks,
  activeId,
  isPlaying,
  onPlay,
  onCreate,
}: {
  tracks: Track[];
  activeId?: string;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onCreate: (track: Track) => void;
}) {
  const [active, setActive] = useState(0);
  const heroMotion = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active >= tracks.length) setActive(0);
  }, [active, tracks.length]);
  useEffect(() => {
    heroMotion.setValue(0);
    Animated.timing(heroMotion, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, heroMotion]);

  if (!tracks.length) return <View style={[styles.card, styles.heroSkeleton]} />;
  const item = tracks[active] || tracks[0];
  const playingThis = activeId === item._id && isPlaying;

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <TrackCover track={item} active autoPlayVideo style={StyleSheet.absoluteFill} imageStyle={styles.heroImage} />
        <LinearGradient
          colors={['rgba(23,19,19,0.98)', 'rgba(23,19,19,0.84)', 'rgba(23,19,19,0.28)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroBadges}>
          <View style={styles.heroBadgeRow}>
            <Text style={styles.heroBadge}>Mix quotidien</Text>
            <Text style={styles.heroBadgeMuted}>Top hebdo</Text>
          </View>
          <View style={styles.heroNav}>
            <MotionPressable
              accessibilityLabel="Titre precedent"
              onPress={() => setActive((value) => (value - 1 + tracks.length) % tracks.length)}
              style={styles.heroNavButton}
              scaleTo={0.88}
            >
              <Ionicons name="chevron-back" size={16} color="rgba(255,250,242,0.76)" />
            </MotionPressable>
            <MotionPressable
              accessibilityLabel="Titre suivant"
              onPress={() => setActive((value) => (value + 1) % tracks.length)}
              style={styles.heroNavButton}
              scaleTo={0.88}
            >
              <Ionicons name="chevron-forward" size={16} color="rgba(255,250,242,0.76)" />
            </MotionPressable>
          </View>
        </View>
        <Animated.View
          style={[
            styles.heroBody,
            {
              opacity: heroMotion,
              transform: [{
                translateY: heroMotion.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              }],
            },
          ]}
        >
          <Text style={styles.heroTitle}>Decouvre, remixe, publie.</Text>
          <Text style={styles.heroCopy}>Lance un mix de sons IA et indes, puis cree ton univers musical a partir de ce que tu aimes.</Text>
          <Text style={styles.heroNow} numberOfLines={1}>En tete maintenant : {item.title} · {artistName(item)}</Text>
          <View style={styles.heroActions}>
            <MotionPressable style={styles.heroPrimary} onPress={() => onPlay(item)}>
              <Ionicons name={playingThis ? 'pause' : 'play'} size={15} color={warm.ink} />
              <Text style={styles.heroPrimaryText}>Lancer mon mix</Text>
            </MotionPressable>
            <MotionPressable style={styles.heroSecondary} onPress={() => onCreate(item)}>
              <Ionicons name="sparkles" size={15} color="rgba(255,250,242,0.78)" />
              <Text style={styles.heroSecondaryText}>Creer dans ce style</Text>
            </MotionPressable>
          </View>
        </Animated.View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroThumbs}>
        {tracks.slice(0, 5).map((track, index) => (
          <MotionPressable key={track._id} onPress={() => setActive(index)} style={[styles.heroThumb, active === index && styles.heroThumbActive]}>
            <TrackCover track={track} active={active === index} autoPlayVideo={active === index} style={styles.heroThumbImage} />
            <View style={styles.heroThumbText}>
              <Text numberOfLines={1} style={[styles.heroThumbTitle, active === index && styles.heroThumbTitleActive]}>{track.title}</Text>
              <Text numberOfLines={1} style={[styles.heroThumbArtist, active === index && styles.heroThumbArtistActive]}>{artistName(track)}</Text>
            </View>
          </MotionPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function QuickActions({
  onListen,
  onCreate,
  onPublish,
  onCommunity,
}: {
  onListen: () => void;
  onCreate: () => void;
  onPublish: () => void;
  onCommunity: () => void;
}) {
  const actions = [onListen, onCreate, onPublish, onCommunity];
  return (
    <View style={styles.quickGrid}>
      {quickActions.map((item, index) => (
        <Reveal key={item.label} delay={70 + index * 55} style={styles.quickReveal}>
          <MotionPressable onPress={actions[index]} style={styles.quickItem}>
            <View style={styles.quickIcon}>
              <Ionicons name={item.icon} size={18} color={item.tint} />
            </View>
            <View style={styles.quickCopy}>
              <Text numberOfLines={1} style={styles.quickLabel}>{item.label}</Text>
              <Text numberOfLines={1} style={styles.quickCaption}>{item.caption}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color="rgba(23,19,19,0.24)" />
          </MotionPressable>
        </Reveal>
      ))}
    </View>
  );
}

function FilterBar({ value, onChange }: { value: HomeFilter; onChange: (value: HomeFilter) => void }) {
  return (
    <View style={styles.filterWrap}>
      {filters.map((item) => (
        <Pressable key={item} onPress={() => onChange(item)} style={[styles.filter, value === item && styles.filterActive]}>
          <Text style={[styles.filterText, value === item && styles.filterTextActive]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TrackShareSheet({
  track,
  onClose,
  onPostCreated,
}: {
  track: Track | null;
  onClose: () => void;
  onPostCreated: (post: HomePost) => void;
}) {
  const auth = useAuth();
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quickCaptions = ['Coup de coeur', 'A mettre en boucle', 'Besoin d avis', 'Pour vos playlists'];

  useEffect(() => {
    if (!track) {
      setCaption('');
      setError(null);
    }
  }, [track]);

  const publish = async () => {
    if (!track || submitting) return;
    if (!auth.requireAuth()) {
      setError('Connecte-toi pour partager ce son dans le feed.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const post = await createPost({ content: caption.trim(), trackId: track._id, type: 'track_share' });
      onPostCreated(post);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Partage impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={Boolean(track)} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
        <Pressable style={styles.modalShade} onPress={onClose} />
        <View style={styles.commentSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.shareHeading}>
              <Text style={styles.sheetKicker}>Partager sans quitter le fil</Text>
              <Text numberOfLines={1} style={styles.sheetTitle}>{track?.title || 'Son Synaura'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <Ionicons name="close" size={18} color={warm.ink} />
            </Pressable>
          </View>
          {track ? (
            <View style={styles.shareTrackPreview}>
              <TrackCover track={track} active style={styles.shareTrackCover} />
              <View style={styles.shareTrackMeta}>
                <Text numberOfLines={1} style={styles.postTrackTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.postTrackArtist}>{artistName(track)}</Text>
              </View>
              <Ionicons name="musical-notes" size={20} color={warm.inkSoft} />
            </View>
          ) : null}
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Ajoute quelques mots..."
            placeholderTextColor="rgba(23,19,19,0.34)"
            multiline
            style={styles.shareCaption}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shareChips}>
            {quickCaptions.map((item) => (
              <Pressable key={item} onPress={() => setCaption(item)} style={styles.composerChip}>
                <Text style={styles.composerChipText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.shareActions}>
            <Pressable onPress={publish} disabled={submitting} style={[styles.sharePrimary, submitting && styles.commentSendDisabled]}>
              {submitting ? <ActivityIndicator color={warm.paper} /> : <Ionicons name="repeat" size={17} color={warm.paper} />}
              <Text style={styles.sharePrimaryText}>Partager dans le feed</Text>
            </Pressable>
            <Pressable onPress={() => track && shareTrack(track)} style={styles.shareSecondary}>
              <Ionicons name="share-social-outline" size={17} color={warm.inkSoft} />
              <Text style={styles.shareSecondaryText}>Autres apps</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CommentSheet({
  target,
  comments,
  loading,
  value,
  submitting,
  loadingMore,
  hasMore,
  onChange,
  onSubmit,
  onLoadMore,
  onDelete,
  currentUserId,
  onClose,
}: {
  target: { kind: 'track' | 'post'; id: string; title: string } | null;
  comments: HomeComment[];
  loading: boolean;
  value: string;
  submitting: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onLoadMore: () => void;
  onDelete: (comment: HomeComment) => void;
  currentUserId?: string;
  onClose: () => void;
}) {
  const keyboardHeight = useKeyboardHeight();
  const renderComment = (comment: HomeComment, nested = false): React.ReactNode => (
    <View key={comment.id} style={[styles.commentRow, nested && styles.commentReplyRow]}>
      <View style={[styles.commentAvatar, nested && styles.commentReplyAvatar]}>
        <Text style={styles.commentAvatarText}>{comment.user.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.commentColumn}>
        <View style={styles.commentBubble}>
          <View style={styles.commentHeader}>
            <View style={styles.commentIdentity}>
              <Text style={styles.commentName}>{comment.user.name}</Text>
              <Text numberOfLines={1} style={styles.commentHandle}>@{comment.user.username}</Text>
            </View>
            {currentUserId && currentUserId === comment.user.id ? (
              <Pressable accessibilityLabel="Supprimer le commentaire" onPress={() => onDelete(comment)} style={styles.commentDelete}>
                <Ionicons name="trash-outline" size={14} color={warm.inkMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        {comment.replies?.length ? <View style={styles.commentReplies}>{comment.replies.map((reply) => renderComment(reply, true))}</View> : null}
      </View>
    </View>
  );

  return (
    <Modal visible={Boolean(target)} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalShade} onPress={onClose} />
        <View style={[styles.commentSheet, { paddingBottom: Math.max(14, keyboardHeight) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>{target?.kind === 'track' ? 'Avis piste' : 'Commentaires post'}</Text>
              <Text numberOfLines={1} style={styles.sheetTitle}>{target?.title || 'Discussion'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <Ionicons name="close" size={18} color={warm.ink} />
            </Pressable>
          </View>
          <ScrollView style={styles.commentsList} contentContainerStyle={styles.commentsContent} keyboardShouldPersistTaps="handled">
            {loading ? <ActivityIndicator color={warm.ink} /> : null}
            {!loading && !comments.length ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyTitle}>Aucun commentaire</Text>
                <Text style={styles.emptyText}>Lance la conversation comme sur la home web.</Text>
              </View>
            ) : null}
            {comments.map((comment) => renderComment(comment))}
            {hasMore ? (
              <Pressable disabled={loadingMore} onPress={onLoadMore} style={styles.loadMoreComments}>
                {loadingMore ? <ActivityIndicator color={warm.ink} /> : <Text style={styles.loadMoreCommentsText}>Charger plus</Text>}
              </Pressable>
            ) : null}
          </ScrollView>
          <View style={styles.commentInputRow}>
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor="rgba(23,19,19,0.36)"
              style={styles.commentInput}
            />
            <Pressable disabled={!value.trim() || submitting} onPress={onSubmit} style={[styles.commentSend, (!value.trim() || submitting) && styles.commentSendDisabled]}>
              {submitting ? <ActivityIndicator color={warm.paper} /> : <Ionicons name="send" size={17} color={warm.paper} />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FeedCard({
  item,
  allTracks,
  activeId,
  isPlaying,
  onPlay,
  isFavorite,
  onFavorite,
  onNavigate,
  onCommunity,
  onQueueNext,
  onComments,
  onShareTrack,
  libraryStats,
  onPostCreated,
  onOpenWeb,
}: {
  item: FeedItem;
  allTracks: Track[];
  activeId?: string;
  isPlaying: boolean;
  onPlay: (tracks: Track[], track: Track) => void;
  isFavorite: (id: string) => boolean;
  onFavorite: (track: Track) => void;
  onNavigate: (target: 'Discover' | 'Search' | 'Library' | 'Profile') => void;
  onCommunity: () => void;
  onQueueNext: (track: Track) => void;
  onComments: (target: { kind: 'track' | 'post'; id: string; title: string }) => void;
  onShareTrack: (track: Track) => void;
  libraryStats?: HomeData['libraryStats'];
  onPostCreated: (post: HomePost) => void;
  onOpenWeb: (path: string) => void;
}) {
  if (item.kind === 'city') return <CityFeedPulse onOpen={() => onOpenWeb('/city')} onCreate={() => onOpenWeb('/upload')} />;
  if (item.kind === 'composer') return <ComposerCard onPublish={() => onNavigate('Profile')} onUpload={() => onOpenWeb('/upload')} onText={onCommunity} onStudio={() => onOpenWeb('/ai-generator')} onPostCreated={onPostCreated} />;
  if (item.kind === 'post') return <PostCard post={item.post} activeId={activeId} isPlaying={isPlaying} onOpen={() => onOpenWeb(`/posts/${item.post.id}`)} onOpenProfile={() => onOpenWeb(`/profile/${encodeURIComponent(item.post.handle.replace(/^@/, ''))}`)} onPlay={(track) => onPlay(allTracks, track)} onComments={() => onComments({ kind: 'post', id: item.post.id, title: item.post.author })} onRemix={(track) => onOpenWeb(`/ai-generator?mode=style&sourceTrack=${encodeURIComponent(track._id)}`)} />;
  if (item.kind === 'rail') {
    return <RailCard item={item} activeId={activeId} isPlaying={isPlaying} onPlay={onPlay} />;
  }
  if (item.kind === 'track') {
    return (
      <HeadlineTrack
        item={item}
        activeId={activeId}
        isPlaying={isPlaying}
        onPlay={() => onPlay(allTracks, item.track)}
        isFavorite={isFavorite(item.track._id)}
        onFavorite={() => {
          onFavorite(item.track);
          toggleTrackLike(item.track._id).catch(() => {});
        }}
        onShare={() => onShareTrack(item.track)}
        onCreate={() => onOpenWeb(`/ai-generator?mode=style&sourceTrack=${encodeURIComponent(item.track._id)}&title=${encodeURIComponent(item.track.title)}`)}
        onQueueNext={() => onQueueNext(item.track)}
        onDiscuss={() => onComments({ kind: 'track', id: item.track._id, title: item.track.title })}
      />
    );
  }
  if (item.kind === 'playlist') return <PlaylistCard playlist={item.playlist} onOpen={() => onOpenWeb(`/playlists/${item.playlist.id}`)} />;
  if (item.kind === 'creator') return <CreatorRail creators={item.creators} onOpen={(creator) => onOpenWeb(`/profile/${encodeURIComponent(creator.handle.replace(/^@/, ''))}`)} />;
  if (item.kind === 'studio') return <ActionCard icon="color-wand" title={item.title} text={item.text} label="Ouvrir" gradient={['#fffaf2', '#eee7ff', '#e2fbff']} iconColor={warm.paper} onPress={() => onOpenWeb('/ai-generator')} />;
  if (item.kind === 'booster') return <ActionCard icon="flash" title={item.title} text={item.text} label="Booster" gradient={['#fff6d7', '#ffe4f1', '#fffaf2']} iconColor="#FBBF24" onPress={() => onOpenWeb('/boosters')} />;
  return <LibraryCard stats={libraryStats} onOpen={() => onNavigate('Library')} />;
}

function CityFeedPulse({ onOpen, onCreate }: { onOpen: () => void; onCreate: () => void }) {
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1,
      duration: 2200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  useEffect(() => {
    let active = true;
    void getSynauraCity().then((next) => {
      if (active) setCity(next);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const liveEvent = city?.events?.find((event) => event.kind === 'battle' && event.isLive)
    || city?.events?.find((event) => event.isLive)
    || city?.events?.[0];
  const topPulse = city?.pulse?.[0];

  return (
    <MotionPressable onPress={onOpen} style={styles.cityFeedCard}>
      <LinearGradient colors={['#fffaf2', '#fff0e4', '#efe9ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cityFeedOrb,
          {
            opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.14, 0.34, 0.14] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
          },
        ]}
      />
      <View style={styles.cityFeedHeader}>
        <View style={styles.cityFeedIcon}><Ionicons name="radio" size={18} color={warm.paper} /></View>
        <View style={styles.cityFeedCopy}>
          <Text style={styles.cityFeedKicker}>{liveEvent?.kind === 'battle' ? 'Battle live' : 'Synaura Events dans le feed'}</Text>
          <Text style={styles.cityFeedTitle}>{liveEvent?.title || city?.cityMood?.title || 'Le quartier bouge maintenant'}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="rgba(23,19,19,0.42)" />
      </View>
      <Text style={styles.cityFeedText}>{liveEvent?.description || city?.cityMood?.subtitle || 'Vitrine du jour, Radar, battle et awards peuvent surgir entre deux sons, comme un evenement vivant de la home.'}</Text>
      <View style={styles.cityFeedChips}>
        <View style={styles.cityFeedChip}><Ionicons name="flame" size={13} color="#FF6F61" /><Text style={styles.cityFeedChipText}>{topPulse ? `Pulse ${topPulse.pulse}%` : 'Pulse live'}</Text></View>
        <View style={styles.cityFeedChip}><Ionicons name="telescope" size={13} color="#7C5CFF" /><Text style={styles.cityFeedChipText}>{liveEvent?.participationCount || 0} participations</Text></View>
        <Pressable onPress={onCreate} style={styles.cityFeedCta}><Text style={styles.cityFeedCtaText}>Drop</Text></Pressable>
      </View>
    </MotionPressable>
  );
}

function ComposerCard({
  onPublish,
  onUpload,
  onText,
  onStudio,
  onPostCreated,
}: {
  onPublish: () => void;
  onUpload: () => void;
  onText: () => void;
  onStudio: () => void;
  onPostCreated: (post: HomePost) => void;
}) {
  const auth = useAuth();
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.82,
    });
    if (!result.canceled) setImageUri(result.assets[0]?.uri || null);
  };

  const publish = async () => {
    if (!auth.requireAuth()) {
      onPublish();
      return;
    }
    if (!text.trim() && !imageUri) return;
    setSubmitting(true);
    setComposerError(null);
    try {
      const imageUrl = imageUri ? await uploadPostImage(imageUri) : null;
      const post = await createPost({ content: text.trim() || 'Nouveau post Synaura', imageUrl, type: imageUrl ? 'photo' : 'text' });
      onPostCreated(post);
      setText('');
      setImageUri(null);
    } catch (e) {
      setComposerError(e instanceof Error ? e.message : 'Publication impossible');
    } finally {
      setSubmitting(false);
    }
  };

  const chips = [
    { label: 'Son', icon: 'musical-notes', action: onUpload, active: false },
    { label: 'Image', icon: 'image', action: pickImage, active: Boolean(imageUri) },
    { label: 'Texte', icon: 'chatbubble', action: onText, active: true },
    { label: 'Studio', icon: 'color-wand', action: onStudio, active: false },
  ] as const;

  return (
    <View style={styles.card}>
      <View style={styles.composerRow}>
        <View style={styles.composerAvatar}>
          <Text style={styles.composerAvatarText}>M</Text>
        </View>
        <View style={styles.composerBody}>
          <View style={styles.composerGuest}>
            <Text style={styles.composerKicker}>{auth.user ? 'Publier maintenant' : "Tu n'as pas encore de compte"}</Text>
            <Text style={styles.composerTitle}>{auth.user ? 'Quoi de neuf dans ton univers ?' : 'Rejoins le feed Synaura'}</Text>
            <Text style={styles.composerText}>
              {auth.user ? 'Texte, image, partage de son : le composer mobile suit la home web.' : 'Publie tes sons, commente les posts, suis des artistes et garde tes notifications.'}
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Partager un texte directement depuis l'accueil..."
              placeholderTextColor="rgba(23,19,19,0.34)"
              multiline
              style={styles.composerInput}
            />
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.composerPreview} /> : null}
            {imageUri ? (
              <Pressable accessibilityLabel="Retirer l'image" onPress={() => setImageUri(null)} style={styles.removeImageButton}>
                <Ionicons name="close" size={17} color={warm.paper} />
              </Pressable>
            ) : null}
            {composerError ? <Text style={styles.error}>{composerError}</Text> : null}
            <Pressable disabled={submitting || (auth.requireAuth() && !text.trim() && !imageUri)} onPress={publish} style={[styles.composerButton, submitting && styles.commentSendDisabled]}>
              {submitting ? <ActivityIndicator color={warm.paper} /> : <Ionicons name={auth.user ? 'send' : 'person-add'} size={16} color={warm.paper} />}
              <Text style={styles.composerButtonText}>{auth.user ? 'Publier' : 'Creer un compte'}</Text>
            </Pressable>
            {!auth.user ? (
              <Pressable onPress={onPublish} style={styles.composerSecondaryButton}>
                <Text style={styles.composerSecondaryButtonText}>Connexion</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.composerChips}>
            {chips.map((chip) => (
              <Pressable key={chip.label} onPress={chip.action} style={[styles.composerChip, chip.active && styles.composerChipActive]}>
                <Ionicons name={chip.icon} size={14} color={chip.active ? warm.paper : warm.inkSoft} />
                <Text style={[styles.composerChipText, chip.active && styles.composerChipTextActive]}>{chip.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function PostCard({
  post,
  activeId,
  isPlaying,
  onOpen,
  onOpenProfile,
  onPlay,
  onComments,
  onRemix,
}: {
  post: HomePost;
  activeId?: string;
  isPlaying: boolean;
  onOpen: () => void;
  onOpenProfile: () => void;
  onPlay: (track: Track) => void;
  onComments: () => void;
  onRemix: (track: Track) => void;
}) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likesCount);
  const playingThis = post.track ? activeId === post.track._id && isPlaying : false;

  const toggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    try {
      await togglePostLike(post.id);
    } catch {
      setLiked(!nextLiked);
      setLikes((current) => Math.max(0, current + (nextLiked ? -1 : 1)));
    }
  };

  const sharePost = () => {
    Share.share({ message: `${post.author} sur Synaura: ${post.text}` }).catch(() => {});
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpenProfile} style={styles.postHeader}>
        <View style={styles.postAvatar}>
          {post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.postAvatarText}>{post.avatar}</Text>}
        </View>
        <View style={styles.postAuthor}>
          <Text numberOfLines={1} style={styles.postName}>{post.author}</Text>
          <Text numberOfLines={1} style={styles.postMeta}>{post.handle} · {post.time} · {post.mood}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color="rgba(23,19,19,0.36)" />
      </Pressable>

      <Pressable onPress={onOpen}>
        <Text style={styles.postText}>{post.text}</Text>
      </Pressable>

      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
      {post.track ? <PostTrack track={post.track} playing={playingThis} onPlay={() => onPlay(post.track!)} onComments={() => onComments()} onRemix={() => onRemix(post.track!)} /> : null}

      <View style={styles.postActions}>
        <Pressable onPress={toggleLike} style={[styles.postAction, liked && styles.postActionActive]}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? warm.paper : warm.inkSoft} />
          <Text style={[styles.postActionText, liked && styles.postActionTextActive]}>{likes || 'Liker'}</Text>
        </Pressable>
        <Pressable onPress={onComments} style={styles.postAction}>
          <Ionicons name="chatbubble-outline" size={16} color={warm.inkSoft} />
          <Text style={styles.postActionText}>{post.commentsCount || 'Commenter'}</Text>
        </Pressable>
        <Pressable onPress={sharePost} style={styles.postAction}>
          <Ionicons name="share-social-outline" size={16} color={warm.inkSoft} />
          <Text style={styles.postActionText}>Partager</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PostTrack({ track, playing, onPlay, onComments, onRemix }: { track: Track; playing: boolean; onPlay: () => void; onComments: () => void; onRemix: () => void }) {
  return (
    <View style={styles.postTrackWrap}>
      <View style={styles.postTrack}>
        <TrackCover track={track} active style={styles.postTrackCover} />
        <View style={styles.postTrackMeta}>
          <Text numberOfLines={1} style={styles.postTrackTitle}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.postTrackArtist}>{artistName(track)} · {track.genre?.[0] || 'Track Synaura'}</Text>
          <MiniWave active={playing} color={pickLocalTint(track._id)} />
        </View>
        <Pressable onPress={onPlay} style={styles.postTrackPlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={warm.paper} />
        </Pressable>
      </View>
      <View style={styles.postTrackActions}>
        <TrackActionButton icon="sparkles" label="Remix" onPress={onRemix} />
        <TrackActionButton icon="list" label="Lire ensuite" onPress={onPlay} />
        <TrackActionButton icon="chatbox-ellipses" label="Avis" onPress={onComments} />
      </View>
    </View>
  );
}

function MiniWave({ active, color }: { active: boolean; color: string }) {
  const bars = [10, 18, 13, 22, 15, 19, 12, 20];
  return (
    <View style={styles.wave}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveBar,
            {
              height: active ? height : Math.max(5, Math.round(height * 0.45)),
              backgroundColor: active ? color : 'rgba(23,19,19,0.16)',
            },
          ]}
        />
      ))}
    </View>
  );
}

function RailCard({
  item,
  activeId,
  isPlaying,
  onPlay,
}: {
  item: Extract<FeedItem, { kind: 'rail' }>;
  activeId?: string;
  isPlaying: boolean;
  onPlay: (tracks: Track[], track: Track) => void;
}) {
  return (
    <View style={styles.card}>
      <SectionHeader title={item.title} subtitle={item.subtitle} label={item.label} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {item.tracks.map((track) => {
          const playingThis = activeId === track._id && isPlaying;
          return (
            <MotionPressable key={track._id} onPress={() => onPlay(item.tracks, track)} style={styles.railTrack} lift={2}>
              <View style={styles.railCoverWrap}>
                <TrackCover track={track} active style={styles.railCover} />
                <View style={styles.railPlay}>
                  <Ionicons name={playingThis ? 'pause' : 'play'} size={14} color={warm.ink} />
                </View>
              </View>
              <Text numberOfLines={1} style={styles.railTitle}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.railArtist}>{artistName(track)}</Text>
            </MotionPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HeadlineTrack({
  item,
  activeId,
  isPlaying,
  onPlay,
  isFavorite,
  onFavorite,
  onShare,
  onCreate,
  onQueueNext,
  onDiscuss,
}: {
  item: Extract<FeedItem, { kind: 'track' }>;
  activeId?: string;
  isPlaying: boolean;
  onPlay: () => void;
  isFavorite: boolean;
  onFavorite: () => void;
  onShare: () => void;
  onCreate: () => void;
  onQueueNext: () => void;
  onDiscuss: () => void;
}) {
  const playingThis = activeId === item.track._id && isPlaying;
  return (
    <View style={styles.inkCard}>
      <View style={[styles.inkGlow, { backgroundColor: pickLocalTint(item.track._id) }]} />
      <View style={styles.headlineTop}>
        <View>
          <Text style={styles.inkLabel}>{item.label}</Text>
          <Text style={styles.inkHeading}>{item.title}</Text>
        </View>
        <Text style={styles.recoBadge}>Reco</Text>
      </View>
      <View style={styles.headlineBody}>
        <TrackCover track={item.track} active style={styles.headlineCover} />
        <View style={styles.headlineMeta}>
          <Text numberOfLines={2} style={styles.headlineTitle}>{item.track.title}</Text>
          <Text numberOfLines={1} style={styles.headlineArtist}>{artistName(item.track)} · {item.track.genre?.[0] || 'Track Synaura'}</Text>
          <View style={styles.headlineStats}>
            <Text style={styles.inkChip}>{formatCompact(item.track.plays)} ecoutes</Text>
            <Text style={styles.inkChip}>{item.track.likes?.length || 0} likes</Text>
            <Text style={styles.inkChip}>{item.track.comments?.length || 0} coms</Text>
          </View>
        </View>
      </View>
      <View style={styles.headlineActions}>
        <Pressable onPress={onFavorite} style={styles.inkAction}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#FB7185' : 'rgba(255,250,242,0.66)'} />
        </Pressable>
        <Pressable onPress={onDiscuss} style={styles.inkAction}>
          <Ionicons name="chatbubble-outline" size={17} color="rgba(255,250,242,0.66)" />
        </Pressable>
        <Pressable onPress={onShare} style={styles.inkAction}>
          <Ionicons name="share-social-outline" size={17} color="rgba(255,250,242,0.66)" />
        </Pressable>
        <Pressable onPress={onPlay} style={styles.inkPlay}>
          <Ionicons name={playingThis ? 'pause' : 'play'} size={19} color={warm.ink} />
        </Pressable>
      </View>
      <View style={styles.trackActionGrid}>
        <TrackActionButton icon="sparkles" label="Remix" dark onPress={onCreate} />
        <TrackActionButton icon="list" label="Lire ensuite" dark onPress={onQueueNext} />
        <TrackActionButton icon="chatbox-ellipses" label="Avis" dark onPress={onDiscuss} />
        <TrackActionButton icon="repeat" label="Defi remix" dark onPress={onDiscuss} />
      </View>
    </View>
  );
}

function TrackActionButton({
  icon,
  label,
  onPress,
  dark = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  dark?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.trackActionButton, dark && styles.trackActionButtonDark]}>
      <Ionicons name={icon} size={14} color={dark ? 'rgba(255,250,242,0.68)' : warm.inkSoft} />
      <Text numberOfLines={1} style={[styles.trackActionText, dark && styles.trackActionTextDark]}>{label}</Text>
    </Pressable>
  );
}

function PlaylistCard({ playlist, onOpen }: { playlist: Playlist; onOpen: () => void }) {
  return (
    <View style={styles.card}>
      <SectionHeader title={playlist.title} subtitle={`${playlist.curator} · ${playlist.vibe}`} label="playlist" />
      <View style={styles.playlistBody}>
        <View style={styles.playlistGrid}>
          {playlist.covers.map((cover, index) => <Image key={`${cover}-${index}`} source={{ uri: cover }} style={styles.playlistCover} />)}
        </View>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistCount}>{playlist.tracks}</Text>
          <Text style={styles.playlistText}>Une vraie playlist issue des surfaces deja presentes dans l'app.</Text>
          <Pressable onPress={onOpen} style={styles.darkPill}>
            <Ionicons name="play" size={14} color={warm.paper} />
            <Text style={styles.darkPillText}>Ouvrir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function CreatorRail({ creators, onOpen }: { creators: Creator[]; onOpen: (creator: Creator) => void }) {
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    Promise.all(creators.map(async (creator) => [creator.id, await getArtistFollowState(creator.handle.replace(/^@/, ''))] as const))
      .then((entries) => {
        if (mounted) setFollowing(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [creators]);

  const toggleFollow = async (creator: Creator) => {
    if (pending[creator.id]) return;
    const before = Boolean(following[creator.id]);
    setPending((current) => ({ ...current, [creator.id]: true }));
    setFollowing((current) => ({ ...current, [creator.id]: !before }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await toggleArtistFollow(creator.handle.replace(/^@/, ''));
      if (!result) setFollowing((current) => ({ ...current, [creator.id]: before }));
      else setFollowing((current) => ({ ...current, [creator.id]: result.following }));
    } catch {
      setFollowing((current) => ({ ...current, [creator.id]: before }));
    } finally {
      setPending((current) => ({ ...current, [creator.id]: false }));
    }
  };

  return (
    <View style={styles.card}>
      <SectionHeader title="Createurs a suivre" subtitle="profils qui publient, remixent et font bouger la home" icon="people" />
      <View style={styles.creatorGrid}>
        {creators.map((creator) => (
          <MotionPressable key={creator.id} onPress={() => onOpen(creator)} style={styles.creatorCard} lift={2}>
            <View style={styles.creatorAvatar}>
              {creator.avatar?.startsWith('http') ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.creatorAvatarText}>{creator.avatar}</Text>}
              <View style={[styles.creatorAccent, { backgroundColor: creator.tint }]} />
            </View>
            <Text numberOfLines={1} style={styles.creatorName}>{creator.name}</Text>
            <Text numberOfLines={1} style={styles.creatorHandle}>{creator.handle}</Text>
            <Text numberOfLines={1} style={styles.creatorFollowers}>{creator.followers}</Text>
            <Pressable
              disabled={pending[creator.id]}
              onPress={(event) => {
                event.stopPropagation();
                void toggleFollow(creator);
              }}
              style={[styles.creatorButton, following[creator.id] && styles.creatorButtonFollowing]}
            >
              <Ionicons name={pending[creator.id] ? 'ellipsis-horizontal' : following[creator.id] ? 'checkmark' : 'add'} size={13} color={following[creator.id] ? warm.paper : warm.inkSoft} />
              <Text style={[styles.creatorButtonText, following[creator.id] && styles.creatorButtonTextFollowing]}>
                {following[creator.id] ? 'Suivi' : 'Suivre'}
              </Text>
            </Pressable>
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  text,
  label,
  gradient,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  label: string;
  gradient: readonly [string, string, string];
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <LinearGradient colors={gradient} style={styles.actionCard}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionText}>{text}</Text>
      </View>
      <Pressable onPress={onPress} style={styles.actionButton}>
        <Text style={styles.actionButtonText}>{label}</Text>
      </Pressable>
    </LinearGradient>
  );
}

function LibraryCard({ stats: remoteStats, onOpen }: { stats?: HomeData['libraryStats']; onOpen: () => void }) {
  const library = useLibrary();
  const stats = [
    [String(remoteStats?.favorites ?? library.favorites.length), 'favoris'],
    [String(remoteStats?.recent ?? library.recent.length), 'recentes'],
    [String(remoteStats?.playlists ?? 0), 'playlists'],
    [String(remoteStats?.ai ?? 0), 'IA'],
  ];
  return (
    <Pressable onPress={onOpen} style={styles.card}>
      <SectionHeader title="Ta bibliotheque" subtitle="favoris, playlists et ecoutes recentes" icon="library" />
      <View style={styles.libraryGrid}>
        {stats.map(([value, label]) => (
          <View key={label} style={styles.libraryStat}>
            <Text style={styles.libraryValue}>{value}</Text>
            <Text style={styles.libraryLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, subtitle, label, icon }: { title: string; subtitle: string; label?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {label ? <Text style={styles.sectionLabel}>{label}</Text> : null}
      {icon ? <Ionicons name={icon} size={20} color="rgba(23,19,19,0.36)" /> : null}
    </View>
  );
}

function LoadingCards() {
  return (
    <View style={styles.loadingWrap}>
      {[0, 1, 2].map((item) => <View key={item} style={styles.loadingCard} />)}
    </View>
  );
}

function pickLocalTint(seed: string) {
  const palette = ['#8B5CF6', '#38BDF8', '#FB7185', '#F59E0B', '#14B8A6', '#EF4444'];
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return palette[total % palette.length];
}

const warm = {
  paper: '#FFFAF2',
  background: '#F4EFE6',
  ink: '#171313',
  inkSoft: 'rgba(23,19,19,0.58)',
  inkMuted: 'rgba(23,19,19,0.40)',
  border: 'rgba(23,19,19,0.08)',
  card: 'rgba(255,250,242,0.90)',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: warm.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 180,
  },
  colorField: {
    position: 'absolute',
    width: 520,
    height: 260,
    borderRadius: 130,
    opacity: 0.09,
    transform: [{ rotate: '-18deg' }],
  },
  colorFieldCoral: {
    left: -270,
    top: -70,
    backgroundColor: '#FF6F61',
  },
  colorFieldViolet: {
    right: -300,
    top: 180,
    backgroundColor: '#7C5CFF',
  },
  colorFieldCyan: {
    left: -250,
    bottom: 80,
    backgroundColor: '#00C2CB',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
    overflow: 'hidden',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(23,19,19,0.12)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(23,19,19,0.10)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: warm.border,
    borderRadius: 26,
    backgroundColor: warm.card,
    padding: spacing.sm,
    shadowColor: '#1E1914',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  brandBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: warm.border,
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    color: warm.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: 'rgba(23,19,19,0.35)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  roundButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  notificationBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C5CFF',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: warm.paper,
    fontSize: 9,
    fontWeight: '900',
  },
  publishButton: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
    paddingHorizontal: 14,
  },
  publishText: {
    color: warm.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  routeNav: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchStrip: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 21,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: spacing.md,
  },
  searchPlaceholder: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(23,19,19,0.40)',
    fontSize: 12,
    fontWeight: '800',
  },
  studioMiniButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 21,
    backgroundColor: 'rgba(23,19,19,0.06)',
    paddingHorizontal: spacing.md,
  },
  studioMiniText: {
    color: warm.inkSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  announcement: {
    marginBottom: spacing.md,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.45)',
    backgroundColor: 'rgba(254,242,242,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  announcementText: {
    flex: 1,
    color: 'rgba(127,29,29,0.78)',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  routePill: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 21,
    backgroundColor: 'rgba(255,250,242,0.84)',
    borderWidth: 1,
    borderColor: warm.border,
    paddingHorizontal: 14,
  },
  routePillActive: {
    backgroundColor: warm.ink,
  },
  routeText: {
    color: warm.inkSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  routeTextActive: {
    color: warm.paper,
  },
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: warm.border,
    backgroundColor: warm.card,
    padding: spacing.md,
    shadowColor: '#1E1914',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  cityFeedCard: {
    width: '100%',
    minHeight: 190,
    overflow: 'hidden',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: warm.card,
    padding: spacing.md,
    shadowColor: '#1E1914',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  cityFeedOrb: {
    position: 'absolute',
    right: -60,
    top: -46,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FF6F61',
  },
  cityFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cityFeedIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
  },
  cityFeedCopy: {
    flex: 1,
    minWidth: 0,
  },
  cityFeedKicker: {
    color: '#FF6F61',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cityFeedTitle: {
    marginTop: 3,
    color: warm.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cityFeedText: {
    marginTop: spacing.md,
    maxWidth: 300,
    color: 'rgba(23,19,19,0.56)',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  cityFeedChips: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cityFeedChip: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 17,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: 11,
  },
  cityFeedChipText: {
    color: warm.inkSoft,
    fontSize: 10,
    fontWeight: '900',
  },
  cityFeedCta: {
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: warm.ink,
    paddingHorizontal: spacing.md,
  },
  cityFeedCtaText: {
    color: warm.paper,
    fontSize: 10,
    fontWeight: '900',
  },
  heroSkeleton: {
    height: 260,
    backgroundColor: 'rgba(255,250,242,0.70)',
  },
  hero: {
    minHeight: 244,
    overflow: 'hidden',
    borderRadius: 20,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  heroImage: {
    borderRadius: 20,
    opacity: 0.6,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroNav: {
    flexDirection: 'row',
    gap: 6,
  },
  heroNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,250,242,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroBadgeMuted: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    color: 'rgba(255,250,242,0.52)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroBody: {
    marginTop: 28,
  },
  heroTitle: {
    color: warm.paper,
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '900',
  },
  heroCopy: {
    marginTop: spacing.sm,
    color: 'rgba(255,250,242,0.64)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  heroNow: {
    marginTop: spacing.sm,
    color: 'rgba(255,250,242,0.45)',
    fontSize: 11,
    fontWeight: '800',
  },
  heroActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroPrimary: {
    height: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    backgroundColor: warm.paper,
    paddingHorizontal: 14,
  },
  heroPrimaryText: {
    color: warm.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  heroSecondary: {
    height: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
  },
  heroSecondaryText: {
    color: 'rgba(255,250,242,0.76)',
    fontSize: 12,
    fontWeight: '900',
  },
  heroThumbs: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  heroThumb: {
    width: 168,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.06)',
    backgroundColor: 'rgba(255,255,255,0.42)',
    padding: spacing.sm,
  },
  heroThumbActive: {
    backgroundColor: warm.ink,
  },
  heroThumbImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  heroThumbText: {
    flex: 1,
    minWidth: 0,
  },
  heroThumbTitle: {
    color: warm.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  heroThumbTitleActive: {
    color: warm.paper,
  },
  heroThumbArtist: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.42)',
    fontSize: 10,
    fontWeight: '700',
  },
  heroThumbArtistActive: {
    color: 'rgba(255,250,242,0.55)',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  quickReveal: {
    width: '48.7%',
  },
  quickItem: {
    width: '100%',
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.07)',
    borderRadius: 17,
    backgroundColor: 'rgba(255,250,242,0.72)',
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171313',
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickLabel: {
    maxWidth: '100%',
    color: warm.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  quickCaption: {
    marginTop: 3,
    color: 'rgba(23,19,19,0.38)',
    fontSize: 9,
    fontWeight: '700',
  },
  filterWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: warm.border,
    backgroundColor: 'rgba(244,239,230,0.88)',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  filter: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.055)',
  },
  filterActive: {
    backgroundColor: warm.ink,
  },
  filterText: {
    color: warm.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  filterTextActive: {
    color: warm.paper,
  },
  error: {
    marginBottom: spacing.md,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: warm.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: warm.inkMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionLabel: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(23,19,19,0.055)',
    color: warm.inkSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '900',
  },
  composerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
  },
  composerAvatarText: {
    color: warm.paper,
    fontSize: 13,
    fontWeight: '900',
  },
  composerBody: {
    flex: 1,
    minWidth: 0,
  },
  composerGuest: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,111,97,0.18)',
    backgroundColor: 'rgba(255,111,97,0.10)',
    padding: spacing.md,
  },
  composerKicker: {
    color: '#FF6F61',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  composerTitle: {
    marginTop: spacing.sm,
    color: warm.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  composerText: {
    marginTop: spacing.sm,
    color: 'rgba(23,19,19,0.54)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  composerInput: {
    minHeight: 74,
    marginTop: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,250,242,0.65)',
    color: warm.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  composerPreview: {
    marginTop: spacing.md,
    width: '100%',
    height: 160,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  removeImageButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 62,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.72)',
  },
  composerButton: {
    marginTop: spacing.md,
    height: 42,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 21,
    backgroundColor: warm.ink,
    paddingHorizontal: spacing.lg,
  },
  composerButtonText: {
    color: warm.paper,
    fontSize: 13,
    fontWeight: '900',
  },
  composerSecondaryButton: {
    marginTop: spacing.sm,
    height: 42,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: 'rgba(255,250,242,0.82)',
    paddingHorizontal: spacing.lg,
  },
  composerSecondaryButtonText: {
    color: warm.inkSoft,
    fontSize: 13,
    fontWeight: '900',
  },
  composerChips: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  composerChip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: 12,
  },
  composerChipActive: {
    backgroundColor: warm.ink,
  },
  composerChipText: {
    color: warm.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  composerChipTextActive: {
    color: warm.paper,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
    overflow: 'hidden',
  },
  postAvatarText: {
    color: warm.paper,
    fontSize: 15,
    fontWeight: '900',
  },
  postAuthor: {
    flex: 1,
    minWidth: 0,
  },
  postName: {
    color: warm.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  postMeta: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.40)',
    fontSize: 11,
    fontWeight: '700',
  },
  postText: {
    marginTop: spacing.md,
    color: warm.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  postImage: {
    marginTop: spacing.md,
    width: '100%',
    height: 210,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  postTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 22,
    backgroundColor: 'rgba(23,19,19,0.055)',
    padding: spacing.sm,
  },
  postTrackWrap: {
    marginTop: spacing.md,
    borderRadius: 22,
    backgroundColor: 'rgba(23,19,19,0.045)',
    padding: spacing.sm,
  },
  postTrackCover: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  postTrackMeta: {
    flex: 1,
    minWidth: 0,
  },
  postTrackTitle: {
    color: warm.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  postTrackArtist: {
    marginTop: 3,
    color: 'rgba(23,19,19,0.42)',
    fontSize: 11,
    fontWeight: '700',
  },
  postTrackPlay: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
  },
  wave: {
    marginTop: 7,
    height: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  waveBar: {
    width: 4,
    borderRadius: 3,
  },
  postActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  postAction: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: 12,
  },
  postActionActive: {
    backgroundColor: warm.ink,
  },
  postActionText: {
    color: warm.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  postActionTextActive: {
    color: warm.paper,
  },
  postTrackActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trackActionGrid: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trackActionButton: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 17,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: 10,
  },
  trackActionButtonDark: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  trackActionText: {
    color: warm.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  trackActionTextDark: {
    color: 'rgba(255,250,242,0.68)',
  },
  rail: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  railTrack: {
    width: 145,
    borderRadius: 19,
    backgroundColor: 'rgba(23,19,19,0.045)',
    padding: spacing.sm,
  },
  railCoverWrap: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  railCover: {
    width: '100%',
    height: '100%',
  },
  railPlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.paper,
  },
  railTitle: {
    marginTop: spacing.sm,
    color: warm.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  railArtist: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.36)',
    fontSize: 11,
    fontWeight: '700',
  },
  inkCard: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: warm.ink,
    padding: spacing.md,
    shadowColor: '#140F0A',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 3,
  },
  inkGlow: {
    position: 'absolute',
    right: -70,
    top: -80,
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.28,
  },
  headlineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inkLabel: {
    color: 'rgba(255,250,242,0.38)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  inkHeading: {
    marginTop: 3,
    color: warm.paper,
    fontSize: 20,
    fontWeight: '900',
  },
  recoBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: warm.paper,
    color: warm.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '900',
  },
  headlineBody: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  headlineCover: {
    width: 116,
    height: 116,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headlineMeta: {
    flex: 1,
    minWidth: 0,
  },
  headlineTitle: {
    color: warm.paper,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '900',
  },
  headlineArtist: {
    marginTop: 7,
    color: 'rgba(255,250,242,0.50)',
    fontSize: 12,
    fontWeight: '700',
  },
  headlineStats: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inkChip: {
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,250,242,0.54)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  headlineActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inkAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inkPlay: {
    marginLeft: 'auto',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.paper,
  },
  playlistBody: {
    gap: spacing.md,
  },
  playlistGrid: {
    height: 142,
    overflow: 'hidden',
    borderRadius: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playlistCover: {
    width: '50%',
    height: '50%',
  },
  playlistInfo: {
    gap: spacing.sm,
  },
  playlistCount: {
    color: warm.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  playlistText: {
    color: 'rgba(23,19,19,0.52)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  darkPill: {
    height: 38,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 19,
    backgroundColor: warm.ink,
    paddingHorizontal: 15,
  },
  darkPillText: {
    color: warm.paper,
    fontSize: 13,
    fontWeight: '900',
  },
  creatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  creatorCard: {
    width: '48.5%',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.045)',
    padding: spacing.md,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: warm.ink,
    borderWidth: 2,
    borderColor: 'rgba(255,250,242,0.86)',
  },
  creatorAccent: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: warm.paper,
  },
  creatorAvatarText: {
    color: warm.paper,
    fontSize: 16,
    fontWeight: '900',
  },
  creatorName: {
    marginTop: spacing.sm,
    color: warm.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  creatorHandle: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.36)',
    fontSize: 11,
    fontWeight: '700',
  },
  creatorFollowers: {
    marginTop: spacing.sm,
    color: 'rgba(23,19,19,0.50)',
    fontSize: 11,
    fontWeight: '800',
  },
  creatorButton: {
    marginTop: spacing.sm,
    height: 32,
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  creatorButtonFollowing: { backgroundColor: warm.ink },
  creatorButtonText: {
    color: warm.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  creatorButtonTextFollowing: { color: warm.paper },
  actionCard: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: warm.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    color: warm.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  actionText: {
    marginTop: 4,
    color: 'rgba(23,19,19,0.54)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionButton: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: warm.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  libraryStat: {
    width: '48.5%',
    borderRadius: 16,
    backgroundColor: 'rgba(23,19,19,0.045)',
    padding: spacing.md,
  },
  libraryValue: {
    color: warm.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  libraryLabel: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.38)',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    gap: spacing.md,
  },
  loadingCard: {
    height: 148,
    borderRadius: 24,
    backgroundColor: 'rgba(255,250,242,0.70)',
    borderWidth: 1,
    borderColor: warm.border,
  },
  empty: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: warm.border,
    borderRadius: radius.xl,
    backgroundColor: warm.card,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: warm.ink,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    color: warm.inkSoft,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingMoreText: {
    color: warm.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23,19,19,0.42)',
  },
  commentSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: warm.border,
    backgroundColor: warm.paper,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(23,19,19,0.16)',
  },
  sheetHeader: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sheetKicker: {
    color: warm.inkMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    marginTop: 3,
    maxWidth: 280,
    color: warm.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  shareHeading: {
    flex: 1,
    minWidth: 0,
  },
  shareTrackPreview: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.055)',
    padding: spacing.sm,
  },
  shareTrackCover: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  shareTrackMeta: {
    flex: 1,
    minWidth: 0,
  },
  shareCaption: {
    minHeight: 82,
    marginTop: spacing.md,
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.055)',
    color: warm.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 13,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  shareChips: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  shareActions: {
    gap: spacing.sm,
  },
  sharePrimary: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 23,
    backgroundColor: warm.ink,
    paddingHorizontal: spacing.lg,
  },
  sharePrimaryText: {
    color: warm.paper,
    fontSize: 13,
    fontWeight: '900',
  },
  shareSecondary: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 22,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: spacing.lg,
  },
  shareSecondaryText: {
    color: warm.inkSoft,
    fontSize: 13,
    fontWeight: '900',
  },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.055)',
  },
  commentsList: {
    marginTop: spacing.md,
  },
  commentsContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyComments: {
    paddingVertical: spacing.xl,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentReplyRow: {
    marginTop: spacing.sm,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
  },
  commentReplyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(23,19,19,0.62)',
  },
  commentAvatarText: {
    color: warm.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  commentBubble: {
    borderRadius: 18,
    backgroundColor: 'rgba(23,19,19,0.055)',
    padding: spacing.md,
  },
  commentColumn: {
    flex: 1,
    minWidth: 0,
  },
  commentReplies: {
    marginLeft: spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commentDelete: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(23,19,19,0.045)',
  },
  commentName: {
    color: warm.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  commentIdentity: {
    flex: 1,
    minWidth: 0,
  },
  commentHandle: {
    marginTop: 1,
    color: warm.inkMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  commentText: {
    marginTop: 4,
    color: warm.inkSoft,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  loadMoreComments: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(23,19,19,0.055)',
  },
  loadMoreCommentsText: {
    color: warm.inkSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: warm.border,
    paddingTop: spacing.md,
  },
  commentInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: spacing.lg,
    color: warm.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  commentSend: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: warm.ink,
  },
  commentSendDisabled: {
    opacity: 0.45,
  },
  loader: {
    position: 'absolute',
    top: 280,
    alignSelf: 'center',
  },
});
