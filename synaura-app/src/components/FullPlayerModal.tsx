import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { AuraVisual } from '@/components/mobile/AuraVisual';
import { MomentSheet } from '@/components/mobile/MomentSheet';
import { WaveformSeekBar } from '@/components/swipe/WaveformSeekBar';
import { fmtCount, fmtTime, trackArtistName } from '@/components/swipe/helpers';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// Refonte "lecture en cours" : tout tient sur un seul écran (plus de scroll).
// La waveform réelle vit DANS la cover (bandeau bas sur scrim sombre) au lieu
// d'une grosse carte séparée ; réactions/commentaires de moment passent dans
// une feuille dédiée ("Réagir à ce moment") ; les actions secondaires
// (paroles, remix, téléchargement, timer, aura) dans une feuille "Plus".
export function FullPlayerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const player = usePlayer();
  const progress = usePlayerProgress(250);
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
  const [coverZoneHeight, setCoverZoneHeight] = useState(0);

  const dragY = useRef(new Animated.Value(0)).current;
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
    inputRange: [0, SCREEN_H * 0.6],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  // La cover prend toute la place disponible entre le header et le bloc
  // méta/contrôles, sans jamais déborder ni forcer de scroll : sa taille est
  // le min entre la hauteur mesurée de la zone flexible et la largeur écran.
  const coverSize = Math.max(180, Math.min(coverZoneHeight, SCREEN_W - 48, 360));

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
        <AuraVisual track={track} active={visible} playing={player.isPlaying} />

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
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {player.queue.length > 1 ? `${player.currentIndex + 1} sur ${player.queue.length}` : trackArtistName(track)}
            </Text>
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

        <View style={[styles.body, { paddingBottom: insets.bottom + 14 }]}>
          {/* Zone cover flexible : absorbe l'espace restant */}
          <View
            style={styles.coverZone}
            onLayout={(event) => setCoverZoneHeight(Math.max(0, event.nativeEvent.layout.height))}
          >
            {track.coverUrl ? (
              <Animated.View style={[styles.coverHalo, { width: coverSize + 22, height: coverSize + 22, transform: [{ scale: coverScale }] }]}>
                <Image source={{ uri: track.coverUrl }} blurRadius={28} style={StyleSheet.absoluteFillObject} />
              </Animated.View>
            ) : null}
            <Animated.View style={[styles.coverFrame, { width: coverSize, height: coverSize, transform: [{ scale: coverScale }] }]}>
              {track.coverUrl || track.coverVideoUrl || track.coverVideoPosterUrl ? (
                <TrackCover track={track} active={visible && player.isPlaying} autoPlayVideo={visible && player.isPlaying} style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
                  <Ionicons name="musical-notes" size={68} color="rgba(23,19,19,0.32)" />
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

              {/* Waveform réelle intégrée dans la cover, sur scrim sombre */}
              {!isRadio ? (
                <View style={styles.waveOverlay}>
                  <LinearGradient
                    colors={['rgba(10,8,8,0)', 'rgba(10,8,8,0.58)', 'rgba(10,8,8,0.82)']}
                    locations={[0, 0.4, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <WaveformSeekBar
                    trackId={trackId}
                    position={progress.positionSec}
                    duration={progress.durationSec || track.duration || 0}
                    onSeek={(seconds) => void player.seekTo(seconds)}
                    showMoments={canInteract}
                    height={48}
                    barCount={52}
                    immersive
                    onCreateMoment={canInteract ? openMomentSheet : undefined}
                    style={styles.waveInner}
                  />
                </View>
              ) : (
                <View style={styles.liveOverlay}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>EN DIRECT</Text>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Bloc méta compact */}
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
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
                    <Ionicons name={following ? 'checkmark' : 'add'} size={13} color={following ? '#FFFAF2' : '#171313'} />
                    <Text style={[styles.followText, following && styles.followTextDone]}>
                      {following ? 'Suivi' : 'Suivre'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          {/* Transport */}
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

          {/* Une seule rangée d'actions : le reste vit dans "Plus" */}
          <View style={styles.actionRow}>
            <PlayerAction
              icon={liked ? 'heart' : 'heart-outline'}
              label={fmtCount(likesCount) || "J'aime"}
              activeColor="#D96D63"
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
              icon={isFavorite ? 'bookmark' : 'bookmark-outline'}
              label="Sauver"
              activeColor="#7357C6"
              active={isFavorite}
              onPress={() => library.toggleFavorite(track)}
            />
            <PlayerAction
              icon="ellipsis-horizontal"
              label="Plus"
              onPress={() => setMoreOpen(true)}
            />
          </View>
        </View>

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
            <View style={[styles.moreSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.moreHandle} />
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
                label={settings.dynamicBackground ? 'Aura visuals · activés' : 'Aura visuals'}
                active={settings.dynamicBackground}
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
            </View>
          </View>
        </Modal>
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
        <Ionicons name={icon} size={18} color={active ? '#FFFAF2' : '#171313'} />
      </View>
      <Text style={styles.moreLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color="rgba(23,19,19,0.3)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE6' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
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
  body: { flex: 1, paddingHorizontal: 20 },
  coverZone: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverHalo: {
    position: 'absolute',
    borderRadius: 34,
    overflow: 'hidden',
    opacity: 0.34,
  },
  coverFrame: {
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
  waveOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 52,
  },
  waveInner: { paddingHorizontal: 14, paddingBottom: 12 },
  liveOverlay: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(10,8,8,0.55)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { color: 'rgba(255,250,242,0.85)', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  meta: { marginTop: 14 },
  title: {
    color: '#171313',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  metaRow: {
    marginTop: 8,
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
    borderColor: 'rgba(23,19,19,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: { color: '#171313', fontSize: 13, fontWeight: '900' },
  artist: { color: '#171313', fontSize: 13, fontWeight: '900' },
  plays: { color: 'rgba(23,19,19,0.5)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFAF2',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.1)',
  },
  followBtnDone: { backgroundColor: '#171313', borderColor: 'transparent' },
  followText: { color: '#171313', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  followTextDone: { color: '#FFFAF2' },
  controls: {
    marginTop: 16,
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
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  actionBtn: { flex: 1, alignItems: 'center', gap: 6 },
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
  moreOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  moreSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#F7F6F3',
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 4,
  },
  moreHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(17,17,17,0.18)', marginBottom: 8 },
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  moreIconActive: { backgroundColor: '#171313', borderColor: 'transparent' },
  moreLabel: { flex: 1, color: '#171313', fontSize: 14, fontWeight: '900' },
  genres: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
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
