import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { MusicClip } from '@/api/types';
import { canUseSoundClientSide } from '@/api/types';
import { fmtCount, trackArtistName } from './helpers';
import { useAuth } from '@/auth/AuthProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraImage } from '@/components/ui/SynauraImage';

const FONT_BLACK = Platform.select({ android: 'sans-serif-black', ios: 'System', default: 'System' });
const FONT_BOLD = Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' });

const SIGNAL = {
  black: '#09090B',
  paper: '#F7F6F3',
  violet: '#7357C6',
  violetSoft: '#A98BE8',
  cyan: '#4A9EAA',
  cyanSoft: '#72BBC5',
  coral: '#D96D63',
  coralSoft: '#F0AAA2',
};

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

function ClipAura({ variant }: { variant: 'primary' | 'secondary' }) {
  const primary = variant === 'primary';
  const suffix = primary ? 'ClipPrimary' : 'ClipSecondary';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`clipCyan${suffix}`} cx={primary ? '8' : '52'} cy={primary ? '12' : '42'} rx="74" ry="66" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.42 : 0.22} />
          <Stop offset="0.4" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.14 : 0.065} />
          <Stop offset="0.82" stopColor={SIGNAL.cyan} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`clipViolet${suffix}`} cx={primary ? '92' : '28'} cy={primary ? '8' : '66'} rx="72" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.36 : 0.2} />
          <Stop offset="0.4" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.12 : 0.055} />
          <Stop offset="0.84" stopColor={SIGNAL.violet} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`clipCoral${suffix}`} cx={primary ? '70' : '96'} cy={primary ? '72' : '34'} rx="62" ry="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.19 : 0.14} />
          <Stop offset="0.45" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.06 : 0.04} />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#clipCyan${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#clipViolet${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#clipCoral${suffix})`} />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

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
      <Animated.View style={[styles.actionCircle, responsive.compactControls && styles.actionCircleCompact, active && { backgroundColor: `${highlightColor || SIGNAL.coral}28`, borderColor: `${highlightColor || SIGNAL.coral}88` }, { transform: [{ scale }] }]}>
        <GlassOutline radius={99} opacity={active ? 0.28 : 0.22} />
        <Ionicons name={(active && iconActive ? iconActive : icon) as any} size={responsive.compactControls ? 19 : 22} color={active ? highlightColor || SIGNAL.coral : SIGNAL.paper} />
      </Animated.View>
      {typeof count === 'number' && count > 0 ? <Text numberOfLines={1} style={styles.actionLabel}>{fmtCount(count)}</Text> : null}
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
  const canUseSound = canUseSoundClientSide({ isOwner: isOwnTrack, allowClips: Boolean(track.allowClips), remixVisibility: track.remixVisibility || 'disabled' });

  const playButtonOpacity = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;
  const reveal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;
  const signalPulse = useRef(new Animated.Value(0)).current;
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
    Animated.spring(reveal, { toValue: isActive ? 1 : 0, speed: 16, bounciness: isActive ? 5 : 0, useNativeDriver: true }).start();
  }, [isActive, reveal]);

  useEffect(() => {
    if (!isActive || settings.reducedMotion) {
      auraOne.stopAnimation();
      auraTwo.stopAnimation();
      signalPulse.stopAnimation();
      auraOne.setValue(0.5);
      auraTwo.setValue(0.5);
      signalPulse.setValue(0);
      return;
    }
    const first = Animated.loop(Animated.sequence([
      Animated.timing(auraOne, { toValue: 1, duration: 6_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const second = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8_500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8_500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(signalPulse, { toValue: 1, duration: 1_650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(signalPulse, { toValue: 0, duration: 1_650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    first.start(); second.start(); pulse.start();
    return () => { first.stop(); second.stop(); pulse.stop(); };
  }, [auraOne, auraTwo, isActive, settings.reducedMotion, signalPulse]);

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

  const mediaGesture = React.useMemo(() => Gesture.Exclusive(
    Gesture.Tap().enabled(isActive).numberOfTaps(2).maxDelay(240).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onDoubleTapLike(); }),
    Gesture.Tap().enabled(isActive).numberOfTaps(1).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onPressAudio(); }),
  ), [isActive, onDoubleTapLike, onPressAudio]);

  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.84] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.15] }) },
    ],
  };
  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.64] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [18, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1.03] }) },
    ],
  };

  return (
    <View style={[styles.page, { height }]}>
      <GestureDetector gesture={mediaGesture}>
        <View accessible accessibilityRole="button" accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'} onAccessibilityTap={onPressAudio} style={styles.pressArea}>
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
              onProgress={(event) => { videoTimeRef.current = Number(event.currentTime || 0); }}
              onEnd={() => {
                if (!isActive || !isPlaying || playbackEndedRef.current) return;
                if (track.audioUrl && !audioFailed) return;
                playbackEndedRef.current = true;
                audioRef.current?.seek(clipStart);
                videoRef.current?.seek(0);
                onPlaybackEnd();
              }}
              onBuffer={(event) => setVideoBuffering(Boolean(event.isBuffering))}
              onError={() => { setVideoBuffering(false); setVideoFailed(true); }}
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
              onLoad={() => { setAudioReady(true); setAudioBuffering(false); audioTimeRef.current = clipStart; audioRef.current?.seek(clipStart); }}
              onProgress={(event) => {
                const currentTime = Number(event.currentTime || 0);
                audioTimeRef.current = currentTime;
                const relative = Math.max(0, currentTime - clipStart);
                if (isActive && videoReady && Math.abs(videoTimeRef.current - relative) > 0.5) videoRef.current?.seek(Math.min(relative, Math.max(0, videoDurationRef.current - 0.05)));
                if (!isActive || !isPlaying || playbackEndedRef.current || currentTime < clipEnd - 0.12) return;
                playbackEndedRef.current = true;
                audioRef.current?.seek(clipStart);
                videoRef.current?.seek(0);
                onPlaybackEnd();
              }}
              onBuffer={(event) => setAudioBuffering(Boolean(event.isBuffering))}
              onEnd={() => { if (playbackEndedRef.current) return; playbackEndedRef.current = true; audioRef.current?.seek(clipStart); videoRef.current?.seek(0); onPlaybackEnd(); }}
              onError={() => { setAudioBuffering(false); setAudioFailed(true); }}
              style={styles.hiddenAudio}
            />
          ) : null}

          <LinearGradient colors={['rgba(6,6,8,0.16)', 'rgba(6,6,8,0)', 'rgba(6,6,8,0.56)', 'rgba(6,6,8,0.98)']} locations={[0, 0.34, 0.73, 1]} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><ClipAura variant="primary" /></Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><ClipAura variant="secondary" /></Animated.View>
          <View pointerEvents="none" style={styles.topEdge}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>

          <Animated.View pointerEvents="none" style={[styles.playOverlay, { opacity: playButtonOpacity }]}>
            <Animated.View style={[styles.playPulse, { opacity: signalPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: signalPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.62] }) }] }]} />
            <View style={styles.playCircle}><GlassOutline radius={99} opacity={0.3} /><Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={SIGNAL.paper} style={!isPlaying ? { marginLeft: 5 } : null} /></View>
          </Animated.View>

          <View style={[styles.topBadges, { top: topPad + (responsive.compactControls ? 54 : 63) }]}>
            <View style={styles.clipBadge}><View style={[styles.signalDot, isPlaying && styles.signalDotActive]} /><Ionicons name="film-outline" size={11} color="#A8DEE5" /><Text style={styles.clipBadgeText}>CLIP DU FLOW</Text></View>
            {videoFailed ? <View style={styles.videoStatus}><Ionicons name="cloud-offline-outline" size={11} color={SIGNAL.paper} /><Text style={styles.videoStatusText}>VIDÉO INDISPONIBLE</Text></View> : isActive && (videoBuffering || (!audioFailed && (!audioReady || audioBuffering))) ? <View style={styles.videoLoading}><View style={styles.videoLoadingDot} /><Text style={styles.videoStatusText}>CHARGEMENT</Text></View> : null}
          </View>
        </View>
      </GestureDetector>

      <Animated.View style={[styles.actionsColumn, responsive.compactControls && styles.actionsColumnCompact, { bottom: bottomPad + (responsive.compactControls ? 72 : 92), opacity: reveal, transform: [{ translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
        {clip.creator?.username ? (
          <View style={styles.profileCluster}>
            <Pressable accessibilityLabel="Ouvrir le profil du créateur" onPress={onOpenCreator} style={styles.profileAvatar}>
              {clip.creator.avatar ? <SynauraImage source={{ uri: clip.creator.avatar }} lowPriority={!isActive} style={StyleSheet.absoluteFill} /> : <Text style={styles.profileInitial}>{(clip.creator.name || clip.creator.username || '?').slice(0, 1).toUpperCase()}</Text>}
              <GlassOutline radius={99} opacity={0.44} />
            </Pressable>
            <Pressable accessibilityLabel={isFollowingCreator ? 'Suivi' : 'Suivre le créateur'} disabled={followLoading} onPress={onToggleFollowCreator} style={[styles.followBubble, isFollowingCreator && styles.followBubbleDone]}><Ionicons name={followLoading ? 'ellipsis-horizontal' : isFollowingCreator ? 'checkmark' : 'add'} size={14} color={SIGNAL.paper} /></Pressable>
          </View>
        ) : null}
        <ActionButton icon="heart-outline" iconActive="heart" active={isLiked} count={likesCount} label="Like" highlightColor={SIGNAL.coral} onPress={onToggleLike} />
        <ActionButton icon="chatbubble-ellipses-outline" count={commentsCount} label="Commentaires" highlightColor={SIGNAL.cyanSoft} onPress={onOpenComments} />
        <ActionButton icon="share-social-outline" label="Partager" highlightColor={SIGNAL.violetSoft} onPress={onShare} />
        {canUseSound ? <ActionButton icon="film-outline" label={isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'} onPress={onUseSound} /> : null}
      </Animated.View>

      <Animated.View style={[styles.metaPanel, responsive.isNarrow && styles.metaPanelNarrow, { bottom: bottomPad + (responsive.compactControls ? 8 : 14), opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <LinearGradient colors={['rgba(12,11,15,0.76)', 'rgba(9,9,11,0.56)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <GlassOutline radius={22} opacity={0.23} />
        <View style={styles.metaAccent} />
        <Pressable accessibilityLabel="Ouvrir le profil du créateur" onPress={onOpenCreator} style={styles.creatorRow}><View style={styles.creatorDot} /><Text numberOfLines={1} style={styles.creator}>@{clip.creator.username || clip.creator.name || 'synaura'}</Text><Text style={styles.clipSignal}>CLIP</Text></Pressable>
        {clip.caption ? <Text numberOfLines={2} style={styles.caption}>{clip.caption}</Text> : null}
        {clip.tags.length ? <View style={styles.tags}>{clip.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}

        <View style={styles.musicCard}>
          <LinearGradient colors={['rgba(74,158,170,0.15)', 'rgba(115,87,198,0.1)', 'rgba(255,255,255,0.035)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <GlassOutline radius={17} opacity={0.2} />
          {track.coverUrl ? <SynauraImage source={{ uri: track.coverUrl }} lowPriority={!isActive} style={styles.cover} /> : <View style={styles.cover} />}
          <Pressable accessibilityLabel="Voir le morceau" onPress={onOpenTrack} style={styles.trackCopy}><Text style={styles.kicker}>SON ORIGINAL</Text><Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.trackArtist}>{artist}</Text></Pressable>
          <Pressable accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'} onPress={onPressAudio} style={styles.playButton}><Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color="#171313" style={!isPlaying ? { marginLeft: 2 } : null} /></Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: SIGNAL.black },
  pressArea: { flex: 1 },
  hiddenAudio: { position: 'absolute', width: 1, height: 1, left: 0, bottom: 0, opacity: 0.01 },
  topEdge: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.92 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playPulse: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  playCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  topBadges: { position: 'absolute', zIndex: 10, left: 14, right: 82, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  clipBadge: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(74,158,170,0.2)', borderWidth: 1, borderColor: 'rgba(114,187,197,0.42)' },
  clipBadgeText: { color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.38)' },
  signalDotActive: { backgroundColor: SIGNAL.cyanSoft, shadowColor: SIGNAL.cyanSoft, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  videoStatus: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(217,109,99,0.62)', borderWidth: 1, borderColor: 'rgba(240,170,162,0.48)' },
  videoLoading: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(9,9,11,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  videoLoadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SIGNAL.cyanSoft },
  videoStatusText: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.65 },
  actionsColumn: { position: 'absolute', zIndex: 14, right: 9, alignItems: 'center', gap: 9 },
  actionsColumnCompact: { gap: 5 },
  profileCluster: { alignItems: 'center', justifyContent: 'center', width: 50, height: 60, marginBottom: 4 },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  profileInitial: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 16, fontWeight: '900' },
  followBubble: { position: 'absolute', bottom: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: SIGNAL.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0E0A0D' },
  followBubbleDone: { backgroundColor: SIGNAL.violet },
  actionButton: { width: 48, alignItems: 'center', gap: 3 },
  actionButtonCompact: { width: 42, gap: 2 },
  actionButtonDisabled: { opacity: 0.38 },
  actionCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  actionCircleCompact: { width: 37, height: 37, borderRadius: 19 },
  actionLabel: { maxWidth: 50, color: 'rgba(255,255,255,0.76)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', textAlign: 'center' },
  metaPanel: { position: 'absolute', zIndex: 13, left: 14, right: 70, overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.21)', backgroundColor: 'rgba(9,9,11,0.56)', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 11, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 6 },
  metaPanelNarrow: { left: 10, right: 60, paddingHorizontal: 12 },
  metaAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 2.5, borderRadius: 2, backgroundColor: SIGNAL.cyanSoft },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  creatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SIGNAL.coralSoft, shadowColor: SIGNAL.coralSoft, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2 },
  creator: { flex: 1, minWidth: 0, color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 13, fontWeight: '900' },
  clipSignal: { color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  caption: { marginTop: 7, color: 'rgba(255,255,255,0.93)', fontFamily: FONT_BOLD, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  tags: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { overflow: 'hidden', color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 9, fontWeight: '900' },
  musicCard: { marginTop: 11, minHeight: 64, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 9 },
  cover: { width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  trackCopy: { flex: 1, minWidth: 0 },
  kicker: { color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.75 },
  trackTitle: { marginTop: 2, color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 13, fontWeight: '900' },
  trackArtist: { marginTop: 1, color: 'rgba(255,255,255,0.62)', fontFamily: FONT_BOLD, fontSize: 9.5, fontWeight: '700' },
  playButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: SIGNAL.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#000', shadowOpacity: 0.26, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
});

export default ClipSlide;
