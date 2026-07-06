import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  getMusicClips,
  getPlaylistDetail,
  getPopularArtists,
  getSynauraCity,
  getTrackLikeStatus,
  recordClipFunnelEvent,
  setTrackLike,
  toggleArtistFollow,
} from '@/api/client';
import type { MusicClip, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
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
  composeScrollFeed,
  type ScrollFeedItem,
} from '@/components/swipe/feedTypes';
import { HeartBurst } from '@/components/swipe/HeartBurst';
import { LyricsSheet } from '@/components/swipe/LyricsSheet';
import { QueueSheet } from '@/components/swipe/QueueSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { SwipeSlide } from '@/components/swipe/SwipeSlide';
import {
  FEED_MODE_META,
  FeedMode,
  topGenre,
  uniqueTracks,
} from '@/components/swipe/helpers';

const PRELOAD_RANGE = 1;
const COMMENTS_POLL_DELAY_MS = 900;
const SWIPE_TRIGGER_DISTANCE = 48;
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function withoutObsoleteRadios(tracks: Track[]) {
  return tracks.filter((track) => !!track.audioUrl && !track._id.startsWith('radio-'));
}

function trackOfItem(item: ScrollFeedItem | null | undefined): Track | null {
  if (!item) return null;
  if (item.kind === 'track') return item.track;
  if (item.kind === 'clip') return item.track;
  if (item.kind === 'artist_spotlight') return item.track;
  return null;
}

