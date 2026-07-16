import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { trackArtistName } from '@/components/swipe/helpers';
import { TrackCover } from '@/components/TrackCover';
import { MotionPressable } from '@/components/motion/Motion';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type Props = {
  activeRoute?: string;
  onOpen?: () => void;
};

const DOCK_ROUTES = new Set(['Swipe', 'Discover', 'Library', 'Profile']);
const HIDDEN_ROUTES = new Set(['Swipe', 'AIStudio', 'Notifications', 'Upload', 'ClipComposer', 'CreateVariation', 'CreateHub', 'Welcome', 'Login', 'Register', 'ForgotPassword', 'Onboarding']);

export function MiniPlayer({ activeRoute, onOpen }: Props) {
  const layout = useResponsiveLayout();
  const player = usePlayer();
  const playerProgress = usePlayerProgress(500);
  const slide = useRef(new Animated.Value(0)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const routeName = activeRoute || '';
  const isVisible = !!player.current && !HIDDEN_ROUTES.has(routeName);
  const hasDock = DOCK_ROUTES.has(routeName);
  const playerWidth = Math.min(layout.safeWidth, layout.isTablet ? 640 : 560);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isVisible, slide]);

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void player.togglePlayPause();
  };

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {});
    void player.next();
  };

  const handlePrevious = () => {
    Haptics.selectionAsync().catch(() => {});
    void player.previous();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 || gesture.dy < -18,
    onPanResponderMove: (_, gesture) => {
      gestureX.setValue(Math.max(-110, Math.min(110, gesture.dx)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -55 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) onOpen?.();
      else if (gesture.dx < -70) handleNext();
      else if (gesture.dx > 70) handlePrevious();
      Animated.spring(gestureX, { toValue: 0, speed: 28, bounciness: 7, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(gestureX, { toValue: 0, speed: 28, bounciness: 7, useNativeDriver: true }).start();
    },
  }), [gestureX, onOpen, player]);

  if (!player.current) return null;

  const progress = playerProgress.durationSec > 0 ? Math.min(1, playerProgress.positionSec / playerProgress.durationSec) : 0;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });
  const opacity = slide;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[
        styles.wrap,
        {
          left: layout.insets.left + (layout.safeWidth - playerWidth) / 2,
          width: playerWidth,
          bottom: hasDock
            ? layout.dockHeight + Math.max(layout.insets.bottom, 7)
            : Math.max(10, layout.insets.bottom + 6),
          opacity,
          transform: [{ translateY }, { translateX: gestureX }],
        },
      ]}
    >
      <Pressable accessibilityLabel="Ouvrir le lecteur" onPress={onOpen} style={styles.card}>
        <View style={[styles.content, layout.compactControls && styles.contentCompact]}>
          <View style={[styles.coverWrap, layout.compactControls && styles.coverWrapCompact]}>
            {player.current.coverUrl || player.current.coverVideoUrl || player.current.coverVideoPosterUrl ? (
              <TrackCover track={player.current} active={isVisible} style={StyleSheet.absoluteFill} />
            ) : (
              <Ionicons name="musical-note" size={18} color="rgba(255,255,255,0.5)" />
            )}
          </View>
          <View style={styles.meta}>
            <Text maxFontSizeMultiplier={1.2} style={styles.title} numberOfLines={1}>{player.current.title}</Text>
            <View style={styles.artistRow}>
              {player.isPlaying ? <View style={styles.playingDot} /> : null}
              <Text maxFontSizeMultiplier={1.2} style={styles.artist} numberOfLines={1}>{trackArtistName(player.current)}</Text>
            </View>
          </View>

          <MotionPressable
            accessibilityLabel={player.isPlaying ? 'Mettre en pause' : 'Lire'}
            onPress={(event) => { event.stopPropagation(); handlePlayPause(); }}
            style={[styles.playButton, layout.compactControls && styles.playButtonCompact]}
            scaleTo={0.86}
          >
            {player.isLoading ? (
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.black} />
            ) : (
              <Ionicons
                name={player.isPlaying ? 'pause' : 'play'}
                size={20}
                color={colors.black}
                style={!player.isPlaying ? { marginLeft: 2 } : null}
              />
            )}
          </MotionPressable>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 30,
  },
  card: {
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: colors.night,
    shadowColor: '#111111',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 8,
  },
  progressTrack: { height: 2, backgroundColor: 'rgba(17,17,17,0.07)' },
  progressFill: {
    height: 2,
    backgroundColor: colors.violet,
  },
  content: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  contentCompact: { minHeight: 54, gap: 8, paddingHorizontal: 8, paddingVertical: 7 },
  coverWrap: {
    width: 38,
    height: 38,
    borderRadius: 5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  coverWrapCompact: { width: 36, height: 36, borderRadius: 4 },
  meta: { flex: 1, minWidth: 0 },
  title: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  artistRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  playingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.cyan },
  artist: {
    flexShrink: 1,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    fontWeight: '700',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    shadowColor: '#000000',
    shadowOpacity: 0,
    elevation: 0,
  },
  playButtonCompact: { width: 34, height: 34, borderRadius: 17 },
});
