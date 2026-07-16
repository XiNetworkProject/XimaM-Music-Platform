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
  recordClipFunnelEvent,
  sendRecommendationImpressions,
  setTrackLike,
  setMusicClipLike,
  toggleArtistFollow,
} from '@/api/client';
import type { MusicClip, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { readRankingFeedCache, writeRankingFeedCache } from '@/feed/rankingFeedCache';
import { readClipFeedCache, writeClipFeedCache } from '@/feed/clipFeedCache';
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
  type ScrollFeedItem,
} from '@/components/swipe/feedTypes';
import { HeartBurst } from '@/components/swipe/HeartBurst';
import { LyricsSheet } from '@/components/swipe/LyricsSheet';
import { QueueSheet } from '@/components/swipe/QueueSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
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
import { colors } from '@/theme/tokens';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { ClipUploadIndicator } from '@/clips/ClipUploadIndicator';
import { NotificationBellButton } from '@/components/notifications/NotificationBellButton';

const PRELOAD_RANGE = 1;
const COMMENTS_POLL_DELAY_MS = 900;
const SWIPE_TRIGGER_DISTANCE = 48;
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
  const itemHeight = Math.max(420, responsive.height);

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
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [collectionsRaw, setCollectionsRaw] = useState<any[]>([]);
  const [cityEvents, setCityEvents] = useState<any[]>([]);
  const [musicChallenges, setMusicChallenges] = useState<any[]>([]);
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
  const pendingSwipeTrackRef = useRef<string | null>(null);
  const fetchedCommentIdsRef = useRef<Set<string>>(new Set());
  const fetchedLikeIdsRef = useRef<Set<string>>(new Set());
  const fetchedFollowIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlatList<ScrollFeedItem>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const feedProgress = useRef(new Animated.Value(0)).current;
  const lastCommittedIndexRef = useRef(0);
  const activeIndexRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const feedItemsRef = useRef<ScrollFeedItem[]>([]);
  const lastAutoStartedClipRef = useRef<string | null>(null);
  const impressionSeenRef = useRef<Set<string>>(new Set());
  const switchFeedMode = useCallback((nextMode: FeedMode) => {
    if (nextMode === feedMode) return;
    if (nextMode !== 'clips' && route.params?.mode === 'clips') {
      navigation.setParams({ mode: undefined, sourceTrackId: undefined, clipId: undefined });
    }
    setFeedMode(nextMode);
    Haptics.selectionAsync().catch(() => {});
  }, [feedMode, navigation, route.params?.mode]);

  useEffect(() => {
    if (route.params?.mode === 'clips' && feedMode !== 'clips') setFeedMode('clips');
  }, [feedMode, route.params?.mode]);

  // Feed mixte : la trame reste les morceaux (>=75%), les cartes non musicales
  // (artiste, collection, défi, annonce) sont réparties avec parcimonie. Aucune
  // promotion Premium n'est injectée.
  const feedItems = useMemo<ScrollFeedItem[]>(() => {
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
      artistSpotlights: artistItems,
      collections: collectionItems,
      challenge: challenge?.item || null,
      announcement: announcement?.item || null,
    });
  }, [feedMode, tracks, clips, popularUsers, collectionsRaw, cityEvents, musicChallenges]);

  useEffect(() => {
    feedItemsRef.current = feedItems;
  }, [feedItems]);

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

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isFocused || !appIsActive || loadState !== 'ready') return;
    const item = feedItems[activeIndex];
    if (!item || (item.kind !== 'track' && item.kind !== 'clip')) return;
    const kind = item.kind === 'clip' ? 'clip' as const : 'track' as const;
    const entity = item.kind === 'clip' ? item.clip : item.track;
    const id = item.kind === 'clip' ? item.clip.id : item.track._id;
    const key = `${kind}:${id}`;
    if (!id || impressionSeenRef.current.has(key)) return;
    const timer = setTimeout(() => {
      if (impressionSeenRef.current.has(key)) return;
      impressionSeenRef.current.add(key);
      void sendRecommendationImpressions([{
        id,
        kind,
        position: activeIndex,
        score: Number(entity.recommendationScore || 0),
        reasons: entity.recommendationReasons || [],
      }]);
    }, 650);
    return () => clearTimeout(timer);
  }, [activeIndex, appIsActive, feedItems, isFocused, loadState]);

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

  // (1) Charge le feed quand le mode change
  useEffect(() => {
    let cancelled = false;
    const reqId = ++lastRequestRef.current;
    setLoadState('loading');
    setLoadingMore(false);
    setTracks([]);
    setClips([]);
    setPlayingClipId(null);
    setActiveIndex(0);
    lastCommittedIndexRef.current = 0;
    setCursor(0);
    setHasMore(true);
    queueBoundRef.current = '';

    if (feedMode === 'clips') {
      void (async () => {
        let cacheWasShown = false;
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
          setLoadState(chunk.clips.length ? 'ready' : 'error');
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
      const cached = await readRankingFeedCache(feedMode, seedForReco, userId);
      if (!cancelled && reqId === lastRequestRef.current && cached?.tracks.length) {
        const cachedTracks = withoutObsoleteRadios(cached.tracks);
        const merged = uniqueTracks(player.current?.audioUrl
          ? [...(player.current._id.startsWith('radio-') ? [] : [player.current]), ...cachedTracks]
          : cachedTracks);
        setTracks(merged);
        setCursor(cached.nextCursor);
        setHasMore(cached.hasMore);
        setLoadState(merged.length ? 'ready' : 'loading');
        cacheWasShown = merged.length > 0;
      }

      try {
        const chunk = await fetchRankingFeedChunk(feedMode, 0, seedForReco);
        if (cancelled || reqId !== lastRequestRef.current) return;
        const feedTracks = withoutObsoleteRadios(chunk.tracks);
        const merged = uniqueTracks(player.current?.audioUrl
          ? [...(player.current._id.startsWith('radio-') ? [] : [player.current]), ...feedTracks]
          : feedTracks);
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
  }, [clipIdFilter, feedMode, reloadKey, sourceTrackFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Un titre lance depuis le mini-player, le Studio ou la bibliotheque reste la
  // premiere slide de Swipe au lieu d'etre remplace par le feed.
  useEffect(() => {
    if (loadState !== 'ready' || !player.current?.audioUrl) return;
    if (tracks.some((track) => track._id === player.current?._id)) return;
    queueBoundRef.current = '';
    setTracks((current) => uniqueTracks([player.current!, ...current]));
  }, [loadState, player.current?._id, player.current?.audioUrl, tracks]);

  // (2) Synchronise la queue du player une fois le feed pret (premier bind, ou changement de mode).
  // On NE re-bind PAS au simple focus de l'ecran : on garde la lecture en cours stable.
  useEffect(() => {
    if (loadState !== 'ready' || !playableQueue.length) return;
    const key = `${feedMode}:${playableQueue[0]?._id}:${playableQueue.at(-1)?._id}:${playableQueue.length}`;
    if (queueBoundRef.current === key) return;
    queueBoundRef.current = key;

    // Si le track courant fait deja partie du nouveau feed, on enrichit la queue native
    // autour de lui sans reset audio. Sinon, on lance le feed depuis le debut.
    const currentId = player.current?._id;
    const idxInFeed = currentId ? feedItems.findIndex((it) => playableTrackOfItem(it)?._id === currentId) : -1;
    if (idxInFeed >= 0) {
      const queueIndex = playableQueue.findIndex((track) => track._id === currentId);
      void player.setQueueOnly(playableQueue, Math.max(0, queueIndex));
      const pendingIndex = pendingSwipeTrackRef.current
        ? feedItems.findIndex((it) => playableTrackOfItem(it)?._id === pendingSwipeTrackRef.current)
        : -1;
      const displayIndex = pendingIndex >= 0 ? pendingIndex : idxInFeed;
      activeIndexRef.current = displayIndex;
      lastCommittedIndexRef.current = displayIndex;
      setActiveIndex(displayIndex);
      // On scrolle a la slide correspondante des que la liste est montee.
      requestAnimationFrame(() => {
        try { listRef.current?.scrollToIndex({ index: displayIndex, animated: false }); } catch { /* ignore */ }
      });
    } else if (!player.current || player.current._id.startsWith('radio-')) {
      void player.setQueueAndPlay(playableQueue, 0);
      activeIndexRef.current = 0;
      lastCommittedIndexRef.current = 0;
      setActiveIndex(0);
    }
  }, [feedItems, feedMode, loadState, player, playableQueue, tracks]);

  // (3) Synchro INVERSE : quand le player change naturellement de track
  // (auto-advance, lockscreen, mini-player), on scrolle vers la slide correspondante.
  // Pas de boucle car scrollToIndex(animated:false) ne declenche pas onMomentumScrollEnd.
  useEffect(() => {
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
    if (player.isPlaying) void player.pause();
    setPlayingClipId(item.clip.id);
  }, [activeIndex, appIsActive, feedItems, feedMode, isFocused, player]);

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
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      if (feedMode === 'clips') {
        const chunk = await getMusicClips({ limit: 12, cursor, sourceTrackId: sourceTrackFilter || undefined, clipId: clipIdFilter || undefined });
        const seen = new Set(clips.map((clip) => clip.id));
        const fresh = chunk.clips.filter((clip) => !seen.has(clip.id));
        setClips([...clips, ...fresh]);
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore && fresh.length > 0);
        return;
      }
      const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;
      const chunk = await fetchRankingFeedChunk(feedMode, cursor, seedForReco);
      const seen = new Set(tracks.map((t) => t._id));
      const fresh = withoutObsoleteRadios(chunk.tracks).filter((t) => !seen.has(t._id));
      if (!fresh.length) {
        setHasMore(false);
      } else {
        setTracks(uniqueTracks([...tracks, ...fresh]));
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [clipIdFilter, clips, cursor, currentSeedGenre, feedMode, hasMore, loadingMore, sourceTrackFilter, tracks]);

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
    } catch {
      setLikedMap((current) => ({ ...current, [key]: wasLiked }));
      setLikesMap((current) => ({ ...current, [key]: previousCount }));
    }
  }, [activeItem, activeTrack, auth.user, likedMap, likesMap, navigation, triggerBurst]);

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

  const handleSlideAction = useCallback((action: 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save' | 'remix' | 'useSound') => {
    if (!activeTrack) return;
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

  // Stratégie de swipe : le snap est entierement gere nativement via
  // snapToInterval + disableIntervalMomentum (une page max par geste, flick leger suffisant).
  // On ne commit la lecture qu'a la fin du snap pour eviter le play/pause spam.
  const commitIndex = useCallback((idx: number) => {
    const nextIndex = Math.max(0, Math.min(feedItems.length - 1, idx));
    if (nextIndex === lastCommittedIndexRef.current) return;
    lastCommittedIndexRef.current = nextIndex;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    Haptics.selectionAsync().catch(() => {});

    const nextItem = feedItems[nextIndex];
    if (nextItem?.kind === 'clip') {
      clearTimeout(playbackCommitRef.current);
      pendingSwipeTrackRef.current = null;
      if (player.isPlaying) void player.pause();
      lastAutoStartedClipRef.current = `${feedMode}:${nextIndex}:${nextItem.clip.id}`;
      setPlayingClipId(nextItem.clip.id);
      return;
    }
    setPlayingClipId(null);

    // Lance la lecture de la slide stable si elle contient un morceau. Idempotent.
    const target = playableTrackOfItem(nextItem);
    if (!target?.audioUrl) return;
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
        const queueIndex = player.queue.findIndex((item) => item._id === target._id);
        if (queueIndex >= 0) void player.playQueueIndex(queueIndex);
        else void player.playTrack(target);
      });
    }, 90);
  }, [feedItems, feedMode, player]);

  const commitVisibleTrack = useCallback((offsetY: number) => {
    commitIndex(Math.round(offsetY / itemHeight));
  }, [commitIndex, itemHeight]);

  const handleScrollBeginDrag = useCallback((event: any) => {
    dragStartOffsetRef.current = event.nativeEvent.contentOffset.y || 0;
  }, []);

  // Filet de securite : un drag lent mais franc (> SWIPE_TRIGGER_DISTANCE) sans flick
  // doit quand meme avancer d'une page au lieu de revenir en arriere.
  const handleScrollEndDrag = useCallback((event: any) => {
    if (!feedItems.length) return;
    const velocityY = Math.abs(Number(event.nativeEvent.velocity?.y || 0));
    if (velocityY > 0.08) return; // le snap natif s'en occupe
    const endY = event.nativeEvent.contentOffset.y || 0;
    const delta = endY - dragStartOffsetRef.current;
    if (Math.abs(delta) < SWIPE_TRIGGER_DISTANCE) return;
    const startIndex = Math.max(0, Math.min(feedItems.length - 1, Math.round(dragStartOffsetRef.current / itemHeight)));
    const nextIndex = Math.max(0, Math.min(feedItems.length - 1, startIndex + (delta > 0 ? 1 : -1)));
    requestAnimationFrame(() => {
      try { listRef.current?.scrollToIndex({ index: nextIndex, animated: true }); } catch { /* ignore */ }
    });
  }, [itemHeight, feedItems.length]);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    commitVisibleTrack(event.nativeEvent.contentOffset.y);
  }, [commitVisibleTrack]);

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
              if (player.isPlaying) void player.pause();
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
          onPress={() => void player.togglePlayPause()}
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
        onPress={() => void player.togglePlayPause()}
        onAction={handleSlideAction}
        onSeek={handleSeek}
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
    tabBarHeight,
    useThisSound,
  ]);

  const headerStyle = useMemo(() => ({
    paddingTop: insets.top + 8,
    opacity: headerOpacity,
  }), [headerOpacity, insets.top]);

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={['#0B0B0B', '#111111', '#181412']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient colors={['rgba(23,19,19,0.88)', 'rgba(23,19,19,0.0)']} style={[styles.headerGradient, { height: insets.top + 96 }]} pointerEvents="none" />

      <Animated.View style={[styles.header, headerStyle]} pointerEvents="box-none">
        <View style={[styles.headerInner, responsive.contentFrame]}>
          <View style={styles.scrollIdentity}>
            <View style={styles.scrollMark}><Ionicons name="pulse" size={23} color="#F7F6F3" /></View>
            {!responsive.isNarrow ? (
              <View>
                <Text style={styles.scrollName}>Flow</Text>
                <Text style={styles.scrollSubtitle}>Synaura</Text>
              </View>
            ) : null}
          </View>
          <SegmentedControl
            value={feedMode}
            dark
            compact
            style={styles.modeWrap}
            options={(['reco', 'trending', 'clips'] as FeedMode[]).map((mode) => ({ value: mode, label: FEED_MODE_META[mode].label }))}
            onChange={switchFeedMode}
          />
          <View style={styles.headerActions}>
            <NotificationBellButton dark compact />
            <MotionPressable accessibilityLabel="Voir la file d'attente" onPress={() => setQueueOpen(true)} style={styles.queueButton} scaleTo={0.9}>
              <Ionicons name="albums-outline" size={20} color="#FFFAF2" />
              {player.queue.length ? <View style={styles.queueBadge}><Text style={styles.queueBadgeText}>{player.queue.length}</Text></View> : null}
            </MotionPressable>
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
          extraData={`${activeIndex}:${playingClipId || ''}:${appIsActive ? 'active' : 'paused'}`}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          directionalLockEnabled
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
          initialScrollIndex={Math.max(0, Math.min(activeIndex, feedItems.length - 1))}
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={1}
          updateCellsBatchingPeriod={48}
          onScrollToIndexFailed={(info) => listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })}
          removeClippedSubviews={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.45}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color="rgba(255,250,242,0.62)" />
            </View>
          ) : null}
        />
      )}

      <HeartBurst visible={burstVisible} burstKey={burstKey} />

      <CommentsSheet
        visible={commentsOpen}
        track={activeTrack}
        clip={activeClip}
        commentCount={activeClip
          ? commentsCounts[clipInteractionKey(activeClip.id)] ?? activeClip.commentsCount
          : activeTrack ? commentsCounts[activeTrack._id] ?? activeTrack.commentsCount ?? 0 : 0}
        onClose={() => setCommentsOpen(false)}
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
              <Ionicons name="color-wand-outline" size={18} color="#F7F6F3" />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
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
  footer: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  remixSheet: { paddingHorizontal: 18, paddingBottom: 10, gap: 12 },
  remixHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remixCover: { width: 64, height: 64, borderRadius: 9, backgroundColor: 'rgba(17,17,17,0.08)' },
  remixTitle: { color: '#111111', fontSize: 18, fontWeight: '900' },
  remixArtist: { marginTop: 2, color: 'rgba(17,17,17,0.52)', fontSize: 13, fontWeight: '800' },
  remixText: { color: '#111111', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  remixCredit: { color: 'rgba(17,17,17,0.5)', fontSize: 12, fontWeight: '700' },
  remixPrimary: { height: 50, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111111' },
  remixPrimaryText: { color: '#F7F6F3', fontSize: 14, fontWeight: '900' },
  remixSecondary: { height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)' },
  remixSecondaryText: { color: 'rgba(17,17,17,0.62)', fontSize: 13, fontWeight: '900' },
});
