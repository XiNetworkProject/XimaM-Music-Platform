import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackList } from '@/components/TrackList';
import { useLibrary } from '@/library/LibraryProvider';
import { colors, radius, spacing } from '@/theme/tokens';

export function LibraryScreen() {
  const library = useLibrary();
  const [tab, setTab] = React.useState<'favorites' | 'recent'>('favorites');
  const tracks = tab === 'favorites' ? library.favorites : library.recent;

  return (
    <SynauraBackground>
      <TrackList
        tracks={tracks}
        emptyTitle={tab === 'favorites' ? 'Aucun favori' : 'Aucun historique'}
        emptyText={tab === 'favorites' ? 'Ajoute des titres avec le coeur sur les cartes.' : 'Les pistes ecoutees apparaissent ici automatiquement.'}
        header={
          <View style={styles.header}>
            <Text style={styles.title}>Bibliotheque</Text>
            <View style={styles.segment}>
              <Pressable onPress={() => setTab('favorites')} style={[styles.segmentButton, tab === 'favorites' && styles.segmentButtonActive]}>
                <Text style={[styles.segmentText, tab === 'favorites' && styles.segmentTextActive]}>Favoris</Text>
              </Pressable>
              <Pressable onPress={() => setTab('recent')} style={[styles.segmentButton, tab === 'recent' && styles.segmentButtonActive]}>
                <Text style={[styles.segmentText, tab === 'recent' && styles.segmentTextActive]}>Recents</Text>
              </Pressable>
            </View>
            {tab === 'recent' && library.recent.length > 0 ? (
              <Pressable onPress={library.clearRecent} style={styles.clearButton}>
                <Text style={styles.clearText}>Vider l'historique</Text>
              </Pressable>
            ) : null}
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
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
});
