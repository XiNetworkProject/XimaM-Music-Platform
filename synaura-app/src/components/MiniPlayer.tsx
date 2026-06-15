import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { trackArtistName } from '@/components/swipe/helpers';
import { TrackCover } from '@/components/TrackCover';
import { MotionPressable } from '@/components/motion/Motion';

type Props = {
  activeRoute?: string;
  onOpen?: () => void;
};

const VISIBLE_ROUTES = new Set(['Home', 'Discover', 'Community']);

export function MiniPlayer({ activeRoute, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const playerProgress = usePlayerProgress(500);
  const slide = useRef(new Animated.Value(0)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const isVisible = !!player.current && VISIBLE_ROUTES.has(activeRoute || '');

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
      style={[styles.wrap, { bottom: 62 + insets.bottom, opacity, transform: [{ translateY }, { translateX: gestureX }] }]}
    >
      <Pressable accessibilityLabel="Ouvrir le lecteur" onPress={onOpen} style={styles.card}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#22D3EE', '#8B5CF6', '#EC4899', '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.coverWrap}>
            {player.current.coverUrl || player.current.coverVideoUrl || player.current.coverVideoPosterUrl ? (
              <TrackCover track={player.current} active={isVisible} style={StyleSheet.absoluteFill} />
            ) : (
              <Ionicons name="musical-note" size={18} color="rgba(23,19,19,0.5)" />
            )}
          </View>
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>{player.current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{trackArtistName(player.current)}</Text>
          </View>

          <MotionPressable
            accessibilityLabel={player.isPlaying ? 'Mettre en pause' : 'Lire'}
            onPress={(event) => { event.stopPropagation(); handlePlayPause(); }}
            style={styles.playButton}
            scaleTo={0.86}
          >
            {player.isLoading ? (
              <Ionicons name="ellipsis-horizontal" size={18} color="#FFFAF2" />
            ) : (
              <Ionicons
                name={player.isPlaying ? 'pause' : 'play'}
                size={20}
                color="#FFFAF2"
                style={!player.isPlaying ? { marginLeft: 2 } : null}
              />
            )}
          </MotionPressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 30,
  },
  card: {
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#111111',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(23,19,19,0.08)',
  },
  progressFill: {
    height: 3,
  },
  content: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  coverWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  meta: { flex: 1, minWidth: 0 },
  title: {
    color: '#171313',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  artist: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171313',
    shadowColor: '#171313',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
