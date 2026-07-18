import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import type { MusicClip } from '@/api/types';
import { canUseSoundClientSide } from '@/api/types';
import { colors } from '@/theme/tokens';
import { fmtCount, trackArtistName } from './helpers';
import { useAuth } from '@/auth/AuthProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraImage } from '@/components/ui/SynauraImage';

// Un clip reste une slide du Scroll, avec sa propre lecture et ses propres
// interactions. Sa lecture ne modifie jamais la file ou la position du morceau.
type Props = {
  clip: MusicClip;
  isActive: boolean;
  isPlaying: boolean;
  shouldLoadMedia: boolean;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  isFollowingCreator: boolean;
  followLoading?: boolean;
  height: number;
  topPad: number;
  bottomPad: number;
  onPressAudio: () => void;
  onPlaybackEnd: () => void;
  onDoubleTapLike: () => void;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenTrack: () => void;
  onOpenCreator: () => void;
  onToggleFollowCreator: () => void;
  onShare: () => void;
  onUseSound: () => void;
};

function ActionButton({
  icon,
  iconActive,
  active,
  count,
  label,
  disabled,
  highlightColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  count?: number;
  label?: string;
  disabled?: boolean;
  highlightColor?: string;
  onPress: () => void;
}) {
  const responsive = useResponsiveLayout();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.84, duration: 70, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 }),
    ]).start();
    onPress();
  };
  return (
    <Pressable accessibilityLabel={label || String(icon)} disabled={disabled} onPress={handlePress} style={[styles.actionButton, responsive.compactControls && styles.actionButtonCompact, disabled && styles.actionButtonDisabled]}>
      <Animated.View
        style={[
          styles.actionCircle,
          responsive.compactControls && styles.actionCircleCompact,
          active && {
            backgroundColor: highlightColor ? `${highlightColor}28` : 'rgba(255,75,122,0.26)',
            borderColor: highlightColor ? `${highlightColor}66` : 'rgba(255,75,122,0.5)',
          },
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={(active && iconActive ? iconActive : icon) as any}
          size={responsive.compactControls ? 19 : 22}
          color={active ? highlightColor || '#D96D63' : '#FFFAF2'}
        />
      </Animated.View>
      {typeof count === 'number' && count > 0 ? (
        <Text numberOfLines={1} style={styles.actionLabel}>{fmtCount(count)}</Text>
      ) : null}
    </Pressable>
  );
}

export function ClipSlide({
  clip,
  isActive,
  isPlaying,
  shouldLoadMedia,
  isLiked,
  likesCount,
  commentsCount,
  isFollowingCreator,
  followLoading,
  height,
  topPad,
  bottomPad,
  onPressAudio,
  onPlaybackEnd,
  onDoubleTapLike,
  onToggleLike,
  onOpenComments,
  onOpenTrack,
  onOpenCreator,
  onToggleFollowCreator,
  onShare,
  onUseSound,
}: Props) {
  const track = clip.sourceTrack;
  const artist = trackArtistName(track);
  const auth = useAuth();
  const { settings } = useMobileSettings();
  const responsive = useResponsiveLayout();
  const isOwnTrack = Boolean(auth.user?.id) && track.artist?._id === auth.user?.id;
  const canUseSound = canUseSoundClientSide({
    isOwner: isOwnTrack,
    allowClips: Boolean(track.allowClips),
    remixVisibility: track.remixVisibility || 'disabled',
  });

  const playButtonOpacity = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;
  const videoRef = useRef<any>(null);
  const audioRef = useRef<any>(null);
  const videoTimeRef = useRef(0);
  const videoDurationRef = useRef(0);
  const audioTimeRef = useRef(0);
  const playbackEndedRef = useRef(false);
  const wasActiveRef = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(true);
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioBuffering, setAudioBuffering] = useState(true);
  const clipStart = Math.max(0, clip.sourceTrackOffsetSeconds || 0);
  const clipLength = Math.max(3, clip.sourceTrackDurationSeconds || 30);
  const clipEnd = clipStart + clipLength;

  useEffect(() => {
    Animated.timing(playButtonOpacity, { toValue: isPlaying ? 0 : 1, duration: settings.reducedMotion ? 0 : 220, useNativeDriver: true }).start();
  }, [isPlaying, playButtonOpacity, settings.reducedMotion]);

  useEffect(() => {
    setVideoFailed(false);
    setVideoReady(false);
    setVideoBuffering(true);
    setAudioFailed(false);
    setAudioReady(false);
    setAudioBuffering(true);
    videoTimeRef.current = 0;
    videoDurationRef.current = 0;
    audioTimeRef.current = clipStart;
    playbackEndedRef.current = false;
    wasActiveRef.current = false;
  }, [clip.id, clip.videoUrl, clipStart]);

  // Une session Clip possede sa propre video et son propre extrait audio. Elle
  // ne touche jamais a TrackPlayer, a sa file ou a la position du morceau source.
  useEffect(() => {
    if (!isActive) {
      if (wasActiveRef.current) {
        audioRef.current?.seek(clipStart);
        videoRef.current?.seek(0);
        audioTimeRef.current = clipStart;
        videoTimeRef.current = 0;
        playbackEndedRef.current = false;
      }
      wasActiveRef.current = false;
      return;
    }
    if (!wasActiveRef.current) {
      audioRef.current?.seek(clipStart);
      videoRef.current?.seek(0);
      audioTimeRef.current = clipStart;
      videoTimeRef.current = 0;
      playbackEndedRef.current = false;
    }
    wasActiveRef.current = true;
  }, [clipStart, isActive]);

  useEffect(() => {
    if (!isActive || !isPlaying || !playbackEndedRef.current) return;
    playbackEndedRef.current = false;
    audioRef.current?.seek(clipStart);
    videoRef.current?.seek(0);
    audioTimeRef.current = clipStart;
    videoTimeRef.current = 0;
  }, [clipStart, isActive, isPlaying]);

  // Mêmes gestes que SwipeSlide : tap = lecture/pause, double-tap = like.
  const mediaGesture = React.useMemo(() => Gesture.Exclusive(
    Gesture.Tap()
      .enabled(isActive)
      .numberOfTaps(2)
      .maxDelay(240)
      .maxDistance(12)
      .runOnJS(true)
      .onEnd((_event, success) => { if (success) onDoubleTapLike(); }),
    Gesture.Tap()
      .enabled(isActive)
      .numberOfTaps(1)
      .maxDistance(12)
      .runOnJS(true)
      .onEnd((_event, success) => { if (success) onPressAudio(); }),
  ), [isActive, onDoubleTapLike, onPressAudio]);

  return (
    <View style={[styles.page, { height }]}>
      <GestureDetector gesture={mediaGesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'}
          onAccessibilityTap={onPressAudio}
          style={styles.pressArea}
        >
        {shouldLoadMedia && clip.videoUrl && !videoFailed ? (
          <Video
            ref={videoRef}
            source={{ uri: clip.videoUrl }}
            poster={clip.posterUrl || undefined}
            paused={!isActive || !isPlaying}
            repeat={false}
            muted={!audioFailed}
            disableFocus={!audioFailed}
            resizeMode="cover"
            playInBackground={false}
            playWhenInactive={false}
            onLoad={(event) => {
              videoDurationRef.current = Number(event.duration || 0);
              setVideoReady(true);
              setVideoBuffering(false);
              videoRef.current?.seek(Math.max(0, audioTimeRef.current - clipStart));
            }}
            onProgress={(event) => {
              videoTimeRef.current = Number(event.currentTime || 0);
            }}
            onEnd={() => {
              if (!isActive || !isPlaying || playbackEndedRef.current) return;
              if (track.audioUrl && !audioFailed) return;
              playbackEndedRef.current = true;
              audioRef.current?.seek(clipStart);
              videoRef.current?.seek(0);
              onPlaybackEnd();
            }}
            onBuffer={(event) => setVideoBuffering(Boolean(event.isBuffering))}
            onError={() => {
              setVideoBuffering(false);
              setVideoFailed(true);
            }}
            progressUpdateInterval={250}
            style={StyleSheet.absoluteFill}
          />
        ) : clip.posterUrl ? (
          <SynauraImage source={{ uri: clip.posterUrl }} lowPriority={!isActive} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#171313' }]} />
        )}
        {shouldLoadMedia && track.audioUrl ? (
          <Video
            ref={audioRef}
            source={{ uri: track.audioUrl }}
            paused={!isActive || !isPlaying || audioFailed || !audioReady}
            repeat={false}
            muted={false}
            volume={1}
            playInBackground={false}
            playWhenInactive={false}
            progressUpdateInterval={180}
            onLoad={() => {
              setAudioReady(true);
              setAudioBuffering(false);
              audioTimeRef.current = clipStart;
              audioRef.current?.seek(clipStart);
            }}
            onProgress={(event) => {
              const currentTime = Number(event.currentTime || 0);
              audioTimeRef.current = currentTime;
              const relative = Math.max(0, currentTime - clipStart);
              if (isActive && videoReady && Math.abs(videoTimeRef.current - relative) > 0.5) {
                videoRef.current?.seek(Math.min(relative, Math.max(0, videoDurationRef.current - 0.05)));
              }
              if (!isActive || !isPlaying || playbackEndedRef.current || currentTime < clipEnd - 0.12) return;
              playbackEndedRef.current = true;
              audioRef.current?.seek(clipStart);
              videoRef.current?.seek(0);
              onPlaybackEnd();
            }}
            onBuffer={(event) => setAudioBuffering(Boolean(event.isBuffering))}
            onEnd={() => {
              if (playbackEndedRef.current) return;
              playbackEndedRef.current = true;
              audioRef.current?.seek(clipStart);
              videoRef.current?.seek(0);
              onPlaybackEnd();
            }}
            onError={() => {
              setAudioBuffering(false);
              setAudioFailed(true);
            }}
            style={styles.hiddenAudio}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(10,8,8,0.32)', 'rgba(10,8,8,0.0)', 'rgba(10,8,8,0.56)', 'rgba(10,8,8,0.98)']}
          locations={[0, 0.34, 0.73, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View pointerEvents="none" style={[styles.playOverlay, { opacity: playButtonOpacity }]}>
          <View style={styles.playCircle}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#FFFAF2" style={!isPlaying ? { marginLeft: 5 } : null} />
          </View>
        </Animated.View>

        <View style={[styles.topBadges, { top: topPad + (responsive.compactControls ? 50 : 58) }]}>
          <View style={styles.clipBadge}>
            <Ionicons name="film-outline" size={11} color="#8fd3dc" />
            <Text style={styles.clipBadgeText}>CLIP SYNAURA</Text>
          </View>
          {videoFailed ? (
            <View style={styles.videoStatus}>
              <Ionicons name="cloud-offline-outline" size={11} color="#FFFAF2" />
              <Text style={styles.videoStatusText}>VIDEO INDISPONIBLE</Text>
            </View>
          ) : isActive && (videoBuffering || (!audioFailed && (!audioReady || audioBuffering))) ? (
            <View style={styles.videoLoading}>
              <View style={styles.videoLoadingDot} />
              <Text style={styles.videoStatusText}>CHARGEMENT</Text>
            </View>
          ) : null}
        </View>
        </View>
      </GestureDetector>

      <View style={[styles.actionsColumn, responsive.compactControls && styles.actionsColumnCompact, { bottom: bottomPad + (responsive.compactControls ? 72 : 92) }]}>
        {clip.creator?.username ? (
          <View style={styles.profileCluster}>
            <Pressable accessibilityLabel="Ouvrir le profil du créateur" onPress={onOpenCreator} style={styles.profileAvatar}>
              {clip.creator.avatar ? (
                <SynauraImage source={{ uri: clip.creator.avatar }} lowPriority={!isActive} style={StyleSheet.absoluteFill} />
              ) : (
                <Text style={styles.profileInitial}>
                  {(clip.creator.name || clip.creator.username || '?').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityLabel={isFollowingCreator ? 'Suivi' : 'Suivre le créateur'}
              disabled={followLoading}
              onPress={onToggleFollowCreator}
              style={[styles.followBubble, isFollowingCreator && styles.followBubbleDone]}
            >
              <Ionicons
                name={followLoading ? 'ellipsis-horizontal' : isFollowingCreator ? 'checkmark' : 'add'}
                size={14}
                color="#FFFAF2"
              />
            </Pressable>
          </View>
        ) : null}

        <ActionButton
          icon="heart-outline"
          iconActive="heart"
          active={isLiked}
          count={likesCount}
          label="Like"
          highlightColor="#D96D63"
          onPress={onToggleLike}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          count={commentsCount}
          label="Commentaires"
          onPress={onOpenComments}
        />
        <ActionButton
          icon="share-social-outline"
          label="Partager"
          onPress={onShare}
        />
        {canUseSound ? (
          <ActionButton
            icon="film-outline"
            label={isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}
            onPress={onUseSound}
          />
        ) : null}
      </View>

      <View style={[styles.metaPanel, responsive.isNarrow && styles.metaPanelNarrow, { bottom: bottomPad + (responsive.compactControls ? 8 : 14) }]}>
        <Pressable accessibilityLabel="Ouvrir le profil du créateur" onPress={onOpenCreator} style={styles.creatorRow}>
          <Text numberOfLines={1} style={styles.creator}>@{clip.creator.username || clip.creator.name || 'synaura'}</Text>
        </Pressable>
        {clip.caption ? <Text numberOfLines={2} style={styles.caption}>{clip.caption}</Text> : null}
        {clip.tags.length ? (
          <View style={styles.tags}>
            {clip.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}
          </View>
        ) : null}

        {/* Son original : bandeau sombre compact, cohérent avec le reste du Scroll */}
        <View style={styles.musicCard}>
          {track.coverUrl ? <SynauraImage source={{ uri: track.coverUrl }} lowPriority={!isActive} style={styles.cover} /> : <View style={styles.cover} />}
          <Pressable accessibilityLabel="Voir le morceau" onPress={onOpenTrack} style={styles.trackCopy}>
            <Text style={styles.kicker}>SON ORIGINAL</Text>
            <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.trackArtist}>{artist}</Text>
          </Pressable>
          <Pressable accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'} onPress={onPressAudio} style={styles.playButton}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color="#171313" style={!isPlaying ? { marginLeft: 2 } : null} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative', backgroundColor: colors.black },
  pressArea: { flex: 1 },
  hiddenAudio: { position: 'absolute', width: 1, height: 1, left: 0, bottom: 0, opacity: 0.01 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,10,14,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  topBadges: {
    position: 'absolute',
    left: 16,
    right: 82,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  clipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(74,158,170,0.28)',
  },
  clipBadgeText: { color: '#8fd3dc', fontSize: 10, fontWeight: '900' },
  videoStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(217,109,99,0.72)' },
  videoLoading: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(17,17,17,0.56)' },
  videoLoadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  videoStatusText: { color: '#FFFAF2', fontSize: 8, fontWeight: '900' },
  actionsColumn: {
    position: 'absolute',
    right: 9,
    alignItems: 'center',
    gap: 10,
  },
  actionsColumnCompact: { gap: 5 },
  profileCluster: { alignItems: 'center', justifyContent: 'center', width: 50, height: 60, marginBottom: 4 },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileInitial: { color: '#FFFAF2', fontSize: 16, fontWeight: '900' },
  followBubble: {
    position: 'absolute',
    bottom: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D96D63',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0E0A0D',
  },
  followBubbleDone: { backgroundColor: '#7357C6' },
  actionButton: { width: 48, alignItems: 'center', gap: 3 },
  actionButtonCompact: { width: 42, gap: 2 },
  actionButtonDisabled: { opacity: 0.38 },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,12,14,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  actionCircleCompact: { width: 36, height: 36, borderRadius: 18 },
  actionLabel: {
    maxWidth: 50,
    color: 'rgba(255,250,242,0.74)',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
  metaPanel: {
    position: 'absolute',
    left: 18,
    right: 76,
  },
  metaPanelNarrow: { left: 12, right: 64 },
  creatorRow: { flexDirection: 'row', alignItems: 'center' },
  creator: { color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  caption: { marginTop: 7, color: 'rgba(255,250,242,0.92)', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  tags: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    overflow: 'hidden',
    paddingVertical: 2,
    color: '#8fd3dc',
    fontSize: 10,
    fontWeight: '900',
  },
  musicCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,250,242,0.25)',
  },
  cover: { width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(255,250,242,0.1)' },
  trackCopy: { flex: 1, minWidth: 0 },
  kicker: { color: '#8fd3dc', fontSize: 8, fontWeight: '900' },
  trackTitle: { marginTop: 2, color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  trackArtist: { marginTop: 1, color: 'rgba(255,250,242,0.6)', fontSize: 10, fontWeight: '800' },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF2',
  },
});
