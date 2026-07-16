import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getRemixSources } from '@/api/client';
import type { RemixSource } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function CreateVariationScreen() {
  const responsive = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const challengeId: string = route.params?.challengeId || '';
  const [sources, setSources] = React.useState<RemixSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    getRemixSources()
      .then((next) => mounted && setSources(next))
      .catch((e) => mounted && setError(e instanceof Error ? e.message : 'Impossible de charger les morceaux autorises'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const openStudioWith = (source: RemixSource) => {
    navigation.navigate('AIStudio', {
      sourceTrackId: source.sourceTrackId,
      sourceTrackType: source.sourceTrackType,
      mode: 'remix',
      ...(challengeId ? { challengeId } : null),
    });
  };

  return (
    <SynauraBackground>
      <ScrollView contentContainerStyle={[styles.content, responsive.pageContent]} showsVerticalScrollIndicator={false}>
        <AppHeader title="Créer une variation" subtitle="Choisis un morceau Synaura autorisé" onBack={() => navigation.goBack()} />
        <Text style={styles.hint}>Le créateur original sera toujours crédité.</Text>

        {loading ? <ActivityIndicator color={colors.cyan} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error && sources.length === 0 ? (
          <EmptyState icon="color-wand-outline" title="Aucun morceau disponible" text="Aucun morceau n'autorise la variation IA pour le moment." />
        ) : null}

        <View style={styles.list}>
          {sources.map((source) => (
            <Pressable
              key={`${source.sourceTrackType}-${source.sourceTrackId}`}
              onPress={() => openStudioWith(source)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              {source.coverUrl ? <Image source={{ uri: source.coverUrl }} style={styles.cover} /> : <View style={styles.cover} />}
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.title}>{source.title}</Text>
                <Text numberOfLines={1} style={styles.artist}>{source.artist}</Text>
                <Text style={styles.action}>Créer une variation</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.cyan} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700', paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: 13, fontWeight: '800' },
  list: { marginTop: spacing.sm, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 0, paddingVertical: 10, backgroundColor: 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  rowPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  cover: { width: 58, height: 58, borderRadius: radius.sm, backgroundColor: 'rgba(17,17,17,0.08)' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  artist: { marginTop: 2, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  action: { marginTop: 3, color: colors.cyan, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
});

export default CreateVariationScreen;
