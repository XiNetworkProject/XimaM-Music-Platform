import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/player/PlayerProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { trackArtistName } from '@/components/swipe/helpers';
import { TrackCover } from '@/components/TrackCover';

type Props = {
  activeRoute?: string;
  onOpen?: () => void;
};

const HIDDEN_ROUTES = ['Swipe'];

export function MiniPlayer({ activeRoute, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const library = useLibrary();
  const slide = useRef(new Animated.Value(0)).current;
  const isVisible = !!player.current && !HIDDEN_ROUTES.includes(activeRoute || '');

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isVisible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isVisible, slide]);

  if (!player.current) return null;

  const progress = player.durationSec > 0 ? Math.min(1, player.positionSec / player.durationSec) : 0;
  const isFavorite = library.isFavorite(player.current._id);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });
  const opacity = slide;

  const handleLike = () => {
    Haptics.selectionAsync().catch(() => {});
    library.toggleFavorite(player.current!);
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    void player.togglePlayPause();
  };

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {});
    void player.next();
  };

  return (
    <Animated.View
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[styles.wrap, { bottom: 74 + insets.bottom, opacity, transform: [{ translateY }] }]}
    >
      <Pressable accessibilityLabel="Ouvrir le lecteur" onPress={onOpen} style={styles.card}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#7C5CFF', '#3B2FE6']}
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
            <View style={styles.metaTop}>
              <View style={[styles.stateDot, player.isPlaying && styles.stateDotActive]} />
              <Text style={styles.stateText}>{player.isPlaying ? 'En lecture' : 'En pause'}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{player.current.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{trackArtistName(player.current)}</Text>
          </View>

          <Pressable
            accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onPress={(event) => { event.stopPropagation(); handleLike(); }}
            style={[styles.iconButton, isFavorite && styles.iconButtonActive]}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#FF4B7A' : 'rgba(23,19,19,0.55)'}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={player.isPlaying ? 'Mettre en pause' : 'Lire'}
            onPress={(event) => { event.stopPropagation(); handlePlayPause(); }}
            style={styles.playButton}
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
          </Pressable>

          <Pressable
            accessibilityLabel="Titre suivant"
            onPress={(event) => { event.stopPropagation(); handleNext(); }}
            style={styles.iconButton}
          >
            <Ionicons name="play-skip-forward" size={18} color="rgba(23,19,19,0.55)" />
          </Pressable>
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
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,250,242,0.98)',
    shadowColor: '#1E1914',
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(23,19,19,0.08)',
  },
  progressFill: {
    height: 2,
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
