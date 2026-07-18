import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  DeviceEventEmitter,
  FlatList,
  Image,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchRankingFeedChunk,
  getArtistFollowState,
  getCommentsCount,
  getEditorialCollections,
  getMusicChallenges,
  getMusicClips,
  getMusicClipLikeStatus,
  getPlaylistDetail,
  getPopularArtists,
  getSynauraCity,
  getTrackLikeStatus,
  loadMixedPosts,
  recordClipFunnelEvent,
  sendRecommendationImpressions,
  setTrackLike,
  setMusicClipLike,
  toggleArtistFollow,
} from '@/api/client';
import { canOpenAiVariation, canUseSoundClientSide, type HomePost, type MusicClip, type Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { readRankingFeedCache, writeRankingFeedCache } from '@/feed/rankingFeedCache';
import { readClipFeedCache, writeClipFeedCache } from '@/feed/clipFeedCache';
import {
  buildFlowResumeSnapshot,
  extractFlowSources,
  readFlowResumeSnapshot,
  writeFlowResumeSnapshot,
  type FlowResumeSnapshot,
} from '@/feed/scrollFeedSession';
import {
  applyLiveTasteSignal,
  emptyLiveTasteProfile,
  readLiveTasteProfile,
  rerankTracksWithLiveTaste,
  writeLiveTasteProfile,
  type LiveTasteProfile,
  type LiveTasteSignal,
} from '@/feed/liveTasteProfile';
import { openClipComposerForSound } from '@/navigation/clipEntry';
import { AnnouncementSlide } from '@/components/swipe/AnnouncementSlide';
import { ArtistSpotlightSlide } from '@/components/swipe/ArtistSpotlightSlide';
import { ChallengeSlide } from '@/components/swipe/ChallengeSlide';
import { ClipSlide } from '@/components/swipe/ClipSlide';
import { CollectionSlide } from '@/components/swipe/CollectionSlide';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
import {
  buildAnnouncementItem,
  buildArtistSpotlightItems,
  buildChallengeItem,
  buildCollectionItems,
  buildMusicChallengeItem,
  composeScrollFeed,
  reconcileScrollFeedItems,
  type ScrollFeedItem,
} from '@/components/swipe/feedTypes';
import { HeartBurst } from '@/components/swipe/HeartBurst';
import { HomeFlowPrelude } from '@/components/swipe/HomeFlowPrelude';
import { LyricsSheet } from '@/components/swipe/LyricsSheet';
import { QueueSheet } from '@/components/swipe/QueueSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { PostSlide } from '@/components/swipe/PostSlide';
import { ClipShareSheet } from '@/components/social/ClipShareSheet';
import { SwipeSlide } from '@/components/swipe/SwipeSlide';
import {
  FEED_MODE_META,
  FeedMode,
  topGenre,
  uniqueTracks,
} from '@/components/swipe/helpers';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MotionPressable } from '@/components/motion/Motion';
import { MobileAnimatedLogo } from '@/components/mobile/MobileAnimatedLogo';
import { TrackCover } from '@/components/TrackCover';
import { colors } from '@/theme/tokens';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { ClipUploadIndicator } from '@/clips/ClipUploadIndicator';
import { NotificationBellButton } from '@/components/notifications/NotificationBellButton';

const PRELOAD_RANGE = 2;
const COMMENTS_POLL_DELAY_MS = 900;
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function withoutObsoleteRadios(tracks: Track[]) {
  return tracks.filter((track) => (
    typeof track?._id === 'string'
    && track._id.length > 0
    && typeof track.audioUrl === 'string'
    && track.audioUrl.length > 0
    && !track._id.startsWith('radio-')
  ));
}

function trackOfItem(item: ScrollFeedItem | null | undefined): Track | null {
  if (!item) return null;
  if (item.kind === 'track') return item.track;
  if (item.kind === 'clip') return item.track;
  if (item.kind === 'artist_spotlight') return item.track;
  return null;
}

function playableTrackOfItem(item: ScrollFeedItem | null | undefined): Track | null {
  if (!item) return null;
  if (item.kind === 'track' || item.kind === 'artist_spotlight') return item.track;
  return null;
}

function anyTrackOfItem(item: ScrollFeedItem | null | undefined): Track | null {
  return playableTrackOfItem(item) || (item?.kind === 'post' ? item.post.track || null : null);
}

function clipInteractionKey(clipId: string) {
  return `clip:${clipId}`;
}

