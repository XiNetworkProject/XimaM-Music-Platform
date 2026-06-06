import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { TrackCard } from './TrackCard';

type Props = {
  tracks: Track[];
  emptyTitle: string;
  emptyText?: string;
  header?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
};

export function TrackList({ tracks, emptyTitle, emptyText, header, refreshing, onRefresh, bottomInset = 180 }: Props) {
  const player = usePlayer();
  const library = useLibrary();

  const playAt = useCallback(async (index: number) => {
    await player.setQueueAndPlay(tracks, index);
  }, [player, tracks]);

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item._id}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          {emptyText ? <Text style={styles.emptyText}>{emptyText}</Text> : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <TrackCard
          track={item}
          active={player.current?._id === item._id}
          favorite={library.isFavorite(item._id)}
          onToggleFavorite={() => library.toggleFavorite(item)}
          onPress={() => playAt(index)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
  },
  empty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
});
