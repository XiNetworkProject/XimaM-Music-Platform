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
      {active ? <View style={styles.activeLine} /> : null}
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
  root: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 10, paddingHorizontal: 2, overflow: 'hidden' },
  active: { backgroundColor: colors.violetSoft },
  activeLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.violet },
  cover: { width: 52, height: 52, borderRadius: radius.sm },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  playActive: { backgroundColor: colors.black },
});
