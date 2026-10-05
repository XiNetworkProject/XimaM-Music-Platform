import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getPopularTracks, searchEverything } from '@/api/client';
import type { Creator, SearchResults, Track } from '@/api/types';
import { CollectionEmpty, CollectionHeader, CollectionHeading, CollectionReveal, CollectionSurface, CollectionTabs, MusicRow, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { TrackActionsSheet } from '@/components/ui/TrackActionsSheet';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraSearchField } from '@/components/search/SynauraSearchField';
import { recentSearches, SEARCH_FILTERS, searchCount, uniqueSearchResults, type SearchFilter } from '@/components/search/searchModel';

const RECENT_KEY = 'synaura.search.recent.v2';
const EMPTY_RESULTS: SearchResults = { tracks: [], artists: [], playlists: [], posts: [] };

export function SearchScreen() {
  const layout = useResponsiveLayout();
  const p = useCollectionPalette();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<SearchFilter>('all');
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [resolvedQuery, setResolvedQuery] = React.useState('');
  const [popular, setPopular] = React.useState<Track[]>([]);
  const [popularLoading, setPopularLoading] = React.useState(true);
  const [recent, setRecent] = React.useState<string[]>([]);
  const recentTouched = React.useRef(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retry, setRetry] = React.useState(0);
  const [selectedTrack, setSelectedTrack] = React.useState<Track | null>(null);
  const scroll = React.useRef<ScrollView>(null);
  const value = query.trim();
  const searching = value.length >= 2;
  const pending = searching && (loading || resolvedQuery !== value);

  React.useEffect(() => {
    let current = true;
    getPopularTracks().then(items => { if (current) setPopular(items.slice(0, 8)); })
      .catch(() => {}).finally(() => { if (current) setPopularLoading(false); });
    AsyncStorage.getItem(RECENT_KEY).then(raw => {
      if (!current || recentTouched.current) return;
      try { setRecent(recentSearches(raw ? JSON.parse(raw) : [])); } catch { setRecent([]); }
    }).catch(() => {});
    return () => { current = false; };
  }, []);

  React.useEffect(() => {
    if (typeof route.params?.query === 'string') setQuery(route.params.query.trim());
  }, [route.params?.query]);

  React.useEffect(() => {
    let cancelled = false;
    setResults(EMPTY_RESULTS); setError(null);
    if (value.length < 2) { setLoading(false); setResolvedQuery(''); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const next = await searchEverything(value);
        if (!cancelled) { setResults(uniqueSearchResults(next)); setResolvedQuery(value); }
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : 'Recherche impossible'); setResolvedQuery(value); }
      } finally { if (!cancelled) setLoading(false); }
    }, 260);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value, retry]);

  const remember = (term = value) => {
    if (term.trim().length < 2) return;
    recentTouched.current = true;
    const next = recentSearches([term, ...recent]);
    setRecent(next);
    void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  };
  const chooseQuery = (term: string) => { setQuery(term); setFilter('all'); Keyboard.dismiss(); };
  const play = async (track: Track, source: Track[], index: number) => {
    remember(searching ? value : track.title); Keyboard.dismiss();
    if (player.current?._id === track._id) await player.togglePlayPause();
    else await player.setQueueAndPlay(source, index);
  };
  const openTrack = (track: Track) => { remember(); Keyboard.dismiss(); navigation.navigate('TrackDetail', { trackId: track._id, track }); };
  const count = searchCount(results, filter);
  const show = (kind: SearchFilter) => filter === 'all' || filter === kind;
  const rows = (tracks: Track[]) => tracks.map((track, index) => <MusicRow key={track._id} track={track}
    playing={player.current?._id === track._id && player.isPlaying} onPlay={() => void play(track, tracks, index)}
    onOpen={() => openTrack(track)} onMore={() => { Keyboard.dismiss(); setSelectedTrack(track); }} />);

  return <CollectionSurface><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
    <View style={[layout.pageContent, { paddingTop: layout.insets.top, paddingBottom: 8 }]}>
      <CollectionHeader title="Rechercher" onBack={() => navigation.goBack()} />
      <SynauraSearchField value={query} onChangeText={setQuery} onSubmit={() => { remember(); Keyboard.dismiss(); }}
        onClear={() => chooseQuery('')} loading={pending} placeholder="Un son, un artiste…" />
      {searching ? <CollectionTabs value={filter} options={SEARCH_FILTERS.map(option => ({ ...option, count: !pending ? searchCount(results, option.value) : undefined }))}
        onChange={next => { setFilter(next); Keyboard.dismiss(); scroll.current?.scrollTo({ y: 0, animated: false }); }} /> : null}
    </View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={[layout.pageContent, { paddingTop: 16, paddingBottom: layout.miniPlayerClearance + 24 }]}>
      {!searching ? <CollectionReveal>
        {recent.length ? <View style={s.section}>
          <CollectionHeading title="Récemment" action="Effacer" onPress={() => { recentTouched.current = true; setRecent([]); void AsyncStorage.removeItem(RECENT_KEY).catch(() => {}); }} />
          <View style={s.chips}>{recent.map(term => <EntryPressable key={term} accessibilityRole="button" accessibilityLabel={'Rechercher ' + term} onPress={() => chooseQuery(term)} style={[s.chip, { backgroundColor: p.surface }]}>
            <Ionicons name="time-outline" size={17} color={p.muted} /><Text numberOfLines={1} style={[s.chipText, { color: p.text }]}>{term}</Text><Ionicons name="arrow-up-outline" size={15} color={p.faint} style={{ transform: [{ rotate: '-45deg' }] }} />
          </EntryPressable>)}</View>
        </View> : null}
        <View style={s.section}><CollectionHeading title="À découvrir" detail="Des sons à lancer, des univers à explorer." />
          {popular.length ? rows(popular) : <CollectionEmpty loading={popularLoading} title={popularLoading ? 'Les sons arrivent…' : 'Qu’as-tu envie d’écouter ?'} text={popularLoading ? undefined : 'Entre un titre, un artiste ou le nom d’une playlist.'} />}
        </View>
      </CollectionReveal> : pending ? <CollectionEmpty loading title="On cherche…" /> : error ?
        <CollectionEmpty icon="cloud-offline-outline" title="La recherche est indisponible" text={error} action="Réessayer" onPress={() => setRetry(next => next + 1)} /> :
        !count ? <CollectionEmpty icon="search-outline" title="Pas encore trouvé." text={'Aucun résultat' + (filter !== 'all' ? ' dans cette catégorie' : '') + ' pour « ' + value + ' ».'}
          action={filter !== 'all' ? 'Voir toutes les catégories' : undefined} onPress={filter !== 'all' ? () => setFilter('all') : undefined} /> :
        <View>
          <Text accessibilityLiveRegion="polite" style={[s.meta, { color: p.muted, marginBottom: 18 }]}>{count} résultat{count > 1 ? 's' : ''} pour « {value} »</Text>
          {show('artists') && results.artists.length ? <View style={s.section}><CollectionHeading title="Artistes" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.artistRail}>
              {results.artists.map(artist => <ArtistCard key={artist.id} artist={artist} onPress={() => { remember(); Keyboard.dismiss(); navigation.navigate('PublicProfile', { username: artist.handle.replace(/^@/, '') }); }} />)}
            </ScrollView>
          </View> : null}
          {show('tracks') && results.tracks.length ? <View style={s.section}><CollectionHeading title="Sons" />{rows(results.tracks)}</View> : null}
          {show('playlists') && results.playlists.length ? <View style={s.section}><CollectionHeading title="Playlists" />
            <View style={s.grid}>{results.playlists.map(playlist => <EntryPressable key={playlist.id} accessibilityRole="button" accessibilityLabel={'Ouvrir la playlist ' + playlist.title}
              onPress={() => { remember(); Keyboard.dismiss(); navigation.navigate('PlaylistDetail', { playlistId: playlist.id }); }}
              style={[s.playlist, { width: layout.gridColumns === 3 ? '31%' : layout.gridColumns === 2 ? '47%' : '100%' }]}>
              <View style={[s.playlistArt, { backgroundColor: p.raised }]}>{playlist.covers[0] ? <Image source={{ uri: playlist.covers[0] }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={38} color={p.blue} />}</View>
              <Text numberOfLines={2} style={[s.resultTitle, { color: p.text }]}>{playlist.title}</Text><Text numberOfLines={1} style={[s.meta, { color: p.muted }]}>{playlist.curator}</Text>
            </EntryPressable>)}</View>
          </View> : null}
          {show('posts') && results.posts.length ? <View style={s.section}><CollectionHeading title="Dans la communauté" />
            {results.posts.map(post => <EntryPressable key={post.id} accessibilityRole="button" accessibilityLabel={'Post de ' + post.author} onPress={() => { remember(); Keyboard.dismiss(); navigation.navigate('PostDetail', { postId: post.id }); }} style={[s.post, { backgroundColor: p.surface }]}>
              <View style={s.postHead}><View style={[s.postAvatar, { backgroundColor: p.raised }]}>{post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="person-outline" size={18} color={p.blue} />}</View><Text style={[s.resultTitle, { flex: 1, color: p.text }]}>{post.author}</Text><Ionicons name="arrow-forward" size={19} color={p.faint} /></View>
              <Text numberOfLines={3} style={[s.postCopy, { color: p.muted }]}>{post.text}</Text>
              {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={s.postImage} /> : null}
            </EntryPressable>)}
          </View> : null}
        </View>}
    </ScrollView>
  </KeyboardAvoidingView><TrackActionsSheet track={selectedTrack} onClose={() => setSelectedTrack(null)} /></CollectionSurface>;
}

