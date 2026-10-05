import React from 'react';
import { FlatList, Image, Keyboard, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_BASE_URL, getPlaylistDetail, setTrackLike, type PlaylistDetail } from '@/api/client';
import type { Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntityShareSheet } from '@/components/sharing/EntityShareSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CollectionEmpty, CollectionHeader, CollectionHeading, CollectionIconButton, CollectionSurface, CollectionTabs, MusicRow, musicArtist, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraSearchField } from '@/components/search/SynauraSearchField';
import { shuffledTracks } from '@/components/search/searchModel';
import { collectionSearch } from '@/components/mobile/collectionModel';

type SortMode = 'position' | 'title' | 'duration';
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'position', label: 'Ordre original' }, { value: 'title', label: 'Titre A–Z' }, { value: 'duration', label: 'Durée' },
];
const NO_TRACKS: Track[] = [];
function duration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  return hours ? hours + ' h ' + Math.floor(total % 3600 / 60) + ' min' : Math.floor(total / 60) + ' min';
}

export function PlaylistDetailScreen() {
  const layout = useResponsiveLayout();
  const p = useCollectionPalette();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const library = useLibrary();
  const playlistId = String(route.params?.playlistId || route.params?.slug || '');
  const [playlist, setPlaylist] = React.useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retry, setRetry] = React.useState(0);
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = React.useState<Record<string, number>>({});
  const likePending = React.useRef(new Set<string>());
  const entityVersion = React.useRef(0);
  const [query, setQuery] = React.useState('');
  const [genre, setGenre] = React.useState('Tous');
  const [sort, setSort] = React.useState<SortMode>('position');
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [selectedTrack, setSelectedTrack] = React.useState<Track | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [shareCollectionOpen, setShareCollectionOpen] = React.useState(false);
  const [shareTrackTarget, setShareTrackTarget] = React.useState<Track | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  React.useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  React.useEffect(() => {
    const version = ++entityVersion.current;
    setPlaylist(null); setLoading(true); setError(null);
    setQuery(''); setGenre('Tous'); setSort('position'); setToolsOpen(false);
    setSelectedTrack(null); setShareTrackTarget(null); setShareCollectionOpen(false);
    likePending.current.clear();
    getPlaylistDetail(playlistId).then(next => {
      if (entityVersion.current !== version) return;
      setPlaylist(next);
      setLiked(Object.fromEntries(next.tracksList.map(track => [track._id, Boolean(track.isLiked)])));
      setLikeCounts(Object.fromEntries(next.tracksList.map(track => [track._id, Number(track.likesCount || 0)])));
    }).catch(caught => {
      if (entityVersion.current === version) setError(caught instanceof Error ? caught.message : 'Impossible de charger cette playlist.');
    }).finally(() => { if (entityVersion.current === version) setLoading(false); });
    return () => { entityVersion.current++; };
  }, [playlistId, retry]);

  const collection = playlist?.collection;
  const isEditorial = Boolean(playlist?.isEditorial || collection);
  const tracks = playlist?.tracksList || NO_TRACKS;
  const cover = collection?.coverUrl || playlist?.coverUrl || playlist?.covers?.[0];
  const banner = collection?.bannerUrl || playlist?.bannerUrl || cover;
  const title = collection?.title || playlist?.title || '';
  const description = collection?.description || playlist?.description || playlist?.vibe;
  const subtitle = collection?.subtitle;
  const badge = collection?.badge || playlist?.badge || (isEditorial ? 'Synaura Originals' : 'Playlist');
  const totalDuration = React.useMemo(() => tracks.reduce((sum, track) => sum + Number(track.duration || 0), 0), [tracks]);
  const totalLikes = React.useMemo(() => Object.values(likeCounts).reduce((sum, count) => sum + count, 0), [likeCounts]);
  const genres = React.useMemo(() => ['Tous', ...Array.from(new Set(tracks.flatMap(track => track.genre || []))).filter(Boolean).slice(0, 16)], [tracks]);
  const visibleTracks = React.useMemo(() => {
    const q = collectionSearch(query);
    const next = tracks.filter(track => (genre === 'Tous' || (track.genre || []).includes(genre))
      && collectionSearch([track.title, musicArtist(track), ...(track.genre || [])].join(' ')).includes(q));
    if (sort === 'title') next.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    if (sort === 'duration') next.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return next;
  }, [tracks, query, genre, sort]);
  const slug = collection?.slug || playlist?.slug || playlist?.id || '';
  const webUrl = API_BASE_URL + '/playlists/' + encodeURIComponent(slug);
  const commentsEnabled = collection?.commentsEnabled !== false && playlist?.commentsEnabled !== false;
  const canDownload = collection?.downloadEnabled !== false && playlist?.downloadEnabled !== false;
  const resetFilters = () => { setQuery(''); setGenre('Tous'); setSort('position'); };
  const playFrom = async (list: Track[], index = 0) => {
    if (!list.length) return;
    Keyboard.dismiss();
    void Haptics.selectionAsync().catch(() => {});
    try { await player.setQueueAndPlay(list, index); } catch { showToast('Lecture indisponible. Réessaie.'); }
  };
  const playTrack = async (track: Track, index: number) => {
    if (player.current?._id === track._id) await player.togglePlayPause();
    else await playFrom(visibleTracks, index);
  };
  const copyLink = async () => {
    try { await Clipboard.setStringAsync(webUrl); showToast('Lien copié'); } catch { showToast('Copie impossible.'); }
  };
  const queueTrack = (track: Track) => { player.addNext(track); showToast('À suivre · ' + track.title); };
  const toggleLike = async (track: Track) => {
    if (likePending.current.has(track._id)) return;
    const version = entityVersion.current;
    likePending.current.add(track._id);
    const before = Boolean(liked[track._id]);
    const beforeCount = likeCounts[track._id] || 0;
    setLiked(previous => ({ ...previous, [track._id]: !before }));
    setLikeCounts(previous => ({ ...previous, [track._id]: Math.max(0, beforeCount + (before ? -1 : 1)) }));
    try {
      const result = await setTrackLike(track._id, !before);
      if (entityVersion.current !== version) return;
      if (!result) throw new Error('like failed');
      setLiked(previous => ({ ...previous, [track._id]: result.liked }));
      setLikeCounts(previous => ({ ...previous, [track._id]: result.likesCount }));
    } catch {
      if (entityVersion.current !== version) return;
      setLiked(previous => ({ ...previous, [track._id]: before }));
      setLikeCounts(previous => ({ ...previous, [track._id]: beforeCount }));
      showToast('Réaction non enregistrée. Vérifie ta connexion et ton compte.');
    } finally { if (entityVersion.current === version) likePending.current.delete(track._id); }
  };
  const downloadTrack = async (track: Track) => {
    if (!canDownload || !track.audioUrl) return;
    try { await library.downloadTrack(track); } catch { showToast('Téléchargement impossible.'); }
  };
  const openDetail = (track: Track) => {
    setSelectedTrack(null); Keyboard.dismiss();
    navigation.navigate('TrackDetail', { trackId: track._id, track });
  };

  return <CollectionSurface>
    <View style={[layout.pageContent, { paddingTop: layout.insets.top }]}>
      <CollectionHeader title={isEditorial ? 'Collection' : 'Playlist'} onBack={() => navigation.goBack()} actions={playlist ? <>
        <CollectionIconButton icon="share-outline" label="Partager la playlist" onPress={() => setShareCollectionOpen(true)} />
        <CollectionIconButton icon="ellipsis-horizontal" label="Options de la playlist" onPress={() => setToolsOpen(true)} />
      </> : undefined} />
    </View>
    <FlatList<Track> data={loading ? NO_TRACKS : visibleTracks} keyExtractor={(track, index) => track._id + ':' + index}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={[layout.pageContent, { paddingBottom: layout.miniPlayerClearance + 28 }]}
      initialNumToRender={8} windowSize={7}
      ListHeaderComponent={playlist ? <>
        {/* Keep the late-mounted FlatList header opaque; touch feedback stays animated. */}
        <View>
          <View style={[s.artStage, { height: layout.isPhoneLandscape ? 220 : 302, backgroundColor: p.surface }]}>
            {banner ? <Image source={{ uri: banner }} blurRadius={22} style={[StyleSheet.absoluteFillObject, { opacity: .5 }]} /> : null}
            <LinearGradient pointerEvents="none" colors={['rgba(7,10,16,.08)', 'rgba(7,10,16,.65)']} style={StyleSheet.absoluteFillObject} />
            <EntryPressable accessibilityRole="button" accessibilityLabel={'Lire ' + title} disabled={!tracks.length}
              onPress={() => void playFrom(tracks)} style={[s.cover, { width: layout.isPhoneLandscape ? 172 : Math.min(238, layout.availableContentWidth - 50), backgroundColor: p.raised }]}>
              {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={64} color={p.blue} />}
            </EntryPressable>
            <View pointerEvents="none" style={s.coverBadge}><Ionicons name={isEditorial ? 'sparkles' : 'musical-notes'} size={12} color="#DDEBFF" /><Text style={s.badge}>{badge}</Text></View>
          </View>
          <View style={s.heroCopy}><Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
            {subtitle ? <Text style={[s.subtitle, { color: p.muted }]}>{subtitle}</Text> : null}
            <Text style={[s.meta, { color: p.muted }]}>{playlist.curator || 'Synaura'} · {tracks.length} titre{tracks.length > 1 ? 's' : ''} · {duration(totalDuration)}</Text>
          </View>
          <View style={s.mainActions}>
            <EntryPressable accessibilityRole="button" disabled={!tracks.length} onPress={() => void playFrom(tracks)} style={[s.play, { backgroundColor: p.text }]}><Ionicons name="play" size={22} color={p.bg} /><Text style={[s.playText, { color: p.bg }]}>Tout écouter</Text></EntryPressable>
            <EntryPressable accessibilityRole="button" accessibilityLabel="Lire la playlist en aléatoire" disabled={!tracks.length} onPress={() => void playFrom(shuffledTracks(tracks))} style={[s.shuffle, { backgroundColor: p.surface }]}><Ionicons name="shuffle" size={26} color={p.text} /></EntryPressable>
          </View>
        </View>
        <View style={s.filters}><CollectionHeading title="Les titres" action="Filtrer" onPress={() => setToolsOpen(true)} />
          <SynauraSearchField value={query} onChangeText={setQuery} onClear={() => setQuery('')} onSubmit={Keyboard.dismiss} placeholder="Dans cette playlist…" />
          {genre !== 'Tous' || sort !== 'position' ? <EntryPressable accessibilityRole="button" onPress={resetFilters} style={s.activeFilter}><Text style={{ color: p.blue, fontSize: 13 }}>{genre} · {SORT_OPTIONS.find(item => item.value === sort)?.label}</Text><Ionicons name="close-circle-outline" size={20} color={p.blue} /></EntryPressable> : null}
        </View>
      </> : null}
      renderItem={({ item: track, index }) => <MusicRow track={track} playing={player.current?._id === track._id && player.isPlaying}
        onPlay={() => void playTrack(track, index)} onOpen={() => openDetail(track)} onMore={() => { Keyboard.dismiss(); setSelectedTrack(track); }} />}
      ListEmptyComponent={loading ? <CollectionEmpty loading title="La playlist arrive…" /> : error ?
        <CollectionEmpty icon="cloud-offline-outline" title="Playlist indisponible" text={error} action="Réessayer" onPress={() => setRetry(value => value + 1)} /> :
        <CollectionEmpty icon="musical-notes-outline" title={tracks.length ? 'Aucun titre ne correspond.' : 'Cette playlist attend ses sons.'}
          action={tracks.length ? 'Réinitialiser les filtres' : undefined} onPress={tracks.length ? resetFilters : undefined} />}
      ListFooterComponent={playlist && description ? <View style={[s.about, { backgroundColor: p.surface }]}><Text style={[s.aboutTitle, { color: p.text }]}>À propos</Text><Text style={[s.description, { color: p.muted }]}>{description}</Text><Text style={[s.meta, { color: p.faint }]}>{totalLikes} réaction{totalLikes > 1 ? 's' : ''}</Text></View> : null}
    />
    <BottomSheet visible={toolsOpen} title="Ta playlist, ton rythme" onClose={() => setToolsOpen(false)}>
      <ScrollView contentContainerStyle={s.sheet} keyboardShouldPersistTaps="handled">
        <CollectionHeading title="Trier les titres" />
        <CollectionTabs options={SORT_OPTIONS} value={sort} onChange={setSort} />
        {genres.length > 1 ? <><Text style={[s.groupLabel, { color: p.muted }]}>Genres</Text><View style={s.genreChips}>{genres.map(item => <EntryPressable key={item} accessibilityRole="button" accessibilityState={{ selected: genre === item }} onPress={() => setGenre(item)} style={[s.genre, { backgroundColor: genre === item ? p.text : p.surface }]}><Text style={{ color: genre === item ? p.bg : p.text, fontSize: 14 }}>{item}</Text></EntryPressable>)}</View></> : null}
        <MenuAction icon="play-outline" title={'Écouter la sélection · ' + visibleTracks.length} disabled={!visibleTracks.length} onPress={() => { setToolsOpen(false); void playFrom(visibleTracks); }} />
        <MenuAction icon="copy-outline" title="Copier le lien" onPress={() => { setToolsOpen(false); void copyLink(); }} />
        {isEditorial && collection?.slug ? <MenuAction icon="open-outline" title="Voir sur le web" onPress={() => { setToolsOpen(false); void Linking.openURL(webUrl).catch(() => showToast('Lien indisponible.')); }} /> : null}
        <EntryPressable accessibilityRole="button" onPress={() => setToolsOpen(false)} style={[s.done, { backgroundColor: p.text }]}><Text style={[s.playText, { color: p.bg }]}>Afficher les titres</Text></EntryPressable>
      </ScrollView>
    </BottomSheet>
    <BottomSheet visible={Boolean(selectedTrack) && !shareTrackTarget} title={selectedTrack?.title} subtitle={selectedTrack ? musicArtist(selectedTrack) : undefined} onClose={() => setSelectedTrack(null)}>
      {selectedTrack ? <ScrollView contentContainerStyle={s.sheet}>
        <MenuAction icon={liked[selectedTrack._id] ? 'heart' : 'heart-outline'} title={(liked[selectedTrack._id] ? 'Ne plus aimer' : 'J’aime') + ' · ' + (likeCounts[selectedTrack._id] || 0)} onPress={() => void toggleLike(selectedTrack)} />
        <MenuAction icon="play-forward-outline" title="Écouter ensuite" onPress={() => { queueTrack(selectedTrack); setSelectedTrack(null); }} />
        {commentsEnabled ? <MenuAction icon="chatbubble-outline" title="Commentaires et détails" onPress={() => openDetail(selectedTrack)} /> : <MenuAction icon="information-circle-outline" title="Voir le morceau" onPress={() => openDetail(selectedTrack)} />}
        <MenuAction icon="share-outline" title="Partager ce son" onPress={() => setShareTrackTarget(selectedTrack)} />
        {canDownload && selectedTrack.audioUrl ? <MenuAction icon="download-outline" title="Télécharger" onPress={() => { void downloadTrack(selectedTrack); setSelectedTrack(null); }} /> : null}
      </ScrollView> : null}
    </BottomSheet>
    <EntityShareSheet visible={shareCollectionOpen && Boolean(playlist)} title={title || 'Playlist Synaura'} subtitle={subtitle || description}
      kindLabel="Playlist" url={webUrl} imageUrl={playlist ? webUrl + '/opengraph-image' : null} fileKey={'playlist-' + (slug || 'synaura')} onClose={() => setShareCollectionOpen(false)} />
    <ShareSheet visible={Boolean(shareTrackTarget)} track={shareTrackTarget} onClose={() => { setShareTrackTarget(null); setSelectedTrack(null); }} />
    {toast ? <View pointerEvents="none" style={[s.toast, { bottom: layout.miniPlayerClearance + 8, backgroundColor: p.text }]}><Text accessibilityLiveRegion="polite" style={{ color: p.bg, textAlign: 'center', fontSize: 14 }}>{toast}</Text></View> : null}
  </CollectionSurface>;
}

