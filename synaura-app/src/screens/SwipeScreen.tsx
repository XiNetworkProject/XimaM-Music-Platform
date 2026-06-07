import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchRankingFeedChunk,
  getArtistFollowState,
  getCommentsCount,
  getRadioStatus,
  getTrackLikeStatus,
  insertRadioTracks,
  isRadioTrackId,
  setTrackLike,
  toggleArtistFollow,
} from '@/api/client';
import type { RadioMeta, Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
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

const PRELOAD_RANGE = 4;
const RADIO_POLL_MS = 8000;
const COMMENTS_POLL_DELAY_MS = 600;

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export function SwipeScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const tabBarHeight = 76 + insets.bottom;
  const itemHeight = Math.max(420, height - tabBarHeight - 6);

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
  const [radioMeta, setRadioMeta] = useState<RadioMeta | null>(null);

  const queueBoundRef = useRef('');
  const lastRequestRef = useRef(0);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fetchedCommentIdsRef = useRef<Set<string>>(new Set());
  const fetchedLikeIdsRef = useRef<Set<string>>(new Set());
  const fetchedFollowIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlatList<Track>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const activeTrack = tracks[activeIndex] || null;
  const activeId = activeTrack?._id || '';
  const isRadioActive = isRadioTrackId(activeId);

  const currentSeedGenre = useMemo(() => seedGenre || topGenre(activeTrack), [activeTrack, seedGenre]);

  // (1) Charge le feed quand le mode change
  useEffect(() => {
    let cancelled = false;
    const reqId = ++lastRequestRef.current;
    setLoadState('loading');
    setLoadingMore(false);
    setTracks([]);
    setActiveIndex(0);
    setCursor(0);
    setHasMore(true);
    queueBoundRef.current = '';
    setRadioMeta(null);

    const seedForReco = feedMode === 'reco' ? currentSeedGenre : null;

    fetchRankingFeedChunk(feedMode, 0, seedForReco)
      .then((chunk) => {
        if (cancelled || reqId !== lastRequestRef.current) return;
        const merged = insertRadioTracks(chunk.tracks, feedMode).filter((track) => !!track.audioUrl);
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
  }, [feedMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
      void player.setQueueOnly(tracks, idxInFeed);
      setActiveIndex(idxInFeed);
      // On scrolle a la slide correspondante des que la liste est montee.
      requestAnimationFrame(() => {
        try { listRef.current?.scrollToIndex({ index: idxInFeed, animated: false }); } catch { /* ignore */ }
      });
    } else {
      void player.setQueueAndPlay(tracks, 0);
      setActiveIndex(0);
    }
  }, [feedMode, loadState, player, tracks]);

  // (3) Synchro INVERSE : quand le player change naturellement de track
  // (auto-advance, lockscreen, mini-player), on scrolle vers la slide correspondante.
  // Pas de boucle car scrollToIndex(animated:false) ne declenche pas onMomentumScrollEnd.
  useEffect(() => {
    if (loadState !== 'ready' || !tracks.length || !player.current) return;
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
  }, [player.current?._id, loadState, tracks, activeIndex]);

  // (4) Recuperer batch des compteurs commentaires
  useEffect(() => {
    if (loadState !== 'ready' || !tracks.length) return;
    const ids = tracks
      .map((t) => t._id)
      .filter((id) => id && !isRadioTrackId(id) && !id.startsWith('ai-') && !fetchedCommentIdsRef.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => fetchedCommentIdsRef.current.add(id));
    const timer = setTimeout(async () => {
      const counts = await getCommentsCount(ids);
      if (counts && Object.keys(counts).length) {
        setCommentsCounts((current) => ({ ...current, ...counts }));
      }
    }, COMMENTS_POLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loadState, tracks]);

  // (5) Recuperer le statut like + likesCount du morceau actif
  useEffect(() => {
    if (!activeId || isRadioActive || activeId.startsWith('ai-')) return;
    if (fetchedLikeIdsRef.current.has(activeId)) return;
    fetchedLikeIdsRef.current.add(activeId);
    void getTrackLikeStatus(activeId).then((data) => {
      if (!data) return;
      setLikedMap((current) => ({ ...current, [activeId]: data.liked }));
      setLikesMap((current) => ({ ...current, [activeId]: data.likesCount || current[activeId] || 0 }));
    });
  }, [activeId, isRadioActive]);

  // (6) Statut follow de l'artiste
  useEffect(() => {
    const artistId = activeTrack?.artist?._id || '';
    if (!artistId || isRadioActive) return;
    if (fetchedFollowIdsRef.current.has(artistId)) return;
    fetchedFollowIdsRef.current.add(artistId);
    void getArtistFollowState(artistId).then((following) => {
      setFollowingMap((current) => ({ ...current, [artistId]: following }));
    });
  }, [activeTrack?.artist?._id, isRadioActive]);

  // (7) Radio now playing
  useEffect(() => {
    if (!activeId || !activeId.startsWith('radio-')) {
      setRadioMeta(null);
      return;
    }
    const station = activeId === 'radio-ximam' ? 'ximam' : 'mixx_party';
    let cancelled = false;
    const tick = async () => {
      const meta = await getRadioStatus(station);
      if (!cancelled && meta) setRadioMeta(meta);
    };
    void tick();
    const id = setInterval(() => void tick(), RADIO_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeId]);

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
      const fresh = chunk.tracks.filter((t) => !seen.has(t._id) && !!t.audioUrl);
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
  }, []);

  const handleToggleLike = useCallback(async () => {
    if (!activeTrack || isRadioActive) return;
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
  }, [activeTrack, isRadioActive, likedMap, triggerBurst]);

  const handleDoubleTapLike = useCallback(() => {
    if (!activeTrack || isRadioActive) return;
    if (!likedMap[activeTrack._id]) {
      void handleToggleLike();
    } else {
      triggerBurst();
    }
  }, [activeTrack, handleToggleLike, isRadioActive, likedMap, triggerBurst]);

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
      void player.addNext(activeTrack);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
    const artistId = activeTrack?.artist?._id;
    if (!artistId || isRadioActive) return;
    setFollowLoading((current) => ({ ...current, [artistId]: true }));
    try {
      const result = await toggleArtistFollow(artistId);
      if (result) {
        setFollowingMap((current) => ({ ...current, [artistId]: result.following }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } finally {
      setFollowLoading((current) => ({ ...current, [artistId]: false }));
    }
  }, [activeTrack?.artist?._id, isRadioActive]);

  const handleSeek = useCallback((seconds: number) => {
    void player.seekTo(seconds);
  }, [player]);

  // Stratégie de swipe : on ne réagit qu'à la fin du scroll (snap stable).
  // Pas d'onViewableItemsChanged qui peut firer pendant le drag et provoquer du play/pause spam.
  const handleMomentumScrollEnd = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(tracks.length - 1, Math.round(offsetY / itemHeight)));
    if (idx === activeIndex) return;
    setActiveIndex(idx);
    Haptics.selectionAsync().catch(() => {});

    // Lance la lecture de la slide stable. Idempotent grace au check ci-dessous.
    const target = tracks[idx];
    if (!target) return;
    if (player.current?._id === target._id) return;
    const queueIndex = player.queue.findIndex((item) => item._id === target._id);
    if (queueIndex >= 0) {
      void player.playQueueIndex(queueIndex);
    } else {
      void player.playTrack(target);
    }
  }, [activeIndex, itemHeight, player, tracks]);

  const handleEndReached = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => {
    const id = item._id;
    const isActive = index === activeIndex;
    const isPlayingThis = isActive && player.current?._id === id && player.isPlaying;
    const likedHere = !!likedMap[id];
    const likesHere = likesMap[id] ?? item.likesCount ?? 0;
    const commentsHere = commentsCounts[id] ?? item.commentsCount ?? 0;
    const sharesHere = item.sharesCount ?? item.shares ?? 0;
    const artistId = item.artist?._id || '';
    const isFollowing = !!followingMap[artistId];
    const isFollowingLoading = !!followLoading[artistId];

    return (
      <SwipeSlide
        track={item}
        isActive={isActive}
        isPlaying={isPlayingThis}
        isLoading={isActive && player.isLoading}
        duration={isActive ? player.durationSec : item.duration || 0}
        position={isActive ? player.positionSec : 0}
        isFavorite={library.isFavorite(id)}
        isLiked={likedHere}
        likesCount={likesHere}
        commentsCount={commentsHere}
        sharesCount={sharesHere}
        isFollowing={isFollowing}
        followLoading={isFollowingLoading}
        radioMeta={radioMeta}
        height={itemHeight}
        topPad={insets.top}
        bottomPad={tabBarHeight}
        onTogglePlay={() => void player.togglePlayPause()}
        onDoubleTapLike={handleDoubleTapLike}
        onPress={() => void player.togglePlayPause()}
        onAction={handleSlideAction}
        onSeek={handleSeek}
        onToggleFollow={() => void handleToggleFollow()}
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
    library,
    likedMap,
    likesMap,
    player,
    radioMeta,
    tabBarHeight,
  ]);

  const headerStyle = useMemo(() => ({
    paddingTop: insets.top + 8,
    opacity: headerOpacity,
  }), [headerOpacity, insets.top]);

  return (
    <View style={styles.root}>
      {/* Fond ambient : cover de la slide active, lourdement floutee */}
      {activeTrack?.coverUrl ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: activeTrack.coverUrl }}
            style={[StyleSheet.absoluteFill, { opacity: 0.35, transform: [{ scale: 1.5 }] }]}
            blurRadius={48}
          />
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(13,10,14,0.5)', 'rgba(13,10,14,0.7)', 'rgba(13,10,14,0.92)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

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
                    if (mode === feedMode) return;
                    setFeedMode(mode);
                    Haptics.selectionAsync().catch(() => {});
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
          <Ionicons name="swap-vertical" size={13} color="rgba(255,250,242,0.62)" />
          <Text style={styles.swipeHintText}>Swipe pour changer de son</Text>
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
          <Pressable accessibilityLabel="Reessayer" onPress={() => setFeedMode(feedMode)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={tracks}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          renderItem={renderItem}
          pagingEnabled
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
          initialNumToRender={2}
          windowSize={5}
          maxToRenderPerBatch={3}
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
