import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRemixSources } from '@/api/client';
import type { RemixSource } from '@/api/types';
import { CollectionSurface, CollectionHeader, CollectionEmpty, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function CreateVariationScreen() {
  const navigation = useNavigation<any>(); const route = useRoute<any>(); const p = useCollectionPalette(); const layout = useResponsiveLayout(); const insets = useSafeAreaInsets();
  const [sources, setSources] = useState<RemixSource[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [query, setQuery] = useState('');
  const epoch = useRef(0);
  const load = useCallback(async () => {
    const id = ++epoch.current; setLoading(true); setError('');
    try { const result = await getRemixSources(); if (id === epoch.current) setSources(result); }
    catch (reason) { if (id === epoch.current) setError(reason instanceof Error ? reason.message : 'Impossible de charger les morceaux autorisés.'); }
    finally { if (id === epoch.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { epoch.current++; }; }, [load]);
  const filtered = useMemo(() => sources.filter(source => (source.title + ' ' + source.artist).toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))), [sources, query]);
  return <CollectionSurface><FlatList data={filtered} keyExtractor={item => item.sourceTrackType + item.sourceTrackId} initialNumToRender={8} windowSize={5} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={loading && sources.length > 0} onRefresh={() => void load()} tintColor={p.blue} />}
    contentContainerStyle={[layout.pageContent, { paddingTop: insets.top, paddingBottom: layout.miniPlayerClearance + 24 }]}
    ListHeaderComponent={<><CollectionHeader title="Créer une variation" onBack={() => navigation.goBack()} /><LinearGradient colors={['#1D2841', '#302444']} style={s.hero}><Ionicons name="git-branch-outline" size={34} color="#BFB2F1" /><Text style={s.title}>Leur son.{ '\n'}Ta nouvelle direction.</Text><Text style={s.description}>Choisis un morceau dont l’artiste autorise les variations. Il reste crédité.</Text></LinearGradient><View style={[s.search, { backgroundColor: p.surface }]}><Ionicons name="search" size={20} color={p.faint} /><TextInput accessibilityLabel="Rechercher un morceau à transformer" value={query} onChangeText={setQuery} placeholder="Titre ou artiste" placeholderTextColor={p.faint} style={[s.input, { color: p.text }]} /></View>{error && sources.length ? <CollectionEmpty title="Actualisation interrompue" text={error} action="Réessayer" onPress={() => void load()} /> : null}</>}
    ListEmptyComponent={<CollectionEmpty loading={loading} icon="git-branch-outline" title={loading ? 'Morceaux autorisés…' : error ? 'Chargement interrompu' : query ? 'Aucun résultat' : 'Aucun morceau disponible'} text={error || (query ? 'Essaie un autre titre.' : 'Les artistes choisissent eux-mêmes les usages autorisés.')} action={error ? 'Réessayer' : undefined} onPress={error ? () => void load() : undefined} />}
    renderItem={({ item }) => <EntryPressable accessibilityRole="button" accessibilityLabel={'Créer une variation de ' + item.title + ', ' + item.artist} onPress={() => navigation.navigate('AIStudio', { sourceTrackId: item.sourceTrackId, sourceTrackType: item.sourceTrackType, mode: 'remix', ...(route.params?.challengeId ? { challengeId: route.params.challengeId } : {}) })} style={s.row}><SynauraImage source={item.coverUrl} style={[s.cover, { backgroundColor: p.raised }]} /><View style={s.copy}><Text numberOfLines={2} style={[s.name, { color: p.text }]}>{item.title}</Text><Text numberOfLines={1} style={[s.artist, { color: p.muted }]}>{item.artist}</Text></View><Ionicons name="arrow-forward" size={22} color={p.blue} /></EntryPressable>}
  /></CollectionSurface>;
}
export default CreateVariationScreen;
const s = StyleSheet.create({ hero: { borderRadius: 28, padding: 25, gap: 17, marginVertical: 12 }, title: { color: '#F1F4FE', fontSize: 33, lineHeight: 38, fontWeight: '800' }, description: { color: '#CED0E3', fontSize: 15, lineHeight: 22 }, search: { minHeight: 54, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginVertical: 16 }, input: { flex: 1, minWidth: 0, minHeight: 54, fontSize: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }, cover: { width: 65, height: 65, borderRadius: 18 }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 15, fontWeight: '700' }, artist: { marginTop: 6, fontSize: 12 } });
