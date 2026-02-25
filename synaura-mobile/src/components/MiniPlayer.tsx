import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Animated, PanResponder } from 'react-native';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../contexts/PlayerContext';
import { useNavigation } from '@react-navigation/native';

export function MiniPlayer({ tabBarHeight = 60 }: { tabBarHeight?: number }) {
  const navigation = useNavigation<any>();
  const { current, queue, currentIndex, isPlaying, isLoading, positionSec, durationSec, togglePlayPause, stop } = usePlayer();

  const hasCurrent = !!current;

  const openFullPlayer = useCallback(() => {
    if (!current) return;
    const nav = navigation.getParent?.() || navigation;
    // Ouvre le VRAI feed Swipe (comme le web), centré sur le track courant.
    // Ça évite le cas “queue 1 titre” où on ne peut pas swiper.
    nav.navigate('Player', { source: 'forYou', initialTrackId: current._id, title: 'Swipe' });
  }, [current, currentIndex, navigation, queue]);

  const progressPct = useMemo(() => {
    if (!durationSec || durationSec <= 0) return 0;
    return Math.max(0, Math.min(1, positionSec / durationSec));
  }, [durationSec, positionSec]);

  const translateY = useRef(new Animated.Value(0)).current;
  const openedRef = useRef(false);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          const dy = Math.min(0, g.dy); // uniquement vers le haut
          translateY.setValue(dy);
        },
        onPanResponderRelease: (_, g) => {
          const shouldOpen = g.dy < -40 || g.vy < -0.6;
          if (shouldOpen && !openedRef.current) {
            openedRef.current = true;
            Animated.timing(translateY, { toValue: -8, duration: 120, useNativeDriver: true }).start(() => {
              translateY.setValue(0);
              openedRef.current = false;
              openFullPlayer();
            });
            return;
          }
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [openFullPlayer, translateY]
  );

  if (!hasCurrent) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: tabBarHeight, transform: [{ translateY }] },
      ]}
      {...pan.panHandlers}
    >
      {/* barre de progression */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
      </View>

      <Pressable
        onPress={openFullPlayer}
        style={({ pressed }) => [pressed ? { opacity: 0.96 } : null]}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le lecteur"
      >
      <View style={styles.bar} />
      <View style={styles.row}>
        <View style={styles.cover}>
          {current.coverUrl ? (
            <Image source={{ uri: current.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={styles.coverFallback} />
          )}
        </View>
        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.title}>
            {current.title || 'Piste'}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {current.artist?.name || current.artist?.username || 'Artiste'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              togglePlayPause();
            }}
            style={styles.playBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
            )}
          </Pressable>
          <Pressable
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              stop();
            }}
            style={styles.closeBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer le lecteur"
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    // au-dessus de la tab bar
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: '#0A071A',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentBrand,
  },
  bar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  coverFallback: {
    flex: 1,
    backgroundColor: 'rgba(123,97,255,0.25)',
  },
  meta: { flex: 1, minWidth: 0 },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  subtitle: { color: colors.textTertiary, marginTop: 2, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtn: {
    height: 44,
    width: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentBrand,
  },
  closeBtn: {
    height: 44,
    width: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
});