export function SwipeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const tabBarHeight = responsive.dockHeight + Math.max(insets.bottom, 7) + 10;
  const [viewportHeight, setViewportHeight] = useState(() => Math.max(420, responsive.height));
  const itemHeight = viewportHeight;

  const player = usePlayer();
  const library = useLibrary();
  const auth = useAuth();
  const { settings } = useMobileSettings();
  const [feedMode, setFeedMode] = useState<FeedMode>(() => (route.params?.mode === 'clips' ? 'clips' : 'reco'));
  const sourceTrackFilter = route.params?.sourceTrackId ? String(route.params.sourceTrackId) : '';
  const clipIdFilter = route.params?.clipId ? String(route.params.clipId) : '';
  const [seedGenre, setSeedGenre] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [collectionsRaw, setCollectionsRaw] = useState<any[]>([]);
  const [cityEvents, setCityEvents] = useState<any[]>([]);
  const [musicChallenges, setMusicChallenges] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<ScrollFeedItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [resumeGeneration, setResumeGeneration] = useState(0);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [launchingCollectionId, setLaunchingCollectionId] = useState<string | null>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [homePreludeVisible, setHomePreludeVisible] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null);
  const [remixTrack, setRemixTrack] = useState<Track | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [burstVisible, setBurstVisible] = useState(false);

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  const queueBoundRef = useRef('');
  const lastRequestRef = useRef(0);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playbackCommitRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingSwipeReleaseRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settleCommitRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resumePersistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveTastePersistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingSwipeTrackRef = useRef<string | null>(null);
  const fetchedCommentIdsRef = useRef<Set<string>>(new Set());
  const fetchedLikeIdsRef = useRef<Set<string>>(new Set());
  const fetchedFollowIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlatList<ScrollFeedItem>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const feedProgress = useRef(new Animated.Value(0)).current;
  const lastCommittedIndexRef = useRef(0);
  const activeIndexRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const feedItemsRef = useRef<ScrollFeedItem[]>([]);
  const stableFeedModeRef = useRef<FeedMode>(feedMode);
  const pendingCandidateFeedRef = useRef<ScrollFeedItem[] | null>(null);
  const scrollInProgressRef = useRef(false);
  const momentumInProgressRef = useRef(false);
  const playbackIntentRef = useRef(0);
  const flowOwnsPlaybackRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const refreshDeferredRef = useRef(false);
  const persistFlowRef = useRef<() => Promise<void>>(async () => {});
  const liveTasteRef = useRef<LiveTasteProfile>(emptyLiveTasteProfile());
  const lastAutoStartedClipRef = useRef<string | null>(null);
  const impressionSeenRef = useRef<Set<string>>(new Set());
  const viewedTrackIdsRef = useRef<Set<string>>(new Set());
  const viewedPostIdsRef = useRef<Set<string>>(new Set());
  const viewedClipIdsRef = useRef<Set<string>>(new Set());
  const liveRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const liveRefreshInFlightRef = useRef(false);
  const lastLiveRefreshAtRef = useRef(0);
  const pendingLiveSignalsRef = useRef(0);
  const switchFeedMode = useCallback((nextMode: FeedMode) => {
    if (nextMode === feedMode) return;
    if (nextMode !== 'clips' && route.params?.mode === 'clips') {
      navigation.setParams({ mode: undefined, sourceTrackId: undefined, clipId: undefined });
    }
    setFeedMode(nextMode);
    Haptics.selectionAsync().catch(() => {});
  }, [feedMode, navigation, route.params?.mode]);

  useEffect(() => {
    if (route.params?.mode === 'clips') {
      setHomePreludeVisible(false);
      if (feedMode !== 'clips') setFeedMode('clips');
    }
  }, [feedMode, route.params?.mode]);

  // Feed mixte candidat : la trame reste les morceaux (>=75%), les cartes non musicales
  // (artiste, collection, défi, annonce) sont réparties avec parcimonie. Aucune
  // promotion Premium n'est injectée.
  const candidateFeedItems = useMemo<ScrollFeedItem[]>(() => {
    if (feedMode === 'clips') {
      return clips
        .filter((clip) => clip?.id && clip.videoUrl && clip.sourceTrack?.audioUrl)
        .map((clip) => ({ id: `clip-${clip.id}`, kind: 'clip' as const, clip, track: clip.sourceTrack }));
    }
    const artistItems = buildArtistSpotlightItems(popularUsers, tracks, 3);
    const collectionItems = buildCollectionItems(collectionsRaw, 2);
    const challenge = buildMusicChallengeItem(musicChallenges) || buildChallengeItem(cityEvents);
    const announcement = buildAnnouncementItem(cityEvents);
    return composeScrollFeed({
      tracks,
      clips,
      posts: feedMode === 'reco' ? posts : [],
      artistSpotlights: artistItems,
      collections: collectionItems,
      challenge: challenge?.item || null,
      announcement: announcement?.item || null,
    });
  }, [feedMode, tracks, clips, posts, popularUsers, collectionsRaw, cityEvents, musicChallenges]);

  const applyCandidateFeed = useCallback((candidates: ScrollFeedItem[]) => {
    if (!candidates.length) return;
    setFeedItems((previous) => {
      const next = stableFeedModeRef.current === feedMode
        ? reconcileScrollFeedItems(previous, candidates, activeIndexRef.current)
        : candidates;
      stableFeedModeRef.current = feedMode;
      feedItemsRef.current = next;
      return next;
    });
  }, [feedMode]);

  useEffect(() => {
    if (!candidateFeedItems.length) return;
    if (scrollInProgressRef.current) {
      pendingCandidateFeedRef.current = candidateFeedItems;
      return;
    }
    applyCandidateFeed(candidateFeedItems);
  }, [applyCandidateFeed, candidateFeedItems]);

  const playableQueue = useMemo(() => {
    return uniqueTracks(feedItems
      .map((item) => playableTrackOfItem(item))
      .filter((t): t is Track => Boolean(t) && !!t!.audioUrl && !t!._id.startsWith('radio-')));
  }, [feedItems]);

  const activeItem = feedItems[activeIndex] || null;
  const activeTrack = trackOfItem(activeItem);
  const activeClip = activeItem?.kind === 'clip' ? activeItem.clip : null;
  const activeId = activeItem?.kind === 'clip' ? '' : activeTrack?._id || '';

  const currentSeedGenre = useMemo(() => seedGenre || topGenre(activeTrack), [activeTrack, seedGenre]);

  const rerankFutureTracks = useCallback((current: Track[], profile = liveTasteRef.current) => {
    const fixedIds = new Set(viewedTrackIdsRef.current);
    const active = playableTrackOfItem(feedItemsRef.current[activeIndexRef.current]);
    if (active?._id) fixedIds.add(active._id);
    const fixed = current.filter((track) => fixedIds.has(track._id));
    const future = current.filter((track) => !fixedIds.has(track._id));
    return uniqueTracks([...fixed, ...rerankTracksWithLiveTaste(future, profile, fixed)]);
  }, []);

  const rememberLiveTaste = useCallback((track: Track | null | undefined, type: LiveTasteSignal, weight = 1) => {
    if (!track?._id || track._id.startsWith('radio-')) return;
    const next = applyLiveTasteSignal(liveTasteRef.current, track, type, weight);
    liveTasteRef.current = next;
    clearTimeout(liveTastePersistTimerRef.current);
    liveTastePersistTimerRef.current = setTimeout(() => {
      void writeLiveTasteProfile(auth.user?.id, liveTasteRef.current);
    }, 700);
    if (type !== 'play_start') setTracks((current) => rerankFutureTracks(current, next));
  }, [auth.user?.id, rerankFutureTracks]);

  useEffect(() => {
    let cancelled = false;
    void readLiveTasteProfile(auth.user?.id).then((profile) => {
      if (cancelled) return;
      liveTasteRef.current = profile;
      setTracks((current) => rerankFutureTracks(current, profile));
    });
    return () => { cancelled = true; };
  }, [auth.user?.id, rerankFutureTracks]);

  const showResumeSnapshot = useCallback((snapshot: FlowResumeSnapshot) => {
    const sources = extractFlowSources(snapshot.items);
    stableFeedModeRef.current = snapshot.mode;
    feedItemsRef.current = snapshot.items;
    setFeedItems(snapshot.items);
    setTracks(sources.tracks);
    setClips(sources.clips);
    setPosts(sources.posts);
    activeIndexRef.current = snapshot.activeIndex;
    lastCommittedIndexRef.current = snapshot.activeIndex;
    setActiveIndex(snapshot.activeIndex);
    setLoadState('ready');
  }, []);

  const persistCurrentFlow = useCallback(async () => {
    const snapshot = buildFlowResumeSnapshot(feedMode, feedItemsRef.current, activeIndexRef.current);
    if (!snapshot) return;
    await writeFlowResumeSnapshot({
      ownerId: auth.user?.id,
      sourceTrackId: sourceTrackFilter,
      clipId: clipIdFilter,
      snapshot,
    });
  }, [auth.user?.id, clipIdFilter, feedMode, sourceTrackFilter]);

  useEffect(() => {
    persistFlowRef.current = persistCurrentFlow;
  }, [persistCurrentFlow]);

  useEffect(() => {
    if (loadState !== 'ready' || !feedItems.length) return;
    clearTimeout(resumePersistTimerRef.current);
    resumePersistTimerRef.current = setTimeout(() => {
      void persistCurrentFlow();
    }, 420);
    return () => clearTimeout(resumePersistTimerRef.current);
  }, [activeIndex, feedItems.length, loadState, persistCurrentFlow]);

  const refreshUpcomingRecommendations = useCallback(async () => {
    if (scrollInProgressRef.current) {
      refreshDeferredRef.current = true;
      return;
    }
    if (liveRefreshInFlightRef.current || loadState !== 'ready') return;
    if (Date.now() - lastLiveRefreshAtRef.current < 3500) return;
    liveRefreshInFlightRef.current = true;
    lastLiveRefreshAtRef.current = Date.now();
    try {
      if (feedMode === 'clips') {
        if (sourceTrackFilter || clipIdFilter) return;
        const excluded = Array.from(new Set([
          ...viewedClipIdsRef.current,
          ...feedItemsRef.current.slice(0, activeIndexRef.current + 1).flatMap((item) => item.kind === 'clip' ? [item.clip.id] : []),
        ]));
        const chunk = await getMusicClips({ limit: 18, excludeIds: excluded });
        setClips((current) => {
          const preserved = current.filter((clip) => excluded.includes(clip.id));
          const seen = new Set(preserved.map((clip) => clip.id));
          return [...preserved, ...chunk.clips.filter((clip) => !seen.has(clip.id))];
        });
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore);
        return;
      }

      const consumedItems = feedItemsRef.current.slice(0, activeIndexRef.current + 1);
      const preservedTrackIds = new Set([
        ...viewedTrackIdsRef.current,
        ...consumedItems.flatMap((item) => {
          const track = playableTrackOfItem(item);
          return track?._id ? [track._id] : [];
        }),
        ...(player.current?._id ? [player.current._id] : []),
      ]);
      const preservedPostIds = new Set([
        ...viewedPostIdsRef.current,
        ...consumedItems.flatMap((item) => item.kind === 'post' ? [item.post.id] : []),
      ]);
      const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;
      const [trackChunk, postChunk] = await Promise.all([
        fetchRankingFeedChunk(feedMode, 0, seedForReco, { excludeIds: Array.from(preservedTrackIds), limit: 24 }),
        feedMode === 'reco'
          ? loadMixedPosts(null, Array.from(preservedPostIds))
          : Promise.resolve(null),
      ]);

      setTracks((current) => {
        const preserved = current.filter((track) => preservedTrackIds.has(track._id));
        const fresh = withoutObsoleteRadios(trackChunk.tracks).filter((track) => !preservedTrackIds.has(track._id));
        return uniqueTracks([...preserved, ...rerankTracksWithLiveTaste(fresh, liveTasteRef.current, preserved)]);
      });
      if (postChunk) {
        const freshPosts = postChunk.items.flatMap((item) => item.kind === 'post' ? [item.post] : []);
        setPosts((current) => {
          const preserved = current.filter((post) => preservedPostIds.has(post.id));
          const seen = new Set(preserved.map((post) => post.id));
          return [...preserved, ...freshPosts.filter((post) => !seen.has(post.id))];
        });
      }
      setCursor(trackChunk.nextCursor);
      setHasMore(trackChunk.hasMore);
    } catch {
      // Le fil actuel reste intact si le rafraichissement adaptatif echoue.
    } finally {
      liveRefreshInFlightRef.current = false;
    }
  }, [clipIdFilter, currentSeedGenre, feedMode, loadState, player.current?._id, sourceTrackFilter]);

  const scheduleLiveRefresh = useCallback((weight = 1) => {
    pendingLiveSignalsRef.current += Math.max(1, weight);
    if (pendingLiveSignalsRef.current < 3) return;
    pendingLiveSignalsRef.current = 0;
    clearTimeout(liveRefreshTimerRef.current);
    liveRefreshTimerRef.current = setTimeout(() => {
      void refreshUpcomingRecommendations();
    }, weight >= 3 ? 900 : 1450);
  }, [refreshUpcomingRecommendations]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    feedItemsRef.current = feedItems;
  }, [feedItems]);

  useEffect(() => {
    if (!isFocused || !appIsActive || loadState !== 'ready') return;
    const item = feedItems[activeIndex];
    if (!item || (item.kind !== 'track' && item.kind !== 'clip' && item.kind !== 'post')) return;
    const kind = item.kind === 'clip' ? 'clip' as const : item.kind === 'post' ? 'post' as const : 'track' as const;
    const id = item.kind === 'clip' ? item.clip.id : item.kind === 'post' ? item.post.id : item.track._id;
    const key = `${kind}:${id}`;
    if (!id || impressionSeenRef.current.has(key)) return;
    const timer = setTimeout(() => {
      if (impressionSeenRef.current.has(key)) return;
      impressionSeenRef.current.add(key);
      if (kind === 'track') viewedTrackIdsRef.current.add(id);
      if (kind === 'post') viewedPostIdsRef.current.add(id);
      if (kind === 'clip') viewedClipIdsRef.current.add(id);
      void sendRecommendationImpressions([{
        id,
        kind,
        position: activeIndex,
        score: Number(item.kind === 'track'
          ? item.track.recommendationScore || 0
          : item.kind === 'clip' ? item.clip.recommendationScore || 0 : 0),
        reasons: item.kind === 'track'
          ? item.track.recommendationReasons || []
          : item.kind === 'clip' ? item.clip.recommendationReasons || [] : [],
      }]);
      scheduleLiveRefresh(1);
    }, 650);
    return () => clearTimeout(timer);
  }, [activeIndex, appIsActive, feedItems, isFocused, loadState, scheduleLiveRefresh]);

  useEffect(() => {
    const supported = new Set<LiveTasteSignal>([
      'play_start',
      'play_progress_25',
      'play_progress_65',
      'play_complete',
      'skip',
      'next',
      'prev',
    ]);
    const subscription = DeviceEventEmitter.addListener('synaura:recommendation-signal', (signal: { trackId?: string; type?: string; weight?: number }) => {
      const weight = Number(signal?.weight || 1);
      const type = signal?.type as LiveTasteSignal;
      if (signal?.trackId && supported.has(type)) {
        const track = feedItemsRef.current
          .map((item) => anyTrackOfItem(item))
          .find((candidate) => candidate?._id === signal.trackId) || (player.current?._id === signal.trackId ? player.current : null);
        rememberLiveTaste(track, type, weight);
      }
      scheduleLiveRefresh(weight);
    });
    return () => subscription.remove();
  }, [player.current, rememberLiveTaste, scheduleLiveRefresh]);

  useEffect(() => {
    fetchedLikeIdsRef.current.clear();
    setLikedMap({});
  }, [auth.user?.id]);

  useEffect(() => {
    Animated.timing(feedProgress, {
      toValue: feedItems.length ? Math.min(1, (activeIndex + 1) / feedItems.length) : 0,
      duration: settings.reducedMotion ? 0 : 220,
      useNativeDriver: false,
    }).start();
  }, [activeIndex, feedItems.length, feedProgress, settings.reducedMotion]);

  useEffect(() => {
    if (isFocused) return;
    void persistFlowRef.current();
    setPlayingClipId(null);
    setCommentsOpen(false);
    setShareOpen(false);
    setLyricsOpen(false);
    setQueueOpen(false);
  }, [isFocused]);

  // Android peut detacher les surfaces video et les cellules plein ecran quand
  // l'app passe en arriere-plan. On remonte uniquement la liste au retour, en
  // conservant les donnees et l'index, et on recharge si le feed etait vide.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      const isActive = nextState === 'active';
      setAppIsActive(isActive);
      if (!isActive) {
        setPlayingClipId(null);
        void persistFlowRef.current();
        return;
      }
      if (previousState === 'background' || previousState === 'inactive') {
        setResumeGeneration((value) => value + 1);
        if (!feedItemsRef.current.length) setReloadKey((value) => value + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('synaura:clip-upload-completed', () => {
      if (feedMode === 'clips') setReloadKey((value) => value + 1);
      else void getMusicClips({ limit: 8 }).then((chunk) => setClips(chunk.clips)).catch(() => {});
    });
    return () => subscription.remove();
  }, [feedMode]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('synaura:open-home-prelude', () => {
      if (feedMode === 'reco') setHomePreludeVisible(true);
    });
    return () => subscription.remove();
  }, [feedMode]);

  // (1) Charge le feed quand le mode change
  useEffect(() => {
    let cancelled = false;
    const reqId = ++lastRequestRef.current;
    setLoadState('loading');
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setTracks([]);
    setClips([]);
    setPosts([]);
    setFeedItems([]);
    feedItemsRef.current = [];
    setPlayingClipId(null);
    setActiveIndex(0);
    activeIndexRef.current = 0;
    lastCommittedIndexRef.current = 0;
    setCursor(0);
    setHasMore(true);
    queueBoundRef.current = '';

    if (feedMode === 'clips') {
      void (async () => {
        let cacheWasShown = false;
        const resume = await readFlowResumeSnapshot({
          ownerId: auth.user?.id,
          mode: feedMode,
          sourceTrackId: sourceTrackFilter,
          clipId: clipIdFilter,
        });
        if (!cancelled && reqId === lastRequestRef.current && resume?.items.length) {
          showResumeSnapshot(resume);
          cacheWasShown = true;
        }
        const cached = await readClipFeedCache(auth.user?.id, sourceTrackFilter, clipIdFilter);
        if (!cancelled && reqId === lastRequestRef.current && cached?.clips.length) {
          setClips(cached.clips);
          setCursor(cached.nextCursor);
          setHasMore(cached.hasMore);
          setLoadState('ready');
          cacheWasShown = true;
        }
        try {
          const chunk = await getMusicClips({ limit: 12, sourceTrackId: sourceTrackFilter || undefined, clipId: clipIdFilter || undefined });
          if (cancelled || reqId !== lastRequestRef.current) return;
          setClips(chunk.clips);
          setCursor(chunk.nextCursor);
          setHasMore(chunk.hasMore);
          setLoadState(chunk.clips.length || cacheWasShown ? 'ready' : 'error');
          void writeClipFeedCache(chunk, auth.user?.id, sourceTrackFilter, clipIdFilter);
        } catch {
          if (cancelled || reqId !== lastRequestRef.current || cacheWasShown) return;
          setLoadState('error');
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;
    const userId = auth.user?.id || null;

    // Les clips enrichissent le Scroll une fois le premier ecran rendu : leur
    // normalisation ne concurrence plus la restauration du cache audio.
    const clipHydrationTask = InteractionManager.runAfterInteractions(() => {
      void getMusicClips({ limit: 8 })
        .then((chunk) => {
          if (!cancelled && reqId === lastRequestRef.current) setClips(chunk.clips);
        })
        .catch(() => {});
    });

    void (async () => {
      let cacheWasShown = false;
      const resume = await readFlowResumeSnapshot({
        ownerId: userId,
        mode: feedMode,
        sourceTrackId: sourceTrackFilter,
        clipId: clipIdFilter,
      });
      if (!cancelled && reqId === lastRequestRef.current && resume?.items.length) {
        showResumeSnapshot(resume);
        cacheWasShown = true;
      }
      const cached = await readRankingFeedCache(feedMode, seedForReco, userId);
      if (!cancelled && reqId === lastRequestRef.current && cached?.tracks.length) {
        const cachedTracks = rerankTracksWithLiveTaste(withoutObsoleteRadios(cached.tracks), liveTasteRef.current);
        const merged = uniqueTracks(cachedTracks);
        setTracks(merged);
        setCursor(cached.nextCursor);
        setHasMore(cached.hasMore);
        setLoadState(merged.length ? 'ready' : 'loading');
        cacheWasShown = merged.length > 0;
      }

      try {
        const chunk = await fetchRankingFeedChunk(feedMode, 0, seedForReco, { limit: 24 });
        if (cancelled || reqId !== lastRequestRef.current) return;
        const feedTracks = rerankTracksWithLiveTaste(withoutObsoleteRadios(chunk.tracks), liveTasteRef.current);
        const merged = uniqueTracks(feedTracks);
        setTracks(merged);
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore);
        setLoadState(merged.length ? 'ready' : cacheWasShown ? 'ready' : 'error');
        void writeRankingFeedCache(feedMode, seedForReco, chunk, userId);
      } catch {
        if (!cancelled && reqId === lastRequestRef.current && !cacheWasShown) setLoadState('error');
      }
    })();

    return () => {
      cancelled = true;
      clipHydrationTask.cancel();
    };
  }, [auth.user?.id, clipIdFilter, feedMode, reloadKey, sourceTrackFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (feedMode !== 'reco') return;
    let cancelled = false;
    void loadMixedPosts()
      .then((result) => {
        if (cancelled) return;
        setPosts(result.items.flatMap((item) => item.kind === 'post' ? [item.post] : []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id, feedMode, reloadKey]);

  // Artistes populaires + collections éditoriales + events Synaura Pulse : chargés une
  // fois, réutilisés pour composer le feed mixte (mêmes règles que le web).
  useEffect(() => {
    let mounted = true;
    const hydrationTask = InteractionManager.runAfterInteractions(() => {
      void getPopularArtists(20).then((users) => { if (mounted) setPopularUsers(users); });
      void getEditorialCollections().then((collections) => { if (mounted) setCollectionsRaw(collections); });
      void getSynauraCity().then((city) => { if (mounted && Array.isArray(city?.events)) setCityEvents(city.events); }).catch(() => {});
      void getMusicChallenges('active').then((challenges) => { if (mounted) setMusicChallenges(challenges); }).catch(() => {});
    });
    return () => {
      mounted = false;
      hydrationTask.cancel();
    };
  }, []);

  // (2) Enrichit la file sans la reconstruire. Les rerankings du futur ne
  // provoquent donc plus de pause/play ni de déplacement de la slide courante.
  useEffect(() => {
    if (!player.isReady || loadState !== 'ready' || !playableQueue.length) return;
    const key = `${feedMode}:${playableQueue.map((track) => track._id).join('|')}`;
    if (queueBoundRef.current === key) return;
    queueBoundRef.current = key;
    if (!player.current || player.current._id.startsWith('radio-')) {
      const visibleTrack = playableTrackOfItem(feedItemsRef.current[activeIndexRef.current]);
      const visibleQueueIndex = visibleTrack
        ? playableQueue.findIndex((track) => track._id === visibleTrack._id)
        : -1;
      if (homePreludeVisible || visibleQueueIndex < 0) void player.mergeQueue(playableQueue);
      else {
        flowOwnsPlaybackRef.current = true;
        void player.setQueueAndPlay(playableQueue, visibleQueueIndex);
      }
      return;
    }
    void player.mergeQueue(playableQueue);
  }, [feedMode, homePreludeVisible, loadState, player.current?._id, player.isReady, player.mergeQueue, player.setQueueAndPlay, playableQueue]);

  // (3) Synchro INVERSE : quand le player change naturellement de track
  // (auto-advance, lockscreen, mini-player), on scrolle vers la slide correspondante.
  // Pas de boucle car scrollToIndex(animated:false) ne declenche pas onMomentumScrollEnd.
  useEffect(() => {
    if (!flowOwnsPlaybackRef.current || scrollInProgressRef.current) return;
    if (loadState !== 'ready' || !feedItems.length || !player.current) return;
    if (pendingSwipeTrackRef.current) {
      // TrackPlayer peut émettre brièvement l'ancien index juste après le nouveau.
      // Pendant cette fenêtre de stabilisation, la slide choisie par le geste reste
      // la source de vérité afin d'éviter le rebond 62 -> 63 -> 62 -> 63.
      return;
    }
    if (playableTrackOfItem(feedItems[activeIndexRef.current])?._id === player.current._id) return;
    const idx = feedItems.findIndex((it) => playableTrackOfItem(it)?._id === player.current?._id);
    if (idx < 0 || idx === activeIndexRef.current) return;
    activeIndexRef.current = idx;
    lastCommittedIndexRef.current = idx;
    setActiveIndex(idx);
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: false });
      } catch {
        setTimeout(() => {
          try { listRef.current?.scrollToIndex({ index: idx, animated: false }); } catch { /* ignore */ }
        }, 80);
      }
    });
  }, [player.current?._id, loadState, feedItems]);

  // Le Clip actif utilise maintenant sa session media locale (ClipSlide). Le
  // lecteur musical global est seulement mis en pause pour eviter deux audios;
  // sa file et sa position restent intactes.
  useEffect(() => {
    if (!isFocused || !appIsActive) {
      lastAutoStartedClipRef.current = null;
      setPlayingClipId(null);
      return;
    }
    const item = feedItems[activeIndex];
    if (!item || item.kind !== 'clip') {
      lastAutoStartedClipRef.current = null;
      setPlayingClipId(null);
      return;
    }
    const token = `${feedMode}:${activeIndex}:${item.clip.id}`;
    if (lastAutoStartedClipRef.current === token) return;
    lastAutoStartedClipRef.current = token;
    flowOwnsPlaybackRef.current = false;
    playbackIntentRef.current += 1;
    if (player.current) void player.pause();
    setPlayingClipId(item.clip.id);
  }, [activeIndex, appIsActive, feedItems, feedMode, isFocused, player.current, player.pause]);

  // (4) Recuperer batch des compteurs commentaires
  useEffect(() => {
    if (loadState !== 'ready' || !feedItems.length) return;
    const ids = feedItems
      .slice(Math.max(0, activeIndex - 2), Math.min(feedItems.length, activeIndex + 3))
      .filter((it) => it.kind !== 'clip')
      .map((it) => trackOfItem(it)?._id)
      .filter((id): id is string => !!id && !id.startsWith('ai-') && !fetchedCommentIdsRef.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => fetchedCommentIdsRef.current.add(id));
    const timer = setTimeout(async () => {
      const counts = await getCommentsCount(ids);
      if (counts && Object.keys(counts).length) {
        setCommentsCounts((current) => ({ ...current, ...counts }));
      }
    }, COMMENTS_POLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, loadState, feedItems]);

  // (5) Recuperer le statut like + likesCount du morceau actif
  useEffect(() => {
    if (!activeId || activeId.startsWith('ai-')) return;
    if (fetchedLikeIdsRef.current.has(activeId)) return;
    fetchedLikeIdsRef.current.add(activeId);
    void getTrackLikeStatus(activeId).then((data) => {
      if (!data) return;
      setLikedMap((current) => ({ ...current, [activeId]: data.liked }));
      setLikesMap((current) => ({ ...current, [activeId]: data.likesCount || current[activeId] || 0 }));
    });
  }, [activeId]);

  // Les Clips ont leurs propres interactions. Elles ne modifient ni le compteur
  // ni l'etat de like du morceau source.
  useEffect(() => {
    if (!activeClip?.id) return;
    const key = clipInteractionKey(activeClip.id);
    setLikedMap((current) => (key in current ? current : { ...current, [key]: activeClip.isLiked }));
    setLikesMap((current) => (key in current ? current : { ...current, [key]: activeClip.likesCount }));
    setCommentsCounts((current) => (key in current ? current : { ...current, [key]: activeClip.commentsCount }));
    if (fetchedLikeIdsRef.current.has(key)) return;
    fetchedLikeIdsRef.current.add(key);
    void getMusicClipLikeStatus(activeClip.id)
      .then((data) => {
        setLikedMap((current) => ({ ...current, [key]: data.liked }));
        setLikesMap((current) => ({ ...current, [key]: data.likesCount }));
      })
      .catch(() => {
        fetchedLikeIdsRef.current.delete(key);
      });
  }, [activeClip]);

  // (6) Statut follow de l'artiste (et du créateur du clip actif, qui peut
  // être une personne différente de l'artiste du morceau source)
  useEffect(() => {
    const usernames = [
      activeTrack?.artist?.username || '',
      activeItem?.kind === 'clip' ? activeItem.clip.creator?.username || '' : '',
    ].filter((username) => username && !fetchedFollowIdsRef.current.has(username));
    usernames.forEach((username) => {
      fetchedFollowIdsRef.current.add(username);
      void getArtistFollowState(username).then((following) => {
        setFollowingMap((current) => ({ ...current, [username]: following }));
      });
    });
  }, [activeItem, activeTrack?.artist?.username]);

  // (8) Preloading covers (morceaux, artistes en vedette, collections)
  useEffect(() => {
    if (loadState !== 'ready' || !feedItems.length) return;
    const lo = Math.max(0, activeIndex - PRELOAD_RANGE);
    const hi = Math.min(feedItems.length - 1, activeIndex + PRELOAD_RANGE);
    for (let i = lo; i <= hi; i++) {
      const it = feedItems[i];
      const url = it?.kind === 'collection' ? (it.collection.coverUrl || it.collection.bannerUrl) : trackOfItem(it)?.coverUrl;
      if (url) Image.prefetch(url).catch(() => {});
    }
  }, [activeIndex, loadState, feedItems]);

  // (9) Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      if (feedMode === 'clips') {
        const generalClipFeed = !sourceTrackFilter && !clipIdFilter;
        const chunk = await getMusicClips({
          limit: 12,
          cursor: generalClipFeed ? 0 : cursor,
          sourceTrackId: sourceTrackFilter || undefined,
          clipId: clipIdFilter || undefined,
          excludeIds: generalClipFeed ? clips.map((clip) => clip.id) : undefined,
        });
        const seen = new Set(clips.map((clip) => clip.id));
        const fresh = chunk.clips.filter((clip) => !seen.has(clip.id));
        setClips((current) => {
          const currentIds = new Set(current.map((clip) => clip.id));
          return [...current, ...fresh.filter((clip) => !currentIds.has(clip.id))];
        });
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore && fresh.length > 0);
        return;
      }
      const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;
      const [chunk, postChunk] = await Promise.all([
        fetchRankingFeedChunk(feedMode, 0, seedForReco, { excludeIds: tracks.map((track) => track._id), limit: 24 }),
        feedMode === 'reco' ? loadMixedPosts(null, posts.map((post) => post.id)) : Promise.resolve(null),
      ]);
      const seen = new Set(tracks.map((t) => t._id));
      const fresh = rerankTracksWithLiveTaste(
        withoutObsoleteRadios(chunk.tracks).filter((t) => !seen.has(t._id)),
        liveTasteRef.current,
        tracks.filter((track) => viewedTrackIdsRef.current.has(track._id)),
      );
      if (!fresh.length) {
        setHasMore(Boolean(postChunk?.hasMore));
      } else {
        setTracks(uniqueTracks([...tracks, ...fresh]));
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore);
      }
      if (postChunk) {
        const seenPosts = new Set(posts.map((post) => post.id));
        const freshPosts = postChunk.items.flatMap((item) => item.kind === 'post' && !seenPosts.has(item.post.id) ? [item.post] : []);
        if (freshPosts.length) setPosts((current) => [...current, ...freshPosts]);
      }
    } catch {
      // ignore
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [clipIdFilter, clips, cursor, currentSeedGenre, feedMode, hasMore, loadingMore, posts, sourceTrackFilter, tracks]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const triggerBurst = useCallback(() => {
    setBurstKey((k) => k + 1);
    setBurstVisible(true);
    clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setBurstVisible(false), 720);
  }, []);

  useEffect(() => () => {
    clearTimeout(burstTimerRef.current);
    clearTimeout(playbackCommitRef.current);
    clearTimeout(pendingSwipeReleaseRef.current);
    clearTimeout(settleCommitRef.current);
    clearTimeout(resumePersistTimerRef.current);
    clearTimeout(liveTastePersistTimerRef.current);
    clearTimeout(liveRefreshTimerRef.current);
    void persistFlowRef.current();
  }, []);

  const handleToggleLike = useCallback(async () => {
    if (!auth.user) {
      navigation.getParent()?.navigate('Login', { returnTo: { screen: 'Tabs', params: { screen: 'Swipe' } } });
      return;
    }
    if (!activeTrack) return;
    const isClip = activeItem?.kind === 'clip';
    const id = isClip ? activeItem.clip.id : activeTrack._id;
    const key = isClip ? clipInteractionKey(id) : id;
    if (!isClip && id.startsWith('ai-')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const wasLiked = likedMap[key] ?? (isClip ? activeItem.clip.isLiked : Boolean(activeTrack.isLiked));
    const willLike = !wasLiked;
    const previousCount = likesMap[key] ?? (isClip ? activeItem.clip.likesCount : activeTrack.likesCount) ?? 0;
    setLikedMap((current) => ({ ...current, [key]: willLike }));
    setLikesMap((current) => ({
      ...current,
      [key]: Math.max(0, previousCount + (willLike ? 1 : -1)),
    }));
    if (willLike) triggerBurst();
    try {
      const result = isClip
        ? await setMusicClipLike(id, willLike)
        : await setTrackLike(id, willLike);
      if (!result) throw new Error('Interaction non enregistree');
      setLikedMap((current) => ({ ...current, [key]: result.liked }));
      setLikesMap((current) => ({ ...current, [key]: result.likesCount }));
      if (!isClip) rememberLiveTaste(activeTrack, result.liked ? 'like' : 'unlike', result.liked ? 4 : 2);
      scheduleLiveRefresh(willLike ? 4 : 2);
    } catch {
      setLikedMap((current) => ({ ...current, [key]: wasLiked }));
      setLikesMap((current) => ({ ...current, [key]: previousCount }));
    }
  }, [activeItem, activeTrack, auth.user, likedMap, likesMap, navigation, rememberLiveTaste, scheduleLiveRefresh, triggerBurst]);

  const handleDoubleTapLike = useCallback(() => {
    if (!activeTrack) return;
    const key = activeItem?.kind === 'clip' ? clipInteractionKey(activeItem.clip.id) : activeTrack._id;
    const alreadyLiked = likedMap[key] ?? (activeItem?.kind === 'clip' ? activeItem.clip.isLiked : Boolean(activeTrack.isLiked));
    if (!alreadyLiked) {
      void handleToggleLike();
    } else {
      triggerBurst();
    }
  }, [activeItem, activeTrack, handleToggleLike, likedMap, triggerBurst]);

  const useThisSound = useCallback((track: Track) => {
    void recordClipFunnelEvent(track._id, 'clip_use_sound_started');
    const sourceTrackType = track._id.startsWith('ai-') ? 'ai_track' : 'track';
    openClipComposerForSound(navigation, Boolean(auth.user), track._id, sourceTrackType);
  }, [auth.user, navigation]);

  const handleSlideAction = useCallback((action: 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save' | 'remix' | 'useSound' | 'more') => {
    if (!activeTrack) return;
    if (action === 'more') {
      setCommentsOpen(false);
      setShareOpen(false);
      setLyricsOpen(false);
      setMoreOpen(true);
      return;
    }
    if (action === 'remix') {
      Haptics.selectionAsync().catch(() => {});
      navigation.navigate('AIStudio', {
        sourceTrackId: activeTrack._id,
        sourceTrackType: activeTrack._id.startsWith('ai-') ? 'ai_track' : 'track',
        mode: 'remix',
      });
      return;
    }
    if (action === 'useSound') {
      Haptics.selectionAsync().catch(() => {});
      useThisSound(activeTrack);
      return;
    }
    if (action === 'like') {
      void handleToggleLike();
      return;
    }
    if (action === 'comment') {
      Haptics.selectionAsync().catch(() => {});
      setCommentTimestamp(null);
      setShareOpen(false);
      setLyricsOpen(false);
      setCommentsOpen(true);
      return;
    }
    if (action === 'share') {
      Haptics.selectionAsync().catch(() => {});
      setCommentsOpen(false);
      setLyricsOpen(false);
      setShareOpen(true);
      return;
    }
    if (action === 'queue') {
      setQueueOpen(true);
      return;
    }
    if (action === 'lyrics') {
      setCommentsOpen(false);
      setShareOpen(false);
      setLyricsOpen(true);
      return;
    }
    if (action === 'save') {
      library.toggleFavorite(activeTrack);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [activeTrack, handleToggleLike, library, useThisSound]);

  const handleToggleFollow = useCallback(async (usernameParam?: string) => {
    const username = usernameParam || activeTrack?.artist?.username;
    if (!username) return;
    if (followLoading[username]) return;
    const wasFollowing = Boolean(followingMap[username]);
    setFollowLoading((current) => ({ ...current, [username]: true }));
    setFollowingMap((current) => ({ ...current, [username]: !wasFollowing }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await toggleArtistFollow(username);
      if (result) {
        setFollowingMap((current) => ({ ...current, [username]: result.following }));
        if (result.following) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        setFollowingMap((current) => ({ ...current, [username]: wasFollowing }));
      }
    } catch {
      setFollowingMap((current) => ({ ...current, [username]: wasFollowing }));
    } finally {
      setFollowLoading((current) => ({ ...current, [username]: false }));
    }
  }, [activeTrack?.artist?.username, followLoading, followingMap]);

  const handleSeek = useCallback((seconds: number) => {
    void player.seekTo(seconds);
  }, [player]);

  const handleLaunchCollection = useCallback(async (collectionId: string, slug: string) => {
    setLaunchingCollectionId(collectionId);
    try {
      const detail = await getPlaylistDetail(slug);
      if (detail.tracksList?.length) void player.setQueueAndPlay(detail.tracksList, 0);
    } catch {
      // ignore
    } finally {
      setLaunchingCollectionId(null);
    }
  }, [player]);

  const enterPreludeFlow = useCallback(() => {
    setHomePreludeVisible(false);
    const target = playableTrackOfItem(feedItems[activeIndexRef.current]) || playableQueue[0] || null;
    if (!target?.audioUrl) return;
    if (player.current?._id === target._id) {
      if (!player.isPlaying) void player.play();
    } else {
      void player.playTrack(target);
    }
  }, [feedItems, playableQueue, player]);

  const playPreludeTrack = useCallback((track: Track) => {
    if (player.current?._id === track._id) void player.togglePlayPause();
    else void player.playTrack(track);
  }, [player]);

  const openPreludeTrack = useCallback((track: Track) => {
    const index = feedItems.findIndex((item) => playableTrackOfItem(item)?._id === track._id);
    setHomePreludeVisible(false);
    if (index >= 0) {
      activeIndexRef.current = index;
      lastCommittedIndexRef.current = index;
      setActiveIndex(index);
      requestAnimationFrame(() => {
        try { listRef.current?.scrollToIndex({ index, animated: false }); } catch { /* ignore */ }
      });
    }
    if (player.current?._id === track._id) {
      if (!player.isPlaying) void player.play();
    } else {
      void player.playTrack(track);
    }
  }, [feedItems, player]);

  // Le snap est entierement natif. La lecture ne change qu'une fois la page
  // stabilisee et chaque geste invalide les commandes audio plus anciennes.
  const commitIndex = useCallback((idx: number) => {
    const nextIndex = Math.max(0, Math.min(feedItems.length - 1, idx));
    if (nextIndex === lastCommittedIndexRef.current) return;
    const playbackIntent = ++playbackIntentRef.current;
    lastCommittedIndexRef.current = nextIndex;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    Haptics.selectionAsync().catch(() => {});

    const nextItem = feedItems[nextIndex];
    if (nextItem?.kind === 'clip') {
      clearTimeout(playbackCommitRef.current);
      pendingSwipeTrackRef.current = null;
      flowOwnsPlaybackRef.current = false;
      if (player.current) void player.pause();
      lastAutoStartedClipRef.current = `${feedMode}:${nextIndex}:${nextItem.clip.id}`;
      setPlayingClipId(nextItem.clip.id);
      return;
    }
    setPlayingClipId(null);

    // Les sons attaches aux posts restent manuels : voir un post ne change ni
    // la slide ni le morceau en cours.
    const target = playableTrackOfItem(nextItem);
    if (!target?.audioUrl) {
      flowOwnsPlaybackRef.current = false;
      pendingSwipeTrackRef.current = null;
      clearTimeout(playbackCommitRef.current);
      return;
    }
    flowOwnsPlaybackRef.current = true;
    if (player.current?._id === target._id) {
      if (!player.isPlaying) void player.play();
      return;
    }
    pendingSwipeTrackRef.current = target._id;
    clearTimeout(pendingSwipeReleaseRef.current);
    pendingSwipeReleaseRef.current = setTimeout(() => {
      pendingSwipeTrackRef.current = null;
    }, 1400);
    clearTimeout(playbackCommitRef.current);
    playbackCommitRef.current = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        if (playbackIntent !== playbackIntentRef.current) return;
        if (activeIndexRef.current !== nextIndex) return;
        if (playableTrackOfItem(feedItemsRef.current[nextIndex])?._id !== target._id) return;
        const queueIndex = player.queue.findIndex((item) => item._id === target._id);
        if (queueIndex >= 0) void player.playQueueIndex(queueIndex);
        else void player.playTrack(target);
      });
    }, 120);
  }, [feedItems, feedMode, player]);

  const commitVisibleTrack = useCallback((offsetY: number) => {
    commitIndex(Math.round(offsetY / itemHeight));
  }, [commitIndex, itemHeight]);

  const flushStableFeed = useCallback(() => {
    scrollInProgressRef.current = false;
    momentumInProgressRef.current = false;
    const pending = pendingCandidateFeedRef.current;
    pendingCandidateFeedRef.current = null;
    if (pending?.length) requestAnimationFrame(() => applyCandidateFeed(pending));
    if (refreshDeferredRef.current) {
      refreshDeferredRef.current = false;
      setTimeout(() => void refreshUpcomingRecommendations(), 260);
    }
  }, [applyCandidateFeed, refreshUpcomingRecommendations]);

  const handleScrollBeginDrag = useCallback(() => {
    scrollInProgressRef.current = true;
    momentumInProgressRef.current = false;
    playbackIntentRef.current += 1;
    pendingSwipeTrackRef.current = null;
    clearTimeout(playbackCommitRef.current);
    clearTimeout(pendingSwipeReleaseRef.current);
    clearTimeout(settleCommitRef.current);
  }, []);

  const handleScrollEndDrag = useCallback((event: any) => {
    if (!feedItems.length) return;
    const velocityY = Math.abs(Number(event.nativeEvent.velocity?.y || 0));
    const targetY = Number(event.nativeEvent.targetContentOffset?.y ?? event.nativeEvent.contentOffset.y ?? 0);
    clearTimeout(settleCommitRef.current);
    settleCommitRef.current = setTimeout(() => {
      if (momentumInProgressRef.current) return;
      commitVisibleTrack(targetY);
      flushStableFeed();
    }, velocityY > 0.05 ? 240 : 90);
  }, [commitVisibleTrack, feedItems.length, flushStableFeed]);

  const handleMomentumScrollBegin = useCallback(() => {
    scrollInProgressRef.current = true;
    momentumInProgressRef.current = true;
    clearTimeout(settleCommitRef.current);
  }, []);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    commitVisibleTrack(event.nativeEvent.contentOffset.y);
    flushStableFeed();
  }, [commitVisibleTrack, flushStableFeed]);

  const handleEndReached = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const renderItem = useCallback(({ item, index }: { item: ScrollFeedItem; index: number }) => {
    const isActive = isFocused && index === activeIndex;

    if (item.kind === 'clip') {
      const isPlayingThis = isActive && appIsActive && playingClipId === item.clip.id;
      const clipTrackId = item.track._id;
      const clipKey = clipInteractionKey(item.clip.id);
      const creatorKey = item.clip.creator?.username || '';
      return (
        <ClipSlide
          clip={item.clip}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          isPlaying={isPlayingThis}
          shouldLoadMedia={isFocused && index === activeIndex}
          isLiked={likedMap[clipKey] ?? item.clip.isLiked}
          likesCount={likesMap[clipKey] ?? item.clip.likesCount}
          commentsCount={commentsCounts[clipKey] ?? item.clip.commentsCount}
          isFollowingCreator={!!followingMap[creatorKey]}
          followLoading={!!followLoading[creatorKey]}
          onPressAudio={() => {
            if (playingClipId === item.clip.id) {
              setPlayingClipId(null);
            } else {
              flowOwnsPlaybackRef.current = false;
              playbackIntentRef.current += 1;
              if (player.current) void player.pause();
              setPlayingClipId(item.clip.id);
            }
          }}
          onPlaybackEnd={() => setPlayingClipId((current) => current === item.clip.id ? null : current)}
          onDoubleTapLike={handleDoubleTapLike}
          onToggleLike={() => void handleToggleLike()}
          onOpenComments={() => {
            Haptics.selectionAsync().catch(() => {});
            setShareOpen(false);
            setLyricsOpen(false);
            setCommentsOpen(true);
          }}
          onOpenTrack={() => {
            setPlayingClipId(null);
            navigation.navigate('TrackDetail', { trackId: clipTrackId, track: item.track });
          }}
          onOpenCreator={() => {
            setPlayingClipId(null);
            if (creatorKey) navigation.navigate('PublicProfile', { username: creatorKey });
          }}
          onToggleFollowCreator={() => void handleToggleFollow(creatorKey)}
          onShare={() => {
            setCommentsOpen(false);
            setLyricsOpen(false);
            setShareOpen(true);
          }}
          onUseSound={() => useThisSound(item.track)}
        />
      );
    }

    if (item.kind === 'post') {
      const attachedTrack = item.post.track || null;
      const isPlayingThis = Boolean(
        isActive
        && attachedTrack
        && player.current?._id === attachedTrack._id
        && player.isPlaying,
      );
      const username = String(item.post.handle || '').replace(/^@/, '').trim();
      return (
        <PostSlide
          post={item.post}
          active={isActive}
          playing={isPlayingThis}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          onOpenPost={() => navigation.navigate('PostDetail', { postId: item.post.id })}
          onOpenProfile={() => {
            if (username) navigation.navigate('PublicProfile', { username });
            else navigation.navigate('PostDetail', { postId: item.post.id });
          }}
          onOpenTrack={(track) => navigation.navigate('TrackDetail', { trackId: track._id, track })}
          onPlayTrack={(track) => {
            flowOwnsPlaybackRef.current = false;
            playbackIntentRef.current += 1;
            pendingSwipeTrackRef.current = null;
            clearTimeout(playbackCommitRef.current);
            if (player.current?._id === track._id) void player.togglePlayPause();
            else void player.playTrack(track);
          }}
          onLikeChange={(liked) => {
            if (attachedTrack) rememberLiveTaste(attachedTrack, liked ? 'post_like' : 'unlike', liked ? 2 : 1);
            scheduleLiveRefresh(liked ? 3 : 1);
          }}
        />
      );
    }

    if (item.kind === 'artist_spotlight') {
      const isPlayingThis = isActive && player.current?._id === item.track._id && player.isPlaying;
      const artistKey = item.artist.username || '';
      return (
        <ArtistSpotlightSlide
          artist={item.artist}
          track={item.track}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          isPlaying={isPlayingThis}
          isFollowing={!!followingMap[artistKey]}
          followLoading={!!followLoading[artistKey]}
          onPress={() => {
            flowOwnsPlaybackRef.current = true;
            playbackIntentRef.current += 1;
            if (player.current?._id === item.track._id) void player.togglePlayPause();
            else void player.playTrack(item.track);
          }}
          onToggleFollow={() => void handleToggleFollow()}
          onOpenArtist={() => item.artist.username && navigation.navigate('PublicProfile', { username: item.artist.username })}
        />
      );
    }

    if (item.kind === 'collection') {
      return (
        <CollectionSlide
          collection={item.collection}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          launching={launchingCollectionId === item.collection.id}
          onLaunch={() => void handleLaunchCollection(item.collection.id, item.collection.slug)}
          onViewSelection={() => navigation.navigate('PlaylistDetail', { playlistId: item.collection.slug })}
        />
      );
    }

    if (item.kind === 'challenge') {
      const isMusicChallenge = item.id.startsWith('music-challenge-');
      return (
        <ChallengeSlide
          challenge={item.challenge}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          isMusicChallenge={isMusicChallenge}
          onOpen={() => (isMusicChallenge
            ? navigation.navigate('ChallengeDetail', { challengeId: item.challenge.id })
            : navigation.navigate('City'))}
        />
      );
    }

    if (item.kind === 'announcement') {
      return (
        <AnnouncementSlide
          announcement={item.announcement}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          onOpen={() => navigation.navigate('City')}
        />
      );
    }

    const track = item.track;
    const id = track._id;
    const isPlayingThis = isActive && player.current?._id === id && player.isPlaying;
    const likedHere = !!likedMap[id];
    const likesHere = likesMap[id] ?? track.likesCount ?? 0;
    const commentsHere = commentsCounts[id] ?? track.commentsCount ?? 0;
    const sharesHere = track.sharesCount ?? track.shares ?? 0;
    const artistKey = track.artist?.username || '';
    const isFollowing = !!followingMap[artistKey];
    const isFollowingLoading = !!followLoading[artistKey];

    return (
      <SwipeSlide
        track={track}
        isActive={isActive}
        isPlaying={isPlayingThis}
        isLoading={isActive && player.isLoading}
        isFavorite={library.isFavorite(id)}
        isLiked={likedHere}
        likesCount={likesHere}
        commentsCount={commentsHere}
        sharesCount={sharesHere}
        isFollowing={isFollowing}
        followLoading={isFollowingLoading}
        height={itemHeight}
        topPad={insets.top}
        bottomPad={tabBarHeight}
        onDoubleTapLike={handleDoubleTapLike}
        onPress={() => {
          flowOwnsPlaybackRef.current = true;
          playbackIntentRef.current += 1;
          if (player.current?._id === track._id) void player.togglePlayPause();
          else void player.playTrack(track);
        }}
        onAction={handleSlideAction}
        onSeek={handleSeek}
        onCreateMoment={(seconds) => {
          setShareOpen(false);
          setLyricsOpen(false);
          setCommentTimestamp(seconds);
          setCommentsOpen(true);
        }}
        onToggleFollow={() => void handleToggleFollow()}
        onOpenArtist={() => track.artist?.username && navigation.navigate('PublicProfile', { username: track.artist.username })}
      />
    );
  }, [
    activeIndex,
    appIsActive,
    commentsCounts,
    followLoading,
    followingMap,
    handleDoubleTapLike,
    handleLaunchCollection,
    handleSeek,
    handleSlideAction,
    handleToggleFollow,
    handleToggleLike,
    insets.top,
    itemHeight,
    isFocused,
    launchingCollectionId,
    library,
    navigation,
    likedMap,
    likesMap,
    player,
    playingClipId,
    rememberLiveTaste,
    scheduleLiveRefresh,
    tabBarHeight,
    useThisSound,
  ]);

  const headerStyle = useMemo(() => ({
    paddingTop: insets.top + 8,
    opacity: headerOpacity,
  }), [headerOpacity, insets.top]);

  const handleViewportLayout = useCallback((event: any) => {
    const measured = Math.round(Number(event.nativeEvent.layout?.height || 0));
    if (measured < 420) return;
    setViewportHeight((current) => Math.abs(current - measured) < 2 ? current : measured);
  }, []);

  useEffect(() => {
    if (!feedItems.length || scrollInProgressRef.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: activeIndexRef.current * itemHeight, animated: false });
    });
  }, [itemHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.root} onLayout={handleViewportLayout}>
      <LinearGradient
        pointerEvents="none"
        colors={['#0B0B0B', '#111111', '#181412']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient colors={['rgba(23,19,19,0.88)', 'rgba(23,19,19,0.0)']} style={[styles.headerGradient, { height: insets.top + 96 }]} pointerEvents="none" />

      <Animated.View style={[styles.header, headerStyle]} pointerEvents="box-none">
        <View style={[styles.headerInner, responsive.contentFrame]}>
          <MotionPressable accessibilityLabel="Ouvrir l'accueil Synaura" onPress={() => setHomePreludeVisible(true)} style={styles.scrollIdentity} scaleTo={0.94}>
            <View style={styles.scrollMark}><Ionicons name="pulse" size={23} color="#F7F6F3" /></View>
            {!responsive.isNarrow ? (
              <View>
                <Text style={styles.scrollName}>Synaura</Text>
                <Text style={styles.scrollSubtitle}>Accueil</Text>
              </View>
            ) : null}
          </MotionPressable>
          <SegmentedControl
            value={feedMode}
            dark
            compact
            style={styles.modeWrap}
            options={(['reco', 'trending', 'clips'] as FeedMode[]).map((mode) => ({ value: mode, label: FEED_MODE_META[mode].label }))}
            onChange={switchFeedMode}
          />
          <View style={styles.headerActions}>
            <MotionPressable accessibilityLabel="Rechercher" onPress={() => navigation.navigate('Search')} style={styles.queueButton} scaleTo={0.9}>
              <Ionicons name="search" size={19} color="#FFFAF2" />
            </MotionPressable>
            <NotificationBellButton dark compact />
          </View>
        </View>
        <View style={styles.feedProgressTrack}><Animated.View style={[styles.feedProgressFill, { width: feedProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>
      </Animated.View>

      <ClipUploadIndicator top={insets.top + 82} left={responsive.insets.left + 10} />

      {loadState === 'loading' || loadState === 'idle' ? (
        <View style={styles.loadingScreen}>
          <MobileAnimatedLogo loading size={58} />
          <Text style={styles.loadingText}>Synaura prépare ton Flow...</Text>
        </View>
      ) : loadState === 'error' || !feedItems.length ? (
        <View style={styles.loadingScreen}>
          <Ionicons name="cloud-offline-outline" size={28} color="rgba(255,250,242,0.55)" />
          <Text style={styles.loadingText}>Aucun son disponible. Reessaie dans un instant.</Text>
          <MotionPressable accessibilityLabel="Réessayer" onPress={() => setReloadKey((value) => value + 1)} style={styles.retryBtn} scaleTo={0.96}>
            <Text style={styles.retryText}>Reessayer</Text>
          </MotionPressable>
        </View>
      ) : (
        <FlatList
          key={`flow-${feedMode}-${resumeGeneration}`}
          ref={listRef}
          data={feedItems}
          extraData={`${activeIndex}:${playingClipId || ''}:${appIsActive ? 'active' : 'paused'}:${itemHeight}`}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          directionalLockEnabled
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollBegin={handleMomentumScrollBegin}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
          initialScrollIndex={Math.max(0, Math.min(activeIndex, feedItems.length - 1))}
          initialNumToRender={3}
          windowSize={5}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={16}
          onScrollToIndexFailed={(info) => listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })}
          removeClippedSubviews={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={1.25}
        />
      )}

      {loadingMore && loadState === 'ready' ? (
        <View pointerEvents="none" style={[styles.loadingMoreOverlay, { bottom: tabBarHeight + 16 }]}>
          <ActivityIndicator size="small" color="rgba(255,250,242,0.78)" />
        </View>
      ) : null}

      <HomeFlowPrelude
        visible={homePreludeVisible && feedMode === 'reco'}
        tracks={tracks}
        posts={posts}
        currentTrack={player.current}
        currentPlaying={player.isPlaying}
        userName={auth.user?.name || auth.user?.username}
        topPad={insets.top}
        bottomPad={tabBarHeight}
        onEnterFlow={enterPreludeFlow}
        onPlayTrack={playPreludeTrack}
        onOpenTrack={openPreludeTrack}
        onOpenPost={(post) => navigation.navigate('PostDetail', { postId: post.id })}
        onSearch={() => navigation.navigate('Search')}
        onNotifications={() => navigation.navigate(auth.requireAuth() ? 'Notifications' : 'Profile')}
        onDiscover={() => navigation.navigate('Discover')}
        onRadar={() => navigation.navigate('Radar')}
        onStudio={() => navigation.navigate('AIStudio')}
        onEvents={() => navigation.navigate('City')}
      />

      <HeartBurst visible={burstVisible} burstKey={burstKey} />

      <CommentsSheet
        visible={commentsOpen}
        track={activeTrack}
        clip={activeClip}
        commentCount={activeClip
          ? commentsCounts[clipInteractionKey(activeClip.id)] ?? activeClip.commentsCount
          : activeTrack ? commentsCounts[activeTrack._id] ?? activeTrack.commentsCount ?? 0 : 0}
        onClose={() => setCommentsOpen(false)}
        initialTimestamp={commentTimestamp}
        onCountChange={(id, next) => setCommentsCounts((current) => ({
          ...current,
          [activeClip ? clipInteractionKey(id) : id]: next,
        }))}
      />

      {activeClip ? (
        <ClipShareSheet visible={shareOpen} clip={activeClip} onClose={() => setShareOpen(false)} />
      ) : (
        <ShareSheet visible={shareOpen} track={activeTrack} onClose={() => setShareOpen(false)} />
      )}

      <LyricsSheet
        visible={lyricsOpen}
        track={activeTrack}
        onClose={() => setLyricsOpen(false)}
      />

      <QueueSheet
        visible={queueOpen}
        onClose={() => setQueueOpen(false)}
      />
      <BottomSheet visible={moreOpen} onClose={() => setMoreOpen(false)} title={activeTrack?.title || 'Actions'} subtitle="La musique reste au centre.">
        <View style={styles.moreSheet}>
          <FlowMoreAction
            icon={activeTrack && library.isFavorite(activeTrack._id) ? 'bookmark' : 'bookmark-outline'}
            color={colors.violet}
            label={activeTrack && library.isFavorite(activeTrack._id) ? 'Retirer de la bibliothèque' : 'Sauver dans la bibliothèque'}
            onPress={() => { handleSlideAction('save'); setMoreOpen(false); }}
          />
          {activeTrack?.lyrics ? <FlowMoreAction icon="document-text-outline" color={colors.cyan} label="Paroles" onPress={() => { setMoreOpen(false); handleSlideAction('lyrics'); }} /> : null}
          <FlowMoreAction icon="list-outline" label="File d'attente" onPress={() => { setMoreOpen(false); handleSlideAction('queue'); }} />
          {activeTrack && canOpenAiVariation(activeTrack) ? <FlowMoreAction icon="color-wand-outline" color={colors.violet} label="Remixer ce son" onPress={() => { setMoreOpen(false); handleSlideAction('remix'); }} /> : null}
          {activeTrack && canUseSoundClientSide({
            isOwner: Boolean(auth.user?.id && activeTrack.artist?._id === auth.user.id),
            allowClips: Boolean(activeTrack.allowClips),
            remixVisibility: activeTrack.remixVisibility || 'disabled',
          }) ? <FlowMoreAction icon="film-outline" color={colors.coral} label="Utiliser ce son dans un Clip" onPress={() => { setMoreOpen(false); handleSlideAction('useSound'); }} /> : null}
          {activeTrack ? <FlowMoreAction icon="open-outline" label="Ouvrir le morceau" onPress={() => { setMoreOpen(false); navigation.navigate('TrackDetail', { trackId: activeTrack._id, track: activeTrack }); }} /> : null}
        </View>
      </BottomSheet>
      <BottomSheet visible={Boolean(remixTrack)} onClose={() => setRemixTrack(null)} title="Remixer ce son" subtitle="Le morceau original restera toujours crédité.">
        {remixTrack ? (
          <View style={styles.remixSheet}>
            <View style={styles.remixHead}>
              <Image source={{ uri: remixTrack.coverUrl || undefined }} style={styles.remixCover} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.remixTitle}>{remixTrack.title}</Text>
                <Text numberOfLines={1} style={styles.remixArtist}>{remixTrack.artist?.name || remixTrack.artist?.username || 'Artiste Synaura'}</Text>
              </View>
            </View>
            <Text style={styles.remixText}>Crée une variation IA inspirée de ce morceau.</Text>
            <MotionPressable
              onPress={() => {
                const sourceTrackType = remixTrack._id.startsWith('ai-') ? 'ai_track' : 'track';
                const sourceTrackId = remixTrack._id;
                setRemixTrack(null);
                navigation.navigate('AIStudio', { sourceTrackId, sourceTrackType, mode: 'remix' });
              }}
              style={styles.remixPrimary}
              scaleTo={0.97}
            >
              <Ionicons name="color-wand-outline" size={18} color="#111111" />
              <Text style={styles.remixPrimaryText}>Ouvrir dans Studio</Text>
            </MotionPressable>
            <MotionPressable onPress={() => setRemixTrack(null)} style={styles.remixSecondary} scaleTo={0.97}>
              <Text style={styles.remixSecondaryText}>Annuler</Text>
            </MotionPressable>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function FlowMoreAction({ icon, label, color = colors.text, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color?: string; onPress: () => void }) {
  return (
    <MotionPressable accessibilityLabel={label} onPress={onPress} style={styles.moreRow} scaleTo={0.98}>
      <View style={[styles.moreIcon, { backgroundColor: `${color}1F` }]}><Ionicons name={icon} size={19} color={color} /></View>
      <Text style={styles.moreLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
  moreSheet: { paddingHorizontal: 14, paddingBottom: 8 },
  moreRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 6 },
  moreIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moreLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 12,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 14,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrollIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  scrollMark: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 2,
    borderLeftColor: colors.cyan,
  },
  scrollName: { color: '#F7F6F3', fontSize: 13, lineHeight: 15, fontWeight: '900' },
  scrollSubtitle: { marginTop: 1, color: 'rgba(255,255,255,0.48)', fontSize: 9, fontWeight: '700' },
  modeWrap: {
    flex: 1,
    maxWidth: 220,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  modeButton: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#FFFAF2',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modeButtonText: {
    color: 'rgba(255,250,242,0.7)',
    fontSize: 8,
    fontWeight: '900',
  },
  modeButtonTextActive: { color: '#171313' },
  queueButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,242,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,250,242,0.14)',
  },
  queueBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#D96D63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
  feedProgressTrack: { height: 2, marginTop: 7, overflow: 'hidden', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  feedProgressFill: { height: 2, borderRadius: 1, backgroundColor: '#4A9EAA' },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 22,
  },
  loadingText: { color: 'rgba(255,250,242,0.65)', fontSize: 13, textAlign: 'center', fontWeight: '700' },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFAF2',
  },
  retryText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  loadingMoreOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,17,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  remixSheet: { paddingHorizontal: 18, paddingBottom: 10, gap: 12 },
  remixHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remixCover: { width: 64, height: 64, borderRadius: 9, backgroundColor: 'rgba(17,17,17,0.08)' },
  remixTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  remixArtist: { marginTop: 2, color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  remixText: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '900' },
  remixCredit: { color: colors.textTertiary, fontSize: 12, fontWeight: '700' },
  remixPrimary: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.paper },
  remixPrimaryText: { color: colors.black, fontSize: 14, fontWeight: '900' },
  remixSecondary: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  remixSecondaryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '900' },
});
