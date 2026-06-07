import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  track: Track;
  active?: boolean;
  onPress: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
};

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

export function TrackCard({ track, active, favorite, onPress, onToggleFavorite }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, active && styles.active, pressed && styles.pressed]}>
      <View style={styles.coverWrap}>
        <TrackCover track={track} active style={styles.cover} />
        <View style={styles.coverFallback}>
          <Ionicons name="musical-notes" size={22} color={colors.text} />
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{artistName(track)}</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>{track.plays || 0} ecoutes</Text>
          {track.genre?.[0] ? <Text style={styles.dot}>•</Text> : null}
          {track.genre?.[0] ? <Text style={styles.stat} numberOfLines={1}>{track.genre[0]}</Text> : null}
        </View>
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onToggleFavorite?.();
        }}
        style={styles.favorite}
      >
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.accentPink : colors.textSecondary} />
      </Pressable>

      <View style={[styles.play, active && styles.playActive]}>
        <Ionicons name={active ? 'pause' : 'play'} size={16} color={colors.black} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  active: {
    borderColor: 'rgba(124,92,255,0.65)',
    backgroundColor: 'rgba(124,92,255,0.16)',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.surfaceStrong,
  },
  coverWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(124,92,255,0.35)',
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  artist: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
  },
  dot: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  playActive: {
    backgroundColor: colors.accent2,
  },
  favorite: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
