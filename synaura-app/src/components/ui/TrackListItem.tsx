import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { MotionPressable } from '@/components/motion/Motion';
import { colors, radius, spacing } from '@/theme/tokens';

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

export function TrackListItem({
  track,
  active,
  favorite,
  onPlay,
  onToggleFavorite,
  onMore,
}: {
  track: Track;
  active?: boolean;
  favorite?: boolean;
  onPlay: () => void;
  onToggleFavorite?: () => void;
  onMore?: () => void;
}) {
  return (
    <MotionPressable onPress={onPlay} style={[styles.root, active && styles.active]} scaleTo={0.985}>
      <TrackCover track={track} active={active} style={styles.cover} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.meta}>{artistName(track)}{track.genre?.[0] ? ` · ${track.genre[0]}` : ''}</Text>
      </View>
      {onToggleFavorite ? (
        <Pressable accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onPress={(event) => { event.stopPropagation(); onToggleFavorite(); }} style={styles.iconButton}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? colors.coral : colors.textSecondary} />
        </Pressable>
      ) : null}
      {onMore ? (
        <Pressable accessibilityLabel="Plus d'actions" onPress={(event) => { event.stopPropagation(); onMore(); }} style={styles.iconButton}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={[styles.play, active && styles.playActive]}><Ionicons name={active ? 'pause' : 'play'} size={15} color={active ? colors.white : colors.text} /></View>
      )}
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.sm },
  active: { borderColor: 'rgba(115,87,198,0.28)', backgroundColor: 'rgba(115,87,198,0.07)' },
  cover: { width: 54, height: 54, borderRadius: radius.md },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.055)' },
  playActive: { backgroundColor: colors.black },
});
