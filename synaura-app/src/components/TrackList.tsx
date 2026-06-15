import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { spacing } from '@/theme/tokens';
import { EmptyState } from './ui/EmptyState';
import { TrackActionsSheet } from './ui/TrackActionsSheet';
import { TrackListItem } from './ui/TrackListItem';

type Props = {
  tracks: Track[];
  emptyTitle: string;
  emptyText?: string;
  header?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  topInset?: number;
};

export function TrackList({ tracks, emptyTitle, emptyText, header, refreshing, onRefresh, bottomInset = 180, emptyActionLabel, onEmptyAction, topInset = 64 }: Props) {
  const player = usePlayer();
  const library = useLibrary();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const playAt = useCallback(async (index: number) => {
    await player.setQueueAndPlay(tracks, index);
  }, [player, tracks]);

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item._id}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset, paddingTop: topInset }]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState title={emptyTitle} text={emptyText} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
      }
      renderItem={({ item, index }) => (
        <TrackListItem
          track={item}
          active={player.current?._id === item._id}
          favorite={library.isFavorite(item._id)}
          onToggleFavorite={() => library.toggleFavorite(item)}
          onPlay={() => playAt(index)}
          onMore={() => setSelectedTrack(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListFooterComponent={<TrackActionsSheet track={selectedTrack} onClose={() => setSelectedTrack(null)} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
  },
});
