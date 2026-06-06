import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getPopularTracks, getRecentTracks, getTrendingTracks } from '@/api/client';
import type { Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackList } from '@/components/TrackList';
import { colors, radius, spacing } from '@/theme/tokens';

type Mode = 'trending' | 'recent' | 'popular';

const modes: Array<{ id: Mode; label: string }> = [
  { id: 'trending', label: 'Tendances' },
  { id: 'recent', label: 'Nouveautes' },
  { id: 'popular', label: 'Populaires' },
];

export function DiscoverScreen() {
  const [mode, setMode] = useState<Mode>('trending');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next =
        mode === 'recent'
          ? await getRecentTracks()
          : mode === 'popular'
          ? await getPopularTracks()
          : await getTrendingTracks();
      setTracks(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const header = useMemo(() => (
    <View style={styles.header}>
      <Text style={styles.title}>Decouvrir</Text>
      <Text style={styles.subtitle}>Explore les sons qui montent sur Synaura.</Text>
      <View style={styles.segment}>
        {modes.map((item) => {
          const active = item.id === mode;
          return (
            <Pressable key={item.id} onPress={() => setMode(item.id)} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ), [mode]);

  return (
    <SynauraBackground>
      <TrackList
        tracks={tracks}
        refreshing={loading}
        onRefresh={load}
        header={header}
        emptyTitle={loading ? 'Chargement...' : 'Rien a afficher'}
        emptyText={error || 'Essaie une autre section.'}
      />
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  segment: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.white,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.black,
  },
});
