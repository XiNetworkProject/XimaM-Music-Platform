import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFollowingCreators, getMyProfile, type MobileProfilePlaylist } from '@/api/client';
import type { Creator, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { TrackActionsSheet } from '@/components/ui/TrackActionsSheet';
import { CollectionSurface, CollectionHeader, CollectionIconButton, CollectionTabs, CollectionHeading, CollectionEmpty, MusicRow, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { collectionSearch as normalize, filterCollectionTracks } from '@/components/mobile/collectionModel';

type LibraryTab = 'favorites' | 'recent' | 'downloaded' | 'queue' | 'playlists' | 'artists';
type LibraryItem = { kind: 'track'; track: Track; index: number } | { kind: 'playlist'; playlist: MobileProfilePlaylist } | { kind: 'artist'; artist: Creator };
const labels: Record<LibraryTab, string> = { favorites: 'Sons aimés', recent: 'Écoutés récemment', downloaded: 'Disponibles hors ligne', queue: 'File d’attente', playlists: 'Playlists du profil', artists: 'Artistes suivis' };
const empty: Record<LibraryTab, [string, string]> = {
  favorites: ['Garde ce qui te touche.', 'Un cœur sur un morceau, et tu le retrouves ici.'],
  recent: ['Ton prochain coup de cœur t’attend.', 'Les morceaux que tu écoutes restent à portée de main.'],
  downloaded: ['Ta musique, même sans réseau.', 'Ouvre les options d’un morceau pour le télécharger.'],
  queue: ['La suite t’appartient.', 'Lance une sélection pour retrouver les prochains morceaux ici.'],
  playlists: ['Compose ta collection.', 'Les playlists de ton profil apparaîtront ici.'],
  artists: ['Retrouve tes artistes.', 'Abonne-toi depuis leur profil pour les garder ici.'],
};

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const library = useLibrary();
  const player = usePlayer();
  const p = useCollectionPalette();
  const layout = useResponsiveLayout();
  const [tab, setTab] = useState<LibraryTab>('favorites');
  const [query, setQuery] = useState('');
  const [playlists, setPlaylists] = useState<MobileProfilePlaylist[]>([]);
  const [following, setFollowing] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Track | null>(null);
  const requestId = useRef(0);
  const list = useRef<FlatList<LibraryItem>>(null);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!auth.user) { setPlaylists([]); setFollowing([]); setLoading(false); setFailed(false); return; }
    setLoading(true); setFailed(false);
    const results = await Promise.allSettled([getMyProfile(), getFollowingCreators()]);
    if (id !== requestId.current) return;
    if (results[0].status === 'fulfilled') setPlaylists(results[0].value.playlists);
    if (results[1].status === 'fulfilled') setFollowing(results[1].value);
    setFailed(results.some(result => result.status === 'rejected'));
    setLoading(false);
  }, [auth.user?.id]);
  useEffect(() => { setPlaylists([]); setFollowing([]); void load(); return () => { requestId.current += 1; }; }, [load]);
  const source = tab === 'favorites' ? library.favorites : tab === 'recent' ? library.recent : tab === 'downloaded' ? library.downloaded : player.queue;
  const needle = normalize(query);
  const data: LibraryItem[] = tab === 'playlists'
    ? playlists.filter(item => normalize(item.title).includes(needle)).map(playlist => ({ kind: 'playlist', playlist }))
    : tab === 'artists'
      ? following.filter(item => normalize(item.name + ' ' + item.handle).includes(needle)).map(artist => ({ kind: 'artist', artist }))
      : filterCollectionTracks(source, query);
  const accountTab = tab === 'playlists' || tab === 'artists';
  const play = async (track: Track, index: number) => {
    try {
      if (player.current?._id === track._id) await player.togglePlayPause();
      else await player.setQueueAndPlay(source, index);
    } catch { Alert.alert('Lecture indisponible', 'Réessaie dans un instant.'); }
  };
  const open = (track: Track) => navigation.navigate('TrackDetail', { trackId: track._id, track });
  return <CollectionSurface>
    <FlatList<LibraryItem>
      ref={list} data={data} initialNumToRender={12} windowSize={7} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      keyExtractor={item => item.kind === 'track' ? 'track-' + item.track._id + '-' + item.index : item.kind === 'playlist' ? 'playlist-' + item.playlist.id : 'artist-' + item.artist.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[layout.pageContent, { paddingTop: layout.insets.top + 8, paddingBottom: layout.miniPlayerClearance + 20 }]}
      refreshControl={accountTab && auth.user ? <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={p.blue} /> : undefined}
      ListHeaderComponent={<View style={{ gap: 15 }}>
        <CollectionHeader title="Bibliothèque" eyebrow="TA COLLECTION" actions={<CollectionIconButton icon="search-outline" label="Explorer Synaura" onPress={() => navigation.navigate('Discover')} />} />
        <View style={[s.search, { backgroundColor: p.surface }]}><Ionicons name="search-outline" size={20} color={p.muted} /><TextInput accessibilityLabel="Chercher dans la bibliothèque" value={query} onChangeText={setQuery} placeholder="Un titre, un artiste…" placeholderTextColor={p.muted} style={[s.input, { color: p.text }]} returnKeyType="search" />{query ? <CollectionIconButton icon="close" label="Effacer la recherche" onPress={() => setQuery('')} /> : null}</View>
        <CollectionTabs value={tab} onChange={next => { setTab(next); list.current?.scrollToOffset({ offset: 0, animated: false }); }} options={[
          { value: 'favorites', label: 'Aimés', icon: 'heart-outline', count: library.favorites.length },
          { value: 'recent', label: 'Récents', icon: 'time-outline' },
          { value: 'downloaded', label: 'Hors ligne', icon: 'download-outline' },
          { value: 'queue', label: 'File', icon: 'list-outline' },
          { value: 'playlists', label: 'Playlists', icon: 'albums-outline' },
          { value: 'artists', label: 'Artistes', icon: 'people-outline' },
        ]} />
        {tab === 'favorites' && !needle && library.recent[0] ? <View style={[s.resume, { backgroundColor: p.surface }]}>
          <Text style={[s.kicker, { color: p.blue }]}>ON REPREND ?</Text>
          <MusicRow track={library.recent[0]} playing={player.current?._id === library.recent[0]._id && player.isPlaying} onPlay={() => { void (player.current?._id === library.recent[0]._id ? player.togglePlayPause() : player.setQueueAndPlay(library.recent, 0)).catch(() => Alert.alert('Lecture indisponible')); }} onOpen={() => open(library.recent[0])} />
        </View> : null}
        <CollectionHeading title={labels[tab]} detail={data.length ? data.length + (tab === 'artists' ? ' artiste(s)' : ' élément(s)') : undefined} action="Effacer" onPress={tab === 'recent' && library.recent.length ? () => Alert.alert('Effacer l’historique ?', 'Les morceaux et les favoris seront conservés.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Effacer', style: 'destructive', onPress: library.clearRecent }]) : undefined} />
        {accountTab && failed ? <EntryPressable accessibilityRole="button" onPress={() => void load()} style={[s.notice, { backgroundColor: p.surface }]}><Text style={{ color: p.muted }}>Actualisation impossible. Toucher pour réessayer.</Text></EntryPressable> : null}
      </View>}
      ListEmptyComponent={<CollectionEmpty icon={tab === 'favorites' ? 'heart-outline' : tab === 'artists' ? 'people-outline' : 'albums-outline'}
        loading={accountTab && loading}
        title={accountTab && loading ? 'Chargement de ta collection…' : accountTab && !auth.user ? 'Retrouve ton compte.' : needle ? 'Aucun résultat' : empty[tab][0]}
        text={accountTab && !auth.user ? 'Connecte-toi pour retrouver tes playlists et artistes suivis.' : needle ? 'Essaie un autre titre ou artiste.' : empty[tab][1]}
        action={accountTab && !auth.user ? 'Se connecter' : 'Explorer la musique'}
        onPress={accountTab && loading ? undefined : () => navigation.navigate(accountTab && !auth.user ? 'Login' : 'Discover')} />}
      renderItem={({ item }) => item.kind === 'track' ? <MusicRow track={item.track} playing={player.current?._id === item.track._id && player.isPlaying} onPlay={() => void play(item.track, item.index)} onOpen={() => open(item.track)} onMore={() => setSelected(item.track)} /> : item.kind === 'playlist'
        ? <EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.playlist.id })} style={s.entity}><View style={[s.entityArt, { backgroundColor: p.raised }]}>{item.playlist.coverUrl ? <SynauraImage source={item.playlist.coverUrl} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={24} color={p.blue} />}</View><View style={{ flex: 1 }}><Text style={[s.name, { color: p.text }]}>{item.playlist.title}</Text><Text style={[s.meta, { color: p.muted }]}>{item.playlist.tracksCount} titres</Text></View><Ionicons name="chevron-forward" size={17} color={p.muted} /></EntryPressable>
        : <EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('PublicProfile', { username: item.artist.handle.replace(/^@/, '') })} style={s.entity}><View style={[s.entityArt, { borderRadius: 32, backgroundColor: p.raised }]}>{item.artist.avatar?.startsWith('http') ? <SynauraImage source={item.artist.avatar} style={StyleSheet.absoluteFillObject} /> : <Text style={{ color: p.blue, fontSize: 24 }}>{item.artist.name.charAt(0)}</Text>}</View><View style={{ flex: 1 }}><Text style={[s.name, { color: p.text }]}>{item.artist.name}</Text><Text style={[s.meta, { color: p.muted }]}>{item.artist.handle}</Text></View><Ionicons name="chevron-forward" size={17} color={p.muted} /></EntryPressable>}
    />
    <TrackActionsSheet track={selected} onClose={() => setSelected(null)} />
  </CollectionSurface>;
}
const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingLeft: 16, paddingRight: 5, minHeight: 54 },
  input: { flex: 1, minWidth: 0, fontSize: 15, minHeight: 54 }, resume: { padding: 14, paddingBottom: 5, borderRadius: 22, marginBottom: 8 }, kicker: { fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  notice: { borderRadius: 14, padding: 15 }, entity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  entityArt: { width: 62, height: 62, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, name: { fontSize: 16, fontWeight: '700' }, meta: { fontSize: 12, marginTop: 5 },
});
