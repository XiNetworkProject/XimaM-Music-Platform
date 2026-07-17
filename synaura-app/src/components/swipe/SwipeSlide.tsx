import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Track } from '@/api/types';
import { fmtCount, trackArtistName } from './helpers';
import { WaveformSeekBar } from './WaveformSeekBar';
import { TrackCover } from '@/components/TrackCover';
import { usePlayerProgress } from '@/player/PlayerProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

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
      {(typeof count === 'number' && count > 0) || (typeof count === 'string' && count) ? (
        <Text numberOfLines={1} style={styles.actionLabel}>
          {typeof count === 'number' ? fmtCount(count) : count}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FollowBubble({
  isFollowing,
  loading,
  disabled,
  onPress,
}: {
  isFollowing: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
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
      Animated.timing(ring, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
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
      <Animated.View
        pointerEvents="none"
        style={[
          styles.followRing,
          {
            opacity: ring.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.8, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }],
          },
        ]}
      />
      <Pressable
        accessibilityLabel={isFollowing ? "Suivi" : "Suivre l'artiste"}
        disabled={disabled || loading}
        onPress={handlePress}
      >
        <Animated.View
          style={[
            styles.followBubble,
            isFollowing && styles.followBubbleDone,
            {
              transform: [
                { scale },
                { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
              ],
            },
          ]}
        >
          <Ionicons
            name={loading ? 'ellipsis-horizontal' : isFollowing ? 'checkmark' : 'add'}
            size={14}
            color={isFollowing ? '#FFFAF2' : '#171313'}
          />
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
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playButtonOpacity = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;
  const slideReveal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const coverScale = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(playButtonOpacity, { toValue: isPlaying ? 0 : 1, duration: settings.reducedMotion ? 0 : 220, useNativeDriver: true }).start();
    Animated.timing(coverScale, {
      toValue: isPlaying ? 1.03 : 1,
      duration: settings.reducedMotion ? 0 : 900,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [coverScale, isPlaying, playButtonOpacity, settings.reducedMotion]);

  // Respiration douce de la cover pendant la lecture.
  useEffect(() => {
    if (!isActive || !isPlaying || settings.reducedMotion) {
      breath.stopAnimation();
      Animated.timing(breath, { toValue: 0, duration: 420, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breath, isActive, isPlaying, settings.reducedMotion]);

  useEffect(() => {
    if (!isActive && tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      lastTapRef.current = 0;
    }
    Animated.spring(slideReveal, {
      toValue: isActive ? 1 : 0,
      speed: 16,
      bounciness: isActive ? 7 : 0,
      useNativeDriver: true,
    }).start();
  }, [isActive, slideReveal]);

  useEffect(() => () => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
  }, []);

  const handleTap = () => {
    if (!isActive) return;
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      lastTapRef.current = 0;
      onDoubleTapLike();
      return;
    }
    lastTapRef.current = now;
    tapTimerRef.current = setTimeout(() => {
      if (lastTapRef.current === now) onPress();
      tapTimerRef.current = null;
    }, 270);
  };

  const displayTitle = track.title;
  const displayArtist = trackArtistName(track);
  const lyricPreview = typeof track.lyrics === 'string'
    ? track.lyrics.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || ''
    : '';

  return (
    <View style={[styles.page, { height }]}>
      <Pressable accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'} onPress={handleTap} style={styles.pressArea}>
        <Animated.View
          style={[
            styles.coverShell,
            {
              transform: [
                { scale: Animated.multiply(coverScale, breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] })) },
              ],
            },
          ]}
        >
          <View style={styles.cover}>
            <TrackCover
              track={track}
              active={isActive && isPlaying}
              autoPlayVideo={isActive && isPlaying}
              style={StyleSheet.absoluteFill}
              imageStyle={styles.coverImage}
            />
            <LinearGradient
              colors={['rgba(10,8,8,0.08)', 'rgba(10,8,8,0.0)', 'rgba(10,8,8,0.56)', 'rgba(10,8,8,0.98)']}
              locations={[0, 0.34, 0.73, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.playOverlay, { opacity: playButtonOpacity }]}
            >
              <View style={styles.playCircle}>
                {isLoading ? (
                  <Ionicons name="ellipsis-horizontal" size={34} color="#FFFAF2" />
                ) : (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#FFFAF2" style={!isPlaying ? { marginLeft: 5 } : null} />
                )}
              </View>
            </Animated.View>

            <View style={[styles.topBadges, { top: topPad + (responsive.compactControls ? 50 : 58) }]}>
              {track.isBoosted ? (
                <View style={[styles.badge, { backgroundColor: '#FFFAF2' }]}>
                  <Ionicons name="flash" size={11} color="#171313" />
                  <Text style={[styles.badgeText, { color: '#171313' }]}>BOOST</Text>
                </View>
              ) : null}
              {isAi ? (
                <View style={[styles.badge, { backgroundColor: 'rgba(124,92,255,0.92)' }]}>
                  <Ionicons name="sparkles" size={11} color="#FFFAF2" />
                  <Text style={styles.badgeText}>IA</Text>
                </View>
              ) : null}
              {genres.map((g) => (
                <View key={g} style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={styles.badgeText}>{g.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.actionsColumn,
          responsive.compactControls && styles.actionsColumnCompact,
          {
            bottom: bottomPad + (responsive.compactControls ? 72 : 92),
            opacity: slideReveal,
            transform: [{ translateX: slideReveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
      >
        {track.artist?.username ? (
          <View style={styles.profileCluster}>
            <Pressable accessibilityLabel="Ouvrir le profil artiste" onPress={onOpenArtist} style={styles.profileAvatar}>
              {track.artist.avatar ? (
                <ImageBackground source={{ uri: track.artist.avatar }} style={StyleSheet.absoluteFill} />
              ) : (
                <Text style={styles.profileInitial}>
                  {(track.artist.name || track.artist.username || '?').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </Pressable>
            <FollowBubble
              isFollowing={isFollowing}
              loading={followLoading}
              disabled={!track.artist.username}
              onPress={onToggleFollow}
            />
          </View>
        ) : null}

        <ActionButton
          icon="heart-outline"
          iconActive="heart"
          active={isLiked}
          count={likesCount}
          label="Like"
          highlightColor="#D96D63"
          onPress={() => onAction('like')}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          count={commentsCount}
          label="Commentaires"
          disabled={isAi}
          onPress={() => onAction('comment')}
        />
        <ActionButton
          icon="share-social-outline"
          count={sharesCount}
          label="Partager"
          onPress={() => onAction('share')}
        />
        <ActionButton
          icon="ellipsis-horizontal"
          label="Plus d'actions"
          onPress={() => onAction('more')}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.metaPanel,
          responsive.isNarrow && styles.metaPanelNarrow,
          {
            bottom: bottomPad + (responsive.compactControls ? 8 : 14),
            opacity: slideReveal,
            transform: [{ translateY: slideReveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}
      >
        <View style={styles.metaTopRow}>
          <View style={styles.nowBadge}>
            <View style={[styles.nowDot, isPlaying && styles.nowDotActive]} />
            <Text style={styles.nowText}>{isAi ? 'CRÉATION IA' : isPlaying ? 'EN LECTURE' : 'EN PAUSE'}</Text>
          </View>
        </View>
        {lyricPreview ? (
          <Pressable accessibilityLabel="Voir les paroles" onPress={() => onAction('lyrics')} style={styles.lyricPreview}>
            <Text numberOfLines={2} style={styles.lyricPreviewText}>« {lyricPreview} »</Text>
          </Pressable>
        ) : null}
        <Text maxFontSizeMultiplier={1.15} numberOfLines={2} style={[styles.title, responsive.compactControls && styles.titleCompact]}>{displayTitle}</Text>
        <View style={styles.artistRow}>
          <Pressable accessibilityLabel="Ouvrir le profil artiste" disabled={!track.artist?.username} onPress={onOpenArtist} style={styles.artistNameButton}>
            <Text numberOfLines={1} style={styles.artist}>@{displayArtist}</Text>
          </Pressable>
          {track.artist?.username ? (
            <Pressable
              accessibilityLabel={isFollowing ? 'Deja suivi' : 'Suivre'}
              disabled={!track.artist.username || followLoading}
              onPress={onToggleFollow}
              style={[styles.inlineFollow, isFollowing && styles.inlineFollowDone]}
            >
              <Text style={[styles.inlineFollowText, isFollowing && styles.inlineFollowTextDone]}>
                {isFollowing ? 'Suivi' : 'Suivre'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {track.plays ? (
          <Text style={styles.plays}>{fmtCount(track.plays)} ecoutes</Text>
        ) : null}
        {track.remixAttribution ? (
          <Text numberOfLines={1} style={styles.remixAttribution}>Inspiré de {track.remixAttribution.title}</Text>
        ) : null}
        {Number(track.variationsCount || 0) > 0 ? (
          <Text style={styles.remixAttribution}>{fmtCount(Number(track.variationsCount || 0))} Variations</Text>
        ) : null}
        {track.lyrics ? (
          <Pressable accessibilityLabel="Voir les paroles" onPress={() => onAction('lyrics')} style={styles.lyricsButton}>
            <Ionicons name="document-text-outline" size={13} color="rgba(255,250,242,0.82)" />
            <Text style={styles.lyricsText}>Paroles</Text>
          </Pressable>
        ) : null}
        <View style={styles.seekWrap}>
          {isActive ? <ActiveSeekBar track={track} onSeek={onSeek} onCreateMoment={onCreateMoment} /> : <View style={styles.seekPlaceholder} />}
        </View>
      </Animated.View>

    </View>
  );
});

// Waveform réelle (cache serveur) avec marqueurs de moments quand elle existe ;
// barre de progression classique sinon. Montée uniquement sur la slide active
// pour ne pas multiplier les requêtes pendant le scroll.
function ActiveSeekBar({ track, onSeek, onCreateMoment }: { track: Track; onSeek: (seconds: number) => void; onCreateMoment: (seconds: number) => void }) {
  const responsive = useResponsiveLayout();
  const progress = usePlayerProgress(120);
  const isAi = !!track.isAI || track._id.startsWith('ai-');
  return (
    <WaveformSeekBar
      trackId={track._id}
      position={progress.positionSec}
      duration={progress.durationSec || track.duration || 0}
      onSeek={onSeek}
      onCreateMoment={onCreateMoment}
      showMoments={!isAi}
      height={responsive.compactControls ? 36 : 42}
      barCount={responsive.isNarrow ? 52 : 68}
    />
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative' },
  pressArea: { flex: 1 },
  coverShell: { flex: 1 },
  cover: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#171313',
  },
  coverImage: {},
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
  actionsColumn: {
    position: 'absolute',
    right: 9,
    alignItems: 'center',
    gap: 9,
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
  followBubbleWrap: {
    position: 'absolute',
    bottom: -10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFAF2',
  },
  followBubble: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,13,13,0.38)',
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
  metaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,250,242,0.36)' },
  nowDotActive: { backgroundColor: '#22C55E' },
  nowText: { color: 'rgba(255,250,242,0.76)', fontSize: 8, fontWeight: '900' },
  lyricPreview: { alignSelf: 'flex-start', maxWidth: '95%', marginTop: 7, borderLeftWidth: 2, borderLeftColor: '#4A9EAA', paddingLeft: 9, paddingVertical: 3 },
  lyricPreviewText: { color: 'rgba(247,246,243,0.78)', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  title: { marginTop: 8, color: '#FFFAF2', fontSize: 27, lineHeight: 31, fontWeight: '900' },
  titleCompact: { marginTop: 5, fontSize: 23, lineHeight: 27 },
  artistRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  artistNameButton: { maxWidth: '72%' },
  artist: { color: 'rgba(255,250,242,0.86)', fontSize: 13, fontWeight: '900' },
  inlineFollow: {
    paddingHorizontal: 0,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,250,242,0.66)',
  },
  inlineFollowDone: { borderBottomColor: 'rgba(255,250,242,0.24)' },
  inlineFollowText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
  inlineFollowTextDone: { color: 'rgba(255,250,242,0.62)' },
  plays: { marginTop: 6, color: 'rgba(255,250,242,0.5)', fontSize: 11, fontWeight: '700' },
  remixAttribution: { marginTop: 5, color: '#C7B8FF', fontSize: 11, fontWeight: '900' },
  lyricsButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,250,242,0.34)',
    paddingHorizontal: 0,
  },
  lyricsText: { color: 'rgba(255,250,242,0.82)', fontSize: 10, fontWeight: '800' },
  seekWrap: { marginTop: 12 },
  // Même hauteur que la WaveformSeekBar active (34 + ligne des temps) pour
  // éviter tout saut de layout quand la slide devient active.
  seekPlaceholder: { height: 61 },
});

export default SwipeSlide;
