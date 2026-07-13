import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MobileProfileTrack } from '@/api/client';
import { TrackCover } from '@/components/TrackCover';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, radius, shadows } from '@/theme/tokens';

export type ProfileTrackSort = 'recent' | 'plays' | 'likes';

const SORT_OPTIONS: Array<{ value: ProfileTrackSort; label: string }> = [
  { value: 'recent', label: 'Récents' },
  { value: 'plays', label: 'Écoutés' },
  { value: 'likes', label: 'Aimés' },
];

export function ProfileMusicCatalog({
  tracks,
  currentTrackId,
  isPlaying,
  defaultSort = 'recent',
  emptyText = 'Aucun son public pour le moment.',
  onPlay,
  onOpen,
  onManage,
}: {
  tracks: MobileProfileTrack[];
  currentTrackId?: string | null;
  isPlaying?: boolean;
  defaultSort?: ProfileTrackSort;
  emptyText?: string;
  onPlay: (track: MobileProfileTrack) => void;
  onOpen?: (track: MobileProfileTrack) => void;
  onManage?: (track: MobileProfileTrack) => void;
}) {
  const responsive = useResponsiveLayout();
  const [sort, setSort] = useState<ProfileTrackSort>(defaultSort);
  const sortedTracks = useMemo(() => [...tracks].sort((a, b) => {
    if (sort === 'plays') return Number(b.plays || 0) - Number(a.plays || 0);
    if (sort === 'likes') return Number(b.likesCount || 0) - Number(a.likesCount || 0);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }), [sort, tracks]);

  const singleColumn = responsive.isNarrow || responsive.hasLargeText;
  const cardWidth: DimensionValue = responsive.isTablet ? '31.5%' : singleColumn ? '100%' : '48.3%';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headingBlock}>
          <View style={styles.kickerRow}>
            <Ionicons name="albums-outline" size={13} color={colors.violet} />
            <Text style={styles.kicker}>Discographie</Text>
          </View>
          <Text style={styles.title}>Tous les morceaux</Text>
          <Text style={styles.subtitle}>{tracks.length} titre{tracks.length !== 1 ? 's' : ''} disponible{tracks.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {tracks.length ? (
        <SegmentedControl value={sort} options={SORT_OPTIONS} onChange={setSort} compact style={styles.sortControl} />
      ) : null}

      {sortedTracks.length ? (
        <View style={styles.grid}>
          {sortedTracks.map((track, index) => {
            const card = (
              <CatalogTrackCard
                track={track}
                horizontal={singleColumn}
                playing={currentTrackId === track._id && Boolean(isPlaying)}
                onPlay={onPlay}
                onOpen={onOpen || onPlay}
                onManage={onManage}
              />
            );
            return index < 12 ? (
              <Reveal key={track._id} delay={Math.min(index * 24, 180)} distance={6} scaleFrom={0.992} style={{ width: cardWidth }}>
                {card}
              </Reveal>
            ) : <View key={track._id} style={{ width: cardWidth }}>{card}</View>;
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="musical-notes-outline" size={21} color={colors.violet} /></View>
          <Text style={styles.emptyTitle}>Le catalogue est prêt.</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

function CatalogTrackCard({
  track,
  horizontal,
  playing,
  onPlay,
  onOpen,
  onManage,
}: {
  track: MobileProfileTrack;
  horizontal: boolean;
  playing: boolean;
  onPlay: (track: MobileProfileTrack) => void;
  onOpen: (track: MobileProfileTrack) => void;
  onManage?: (track: MobileProfileTrack) => void;
}) {
  const handlePlay = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPlay(track);
  };

  const handleManage = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onManage?.(track);
  };

  return (
    <MotionPressable onPress={() => onOpen(track)} style={[styles.trackCard, horizontal && styles.trackCardHorizontal]} scaleTo={0.98}>
      <View style={[styles.coverWrap, horizontal && styles.coverWrapHorizontal]}>
        <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.cover} />
        <View style={styles.coverShade} />
        {track.isPublic === false ? <Text style={styles.draftBadge}>Brouillon</Text> : null}
        {onManage ? (
          <Pressable accessibilityLabel={`Gérer ${track.title}`} onPress={handleManage} style={styles.manageButton}>
            <Ionicons name="ellipsis-horizontal" size={17} color="#FFFFFF" />
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel={playing ? 'Mettre en pause' : 'Lire'} onPress={handlePlay} style={styles.playButton}>
          <Ionicons name={playing ? 'pause' : 'play'} size={17} color={colors.text} />
        </Pressable>
      </View>
      <View style={[styles.trackBody, horizontal && styles.trackBodyHorizontal]}>
        <Text numberOfLines={2} style={styles.trackTitle}>{track.title}</Text>
        {track.genre?.length ? <Text numberOfLines={1} style={styles.genre}>{track.genre.slice(0, 2).join(' · ')}</Text> : null}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="headset-outline" size={12} color={colors.textTertiary} /><Text style={styles.metaText}>{compact(track.plays || 0)}</Text></View>
          <View style={styles.metaItem}><Ionicons name="heart-outline" size={12} color={colors.textTertiary} /><Text style={styles.metaText}>{compact(track.likesCount || 0)}</Text></View>
          {track.duration ? <Text style={styles.duration}>{formatDuration(track.duration)}</Text> : null}
        </View>
        <View style={styles.openRow}>
          <Text style={styles.openText}>Ouvrir le morceau</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.text} />
        </View>
      </View>
    </MotionPressable>
  );
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headingBlock: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: colors.violet, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  title: { marginTop: 5, color: colors.text, fontSize: 22, lineHeight: 26, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  sortControl: { maxWidth: 430 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' },
  trackCard: { width: '100%', overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.soft },
  trackCardHorizontal: { minHeight: 112, flexDirection: 'row' },
  coverWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  coverWrapHorizontal: { width: 112, height: 112, aspectRatio: undefined },
  cover: { width: '100%', height: '100%' },
  coverShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.08)' },
  draftBadge: { position: 'absolute', left: 8, top: 8, overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 5, backgroundColor: 'rgba(17,17,17,0.72)', color: '#FFFFFF', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  manageButton: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.66)' },
  playButton: { position: 'absolute', right: 8, bottom: 8, width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  trackBody: { flex: 1, minHeight: 120, padding: 11 },
  trackBodyHorizontal: { minHeight: 112, justifyContent: 'center' },
  trackTitle: { color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  genre: { marginTop: 3, color: colors.violet, fontSize: 9, fontWeight: '800' },
  metaRow: { marginTop: 9, minHeight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  duration: { marginLeft: 'auto', color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  openRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  openText: { flex: 1, color: colors.text, fontSize: 9, fontWeight: '900' },
  empty: { minHeight: 160, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.62)', padding: 20 },
  emptyIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  emptyTitle: { marginTop: 11, color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyText: { marginTop: 5, maxWidth: 300, color: colors.textSecondary, textAlign: 'center', fontSize: 11, lineHeight: 17, fontWeight: '700' },
});