function ArtistCard({ artist, onPress }: { artist: Creator; onPress: () => void }) {
  const p = useCollectionPalette();
  return <EntryPressable accessibilityRole="button" accessibilityLabel={'Profil de ' + artist.name} onPress={onPress} style={s.artist}>
    <View style={[s.artistAvatar, { backgroundColor: p.raised }]}>{artist.avatar?.startsWith('http') ? <Image source={{ uri: artist.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={{ color: p.blue, fontSize: 30 }}>{artist.name.slice(0, 1)}</Text>}</View>
    <Text numberOfLines={1} style={[s.resultTitle, { color: p.text, textAlign: 'center' }]}>{artist.name}</Text><Text numberOfLines={1} style={[s.meta, { color: p.muted, textAlign: 'center' }]}>{artist.handle}</Text>
  </EntryPressable>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, section: { marginBottom: 26 }, chips: { gap: 9, flexDirection: 'row', flexWrap: 'wrap' },
  chip: { minHeight: 46, maxWidth: '100%', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, chipText: { fontSize: 14, flexShrink: 1 },
  artistRail: { gap: 18, paddingBottom: 8 }, artist: { width: 110, alignItems: 'center', gap: 3 }, artistAvatar: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  resultTitle: { fontSize: 15, fontWeight: '700' }, meta: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, playlist: { gap: 7 }, playlistArt: { aspectRatio: 1, width: '100%', borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  post: { borderRadius: 22, padding: 18, gap: 12, marginBottom: 12 }, postHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, postAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, postCopy: { fontSize: 15, lineHeight: 23 }, postImage: { width: '100%', aspectRatio: 1.6, borderRadius: 14 },
});
