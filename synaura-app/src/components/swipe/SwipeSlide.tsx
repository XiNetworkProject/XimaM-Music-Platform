import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Track } from '@/api/types';
import { fmtCount, trackArtistName } from './helpers';
import { WaveformSeekBar } from './WaveformSeekBar';
import { TrackCover } from '@/components/TrackCover';
import { usePlayerProgress } from '@/player/PlayerProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraImage } from '@/components/ui/SynauraImage';

const FONT_BLACK = Platform.select({ android: 'sans-serif-black', ios: 'System', default: 'System' });
const FONT_BOLD = Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' });

const SIGNAL = {
  background: '#09090B',
  paper: '#F7F6F3',
  violet: '#7357C6',
  violetSoft: '#A98BE8',
  cyan: '#4A9EAA',
  cyanSoft: '#72BBC5',
  coral: '#D96D63',
  coralSoft: '#F0AAA2',
  orange: '#F4A261',
};

type ActionLabel = 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save' | 'remix' | 'useSound' | 'more';

type Props = {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  isLoading?: boolean;
  isFavorite: boolean;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isFollowing: boolean;
  followLoading?: boolean;
  height: number;
  topPad: number;
  bottomPad: number;
  onDoubleTapLike: () => void;
  onPress: () => void;
  onAction: (action: ActionLabel) => void;
  onSeek: (seconds: number) => void;
  onCreateMoment: (seconds: number) => void;
  onToggleFollow: () => void;
  onOpenArtist: () => void;
};

function FlowAura({ variant }: { variant: 'primary' | 'secondary' }) {
  const suffix = variant === 'primary' ? 'Primary' : 'Secondary';
  const primary = variant === 'primary';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`flowViolet${suffix}`} cx={primary ? '8' : '42'} cy={primary ? '8' : '22'} rx="74" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.44 : 0.22} />
          <Stop offset="0.38" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.16 : 0.07} />
          <Stop offset="0.8" stopColor={SIGNAL.violet} stopOpacity="0.015" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`flowCoral${suffix}`} cx={primary ? '96' : '72'} cy={primary ? '20' : '42'} rx="70" ry="66" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.35 : 0.2} />
          <Stop offset="0.4" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.12 : 0.065} />
          <Stop offset="0.82" stopColor={SIGNAL.coral} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`flowCyan${suffix}`} cx={primary ? '52' : '18'} cy={primary ? '44' : '64'} rx="66" ry="58" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.24 : 0.18} />
          <Stop offset="0.42" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.08 : 0.055} />
          <Stop offset="0.84" stopColor={SIGNAL.cyan} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#flowViolet${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#flowCoral${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#flowCyan${suffix})`} />
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
  count?: number | string;
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
      {(typeof count === 'number' && count > 0) || (typeof count === 'string' && count) ? <Text numberOfLines={1} style={styles.actionLabel}>{typeof count === 'number' ? fmtCount(count) : count}</Text> : null}
    </Pressable>
  );
}

