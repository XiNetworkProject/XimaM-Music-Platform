import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getArtistFollowState,
  getCommentsCount,
  getTrackLikeStatus,
  setTrackLike,
  toggleArtistFollow,
} from '@/api/client';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
import { InteractiveSeekBar } from '@/components/swipe/InteractiveSeekBar';
import { LyricsSheet } from '@/components/swipe/LyricsSheet';
import { QueueSheet } from '@/components/swipe/QueueSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { fmtCount, trackArtistName } from '@/components/swipe/helpers';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const { height: SCREEN_H } = Dimensions.get('window');

export function FullPlayerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const progress = usePlayerProgress(250);
  const library = useLibrary();
  const track = player.current;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const dragY = useRef(new Animated.Value(0)).current;
  const coverPulse = useRef(new Animated.Value(0)).current;
  const dragStartedRef = useRef(false);

  const trackId = track?._id || '';
  const isRadio = trackId.startsWith('radio-');
  const isAi = trackId.startsWith('ai-');
  const canInteract = !!trackId && !isRadio && !isAi;
  const artistId = track?.artist?._id || '';
  const isFavorite = trackId ? library.isFavorite(trackId) : false;
  const sleepMinutes = player.sleepTimerEnd ? Math.max(1, Math.ceil((player.sleepTimerEnd - Date.now()) / 60_000)) : 0;

  // Reset position whenever the modal opens to avoid sticky offsets.
  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [dragY, visible]);

  useEffect(() => {
    if (!visible || !canInteract) return;
    void getTrackLikeStatus(trackId).then((data) => {
      if (!data) return;
      setLiked(data.liked);
      setLikesCount(data.likesCount || track?.likesCount || 0);
    });
    void getCommentsCount([trackId]).then((counts) => {
      if (!counts) return;
      setCommentsCount(counts[trackId] ?? track?.commentsCount ?? 0);
    });
  }, [canInteract, track?.likesCount, track?.commentsCount, trackId, visible]);

  useEffect(() => {
    if (!visible || !track?.artist?.username || isRadio) return;
    void getArtistFollowState(track.artist.username).then(setFollowing);
  }, [isRadio, track?.artist?.username, visible]);

  // Subtle cover pulse only when playing (less aggressive than before).
  useEffect(() => {
    if (!visible || !player.isPlaying) {
      coverPulse.stopAnimation();
      Animated.timing(coverPulse, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(coverPulse, { toValue: 1, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(coverPulse, { toValue: 0, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [coverPulse, player.isPlaying, visible]);

  const closeWithAnim = useCallback(() => {
    Animated.timing(dragY, {
      toValue: SCREEN_H,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      onClose();
    });
  }, [dragY, onClose]);

  // Swipe-down gesture on the header / top zone to close the modal naturally.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
      // Only react to clearly vertical downward gestures
      return Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
    },
    onPanResponderGrant: () => {
      dragStartedRef.current = true;
    },
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) dragY.setValue(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      dragStartedRef.current = false;
      if (gesture.dy > 140 || gesture.vy > 1.1) {
        closeWithAnim();
      } else {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }).start();
      }
    },
    onPanResponderTerminate: () => {
      dragStartedRef.current = false;
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }).start();
    },
  }), [closeWithAnim, dragY]);

  const toggleLike = useCallback(async () => {
    if (!canInteract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const willLike = !liked;
    setLiked(willLike);
    setLikesCount((c) => Math.max(0, c + (willLike ? 1 : -1)));
    const result = await setTrackLike(trackId, willLike);
    if (result) {
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    }
  }, [canInteract, liked, trackId]);

  const toggleFollow = useCallback(async () => {
    const username = track?.artist?.username;
    if (!username || followBusy) return;
    setFollowBusy(true);
    try {
      const result = await toggleArtistFollow(username);
      if (result) setFollowing(result.following);
      Haptics.selectionAsync().catch(() => {});
    } finally {
      setFollowBusy(false);
    }
  }, [followBusy, track?.artist?.username]);

  const cycleSleepTimer = useCallback(() => {
    const next = !player.sleepTimerEnd ? 15 : sleepMinutes > 45 ? null : sleepMinutes > 20 ? 60 : 30;
    player.setSleepTimer(next);
    Haptics.selectionAsync().catch(() => {});
  }, [player, sleepMinutes]);

  if (!track) return null;

  const coverScale = coverPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, player.isPlaying ? 1.018 : 1],
  });

  // Map the drag distance to a fade for a polished sheet-like dismissal.
  const overlayOpacity = dragY.interpolate({
    inputRange: [0, SCREEN_H * 0.6],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeWithAnim}>
      <Animated.View
        style={[
          styles.root,
          {
            opacity: overlayOpacity,
            transform: [{ translateY: dragY }],
          },
        ]}
      >
        <SynauraBackground variant="warm" />

        <View {...panResponder.panHandlers} style={[styles.header, { paddingTop: insets.top + 8 }]}> 
          <Pressable
            accessibilityLabel="Reduire le lecteur"
            onPress={closeWithAnim}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-down" size={22} color="#171313" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.dragHandle} />
            <Text style={styles.headerKicker}>{isRadio ? 'EN DIRECT' : isAi ? 'CRÉATION IA' : 'LECTURE EN COURS'}</Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>{trackArtistName(track)}</Text>
          </View>
          <Pressable
            accessibilityLabel="Voir la file d'attente"
            onPress={() => setQueueOpen(true)}
            style={styles.headerButton}
          >
            <Ionicons name="albums-outline" size={20} color="#171313" />
            {player.queue.length > 1 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{player.queue.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contextCard}>
            <View style={styles.contextLeft}>
              <Text style={styles.contextKicker}>{player.queue.length > 1 ? 'Queue Synaura' : 'Lecture directe'}</Text>
              <Text style={styles.contextTitle} numberOfLines={1}>
                {player.queue.length > 1 ? `${player.currentIndex + 1} sur ${player.queue.length}` : 'Un son en cours'}
              </Text>
            </View>
            <View style={styles.contextActions}>
              <Pressable accessibilityLabel="Minuteur de sommeil" onPress={cycleSleepTimer} style={[styles.contextBtn, player.sleepTimerEnd ? styles.contextBtnActive : null]}>
                <Ionicons name="moon-outline" size={16} color={player.sleepTimerEnd ? '#FFFAF2' : '#171313'} />
                <Text style={[styles.contextBtnText, player.sleepTimerEnd ? styles.contextBtnTextActive : null]}>{player.sleepTimerEnd ? `${sleepMinutes} min` : 'Timer'}</Text>
              </Pressable>
              <Pressable accessibilityLabel="Voir la queue" onPress={() => setQueueOpen(true)} style={styles.contextBtn}>
                <Ionicons name="list" size={17} color="#171313" />
                <Text style={styles.contextBtnText}>File</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.coverWrap}>
            <Animated.View style={[styles.coverFrame, { transform: [{ scale: coverScale }] }]}>
              {track.coverUrl || track.coverVideoUrl || track.coverVideoPosterUrl ? (
                <TrackCover track={track} active={visible && player.isPlaying} autoPlayVideo={visible && player.isPlaying} style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
                  <Ionicons name="musical-notes" size={68} color="rgba(23,19,19,0.32)" />
                </View>
              )}
            </Animated.View>

            <View style={styles.statusBadges}>
              {isRadio ? (
                <View style={[styles.statusBadge, { backgroundColor: '#EF4444' }]}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>LIVE</Text>
                </View>
              ) : null}
              {track.isBoosted ? (
                <View style={[styles.statusBadge, { backgroundColor: '#171313' }]}>
                  <Ionicons name="flash" size={10} color="#FFFAF2" />
                  <Text style={styles.statusText}>BOOST</Text>
                </View>
              ) : null}
              {isAi ? (
                <View style={[styles.statusBadge, { backgroundColor: '#7C5CFF' }]}>
                  <Ionicons name="sparkles" size={10} color="#FFFAF2" />
                  <Text style={styles.statusText}>IA</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={2}>{track.title}</Text>
            <Pressable
              onPress={() => track.artist?.username && navigation.navigate('Tabs', {
                screen: 'PublicProfile',
                params: { username: track.artist.username },
              })}
              disabled={!track.artist?.username || isRadio}
              style={styles.artistRow}
            >
              <View style={styles.artistAvatar}>
                {track.artist?.avatar ? (
                  <Image source={{ uri: track.artist.avatar }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Text style={styles.artistInitial}>
                    {(track.artist?.name || track.artist?.username || 'S').slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.artist} numberOfLines={1}>{trackArtistName(track)}</Text>
                {track.plays ? (
                  <Text style={styles.plays}>{fmtCount(track.plays)} ecoutes</Text>
                ) : null}
              </View>
              {!isRadio && artistId ? (
                <Pressable
                  accessibilityLabel={following ? 'Deja suivi' : "Suivre l'artiste"}
                  disabled={followBusy}
                  onPress={() => void toggleFollow()}
                  style={[styles.followBtn, following && styles.followBtnDone]}
                >
                  <Ionicons name={following ? 'checkmark' : 'add'} size={13} color={following ? '#FFFAF2' : '#171313'} />
                  <Text style={[styles.followText, following && styles.followTextDone]}>
                    {following ? 'Suivi' : 'Suivre'}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.progressWrap}>
            {!isRadio ? (
              <InteractiveSeekBar
                variant="warm"
                position={progress.positionSec}
                duration={progress.durationSec || track.duration || 0}
                onSeek={(seconds) => void player.seekTo(seconds)}
              />
            ) : (
              <View style={styles.liveLine}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN DIRECT</Text>
              </View>
            )}
          </View>

          <View style={styles.controls}>
            <Pressable
              accessibilityLabel="Activer ou desactiver le shuffle"
              onPress={() => void player.toggleShuffle()}
              style={[styles.smallBtn, player.shuffleEnabled && styles.smallBtnActive]}
            >
              <Ionicons name="shuffle" size={18} color={player.shuffleEnabled ? '#FFFAF2' : '#171313'} />
            </Pressable>
            <Pressable accessibilityLabel="Titre precedent" onPress={() => void player.previous()} style={styles.controlBtn}>
              <Ionicons name="play-skip-back" size={26} color="#171313" />
            </Pressable>
            <Pressable
              accessibilityLabel={player.isPlaying ? 'Mettre en pause' : 'Lire'}
              onPress={() => void player.togglePlayPause()}
              style={styles.playBtn}
            >
              <Ionicons
                name={player.isPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFFAF2"
                style={!player.isPlaying ? { marginLeft: 4 } : null}
              />
            </Pressable>
            <Pressable accessibilityLabel="Titre suivant" onPress={() => void player.next()} style={styles.controlBtn}>
              <Ionicons name="play-skip-forward" size={26} color="#171313" />
            </Pressable>
            <Pressable
              accessibilityLabel="Changer le mode boucle"
              onPress={() => void player.cycleRepeatMode()}
              style={[styles.smallBtn, player.repeatMode !== 'off' && styles.smallBtnActive]}
            >
              <Ionicons
                name={player.repeatMode === 'one' ? 'repeat' : 'repeat-outline'}
                size={18}
                color={player.repeatMode !== 'off' ? '#FFFAF2' : '#171313'}
              />
              {player.repeatMode === 'one' ? <Text style={styles.repeatBadge}>1</Text> : null}
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <PlayerAction
              icon={liked ? 'heart' : 'heart-outline'}
              label={fmtCount(likesCount) || "J'aime"}
              activeColor="#FF4B7A"
              active={liked}
              disabled={!canInteract}
              onPress={() => void toggleLike()}
            />
            <PlayerAction
              icon="chatbubble-ellipses-outline"
              label={fmtCount(commentsCount) || 'Commenter'}
              disabled={!canInteract}
              onPress={() => setCommentsOpen(true)}
            />
            <PlayerAction
              icon="share-social-outline"
              label="Partager"
              onPress={() => setShareOpen(true)}
            />
            <PlayerAction
              icon="document-text-outline"
              label="Paroles"
              disabled={!track.lyrics}
              onPress={() => setLyricsOpen(true)}
            />
            <PlayerAction
              icon={isFavorite ? 'bookmark' : 'bookmark-outline'}
              label="Sauver"
              activeColor="#7C5CFF"
              active={isFavorite}
              onPress={() => library.toggleFavorite(track)}
            />
          </View>

          {track.genre?.length ? (
            <View style={styles.genres}>
              {track.genre.slice(0, 4).map((g) => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <CommentsSheet
          visible={commentsOpen}
          track={track}
          commentCount={commentsCount}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(_id, next) => setCommentsCount(next)}
        />
        <ShareSheet visible={shareOpen} track={track} onClose={() => setShareOpen(false)} />
        <LyricsSheet visible={lyricsOpen} track={track} onClose={() => setLyricsOpen(false)} />
        <QueueSheet visible={queueOpen} onClose={() => setQueueOpen(false)} />
      </Animated.View>
    </Modal>
  );
}

function PlayerAction({
  icon,
  label,
  active,
  activeColor,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const color = active && activeColor ? activeColor : '#171313';
  return (
    <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={styles.actionBtn}>
      <View
        style={[
          styles.actionCircle,
          active && activeColor
            ? {
                backgroundColor: `${activeColor}1F`,
                borderColor: `${activeColor}55`,
              }
            : null,
          disabled && styles.actionDisabled,
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text numberOfLines={1} style={[styles.actionLabel, active && activeColor ? { color: activeColor } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE6' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 5,
  },
  headerButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,242,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(23,19,19,0.18)',
    marginBottom: 6,
  },
  headerKicker: {
    color: 'rgba(23,19,19,0.45)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  headerSubtitle: { color: '#171313', fontSize: 13, fontWeight: '900', marginTop: 4 },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: '#171313',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  contextCard: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,250,242,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  contextLeft: { flex: 1, minWidth: 0 },
  contextKicker: {
    color: 'rgba(23,19,19,0.48)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  contextTitle: { marginTop: 3, color: '#171313', fontSize: 13, fontWeight: '900' },
  contextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  contextActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  contextBtnActive: { backgroundColor: '#171313' },
  contextBtnText: { color: '#171313', fontSize: 11, fontWeight: '900' },
  contextBtnTextActive: { color: '#FFFAF2' },
  coverWrap: { alignItems: 'center', marginTop: 10 },
  coverFrame: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 330,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#171313',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    shadowColor: '#1E1914',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  coverFallback: {
    backgroundColor: 'rgba(23,19,19,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadges: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFAF2' },
  statusText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  meta: { marginTop: 16 },
  title: {
    color: '#171313',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  artistRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  artistAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(23,19,19,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: { color: '#171313', fontSize: 14, fontWeight: '900' },
  artist: { color: '#171313', fontSize: 14, fontWeight: '900' },
  plays: { color: 'rgba(23,19,19,0.5)', fontSize: 11, fontWeight: '700', marginTop: 3 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.1)',
  },
  followBtnDone: { backgroundColor: '#171313', borderColor: 'transparent' },
  followText: { color: '#171313', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  followTextDone: { color: '#FFFAF2' },
  progressWrap: { marginTop: 16 },
  liveLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { color: 'rgba(23,19,19,0.7)', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  controls: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171313',
    shadowColor: '#171313',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  smallBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  smallBtnActive: { backgroundColor: '#171313', borderColor: 'transparent' },
  repeatBadge: {
    position: 'absolute',
    top: 5,
    right: 8,
    color: '#FFFAF2',
    fontSize: 8,
    fontWeight: '900',
  },
  actionRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionBtn: { alignItems: 'center', gap: 6, flex: 1 },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  actionDisabled: { opacity: 0.32 },
  actionLabel: {
    color: 'rgba(23,19,19,0.6)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  genres: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  genreText: {
    color: 'rgba(23,19,19,0.78)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
