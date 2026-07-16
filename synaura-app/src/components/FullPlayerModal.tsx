import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getArtistFollowState,
  getCommentsCount,
  getTrackLikeStatus,
  setTrackLike,
  toggleArtistFollow,
} from '@/api/client';
import { canOpenAiVariation } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { CommentsSheet } from '@/components/swipe/CommentsSheet';
import { LyricsSheet } from '@/components/swipe/LyricsSheet';
import { QueueSheet } from '@/components/swipe/QueueSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { TrackCover } from '@/components/TrackCover';
import { AuraVisual } from '@/components/mobile/AuraVisual';
import { MomentSheet } from '@/components/mobile/MomentSheet';
import { WaveformSeekBar } from '@/components/swipe/WaveformSeekBar';
import { fmtCount, trackArtistName } from '@/components/swipe/helpers';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// The artwork remains central while every social and creation action stays
// connected to the real, timestamp-aware waveform.
export function FullPlayerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const progress = usePlayerProgress(120);
  const library = useLibrary();
  const { settings, updateSettings } = useMobileSettings();
  const track = player.current;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [momentOpen, setMomentOpen] = useState(false);
  const [momentTs, setMomentTs] = useState(0);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const dragY = useRef(new Animated.Value(0)).current;
  const coverX = useRef(new Animated.Value(0)).current;
  const coverPulse = useRef(new Animated.Value(0)).current;
  const dragStartedRef = useRef(false);

  const trackId = track?._id || '';
  const isRadio = trackId.startsWith('radio-');
  const isAi = trackId.startsWith('ai-');
  const canInteract = !!trackId && !isRadio && !isAi;
  const canRemixCurrent = track ? canOpenAiVariation(track) : false;
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

  // Subtle cover pulse only when playing.
  useEffect(() => {
    if (!visible || !player.isPlaying || settings.reducedMotion) {
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
  }, [coverPulse, player.isPlaying, settings.reducedMotion, visible]);

  const closeWithAnim = useCallback(() => {
    Animated.timing(dragY, {
      toValue: layout.height,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      onClose();
    });
  }, [dragY, layout.height, onClose]);

  // Swipe-down gesture on the header to close the modal naturally.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => {
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

  const coverPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35
    ),
    onPanResponderMove: (_, gesture) => coverX.setValue(Math.max(-96, Math.min(96, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      const direction = gesture.dx < 0 ? 1 : -1;
      if (Math.abs(gesture.dx) < 68 && Math.abs(gesture.vx) < 0.85) {
        Animated.spring(coverX, { toValue: 0, speed: 26, bounciness: 5, useNativeDriver: true }).start();
        return;
      }
      void Haptics.selectionAsync().catch(() => {});
      Animated.timing(coverX, {
        toValue: direction > 0 ? -150 : 150,
        duration: settings.reducedMotion ? 0 : 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        const action = direction > 0 ? player.next() : player.previous();
        void Promise.resolve(action).finally(() => {
          coverX.setValue(direction > 0 ? 42 : -42);
          Animated.spring(coverX, { toValue: 0, speed: 25, bounciness: 5, useNativeDriver: true }).start();
        });
      });
    },
    onPanResponderTerminate: () => {
      Animated.spring(coverX, { toValue: 0, speed: 26, bounciness: 5, useNativeDriver: true }).start();
    },
  }), [coverX, player, settings.reducedMotion]);

  useEffect(() => {
    coverX.setValue(0);
  }, [coverX, trackId]);

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

  const toggleAuraVisuals = useCallback(() => {
    updateSettings({ dynamicBackground: !settings.dynamicBackground }).catch(() => {});
    Haptics.selectionAsync().catch(() => {});
  }, [settings.dynamicBackground, updateSettings]);

  const openRemixStudio = useCallback(() => {
    if (!track || !canRemixCurrent) return;
    Haptics.selectionAsync().catch(() => {});
    setMoreOpen(false);
    onClose();
    navigation.navigate('Tabs', {
      screen: 'AIStudio',
      params: {
        sourceTrackId: track._id,
        sourceTrackType: track._id.startsWith('ai-') ? 'ai_track' : 'track',
        mode: 'remix',
      },
    });
  }, [canRemixCurrent, navigation, onClose, track]);

  const openMomentSheet = useCallback((seconds?: number) => {
    if (!canInteract) return;
    const target = typeof seconds === 'number' ? seconds : progress.positionSec;
    setMomentTs(Math.max(0, Math.round(target || 0)));
    setMomentOpen(true);
    Haptics.selectionAsync().catch(() => {});
  }, [canInteract, progress.positionSec]);

  if (!track) return null;

  const coverScale = coverPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, player.isPlaying ? 1.015 : 1],
  });

  const overlayOpacity = dragY.interpolate({
    inputRange: [0, layout.height * 0.6],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  // Constrain the square against both the usable width and short displays.
  const coverSize = Math.min(
    layout.mediaSize,
    layout.safeWidth - layout.pagePaddingLeft - layout.pagePaddingRight,
    layout.isTablet ? 460 : 420,
  );
  const transportIconSize = layout.compactControls ? 23 : 26;
  const auraActive = track.auraVisualEnabled !== false && settings.dynamicBackground;

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
        <StatusBar style="light" />
        <AuraVisual track={track} active={visible} playing={player.isPlaying} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,5,5,0.12)', 'rgba(7,7,7,0.38)', 'rgba(8,8,8,0.72)']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View
          {...panResponder.panHandlers}
          style={[
            styles.header,
            layout.contentFrame,
            layout.isNarrow && styles.headerCompact,
            { paddingLeft: layout.pagePaddingLeft, paddingRight: layout.pagePaddingRight, paddingTop: insets.top + 8 },
          ]}
        >
          <Pressable
            accessibilityLabel="Reduire le lecteur"
            onPress={closeWithAnim}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-down" size={22} color="#F7F6F3" />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.dragHandle} />
            <Text style={styles.headerKicker}>{isRadio ? 'EN DIRECT' : isAi ? 'CRÉATION IA' : 'LECTURE EN COURS'}</Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {player.queue.length > 1 ? `${player.currentIndex + 1} sur ${player.queue.length}` : trackArtistName(track)}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Voir la file d'attente"
            onPress={() => setQueueOpen(true)}
            style={styles.headerButton}
          >
            <Ionicons name="albums-outline" size={20} color="#F7F6F3" />
            {player.queue.length > 1 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{player.queue.length}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={styles.bodyScroll}
          contentContainerStyle={[
            styles.body,
            layout.contentFrame,
            layout.compactControls && styles.bodyCompact,
            {
              minHeight: Math.max(1, layout.height - insets.top - 62),
              paddingLeft: layout.pagePaddingLeft,
              paddingRight: layout.pagePaddingRight,
              paddingBottom: insets.bottom + 14,
            },
          ]}
        >
          {/* Zone cover flexible : absorbe l'espace restant */}
          <View style={[styles.coverZone, { minHeight: coverSize + (layout.compactControls ? 12 : 24) }]}>
            {track.coverUrl ? (
              <Animated.View style={[styles.coverHalo, { width: coverSize + 22, height: coverSize + 22, transform: [{ scale: coverScale }] }]}>
                <Image source={{ uri: track.coverUrl }} blurRadius={28} style={StyleSheet.absoluteFillObject} />
              </Animated.View>
            ) : null}
            <Animated.View style={[styles.coverFrame, { width: coverSize, height: coverSize, transform: [{ translateX: coverX }, { scale: coverScale }] }]}>
              {track.coverUrl || track.coverVideoUrl || track.coverVideoPosterUrl ? (
                <TrackCover track={track} active={visible && player.isPlaying} autoPlayVideo={visible && player.isPlaying} style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
                  <Ionicons name="musical-notes" size={68} color="rgba(247,246,243,0.32)" />
                </View>
              )}

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

              <View {...coverPanResponder.panHandlers} style={styles.coverGestureZone} />

            </Animated.View>
          </View>

          <View style={styles.meta}>
            <View style={styles.titleRow}>
              <Text
                maxFontSizeMultiplier={1.2}
                style={[styles.title, layout.isNarrow && styles.titleCompact]}
                numberOfLines={2}
              >
                {track.title}
              </Text>
              <View style={styles.metaActions}>
                <MetaAction
                  icon={liked ? 'heart' : 'heart-outline'}
                  label={liked ? "Retirer des J'aime" : "Ajouter aux J'aime"}
                  value={likesCount > 0 ? fmtCount(likesCount) : undefined}
                  active={liked}
                  activeColor="#D96D63"
                  disabled={!canInteract}
                  onPress={() => void toggleLike()}
                />
                <MetaAction
                  icon={isFavorite ? 'bookmark' : 'bookmark-outline'}
                  label={isFavorite ? 'Retirer de la bibliotheque' : 'Ajouter a la bibliotheque'}
                  active={isFavorite}
                  activeColor="#A995E8"
                  onPress={() => library.toggleFavorite(track)}
                />
              </View>
            </View>
            <View style={styles.metaRow}>
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
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text style={styles.artist} numberOfLines={1}>{trackArtistName(track)}</Text>
                  {track.plays ? <Text style={styles.plays}>{fmtCount(track.plays)} écoutes</Text> : null}
                </View>
              </Pressable>
              <View style={styles.metaRight}>
                {!isRadio && artistId ? (
                  <Pressable
                    accessibilityLabel={following ? 'Deja suivi' : "Suivre l'artiste"}
                    disabled={followBusy}
                    onPress={() => void toggleFollow()}
                    style={[styles.followBtn, following && styles.followBtnDone]}
                  >
                    <Ionicons name={following ? 'checkmark' : 'add'} size={13} color={following ? '#111111' : '#F7F6F3'} />
                    <Text style={[styles.followText, following && styles.followTextDone]}>
                      {following ? 'Suivi' : 'Suivre'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.timeline}>
            {!isRadio ? (
              <WaveformSeekBar
                trackId={trackId}
                position={progress.positionSec}
                duration={progress.durationSec || track.duration || 0}
                onSeek={(seconds) => void player.seekTo(seconds)}
                showMoments={canInteract}
                showTimes
                height={layout.compactControls ? 48 : 56}
                barCount={layout.isNarrow ? 44 : 58}
                immersive
                onCreateMoment={canInteract ? openMomentSheet : undefined}
                style={styles.waveInner}
              />
            ) : (
              <View style={styles.liveTimeline}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN DIRECT</Text>
                <View style={styles.liveLine} />
              </View>
            )}
          </View>

          {/* Transport */}
          <View style={[styles.controls, layout.compactControls && styles.controlsCompact]}>
            <Pressable
              accessibilityLabel="Activer ou desactiver le shuffle"
              onPress={() => void player.toggleShuffle()}
              style={[styles.smallBtn, layout.compactControls && styles.smallBtnCompact, player.shuffleEnabled && styles.smallBtnActive]}
            >
              <Ionicons name="shuffle" size={layout.compactControls ? 16 : 18} color={player.shuffleEnabled ? '#111111' : '#F7F6F3'} />
            </Pressable>
            <Pressable accessibilityLabel="Titre precedent" onPress={() => void player.previous()} style={[styles.controlBtn, layout.compactControls && styles.controlBtnCompact]}>
              <Ionicons name="play-skip-back" size={transportIconSize} color="#F7F6F3" />
            </Pressable>
            <Pressable
              accessibilityLabel={player.isPlaying ? 'Mettre en pause' : 'Lire'}
              onPress={() => void player.togglePlayPause()}
              style={[styles.playBtn, layout.compactControls && styles.playBtnCompact]}
            >
              <Ionicons
                name={player.isPlaying ? 'pause' : 'play'}
                size={layout.compactControls ? 28 : 32}
                color="#111111"
                style={!player.isPlaying ? { marginLeft: 4 } : null}
              />
            </Pressable>
            <Pressable accessibilityLabel="Titre suivant" onPress={() => void player.next()} style={[styles.controlBtn, layout.compactControls && styles.controlBtnCompact]}>
              <Ionicons name="play-skip-forward" size={transportIconSize} color="#F7F6F3" />
            </Pressable>
            <Pressable
              accessibilityLabel="Changer le mode boucle"
              onPress={() => void player.cycleRepeatMode()}
              style={[styles.smallBtn, layout.compactControls && styles.smallBtnCompact, player.repeatMode !== 'off' && styles.smallBtnActive]}
            >
              <Ionicons
                name={player.repeatMode === 'one' ? 'repeat' : 'repeat-outline'}
                size={layout.compactControls ? 16 : 18}
                color={player.repeatMode !== 'off' ? '#111111' : '#F7F6F3'}
              />
              {player.repeatMode === 'one' ? <Text style={styles.repeatBadge}>1</Text> : null}
            </Pressable>
          </View>

          <View style={[styles.actionRow, layout.compactControls && styles.actionRowCompact]}>
            <PlayerAction
              icon="chatbubble-ellipses-outline"
              label={fmtCount(commentsCount) || 'Commenter'}
              disabled={!canInteract}
              onPress={() => setCommentsOpen(true)}
            />
            <PlayerAction
              icon="pulse-outline"
              label="Moment"
              disabled={!canInteract}
              onPress={() => openMomentSheet()}
            />
            <PlayerAction
              icon="share-social-outline"
              label="Partager"
              onPress={() => setShareOpen(true)}
            />
            <PlayerAction
              icon={auraActive ? 'sparkles' : 'sparkles-outline'}
              label="Aura"
              activeColor="#74C7CF"
              active={auraActive}
              disabled={track.auraVisualEnabled === false}
              onPress={toggleAuraVisuals}
            />
            <PlayerAction
              icon="ellipsis-horizontal"
              label="Plus"
              onPress={() => setMoreOpen(true)}
            />
          </View>
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
        <MomentSheet
          visible={momentOpen}
          track={track}
          timestampSeconds={momentTs}
          onClose={() => setMomentOpen(false)}
          onCommentCreated={() => setCommentsCount((value) => value + 1)}
        />

        {/* Feuille "Plus" : actions secondaires sorties de l'écran principal */}
        <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
          <View style={styles.moreOverlay}>
            <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={() => setMoreOpen(false)} />
            <View style={[styles.moreSheet, { width: Math.min(layout.safeWidth, 560), paddingBottom: insets.bottom + 16, transform: [{ translateX: (insets.left - insets.right) / 2 }] }]}>
              <View style={styles.moreHandle} />
              <ScrollView contentContainerStyle={styles.moreContent} showsVerticalScrollIndicator={false}>
              <MoreRow
                icon="document-text-outline"
                label="Paroles"
                disabled={!track.lyrics}
                onPress={() => {
                  setMoreOpen(false);
                  setLyricsOpen(true);
                }}
              />
              {canRemixCurrent ? (
                <MoreRow icon="color-wand-outline" label="Remixer dans le Studio" onPress={openRemixStudio} />
              ) : null}
              <MoreRow
                icon={library.isDownloaded(track._id) ? 'checkmark-circle' : 'download-outline'}
                label={library.isDownloaded(track._id) ? 'Retirer du hors ligne' : 'Télécharger hors ligne'}
                disabled={!/^https?:\/\//i.test(track.audioUrl || '') && !library.isDownloaded(track._id)}
                onPress={() => {
                  if (library.isDownloaded(track._id)) void library.removeDownload(track._id);
                  else void library.downloadTrack(track);
                }}
              />
              <MoreRow
                icon="moon-outline"
                label={player.sleepTimerEnd ? `Timer sommeil · ${sleepMinutes} min` : 'Timer sommeil'}
                active={Boolean(player.sleepTimerEnd)}
                onPress={cycleSleepTimer}
              />
              <MoreRow
                icon="sparkles-outline"
                label={track.auraVisualEnabled === false ? 'Aura indisponible pour ce son' : auraActive ? 'Aura Visual · activé' : 'Aura Visual · désactivé'}
                active={auraActive}
                disabled={track.auraVisualEnabled === false}
                onPress={toggleAuraVisuals}
              />
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
            </View>
          </View>
        </Modal>
      </Animated.View>
    </Modal>
  );
}

function MetaAction({
  icon,
  label,
  value,
  active,
  activeColor,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  active?: boolean;
  activeColor: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const tint = active ? activeColor : '#F7F6F3';
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.metaAction, active && styles.metaActionActive, disabled && styles.actionDisabled]}
    >
      <Ionicons name={icon} size={22} color={tint} />
      {value ? <Text style={[styles.metaActionValue, active && { color: activeColor }]}>{value}</Text> : null}
    </Pressable>
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
  const color = active && activeColor ? activeColor : '#F7F6F3';
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

function MoreRow({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.moreRow, disabled && { opacity: 0.35 }]}
    >
      <View style={[styles.moreIcon, active && styles.moreIconActive]}>
        <Ionicons name={icon} size={18} color={active ? colors.white : '#F7F6F3'} />
      </View>
      <Text style={styles.moreLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.52)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090909' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 5,
  },
  headerCompact: { gap: 8, paddingBottom: 6 },
  headerButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,8,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  headerKicker: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  headerSubtitle: { color: '#F7F6F3', fontSize: 13, fontWeight: '800', marginTop: 3 },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.violet,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  bodyScroll: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 4 },
  bodyCompact: { paddingTop: 0 },
  coverZone: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  coverHalo: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.38,
  },
  coverFrame: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#171313',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  coverFallback: {
    backgroundColor: '#171716',
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
    borderRadius: 7,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFAF2' },
  statusText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
  coverGestureZone: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  waveInner: { paddingHorizontal: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { color: '#F7F6F3', fontSize: 11, fontWeight: '900' },
  liveTimeline: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  liveLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.24)' },
  timeline: {
    marginTop: 14,
    minHeight: 62,
    justifyContent: 'center',
  },
  meta: { marginTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: {
    flex: 1,
    color: '#F7F6F3',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  titleCompact: { fontSize: 19, lineHeight: 23 },
  metaActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaAction: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(8,8,8,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  metaActionActive: { backgroundColor: 'rgba(8,8,8,0.78)', borderColor: 'rgba(255,255,255,0.42)' },
  metaActionValue: { color: '#F7F6F3', fontSize: 10, fontWeight: '900' },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  artistAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: 'rgba(23,19,19,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: { color: '#F7F6F3', fontSize: 13, fontWeight: '900' },
  artist: { color: '#F7F6F3', fontSize: 14, fontWeight: '900' },
  plays: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(8,8,8,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followBtnDone: { backgroundColor: '#F7F6F3', borderColor: 'transparent' },
  followText: { color: '#F7F6F3', fontSize: 11, fontWeight: '900' },
  followTextDone: { color: '#111111' },
  controls: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  controlsCompact: { marginTop: 10, gap: 5 },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,8,0.4)',
  },
  controlBtnCompact: { width: 46, height: 46, borderRadius: 23 },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F3',
    shadowColor: '#000000',
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  playBtnCompact: { width: 62, height: 62, borderRadius: 31 },
  smallBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,8,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  smallBtnCompact: { width: 36, height: 36, borderRadius: 18 },
  smallBtnActive: { backgroundColor: '#F7F6F3', borderColor: 'transparent' },
  repeatBadge: {
    position: 'absolute',
    top: 5,
    right: 8,
    color: '#111111',
    fontSize: 8,
    fontWeight: '900',
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actionRowCompact: { marginTop: 10 },
  actionBtn: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  actionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,8,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionDisabled: { opacity: 0.32 },
  actionLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 9,
    fontWeight: '900',
  },
  moreOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  moreSheet: {
    alignSelf: 'center',
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 4,
  },
  moreContent: { gap: 4 },
  moreHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  moreIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  moreIconActive: { backgroundColor: colors.violet, borderColor: 'transparent' },
  moreLabel: { flex: 1, color: '#F7F6F3', fontSize: 14, fontWeight: '800' },
  genres: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  genreText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