function FollowBubble({ isFollowing, loading, disabled, onPress }: { isFollowing: boolean; loading?: boolean; disabled?: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFollowing) return;
    ring.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.34, speed: 32, bounciness: 8, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [isFollowing, ring, scale]);

  const handlePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.72, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 8, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(rotation, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
    onPress();
  };

  return (
    <View style={styles.followBubbleWrap}>
      <Animated.View pointerEvents="none" style={[styles.followRing, { opacity: ring.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.8, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }] }]} />
      <Pressable accessibilityLabel={isFollowing ? 'Suivi' : "Suivre l'artiste"} disabled={disabled || loading} onPress={handlePress}>
        <Animated.View style={[styles.followBubble, isFollowing && styles.followBubbleDone, { transform: [{ scale }, { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }]}>
          <Ionicons name={loading ? 'ellipsis-horizontal' : isFollowing ? 'checkmark' : 'add'} size={14} color={isFollowing ? SIGNAL.paper : '#171313'} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export const SwipeSlide = memo(function SwipeSlide(props: Props) {
  const {
    track,
    isActive,
    isPlaying,
    isLoading,
    isLiked,
    likesCount,
    commentsCount,
    sharesCount,
    isFollowing,
    followLoading,
    height,
    topPad,
    bottomPad,
    onDoubleTapLike,
    onPress,
    onAction,
    onSeek,
    onCreateMoment,
    onToggleFollow,
    onOpenArtist,
  } = props;

  const isAi = !!track.isAI || track._id.startsWith('ai-');
  const genres = (track.genre || []).filter((genre) => Boolean(genre) && genre.length <= 20).slice(0, 1);
  const { settings } = useMobileSettings();
  const responsive = useResponsiveLayout();
  const playButtonOpacity = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;
  const slideReveal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const coverScale = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;
  const signalPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(playButtonOpacity, { toValue: isPlaying ? 0 : 1, duration: settings.reducedMotion ? 0 : 220, useNativeDriver: true }).start();
    Animated.timing(coverScale, { toValue: isPlaying ? 1.03 : 1, duration: settings.reducedMotion ? 0 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [coverScale, isPlaying, playButtonOpacity, settings.reducedMotion]);

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
      Animated.timing(auraOne, { toValue: 1, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const second = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(signalPulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(signalPulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    first.start();
    second.start();
    pulse.start();
    return () => { first.stop(); second.stop(); pulse.stop(); };
  }, [auraOne, auraTwo, isActive, settings.reducedMotion, signalPulse]);

  useEffect(() => {
    if (!isActive || !isPlaying || settings.reducedMotion) {
      breath.stopAnimation();
      Animated.timing(breath, { toValue: 0, duration: 420, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breath, isActive, isPlaying, settings.reducedMotion]);

  useEffect(() => {
    Animated.spring(slideReveal, { toValue: isActive ? 1 : 0, speed: 16, bounciness: isActive ? 5 : 0, useNativeDriver: true }).start();
  }, [isActive, slideReveal]);

  const coverGesture = useMemo(() => Gesture.Exclusive(
    Gesture.Tap().enabled(isActive).numberOfTaps(2).maxDelay(240).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onDoubleTapLike(); }),
    Gesture.Tap().enabled(isActive).numberOfTaps(1).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onPress(); }),
  ), [isActive, onDoubleTapLike, onPress]);

  const displayTitle = track.title;
  const displayArtist = trackArtistName(track);
  const lyricPreview = typeof track.lyrics === 'string' ? track.lyrics.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '' : '';

  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.92] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-12, 20] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.16] }) },
    ],
  };
  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.72] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [22, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [18, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1.03] }) },
    ],
  };

  return (
    <View style={[styles.page, { height }]}>
      <GestureDetector gesture={coverGesture}>
        <View accessible accessibilityRole="button" accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'} onAccessibilityTap={onPress} style={styles.pressArea}>
          <Animated.View style={[styles.coverShell, { transform: [{ scale: Animated.multiply(coverScale, breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] })) }] }]}>
            <View style={styles.cover}>
              <TrackCover track={track} active={isActive && isPlaying} autoPlayVideo={isActive && isPlaying} style={StyleSheet.absoluteFill} imageStyle={styles.coverImage} />
              <LinearGradient colors={['rgba(6,6,8,0.04)', 'rgba(6,6,8,0)', 'rgba(6,6,8,0.5)', 'rgba(6,6,8,0.98)']} locations={[0, 0.34, 0.72, 1]} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(6,6,8,0.58)', 'rgba(6,6,8,0.07)', 'rgba(6,6,8,0.01)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><FlowAura variant="primary" /></Animated.View>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><FlowAura variant="secondary" /></Animated.View>

              <View pointerEvents="none" style={styles.topEdge}>
                <LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
              </View>

              <Animated.View pointerEvents="none" style={[styles.playOverlay, { opacity: playButtonOpacity }]}>
                <Animated.View style={[styles.playPulseRing, { opacity: signalPulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0] }), transform: [{ scale: signalPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.65] }) }] }]} />
                <View style={styles.playCircle}>
                  <GlassOutline radius={99} opacity={0.3} />
                  {isLoading ? <Ionicons name="ellipsis-horizontal" size={31} color={SIGNAL.paper} /> : <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={SIGNAL.paper} style={!isPlaying ? { marginLeft: 5 } : null} />}
                </View>
              </Animated.View>

              <View style={[styles.topBadges, { top: topPad + (responsive.compactControls ? 54 : 63) }]}>
                <View style={[styles.badge, styles.signalBadge]}><View style={[styles.signalDot, isPlaying && styles.signalDotActive]} /><Text style={styles.signalBadgeText}>{isPlaying ? 'FLOW EN DIRECT' : 'FLOW SIGNAL'}</Text></View>
                {track.isBoosted ? <View style={[styles.badge, styles.boostBadge]}><Ionicons name="flash" size={11} color="#171313" /><Text style={[styles.badgeText, { color: '#171313' }]}>BOOST</Text></View> : null}
                {isAi ? <View style={[styles.badge, styles.aiBadge]}><Ionicons name="sparkles" size={11} color={SIGNAL.paper} /><Text style={styles.badgeText}>IA</Text></View> : null}
                {genres.map((g) => <View key={g} style={[styles.badge, styles.genreBadge]}><Text style={styles.badgeText}>{g.toUpperCase()}</Text></View>)}
              </View>
            </View>
          </Animated.View>
        </View>
      </GestureDetector>

      <Animated.View style={[styles.actionsColumn, responsive.compactControls && styles.actionsColumnCompact, { bottom: bottomPad + (responsive.compactControls ? 72 : 92), opacity: slideReveal, transform: [{ translateX: slideReveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
        {track.artist?.username ? (
          <View style={styles.profileCluster}>
            <Pressable accessibilityLabel="Ouvrir le profil artiste" onPress={onOpenArtist} style={styles.profileAvatar}>
              {track.artist.avatar ? <SynauraImage source={{ uri: track.artist.avatar }} lowPriority={!isActive} style={StyleSheet.absoluteFill} /> : <Text style={styles.profileInitial}>{(track.artist.name || track.artist.username || '?').slice(0, 1).toUpperCase()}</Text>}
              <GlassOutline radius={99} opacity={0.42} />
            </Pressable>
            <FollowBubble isFollowing={isFollowing} loading={followLoading} disabled={!track.artist.username} onPress={onToggleFollow} />
          </View>
        ) : null}
        <ActionButton icon="heart-outline" iconActive="heart" active={isLiked} count={likesCount} label="Like" highlightColor={SIGNAL.coral} onPress={() => onAction('like')} />
        <ActionButton icon="chatbubble-ellipses-outline" count={commentsCount} label="Commentaires" disabled={isAi} highlightColor={SIGNAL.cyanSoft} onPress={() => onAction('comment')} />
        <ActionButton icon="share-social-outline" count={sharesCount} label="Partager" highlightColor={SIGNAL.violetSoft} onPress={() => onAction('share')} />
        <ActionButton icon="ellipsis-horizontal" label="Plus d'actions" onPress={() => onAction('more')} />
      </Animated.View>

      <Animated.View style={[styles.metaPanel, responsive.isNarrow && styles.metaPanelNarrow, { bottom: bottomPad + (responsive.compactControls ? 8 : 14), opacity: slideReveal, transform: [{ translateY: slideReveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <LinearGradient colors={['rgba(12,11,15,0.72)', 'rgba(9,9,11,0.52)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <GlassOutline radius={22} opacity={0.22} />
        <View style={styles.metaAccent} />
        <View style={styles.metaTopRow}>
          <View style={styles.nowBadge}><View style={[styles.nowDot, isPlaying && styles.nowDotActive]} /><Text style={styles.nowText}>{isAi ? 'CRÉATION IA' : isPlaying ? 'EN LECTURE' : 'PRÊT À JOUER'}</Text></View>
          <Text style={styles.forYouLabel}>POUR TOI</Text>
        </View>
        {lyricPreview ? <Pressable accessibilityLabel="Voir les paroles" onPress={() => onAction('lyrics')} style={styles.lyricPreview}><Text numberOfLines={2} style={styles.lyricPreviewText}>« {lyricPreview} »</Text></Pressable> : null}
        <Text maxFontSizeMultiplier={1.12} numberOfLines={2} style={[styles.title, responsive.compactControls && styles.titleCompact]}>{displayTitle}</Text>
        <View style={styles.artistRow}>
          <Pressable accessibilityLabel="Ouvrir le profil artiste" disabled={!track.artist?.username} onPress={onOpenArtist} style={styles.artistNameButton}><Text numberOfLines={1} style={styles.artist}>@{displayArtist}</Text></Pressable>
          {track.artist?.username ? <Pressable accessibilityLabel={isFollowing ? 'Déjà suivi' : 'Suivre'} disabled={!track.artist.username || followLoading} onPress={onToggleFollow} style={[styles.inlineFollow, isFollowing && styles.inlineFollowDone]}><Text style={[styles.inlineFollowText, isFollowing && styles.inlineFollowTextDone]}>{isFollowing ? 'Suivi' : 'Suivre'}</Text></Pressable> : null}
        </View>
        <View style={styles.statsRow}>
          {track.plays ? <View style={styles.statPill}><Ionicons name="headset-outline" size={12} color="rgba(255,255,255,0.72)" /><Text style={styles.statText}>{fmtCount(track.plays)} écoutes</Text></View> : null}
          {Number(track.variationsCount || 0) > 0 ? <View style={[styles.statPill, styles.variationPill]}><Ionicons name="git-branch-outline" size={12} color="#DCCEFF" /><Text style={[styles.statText, { color: '#DCCEFF' }]}>{fmtCount(Number(track.variationsCount || 0))} variations</Text></View> : null}
        </View>
        {track.remixAttribution ? <Text numberOfLines={1} style={styles.remixAttribution}>Inspiré de {track.remixAttribution.title}</Text> : null}
        <View style={styles.utilityRow}>
          {track.lyrics ? <Pressable accessibilityLabel="Voir les paroles" onPress={() => onAction('lyrics')} style={styles.utilityButton}><Ionicons name="document-text-outline" size={13} color="rgba(255,255,255,0.84)" /><Text style={styles.utilityText}>Paroles</Text></Pressable> : null}
          <Pressable accessibilityLabel="Ajouter à la file" onPress={() => onAction('queue')} style={styles.utilityButton}><Ionicons name="list-outline" size={13} color="rgba(255,255,255,0.84)" /><Text style={styles.utilityText}>File</Text></Pressable>
        </View>
        <View style={styles.seekWrap}>{isActive ? <ActiveSeekBar track={track} onSeek={onSeek} onCreateMoment={onCreateMoment} /> : <View style={styles.seekPlaceholder} />}</View>
      </Animated.View>
    </View>
  );
});

function ActiveSeekBar({ track, onSeek, onCreateMoment }: { track: Track; onSeek: (seconds: number) => void; onCreateMoment: (seconds: number) => void }) {
  const responsive = useResponsiveLayout();
  const progress = usePlayerProgress(120);
  const isAi = !!track.isAI || track._id.startsWith('ai-');
  return <WaveformSeekBar trackId={track._id} position={progress.positionSec} duration={progress.durationSec || track.duration || 0} onSeek={onSeek} onCreateMoment={onCreateMoment} showMoments={!isAi} height={responsive.compactControls ? 34 : 40} barCount={responsive.isNarrow ? 52 : 68} />;
}

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative', backgroundColor: SIGNAL.background, overflow: 'hidden' },
  pressArea: { flex: 1 },
  coverShell: { flex: 1 },
  cover: { flex: 1, overflow: 'hidden', backgroundColor: '#171313' },
  coverImage: {},
  topEdge: { position: 'absolute', zIndex: 8, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.9 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playPulseRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  playCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  topBadges: { position: 'absolute', zIndex: 10, left: 14, right: 76, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 13, borderWidth: 1 },
  badgeText: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  signalBadge: { backgroundColor: 'rgba(9,9,11,0.48)', borderColor: 'rgba(255,255,255,0.24)' },
  signalBadgeText: { color: 'rgba(255,255,255,0.9)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.85 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.38)' },
  signalDotActive: { backgroundColor: SIGNAL.cyanSoft, shadowColor: SIGNAL.cyanSoft, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  boostBadge: { backgroundColor: SIGNAL.paper, borderColor: 'rgba(255,255,255,0.74)' },
  aiBadge: { backgroundColor: 'rgba(115,87,198,0.7)', borderColor: 'rgba(169,139,232,0.56)' },
  genreBadge: { backgroundColor: 'rgba(0,0,0,0.34)', borderColor: 'rgba(255,255,255,0.22)' },
  actionsColumn: { position: 'absolute', zIndex: 14, right: 9, alignItems: 'center', gap: 9 },
  actionsColumnCompact: { gap: 5 },
  profileCluster: { alignItems: 'center', justifyContent: 'center', width: 50, height: 60, marginBottom: 4 },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  profileInitial: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 16, fontWeight: '900' },
  followBubbleWrap: { position: 'absolute', bottom: -10, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  followRing: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: SIGNAL.paper },
  followBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: SIGNAL.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0E0A0D' },
  followBubbleDone: { backgroundColor: SIGNAL.violet },
  actionButton: { width: 48, alignItems: 'center', gap: 3 },
  actionButtonCompact: { width: 42, gap: 2 },
  actionButtonDisabled: { opacity: 0.38 },
  actionCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  actionCircleCompact: { width: 37, height: 37, borderRadius: 19 },
  actionLabel: { maxWidth: 50, color: 'rgba(255,255,255,0.76)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', textAlign: 'center' },
  metaPanel: { position: 'absolute', zIndex: 13, left: 14, right: 70, overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, backgroundColor: 'rgba(9,9,11,0.52)', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 6 },
  metaPanelNarrow: { left: 10, right: 60, paddingHorizontal: 12 },
  metaAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 2, borderRadius: 1, backgroundColor: SIGNAL.cyanSoft },
  metaTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nowBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.36)' },
  nowDotActive: { backgroundColor: SIGNAL.cyanSoft, shadowColor: SIGNAL.cyanSoft, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },
  nowText: { color: 'rgba(255,255,255,0.78)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  forYouLabel: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  lyricPreview: { alignSelf: 'flex-start', maxWidth: '95%', marginTop: 7, borderLeftWidth: 2, borderLeftColor: SIGNAL.cyanSoft, paddingLeft: 9, paddingVertical: 3 },
  lyricPreviewText: { color: 'rgba(247,246,243,0.8)', fontFamily: FONT_BOLD, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  title: { marginTop: 7, color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 28, lineHeight: 28, fontWeight: '900', letterSpacing: 0, textShadowColor: 'rgba(0,0,0,0.42)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },
  titleCompact: { marginTop: 5, fontSize: 23, lineHeight: 24, letterSpacing: 0 },
  artistRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  artistNameButton: { maxWidth: '72%' },
  artist: { color: 'rgba(255,255,255,0.86)', fontFamily: FONT_BLACK, fontSize: 12, fontWeight: '900' },
  inlineFollow: { paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.66)' },
  inlineFollowDone: { borderBottomColor: 'rgba(255,255,255,0.24)' },
  inlineFollowText: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 9, fontWeight: '900' },
  inlineFollowTextDone: { color: 'rgba(255,255,255,0.62)' },
  statsRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statPill: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.055)', paddingHorizontal: 8 },
  variationPill: { borderColor: 'rgba(169,139,232,0.34)', backgroundColor: 'rgba(115,87,198,0.14)' },
  statText: { color: 'rgba(255,255,255,0.66)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900' },
  remixAttribution: { marginTop: 6, color: '#DCCEFF', fontFamily: FONT_BOLD, fontSize: 9, fontWeight: '700' },
  utilityRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  utilityButton: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.045)', paddingHorizontal: 9 },
  utilityText: { color: 'rgba(255,255,255,0.82)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  seekWrap: { marginTop: 8, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(0,0,0,0.14)', paddingHorizontal: 8, paddingTop: 3, paddingBottom: 1 },
  seekPlaceholder: { height: 55 },
});

export default SwipeSlide;