export function SwipeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const tabBarHeight = 76 + insets.bottom;
  const itemHeight = Math.max(420, height);

  const player = usePlayer();
  const library = useLibrary();
  const auth = useAuth();
  const [feedMode, setFeedMode] = useState<FeedMode>(() => (route.params?.mode === 'clips' ? 'clips' : 'reco'));
  const sourceTrackFilter = route.params?.sourceTrackId ? String(route.params.sourceTrackId) : '';
  const [seedGenre, setSeedGenre] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [popularUsers, setPopularUsers] = useState<any[]>([]);
  const [collectionsRaw, setCollectionsRaw] = useState<any[]>([]);
  const [cityEvents, setCityEvents] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
  const lastCommittedIndexRef = useRef(0);
  const activeIndexRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const switchFeedMode = useCallback((nextMode: FeedMode) => {
    if (nextMode === feedMode) return;
    setFeedMode(nextMode);
    Haptics.selectionAsync().catch(() => {});
  }, [feedMode]);

  useEffect(() => {
    if (route.params?.mode === 'clips' && feedMode !== 'clips') setFeedMode('clips');
  }, [feedMode, route.params?.mode]);

  // Feed mixte : la trame reste les morceaux (>=75%), les cartes non musicales
  // (artiste, collection, dÃ©fi, annonce) sont rÃ©parties avec parcimonie. Aucune
  // promotion Premium n'est injectÃ©e.
  const feedItems = useMemo<ScrollFeedItem[]>(() => {
    if (feedMode === 'clips') {
      return clips
        .filter((clip) => clip?.id && clip.videoUrl && clip.sourceTrack?.audioUrl)
        .map((clip) => ({ id: `clip-${clip.id}`, kind: 'clip' as const, clip, track: clip.sourceTrack }));
    }
    const artistItems = buildArtistSpotlightItems(popularUsers, tracks, 3);
    const collectionItems = buildCollectionItems(collectionsRaw, 2);
    const challenge = buildChallengeItem(cityEvents);
    const announcement = buildAnnouncementItem(cityEvents);
    return composeScrollFeed({
      tracks,
      clips,
      artistSpotlights: artistItems,
      collections: collectionItems,
      challenge: challenge?.item || null,
      announcement: announcement?.item || null,
    });
  }, [feedMode, tracks, clips, popularUsers, collectionsRaw, cityEvents]);

  const playableQueue = useMemo(() => {
    return feedItems
      .map((item) => trackOfItem(item))
      .filter((t): t is Track => Boolean(t) && !!t!.audioUrl && !t!._id.startsWith('radio-'));
  }, [feedItems]);

  const activeItem = feedItems[activeIndex] || null;
  const activeTrack = trackOfItem(activeItem);
  const activeId = activeTrack?._id || '';

  const currentSeedGenre = useMemo(() => seedGenre || topGenre(activeTrack), [activeTrack, seedGenre]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (isFocused) return;
    setCommentsOpen(false);
    setShareOpen(false);
    setLyricsOpen(false);
    setQueueOpen(false);
  }, [isFocused]);

  // (1) Charge le feed quand le mode change
  useEffect(() => {
    let cancelled = false;
    const reqId = ++lastRequestRef.current;
    setLoadState('loading');
    setLoadingMore(false);
    setTracks([]);
    setClips([]);
    setActiveIndex(0);
    lastCommittedIndexRef.current = 0;
    setCursor(0);
    setHasMore(true);
    queueBoundRef.current = '';

    if (feedMode === 'clips') {
      getMusicClips({ limit: 40, sourceTrackId: sourceTrackFilter || undefined })
        .then((chunk) => {
          if (cancelled || reqId !== lastRequestRef.current) return;
          setClips(chunk.clips);
          setCursor(chunk.nextCursor);
          setHasMore(chunk.hasMore);
          setLoadState(chunk.clips.length ? 'ready' : 'error');
        })
        .catch(() => {
          if (cancelled || reqId !== lastRequestRef.current) return;
          setLoadState('error');
        });
      return () => {
        cancelled = true;
      };
    }

    const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;

      Promise.all([
        fetchRankingFeedChunk(feedMode, 0, seedForReco),
        getMusicClips({ limit: 20 }).catch(() => ({ clips: [], nextCursor: 0, hasMore: false })),
      ])
        .then(([chunk, clipsChunk]) => {
          if (cancelled || reqId !== lastRequestRef.current) return;
          const feedTracks = withoutObsoleteRadios(chunk.tracks);
          const merged = uniqueTracks(player.current?.audioUrl
            ? [ ...(player.current._id.startsWith('radio-') ? [] : [player.current]), ...feedTracks ]
            : feedTracks);
          setTracks(merged);
          setClips(clipsChunk.clips);
          setCursor(chunk.nextCursor);
          setHasMore(chunk.hasMore);
          setLoadState(merged.length ? 'ready' : 'error');
      })
      .catch(() => {
        if (cancelled || reqId !== lastRequestRef.current) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [feedMode, reloadKey, sourceTrackFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Artistes populaires + collections Ã©ditoriales + events Synaura Pulse : chargÃ©s une
  // fois, rÃ©utilisÃ©s pour composer le feed mixte (mÃªmes rÃ¨gles que le web).
  useEffect(() => {
    let mounted = true;
    void getPopularArtists(20).then((users) => { if (mounted) setPopularUsers(users); });
    void getEditorialCollections().then((collections) => { if (mounted) setCollectionsRaw(collections); });
    void getSynauraCity().then((city) => { if (mounted && Array.isArray(city?.events)) setCityEvents(city.events); }).catch(() => {});
    return () => {
      mounted = false;
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
    if (loadState !== 'ready' || !tracks.length || !playableQueue.length) return;
    const key = `${feedMode}:${playableQueue[0]?._id}:${playableQueue.at(-1)?._id}:${playableQueue.length}`;
    if (queueBoundRef.current === key) return;
    queueBoundRef.current = key;

    // Si le track courant fait deja partie du nouveau feed, on enrichit la queue native
    // autour de lui sans reset audio. Sinon, on lance le feed depuis le debut.
    const currentId = player.current?._id;
    const idxInFeed = currentId ? feedItems.findIndex((it) => trackOfItem(it)?._id === currentId) : -1;
    if (idxInFeed >= 0) {
      const queueIndex = playableQueue.findIndex((track) => track._id === currentId);
      void player.setQueueOnly(playableQueue, Math.max(0, queueIndex));
      const pendingIndex = pendingSwipeTrackRef.current
        ? feedItems.findIndex((it) => trackOfItem(it)?._id === pendingSwipeTrackRef.current)
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
      // TrackPlayer peut Ã©mettre briÃ¨vement l'ancien index juste aprÃ¨s le nouveau.
      // Pendant cette fenÃªtre de stabilisation, la slide choisie par le geste reste
      // la source de vÃ©ritÃ© afin d'Ã©viter le rebond 62 -> 63 -> 62 -> 63.
      return;
    }
    const idx = feedItems.findIndex((it) => trackOfItem(it)?._id === player.current?._id);
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

  // (4) Recuperer batch des compteurs commentaires
  useEffect(() => {
    if (loadState !== 'ready' || !feedItems.length) return;
    const ids = feedItems
      .slice(Math.max(0, activeIndex - 2), Math.min(feedItems.length, activeIndex + 3))
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

  // (6) Statut follow de l'artiste
  useEffect(() => {
    const username = activeTrack?.artist?.username || '';
    if (!username) return;
    if (fetchedFollowIdsRef.current.has(username)) return;
    fetchedFollowIdsRef.current.add(username);
    void getArtistFollowState(username).then((following) => {
      setFollowingMap((current) => ({ ...current, [username]: following }));
    });
  }, [activeTrack?.artist?.username]);

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
        const chunk = await getMusicClips({ limit: 30, cursor, sourceTrackId: sourceTrackFilter || undefined });
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
  }, [clips, cursor, currentSeedGenre, feedMode, hasMore, loadingMore, sourceTrackFilter, tracks]);

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
    if (!activeTrack) return;
    const id = activeTrack._id;
    if (id.startsWith('ai-')) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const wasLiked = !!likedMap[id];
    const willLike = !wasLiked;
    setLikedMap((current) => ({ ...current, [id]: willLike }));
    setLikesMap((current) => ({
      ...current,
      [id]: Math.max(0, (current[id] ?? activeTrack.likesCount ?? 0) + (willLike ? 1 : -1)),
    }));
    if (willLike) triggerBurst();
    const result = await setTrackLike(id, willLike);
    if (result) {
      setLikedMap((current) => ({ ...current, [id]: result.liked }));
      setLikesMap((current) => ({ ...current, [id]: result.likesCount }));
    }
  }, [activeTrack, likedMap, triggerBurst]);

  const handleDoubleTapLike = useCallback(() => {
    if (!activeTrack) return;
    if (!likedMap[activeTrack._id]) {
      void handleToggleLike();
    } else {
      triggerBurst();
    }
  }, [activeTrack, handleToggleLike, likedMap, triggerBurst]);

  const useThisSound = useCallback((track: Track) => {
    void recordClipFunnelEvent(track._id, 'clip_use_sound_started');
    const sourceTrackType = track._id.startsWith('ai-') ? 'ai_track' : 'track';
    openClipComposerForSound(navigation, Boolean(auth.user), track._id, sourceTrackType);
  }, [auth.user, navigation]);

  const handleSlideAction = useCallback((action: 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save' | 'remix' | 'useSound') => {
    if (!activeTrack) return;
    if (action === 'remix') {
      Haptics.selectionAsync().catch(() => {});
      setRemixTrack(activeTrack);
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

  const handleToggleFollow = useCallback(async () => {
    const username = activeTrack?.artist?.username;
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

  // StratÃ©gie de swipe : le snap est entierement gere nativement via
  // snapToInterval + disableIntervalMomentum (une page max par geste, flick leger suffisant).
  // On ne commit la lecture qu'a la fin du snap pour eviter le play/pause spam.
  const commitIndex = useCallback((idx: number) => {
    const nextIndex = Math.max(0, Math.min(feedItems.length - 1, idx));
    if (nextIndex === lastCommittedIndexRef.current) return;
    lastCommittedIndexRef.current = nextIndex;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    Haptics.selectionAsync().catch(() => {});

    // Lance la lecture de la slide stable si elle contient un morceau. Idempotent.
    const target = trackOfItem(feedItems[nextIndex]);
    if (!target?.audioUrl) return;
    if (player.current?._id === target._id) return;
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
  }, [player, feedItems]);

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
      const isPlayingThis = isActive && player.current?._id === item.track._id && player.isPlaying;
      return (
        <ClipSlide
          clip={item.clip}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          isPlaying={isPlayingThis}
          onPressAudio={() => {
            if (player.current?._id === item.track._id) void player.togglePlayPause();
            else void player.playTrack(item.track);
          }}
          onOpenTrack={() => navigation.navigate('TrackDetail', { trackId: item.track._id, track: item.track })}
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
      return (
        <ChallengeSlide
          challenge={item.challenge}
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          onOpen={() => navigation.navigate('City')}
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
    commentsCounts,
    followLoading,
    followingMap,
    handleDoubleTapLike,
    handleLaunchCollection,
    handleSeek,
    handleSlideAction,
    handleToggleFollow,
    insets.top,
    itemHeight,
    isFocused,
    launchingCollectionId,
    library,
    navigation,
    likedMap,
    likesMap,
    player,
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
        colors={['#120D11', '#0D0A0E', '#080607']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient colors={['rgba(10,8,8,0.88)', 'rgba(10,8,8,0.0)']} style={[styles.headerGradient, { height: insets.top + 96 }]} pointerEvents="none" />

      <Animated.View style={[styles.header, headerStyle]} pointerEvents="box-none">
        <View style={styles.headerInner}>
          <View style={styles.scrollIdentity}>
            <View style={styles.scrollMark}><Text style={styles.scrollMarkText}>S</Text></View>
            <View>
              <Text style={styles.scrollName}>Scroll</Text>
              <Text style={styles.scrollSubtitle}>Synaura</Text>
            </View>
          </View>
          <View style={styles.modeWrap}>
            {(['reco', 'trending', 'clips'] as FeedMode[]).map((mode) => {
              const active = mode === feedMode;
              return (
                <Pressable
                  key={mode}
                  accessibilityLabel={`Mode ${FEED_MODE_META[mode].label}`}
                  onPress={() => {
                    switchFeedMode(mode);
                  }}
                  style={[styles.modeButton, active && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                    {FEED_MODE_META[mode].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable accessibilityLabel="Voir la file d'attente" onPress={() => setQueueOpen(true)} style={styles.queueButton}>
            <Ionicons name="albums-outline" size={20} color="#FFFAF2" />
            {player.queue.length ? <View style={styles.queueBadge}><Text style={styles.queueBadgeText}>{player.queue.length}</Text></View> : null}
          </Pressable>
        </View>
      </Animated.View>

      {loadState === 'loading' || loadState === 'idle' ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#FFFAF2" />
          <Text style={styles.loadingText}>Calage du fil sonore Synaura...</Text>
        </View>
      ) : loadState === 'error' || !feedItems.length ? (
        <View style={styles.loadingScreen}>
          <Ionicons name="cloud-offline-outline" size={28} color="rgba(255,250,242,0.55)" />
          <Text style={styles.loadingText}>Aucun son disponible. Reessaie dans un instant.</Text>
          <Pressable accessibilityLabel="Reessayer" onPress={() => setReloadKey((value) => value + 1)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={feedItems}
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
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={1}
          updateCellsBatchingPeriod={48}
          onScrollToIndexFailed={(info) => listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })}
          removeClippedSubviews
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
        commentCount={activeTrack ? commentsCounts[activeTrack._id] ?? activeTrack.commentsCount ?? 0 : 0}
        onClose={() => setCommentsOpen(false)}
        onCountChange={(id, next) => setCommentsCounts((current) => ({ ...current, [id]: next }))}
      />

      <ShareSheet
        visible={shareOpen}
        track={activeTrack}
        onClose={() => setShareOpen(false)}
      />

      <LyricsSheet
        visible={lyricsOpen}
        track={activeTrack}
        onClose={() => setLyricsOpen(false)}
      />

      <QueueSheet
        visible={queueOpen}
        onClose={() => setQueueOpen(false)}
      />
      {remixTrack ? (
        <View style={styles.remixOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRemixTrack(null)} />
          <View style={[styles.remixSheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.remixHandle} />
            <View style={styles.remixHead}>
              <Image source={{ uri: remixTrack.coverUrl || undefined }} style={styles.remixCover} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.remixTitle}>{remixTrack.title}</Text>
                <Text numberOfLines={1} style={styles.remixArtist}>{remixTrack.artist?.name || remixTrack.artist?.username || 'Artiste Synaura'}</Text>
              </View>
            </View>
            <Text style={styles.remixText}>Créer une variation IA inspirée de ce morceau</Text>
            <Text style={styles.remixCredit}>Le créateur original sera toujours crédité</Text>
            <Pressable
              onPress={() => {
                const sourceTrackType = remixTrack._id.startsWith('ai-') ? 'ai_track' : 'track';
                const sourceTrackId = remixTrack._id;
                setRemixTrack(null);
                navigation.navigate('AIStudio', { sourceTrackId, sourceTrackType, mode: 'remix' });
              }}
              style={styles.remixPrimary}
            >
              <Ionicons name="color-wand-outline" size={18} color="#F7F6F3" />
              <Text style={styles.remixPrimaryText}>Ouvrir dans Studio</Text>
            </Pressable>
            <Pressable onPress={() => setRemixTrack(null)} style={styles.remixSecondary}>
              <Text style={styles.remixSecondaryText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0808' },
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
    paddingBottom: 8,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  scrollIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  scrollMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF2',
  },
  scrollMarkText: { color: '#171313', fontSize: 17, fontWeight: '900' },
  scrollName: { color: '#FFFAF2', fontSize: 11, lineHeight: 12, fontWeight: '900' },
  scrollSubtitle: { marginTop: 1, color: 'rgba(255,250,242,0.5)', fontSize: 8, fontWeight: '800' },
  modeWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,12,14,0.24)',
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.12)',
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
    borderWidth: 1,
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
    backgroundColor: '#FF4B7A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
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
    borderRadius: 999,
    backgroundColor: '#FFFAF2',
  },
  retryText: { color: '#171313', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  footer: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  remixOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 40, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  remixSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#F7F6F3', padding: 18, gap: 12 },
  remixHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(17,17,17,0.18)', marginBottom: 4 },
  remixHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  remixCover: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(17,17,17,0.08)' },
  remixTitle: { color: '#111111', fontSize: 18, fontWeight: '900' },
  remixArtist: { marginTop: 2, color: 'rgba(17,17,17,0.52)', fontSize: 13, fontWeight: '800' },
  remixText: { color: '#111111', fontSize: 14, lineHeight: 20, fontWeight: '900' },
  remixCredit: { color: 'rgba(17,17,17,0.5)', fontSize: 12, fontWeight: '700' },
  remixPrimary: { height: 50, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111111' },
  remixPrimaryText: { color: '#F7F6F3', fontSize: 14, fontWeight: '900' },
  remixSecondary: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)' },
  remixSecondaryText: { color: 'rgba(17,17,17,0.62)', fontSize: 13, fontWeight: '900' },
});
