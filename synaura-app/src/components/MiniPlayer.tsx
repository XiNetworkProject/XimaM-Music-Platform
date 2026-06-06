import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  onOpen?: () => void;
};

function artistName(current: NonNullable<ReturnType<typeof usePlayer>['current']>) {
  return current.artist?.artistName || current.artist?.name || current.artist?.username || 'Artiste Synaura';
}

export function MiniPlayer({ onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  if (!player.current) return null;

  const progress = player.durationSec > 0 ? Math.min(1, player.positionSec / player.durationSec) : 0;

  return (
    <View style={[styles.wrap, { bottom: 76 + insets.bottom }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Pressable onPress={onOpen} style={styles.content}>
        <View style={styles.coverWrap}>
          {player.current.coverUrl ? <Image source={{ uri: player.current.coverUrl }} style={styles.cover} /> : null}
          <Ionicons name="musical-note" size={18} color={colors.text} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{player.current.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{artistName(player.current)}</Text>
        </View>
        <Pressable onPress={(event) => { event.stopPropagation(); player.previous(); }} style={styles.iconButton}>
          <Ionicons name="play-skip-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={(event) => { event.stopPropagation(); player.togglePlayPause(); }} style={styles.playButton}>
          <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={20} color={colors.black} />
        </Pressable>
        <Pressable onPress={(event) => { event.stopPropagation(); player.next(); }} style={styles.iconButton}>
          <Ionicons name="play-skip-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(12,10,24,0.94)',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent2,
  },
  content: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  coverWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,92,255,0.35)',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  artist: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
