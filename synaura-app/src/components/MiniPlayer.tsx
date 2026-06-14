import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { trackArtistName } from '@/components/swipe/helpers';
import { TrackCover } from '@/components/TrackCover';
import { MotionPressable } from '@/components/motion/Motion';
import { MobileWaveform } from '@/components/mobile/MobileWaveform';

type Props = {
  activeRoute?: string;
  onOpen?: () => void;
};

const HIDDEN_ROUTES = ['Swipe', 'Login', 'Register', 'ForgotPassword', 'CreateHub', 'CreatePost', 'Upload'];

export function MiniPlayer({ activeRoute, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const playerProgress = usePlayerProgress(500);
  const library = useLibrary();
  const slide = useRef(new Animated.Value(0)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const coverPulse = useRef(new Animated.Value(0)).current;
  const isVisible = !!player.current && !HIDDEN_ROUTES.includes(activeRoute || '');

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isVisible, slide]);

  useEffect(() => {
    if (!isVisible || !player.isPlaying) {
      coverPulse.stopAnimation();
      coverPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(coverPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(coverPulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [coverPulse, isVisible, player.isPlaying]);

  const handleLike = () => {
    if (player.current) {
      Haptics.selectionAsync().catch(() => {});
      library.toggleFavorite(player.current);
    }
  };

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
  const isFavorite = library.isFavorite(player.current._id);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });
  const opacity = slide;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[styles.wrap, { bottom: 82 + insets.bottom, opacity, transform: [{ translateY }, { translateX: gestureX }] }]}
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
          <Animated.View style={[styles.coverWrap, { transform: [{ scale: coverPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]}>
            {player.current.coverUrl || player.current.coverVideoUrl || player.current.coverVideoPosterUrl ? (
              <TrackCover track={player.current} active={isVisible} style={StyleSheet.absoluteFill} />
            ) : (
              <Ionicons name="musical-note" size={18} color="rgba(23,19,19,0.5)" />
            )}
          </Animated.View>
          <View style={styles.meta}>
            <View style={styles.metaTop}>
              <View style={[styles.stateDot, player.isPlaying && styles.stateDotActive]} />
              <Text style={styles.stateText}>{player.isPlaying ? 'En lecture' : 'En pause'}</Text>
              <MobileWaveform active={player.isPlaying} compact style={styles.waveform} />
            </View>
            <Text style={styles.title} numberOfLines={1}>{player.current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{trackArtistName(player.current)}</Text>
          </View>

          <MotionPressable
            accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onPress={(event) => { event.stopPropagation(); handleLike(); }}
            style={[styles.iconButton, isFavorite && styles.iconButtonActive]}
            scaleTo={0.86}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#FF4B7A' : 'rgba(23,19,19,0.55)'}
            />
          </MotionPressable>

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

          <MotionPressable
            accessibilityLabel="Titre suivant"
            onPress={(event) => { event.stopPropagation(); handleNext(); }}
            style={styles.iconButton}
            scaleTo={0.86}
          >
            <Ionicons name="play-skip-forward" size={18} color="rgba(23,19,19,0.55)" />
          </MotionPressable>
          <Ionicons name="chevron-up" size={18} color="rgba(23,19,19,0.32)" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 30,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,249,239,0.97)',
    shadowColor: '#1E1914',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(23,19,19,0.08)',
  },
  progressFill: {
    height: 3,
  },
  content: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coverWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  meta: { flex: 1, minWidth: 0 },
  metaTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  waveform: { marginLeft: 2 },
  stateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(23,19,19,0.22)' },
  stateDotActive: { backgroundColor: '#22C55E' },
  stateText: {
    color: 'rgba(23,19,19,0.45)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#171313',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  artist: {
    marginTop: 2,
    color: 'rgba(23,19,19,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.04)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,75,122,0.12)',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