function MenuAction({ icon, title, onPress, disabled = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void; disabled?: boolean }) {
  const p = useCollectionPalette();
  return <EntryPressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={s.menuAction}><Ionicons name={icon} size={24} color={p.blue} /><Text style={[s.menuText, { color: p.text }]}>{title}</Text></EntryPressable>;
}
const s = StyleSheet.create({
  artStage: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 6 },
  cover: { aspectRatio: 1, borderRadius: 21, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-4deg' }], elevation: 12, shadowColor: '#000', shadowOpacity: .35, shadowRadius: 25, shadowOffset: { width: 0, height: 14 } },
  coverBadge: { position: 'absolute', bottom: 12, left: 15, right: 15, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, badge: { color: '#DDEBFF', fontSize: 11, fontWeight: '700', letterSpacing: 1, flexShrink: 1 },
  heroCopy: { gap: 9, paddingTop: 22 }, title: { fontSize: 30, fontWeight: '800' }, subtitle: { fontSize: 15, lineHeight: 22 }, meta: { fontSize: 12, lineHeight: 19 },
  mainActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 21, marginBottom: 28 }, play: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28 }, playText: { fontSize: 16, fontWeight: '800' }, shuffle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  filters: { marginBottom: 10 }, activeFilter: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 4 }, about: { borderRadius: 24, padding: 22, gap: 12, marginTop: 28 }, aboutTitle: { fontSize: 19, fontWeight: '700' }, description: { fontSize: 15, lineHeight: 24 },
  sheet: { padding: 20, paddingBottom: 30, gap: 10 }, groupLabel: { marginTop: 14, fontSize: 13, fontWeight: '700' }, genreChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 14 }, genre: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 23 },
  menuAction: { flexDirection: 'row', alignItems: 'center', gap: 15, minHeight: 56, paddingVertical: 10 }, menuText: { flex: 1, fontSize: 16, fontWeight: '600' }, done: { borderRadius: 26, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 14 },
});
