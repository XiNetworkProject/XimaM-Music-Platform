import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiscoverMoodTracks, getDiscoverRadar } from '@/api/client';
import type { Track } from '@/api/types';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { getMoodById } from '@/discover/moods';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { TrackActionsSheet } from '@/components/ui/TrackActionsSheet';
import { CollectionSurface, CollectionHeader, CollectionIconButton, CollectionEmpty, MusicRow, useCollectionPalette } from './CollectionUI';

export function CuratedCollection({ kind, moodId }: { kind: 'radar' | 'mood'; moodId?: string }) {
  const p = useCollectionPalette(); const navigation = useNavigation<any>(); const player = usePlayer();
  const layout = useResponsiveLayout(); const insets = useSafeAreaInsets(); const mood = getMoodById(moodId);
  const [tracks, setTracks] = useState<Track[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(''); const [selected, setSelected] = useState<Track | null>(null); const epoch = useRef(0);
  const load = useCallback(async (refresh = false) => {
    const id = ++epoch.current; refresh ? setRefreshing(true) : setLoading(true); setError('');
    try {
      if (kind === 'mood' && !mood) throw new Error('Cette ambiance n’existe pas.');
      const next = kind === 'radar' ? await getDiscoverRadar(30) : (await getDiscoverMoodTracks(mood!.id, 40)).tracks;
      if (id === epoch.current) setTracks(next.filter(track => track.audioUrl));
    } catch (reason) { if (id === epoch.current) setError(reason instanceof Error ? reason.message : 'La sélection est indisponible.'); }
    finally { if (id === epoch.current) { setLoading(false); setRefreshing(false); } }
  }, [kind, mood?.id]);
  useEffect(() => { setTracks([]); void load(); return () => { epoch.current++; }; }, [load]);
  const play = (track: Track, index: number) => {
    if (player.current?._id === track._id) return player.togglePlayPause();
    return player.setQueueAndPlay(tracks, index);
  };
  const title = kind === 'radar' ? 'Le prochain coup de cœur.' : mood?.label || 'Ambiance';
  return <CollectionSurface>
    <FlatList data={tracks} keyExtractor={track => track._id} initialNumToRender={8} windowSize={5}
      contentContainerStyle={[layout.pageContent, { paddingTop: insets.top, paddingBottom: layout.miniPlayerClearance + 30 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={p.blue} />}
      ListHeaderComponent={<>
        <CollectionHeader title={kind === 'radar' ? 'Radar' : 'Ambiances'} onBack={() => navigation.goBack()} actions={<CollectionIconButton icon="search-outline" label="Rechercher" onPress={() => navigation.navigate('Search')} />} />
        <LinearGradient colors={mood?.gradient || ['#102936', '#252142']} style={s.hero}>
          {tracks[0]?.coverUrl ? <Image source={{ uri: tracks[0].coverUrl }} blurRadius={35} style={[StyleSheet.absoluteFillObject, { opacity: .22 }]} /> : null}
          <Orbit />
          <View style={s.badge}><Ionicons name={kind === 'radar' ? 'radio-outline' : 'headset-outline'} size={18} color="#A7D9FE" /><Text style={s.kicker}>{kind === 'radar' ? 'EN ÉMERGENCE' : 'TA FRÉQUENCE'}</Text></View>
          <Text style={s.title}>{title}</Text><Text style={s.description}>{kind === 'radar' ? 'Des artistes à découvrir avant les gros chiffres.' : mood?.promise}</Text>
          {tracks.length ? <EntryPressable accessibilityRole="button" onPress={() => void player.setQueueAndPlay(tracks, 0)} style={s.play}><Ionicons name="play" size={20} color="#0E1728" /><Text style={s.playText}>Écouter la sélection</Text></EntryPressable> : null}
        </LinearGradient>
        {tracks.length ? <Text style={[s.count, { color: p.muted }]}>{tracks.length} titres à explorer</Text> : null}
        {error && tracks.length ? <CollectionEmpty title="Actualisation interrompue" text={error} action="Réessayer" onPress={() => void load(true)} /> : null}
      </>}
      ListEmptyComponent={<CollectionEmpty loading={loading} icon="compass-outline" title={loading ? 'À la recherche de nouveaux sons…' : error ? 'La sélection n’a pas pu être chargée' : 'La sélection se prépare'} text={loading ? undefined : error || 'Reviens un peu plus tard ou choisis une autre ambiance.'} action={error ? 'Réessayer' : 'Retour à Explorer'} onPress={loading ? undefined : error ? () => void load() : () => navigation.goBack()} />}
      renderItem={({ item, index }) => <MusicRow track={item} playing={player.current?._id === item._id && player.isPlaying} onPlay={() => void play(item, index)} onOpen={() => navigation.navigate('TrackDetail', { trackId: item._id, track: item })} onMore={() => setSelected(item)} />}
    /><TrackActionsSheet track={selected} onClose={() => setSelected(null)} />
  </CollectionSurface>;
}
function Orbit() {
  const animate = useEntryMotion(); const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!animate) { progress.setValue(0); return; } const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 15000, useNativeDriver: true, isInteraction: false })); loop.start(); return () => loop.stop(); }, [animate, progress]);
  return <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[s.orbit, { transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}><View style={s.innerOrbit} /><View style={s.star} /></Animated.View>;
}
const s = StyleSheet.create({
  hero: { padding: 26, borderRadius: 30, overflow: 'hidden', minHeight: 300, justifyContent: 'flex-end', marginTop: 12, gap: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 9 }, kicker: { color: '#ADD8F8', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { fontSize: 36, lineHeight: 39, color: '#F2F5FC', fontWeight: '800', maxWidth: 360 }, description: { color: '#C4CEDE', fontSize: 15, lineHeight: 22, maxWidth: 360 },
  play: { marginTop: 8, flexDirection: 'row', gap: 10, minHeight: 50, borderRadius: 28, backgroundColor: '#E0EDFE', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }, playText: { fontWeight: '700', color: '#0E1728', fontSize: 14 },
  count: { fontSize: 12, marginTop: 24, marginBottom: 10 }, orbit: { position: 'absolute', top: -70, right: -60, width: 255, height: 255, borderRadius: 128, borderWidth: 1, borderColor: 'rgba(174,208,255,.16)' }, innerOrbit: { position: 'absolute', inset: 36, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(174,208,255,.12)' }, star: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#B3A6EA', top: 54, right: 12 },
});
