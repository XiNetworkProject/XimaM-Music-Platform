import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchTracks } from '@/api/client';
import type { Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackList } from '@/components/TrackList';
import { colors, radius, spacing } from '@/theme/tokens';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setTracks([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchTracks(q);
        if (!cancelled) setTracks(results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Recherche impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <SynauraBackground>
      <TrackList
        tracks={tracks}
        emptyTitle={query.trim().length < 2 ? 'Recherche Synaura' : loading ? 'Recherche...' : 'Aucun resultat'}
        emptyText={query.trim().length < 2 ? 'Tape au moins deux caracteres pour chercher un titre, artiste ou style.' : error || 'Essaie un autre mot-cle.'}
        header={
          <View style={styles.header}>
            <Text style={styles.title}>Recherche</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Titre, artiste, genre..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>
        }
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
  inputWrap: {
    marginTop: spacing.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
