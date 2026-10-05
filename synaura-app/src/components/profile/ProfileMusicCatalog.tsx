import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { MobileProfileTrack } from '@/api/client';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { CollectionHeading, CollectionTabs, CollectionIconButton, CollectionEmpty, MusicTile, MusicRow, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { sortCollectionTracks } from '@/components/mobile/collectionModel';

export type ProfileTrackSort = 'recent' | 'plays' | 'likes';
const SORT_OPTIONS: { value: ProfileTrackSort; label: string }[] = [{ value: 'recent', label: 'Récents' }, { value: 'plays', label: 'Écoutés' }, { value: 'likes', label: 'Aimés' }];
export function ProfileMusicCatalog({ tracks, currentTrackId, isPlaying, defaultSort = 'recent', emptyText = 'Aucun son public pour le moment.', onPlay, onOpen, onManage }: {
  tracks: MobileProfileTrack[]; currentTrackId?: string | null; isPlaying?: boolean; defaultSort?: ProfileTrackSort; emptyText?: string;
  onPlay: (track: MobileProfileTrack) => void; onOpen?: (track: MobileProfileTrack) => void; onManage?: (track: MobileProfileTrack) => void;
}) {
  const p = useCollectionPalette();
  const layout = useResponsiveLayout();
  const [sort, setSort] = useState<ProfileTrackSort>(defaultSort);
  const [list, setList] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const sorted = useMemo(() => sortCollectionTracks(tracks, sort), [sort, tracks]);
  useEffect(() => setVisibleCount(12), [sort, tracks.length]);
  const horizontal = list || layout.isNarrow || layout.hasLargeText;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><CollectionHeading title="Discographie" detail={tracks.length + (tracks.length === 1 ? ' morceau' : ' morceaux')} /></View>{!layout.isNarrow && !layout.hasLargeText ? <CollectionIconButton icon={list ? 'grid-outline' : 'list-outline'} label={list ? 'Afficher les pochettes' : 'Afficher en liste'} onPress={() => setList(value => !value)} /> : null}</View>
    {tracks.length ? <CollectionTabs value={sort} onChange={setSort} options={SORT_OPTIONS} /> : null}
    {tracks.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: horizontal ? 0 : 24 }}>
      {sorted.slice(0, visibleCount).map(track => horizontal ? <View key={track._id} style={{ width: '100%' }}><MusicRow track={track} playing={currentTrackId === track._id && isPlaying} onPlay={() => onPlay(track)} onOpen={() => (onOpen || onPlay)(track)} onMore={onManage ? () => onManage(track) : undefined} /></View>
        : <MusicTile key={track._id} width={layout.isTablet ? '31.5%' : '48%'} track={track} playing={currentTrackId === track._id && isPlaying} privateTrack={track.isPublic === false} onPlay={() => onPlay(track)} onOpen={() => (onOpen || onPlay)(track)} onMore={onManage ? () => onManage(track) : undefined} />)}
    </View> : <CollectionEmpty title="Les prochains sons arrivent ici." text={emptyText} />}
    {visibleCount < sorted.length ? <EntryPressable accessibilityRole="button" onPress={() => setVisibleCount(value => Math.min(sorted.length, value + 24))} style={{ minHeight: 48, borderRadius: 24, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center', padding: 14 }}><Text style={{ color: p.blue, fontWeight: '700' }}>Afficher {Math.min(24, sorted.length - visibleCount)} morceaux de plus</Text></EntryPressable> : null}
  </View>;
}
