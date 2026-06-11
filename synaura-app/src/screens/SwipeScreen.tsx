import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchRankingFeedChunk,
  getSynauraCity,
  getArtistFollowState,
  getCommentsCount,
  getTrackLikeStatus,
  setTrackLike,
  toggleArtistFollow,
} from '@/api/client';
import type { SynauraCityData, Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
import { HeartBurst } from '@/components/swipe/HeartBurst';
import { LyricsSheet } from '@/components/swipe/LyricsSheet';
import { QueueSheet } from '@/components/swipe/QueueSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { SwipeSlide } from '@/components/swipe/SwipeSlide';
import { SubscriptionPromoSlide } from '@/components/swipe/SubscriptionPromoSlide';
import {
  FEED_MODE_META,
  FeedMode,
  topGenre,
  uniqueTracks,
} from '@/components/swipe/helpers';

const PRELOAD_RANGE = 1;
const COMMENTS_POLL_DELAY_MS = 900;
const SUBSCRIPTION_PROMO_ID = 'synaura-subscription-interlude';
const CITY_PROMO_ID = 'synaura-city-interlude';
const SWIPE_TRIGGER_DISTANCE = 48;
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const subscriptionPromo: Track = {
  _id: SUBSCRIPTION_PROMO_ID,
  title: 'Synaura+',
  audioUrl: '',
  duration: 0,
  likes: [],
  comments: [],
  genre: [],
};

const cityPromo: Track = {
  _id: CITY_PROMO_ID,
  title: 'Synaura City',
  audioUrl: '',
  duration: 0,
  likes: [],
  comments: [],
  genre: [],
};

function withoutObsoleteRadios(tracks: Track[]) {
  return tracks.filter((track) => !!track.audioUrl && !track._id.startsWith('radio-'));
}

function injectSubscriptionPromo(tracks: Track[]) {
  if (tracks.length < 8 || tracks.some((track) => track._id === SUBSCRIPTION_PROMO_ID)) return tracks;
  const result = [...tracks];
  const insertAt = Math.min(result.length, 9 + Math.floor(Math.random() * 4));
  result.splice(insertAt, 0, subscriptionPromo);
  return result;
}

function injectCityPromo(tracks: Track[]) {
  if (tracks.length < 5 || tracks.some((track) => track._id === CITY_PROMO_ID)) return tracks;
  const result = [...tracks];
  result.splice(Math.min(result.length, 5), 0, cityPromo);
  return result;
}

export function SwipeScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const tabBarHeight = 76 + insets.bottom;
  const itemHeight = Math.max(420, height);

  const player = usePlayer();
  const library = useLibrary();
  const [feedMode, setFeedMode] = useState<FeedMode>('reco');
  const [seedGenre, setSeedGenre] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
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
  const fetchedCommentIdsRef = useRef<Set<string>>(new Set());
  const fetchedLikeIdsRef = useRef<Set<string>>(new Set());
  const fetchedFollowIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlatList<Track>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const lastCommittedIndexRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const switchFeedMode = useCallback((nextMode: FeedMode) => {
    if (nextMode === feedMode) return;
    setFeedMode(nextMode);
    Haptics.selectionAsync().catch(() => {});
  }, [feedMode]);

  const activeTrack = tracks[activeIndex] || null;
  const activeId = activeTrack?._id || '';
  const isPromoActive = activeId === SUBSCRIPTION_PROMO_ID;
  const isCityActive = activeId === CITY_PROMO_ID;

  const currentSeedGenre = useMemo(() => seedGenre || topGenre(activeTrack), [activeTrack, seedGenre]);

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
    setActiveIndex(0);
    lastCommittedIndexRef.current = 0;
    setCursor(0);
    setHasMore(true);
    queueBoundRef.current = '';

    const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;

      fetchRankingFeedChunk(feedMode, 0, seedForReco)
        .then((chunk) => {
          if (cancelled || reqId !== lastRequestRef.current) return;
          const feedTracks = injectCityPromo(injectSubscriptionPromo(withoutObsoleteRadios(chunk.tracks)));
          const merged = player.current?.audioUrl
            ? uniqueTracks([...(player.current._id.startsWith('radio-') ? [] : [player.current]), ...feedTracks])
            : feedTracks;
          setTracks(merged);
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
  }, [feedMode, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (loadState !== 'ready' || !tracks.length) return;
    const key = `${feedMode}:${tracks[0]?._id}:${tracks.at(-1)?._id}:${tracks.length}`;
    if (queueBoundRef.current === key) return;
    queueBoundRef.current = key;

    // Si le track courant fait deja partie du nouveau feed, on enrichit la queue native
    // autour de lui sans reset audio. Sinon, on lance le feed depuis le debut.
    const currentId = player.current?._id;
    const idxInFeed = currentId ? tracks.findIndex((t) => t._id === currentId) : -1;
    if (idxInFeed >= 0) {
      const playable = withoutObsoleteRadios(tracks);
      const queueIndex = playable.findIndex((track) => track._id === currentId);
      void player.setQueueOnly(playable, Math.max(0, queueIndex));
      setActiveIndex(idxInFeed);
      // On scrolle a la slide correspondante des que la liste est montee.
      requestAnimationFrame(() => {
        try { listRef.current?.scrollToIndex({ index: idxInFeed, animated: false }); } catch { /* ignore */ }
      });
    } else if (!player.current || player.current._id.startsWith('radio-')) {
      void player.setQueueAndPlay(withoutObsoleteRadios(tracks), 0);
      setActiveIndex(0);
    }
  }, [feedMode, loadState, player, tracks]);

  // (3) Synchro INVERSE : quand le player change naturellement de track
  // (auto-advance, lockscreen, mini-player), on scrolle vers la slide correspondante.
  // Pas de boucle car scrollToIndex(animated:false) ne declenche pas onMomentumScrollEnd.
  useEffect(() => {
    if (loadState !== 'ready' || !tracks.length || !player.current || isPromoActive || isCityActive) return;
    const idx = tracks.findIndex((t) => t._id === player.current?._id);
    if (idx < 0 || idx === activeIndex) return;
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
  }, [player.current?._id, loadState, tracks, activeIndex, isPromoActive, isCityActive]);

  // (4) Recuperer batch des compteurs commentaires
  useEffect(() => {
    if (loadState !== 'ready' || !tracks.length) return;
    const ids = tracks
      .slice(Math.max(0, activeIndex - 2), Math.min(tracks.length, activeIndex + 3))
      .map((t) => t._id)
      .filter((id) => id && id !== SUBSCRIPTION_PROMO_ID && !id.startsWith('ai-') && !fetchedCommentIdsRef.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => fetchedCommentIdsRef.current.add(id));
    const timer = setTimeout(async () => {
      const counts = await getCommentsCount(ids);
      if (counts && Object.keys(counts).length) {
        setCommentsCounts((current) => ({ ...current, ...counts }));
      }
    }, COMMENTS_POLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, loadState, tracks]);

  // (5) Recuperer le statut like + likesCount du morceau actif
  useEffect(() => {
    if (!activeId || isPromoActive || isCityActive || activeId.startsWith('ai-')) return;
    if (fetchedLikeIdsRef.current.has(activeId)) return;
    fetchedLikeIdsRef.current.add(activeId);
    void getTrackLikeStatus(activeId).then((data) => {
      if (!data) return;
      setLikedMap((current) => ({ ...current, [activeId]: data.liked }));
      setLikesMap((current) => ({ ...current, [activeId]: data.likesCount || current[activeId] || 0 }));
    });
  }, [activeId, isPromoActive, isCityActive]);

  // (6) Statut follow de l'artiste
  useEffect(() => {
    const username = activeTrack?.artist?.username || '';
    if (!username || isPromoActive || isCityActive) return;
    if (fetchedFollowIdsRef.current.has(username)) return;
    fetchedFollowIdsRef.current.add(username);
    void getArtistFollowState(username).then((following) => {
      setFollowingMap((current) => ({ ...current, [username]: following }));
    });
  }, [activeTrack?.artist?.username, isPromoActive, isCityActive]);

  // (8) Preloading covers
  useEffect(() => {
    if (loadState !== 'ready' || !tracks.length) return;
    const lo = Math.max(0, activeIndex - PRELOAD_RANGE);
    const hi = Math.min(tracks.length - 1, activeIndex + PRELOAD_RANGE);
    for (let i = lo; i <= hi; i++) {
      const url = tracks[i]?.coverUrl;
      if (url) Image.prefetch(url).catch(() => {});
    }
  }, [activeIndex, loadState, tracks]);

  // (9) Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;
      const chunk = await fetchRankingFeedChunk(feedMode, cursor, seedForReco);
      const seen = new Set(tracks.map((t) => t._id));
      const fresh = withoutObsoleteRadios(chunk.tracks).filter((t) => !seen.has(t._id));
      if (!fresh.length) {
        setHasMore(false);
      } else {
        const merged = uniqueTracks([...tracks, ...fresh]);
        setTracks(merged);
        setCursor(chunk.nextCursor);
        setHasMore(chunk.hasMore);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, currentSeedGenre, feedMode, hasMore, loadingMore, tracks]);

  // ─────────── Handlers ─────────────────────────────────────────────────
  const triggerBurst = useCallback(() => {
    setBurstKey((k) => k + 1);
    setBurstVisible(true);
    clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setBurstVisible(false), 720);
  }, []);

  useEffect(() => () => {
    clearTimeout(burstTimerRef.current);
    clearTimeout(playbackCommitRef.current);
  }, []);

  const handleToggleLike = useCallback(async () => {
    if (!activeTrack || isPromoActive || isCityActive) return;
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
  }, [activeTrack, isPromoActive, isCityActive, likedMap, triggerBurst]);

  const handleDoubleTapLike = useCallback(() => {
    if (!activeTrack || isPromoActive || isCityActive) return;
    if (!likedMap[activeTrack._id]) {
      void handleToggleLike();
    } else {
      triggerBurst();
    }
  }, [activeTrack, handleToggleLike, isPromoActive, isCityActive, likedMap, triggerBurst]);

  const handleSlideAction = useCallback((action: 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save') => {
    if (!activeTrack) return;
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
  }, [activeTrack, handleToggleLike, library, player]);

  const handleToggleFollow = useCallback(async () => {
    const username = activeTrack?.artist?.username;
    if (!username || isPromoActive || isCityActive) return;
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
  }, [activeTrack?.artist?.username, followLoading, followingMap, isPromoActive, isCityActive]);

  const handleSeek = useCallback((seconds: number) => {
    void player.seekTo(seconds);
  }, [player]);

  // Stratégie de swipe : le snap est entierement gere nativement via
  // snapToInterval + disableIntervalMomentum (une page max par geste, flick leger suffisant).
  // On ne commit la lecture qu'a la fin du snap pour eviter le play/pause spam.
  const commitIndex = useCallback((idx: number) => {
    const nextIndex = Math.max(0, Math.min(tracks.length - 1, idx));
    if (nextIndex === lastCommittedIndexRef.current) return;
    lastCommittedIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    Haptics.selectionAsync().catch(() => {});

    // Lance la lecture de la slide stable. Idempotent grace au check ci-dessous.
    const target = tracks[nextIndex];
    if (!target?.audioUrl || target._id === SUBSCRIPTION_PROMO_ID || target._id === CITY_PROMO_ID) return;
    if (player.current?._id === target._id) return;
    clearTimeout(playbackCommitRef.current);
    playbackCommitRef.current = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        const queueIndex = player.queue.findIndex((item) => item._id === target._id);
        if (queueIndex >= 0) void player.playQueueIndex(queueIndex);
        else void player.playTrack(target);
      });
    }, 160);
  }, [player, tracks]);

  const commitVisibleTrack = useCallback((offsetY: number) => {
    commitIndex(Math.round(offsetY / itemHeight));
  }, [commitIndex, itemHeight]);

  const handleScrollBeginDrag = useCallback((event: any) => {
    dragStartOffsetRef.current = event.nativeEvent.contentOffset.y || 0;
  }, []);

  // Filet de securite : un drag lent mais franc (> SWIPE_TRIGGER_DISTANCE) sans flick
  // doit quand meme avancer d'une page au lieu de revenir en arriere.
  const handleScrollEndDrag = useCallback((event: any) => {
    if (!tracks.length) return;
    const velocityY = Math.abs(Number(event.nativeEvent.velocity?.y || 0));
    if (velocityY > 0.08) return; // le snap natif s'en occupe
    const endY = event.nativeEvent.contentOffset.y || 0;
    const delta = endY - dragStartOffsetRef.current;
    if (Math.abs(delta) < SWIPE_TRIGGER_DISTANCE) return;
    const startIndex = Math.max(0, Math.min(tracks.length - 1, Math.round(dragStartOffsetRef.current / itemHeight)));
    const nextIndex = Math.max(0, Math.min(tracks.length - 1, startIndex + (delta > 0 ? 1 : -1)));
    requestAnimationFrame(() => {
      try { listRef.current?.scrollToIndex({ index: nextIndex, animated: true }); } catch { /* ignore */ }
    });
  }, [itemHeight, tracks.length]);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    commitVisibleTrack(event.nativeEvent.contentOffset.y);
  }, [commitVisibleTrack]);

  const handleEndReached = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => {
    const id = item._id;
    const isActive = isFocused && index === activeIndex;
    if (id === SUBSCRIPTION_PROMO_ID) {
      return (
        <SubscriptionPromoSlide
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          onOpenSubscriptions={() => navigation.navigate('Subscriptions')}
        />
      );
    }
    if (id === CITY_PROMO_ID) {
      return (
        <CityInterludeSlide
          height={itemHeight}
          topPad={insets.top}
          bottomPad={tabBarHeight}
          isActive={isActive}
          onOpenCity={() => navigation.navigate('City')}
          onCreate={() => navigation.navigate('Upload')}
        />
      );
    }
    const isPlayingThis = isActive && player.current?._id === id && player.isPlaying;
    const likedHere = !!likedMap[id];
    const likesHere = likesMap[id] ?? item.likesCount ?? 0;
    const commentsHere = commentsCounts[id] ?? item.commentsCount ?? 0;
    const sharesHere = item.sharesCount ?? item.shares ?? 0;
    const artistKey = item.artist?.username || '';
    const isFollowing = !!followingMap[artistKey];
    const isFollowingLoading = !!followLoading[artistKey];

    return (
      <SwipeSlide
        track={item}
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
        onOpenArtist={() => item.artist?.username && navigation.navigate('PublicProfile', { username: item.artist.username })}
      />
    );
  }, [
    activeIndex,
    commentsCounts,
    followLoading,
    followingMap,
    handleDoubleTapLike,
    handleSeek,
    handleSlideAction,
    handleToggleFollow,
    insets.top,
    itemHeight,
    isFocused,
    library,
    navigation,
    likedMap,
    likesMap,
    player,
    tabBarHeight,
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
          <View style={styles.modeWrap}>
            {(Object.keys(FEED_MODE_META) as FeedMode[]).map((mode) => {
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
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal" size={13} color="rgba(255,250,242,0.62)" />
          <Text style={styles.swipeHintText}>Glisse verticalement pour changer de son</Text>
        </View>
        {tracks.length > 1 ? (
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              {activeIndex + 1}<Text style={styles.indicatorTextDim}> / {tracks.length}</Text>
            </Text>
            {currentSeedGenre ? <Text style={styles.indicatorGenre}>{currentSeedGenre.toUpperCase()}</Text> : null}
          </View>
        ) : null}
      </Animated.View>

      {loadState === 'loading' || loadState === 'idle' ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#FFFAF2" />
          <Text style={styles.loadingText}>Calage du fil sonore Synaura...</Text>
        </View>
      ) : loadState === 'error' || !tracks.length ? (
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
          data={tracks}
          keyExtractor={(item) => item._id}
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
    </View>
  );
}

function CityInterludeSlide({
  height,
  topPad,
  bottomPad,
  isActive,
  onOpenCity,
  onCreate,
}: {
  height: number;
  topPad: number;
  bottomPad: number;
  isActive: boolean;
  onOpenCity: () => void;
  onCreate: () => void;
}) {
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1,
      duration: 2100,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [isActive, pulse]);
  useEffect(() => {
    if (!isActive || city) return;
    let active = true;
    void getSynauraCity().then((next) => {
      if (active) setCity(next);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [city, isActive]);

  const liveEvent = city?.events?.find((event) => event.kind === 'battle' && event.isLive)
    || city?.events?.find((event) => event.isLive)
    || city?.events?.[0];
  const topPulse = city?.pulse?.[0];

  return (
    <View style={[styles.citySlide, { height, paddingTop: topPad + 92, paddingBottom: bottomPad + 24 }]}>
      <LinearGradient colors={['#fffaf2', '#fff1e6', '#efe9ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.citySlideOrb,
          {
            opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.16, 0.36, 0.16] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] }) }],
          },
        ]}
      />
      <View style={styles.citySlideCard}>
        <View style={styles.citySlideIcon}><Ionicons name="radio" size={25} color="#FFFAF2" /></View>
        <Text style={styles.citySlideKicker}>{liveEvent?.kind === 'battle' ? 'Battle City' : 'Interlude City'}</Text>
        <Text style={styles.citySlideTitle}>{liveEvent?.title || 'La ville passe dans Swipe.'}</Text>
        <Text style={styles.citySlideText}>
          {liveEvent?.description || city?.cityMood?.subtitle || 'Radar, battle et vitrine du jour peuvent apparaitre entre deux sons pour relancer la decouverte sans casser le flow.'}
        </Text>
        <View style={styles.citySlideStats}>
          <View style={styles.citySlideStat}><Ionicons name="flame" size={16} color="#FF6F61" /><Text style={styles.citySlideStatText}>{topPulse ? `${topPulse.pulse}%` : 'Pulse'}</Text></View>
          <View style={styles.citySlideStat}><Ionicons name="telescope" size={16} color="#7C5CFF" /><Text style={styles.citySlideStatText}>{liveEvent?.participationCount || 0} parts</Text></View>
          <View style={styles.citySlideStat}><Ionicons name="flash" size={16} color="#00A7B2" /><Text style={styles.citySlideStatText}>{liveEvent?.totalVotes || 0} votes</Text></View>
        </View>
        <View style={styles.citySlideActions}>
          <Pressable onPress={onOpenCity} style={styles.citySlidePrimary}><Text style={styles.citySlidePrimaryText}>Ouvrir City</Text></Pressable>
          <Pressable onPress={onCreate} style={styles.citySlideSecondary}><Text style={styles.citySlideSecondaryText}>Drop</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0808' },
  citySlide: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#FFFAF2',
  },
  citySlideOrb: {
    position: 'absolute',
    right: -82,
    top: 118,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FF6F61',
  },
  citySlideCard: {
    overflow: 'hidden',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,250,242,0.88)',
    padding: 22,
    shadowColor: '#1E1914',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  citySlideIcon: {
    width: 56,
    height: 56,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171313',
  },
  citySlideKicker: {
    marginTop: 22,
    color: '#FF6F61',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  citySlideTitle: {
    marginTop: 8,
    color: '#171313',
    fontSize: 40,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.7,
  },
  citySlideText: {
    marginTop: 14,
    color: 'rgba(23,19,19,0.58)',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  citySlideStats: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  citySlideStat: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 19,
    backgroundColor: 'rgba(23,19,19,0.055)',
    paddingHorizontal: 12,
  },
  citySlideStatText: {
    color: 'rgba(23,19,19,0.62)',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  citySlideActions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  citySlidePrimary: {
    height: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#171313',
  },
  citySlidePrimaryText: {
    color: '#FFFAF2',
    fontSize: 13,
    fontWeight: '900',
  },
  citySlideSecondary: {
    height: 46,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(23,19,19,0.065)',
  },
  citySlideSecondaryText: {
    color: '#171313',
    fontSize: 13,
    fontWeight: '900',
  },
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
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  modeWrap: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,250,242,0.08)',
    borderRadius: 999,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.14)',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 9,
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
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modeButtonTextActive: { color: '#171313', letterSpacing: 0.5 },
  queueButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  swipeHint: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,250,242,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.1)',
  },
  swipeHintText: {
    color: 'rgba(255,250,242,0.62)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  indicator: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(13,10,14,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  indicatorText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  indicatorTextDim: { color: 'rgba(255,250,242,0.5)' },
  indicatorGenre: {
    color: 'rgba(255,250,242,0.5)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
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
});
