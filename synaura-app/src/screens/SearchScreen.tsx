import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getPopularTracks, searchEverything } from '@/api/client';
import type { Creator, SearchResults, Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { TrackActionsSheet } from '@/components/ui/TrackActionsSheet';
import { TrackListItem } from '@/components/ui/TrackListItem';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const RECENT_KEY = 'synaura.search.recent.v2';
const EMPTY_RESULTS: SearchResults = { tracks: [], artists: [], playlists: [], posts: [] };

export function SearchScreen() {
  const responsive = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const library = useLibrary();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [popular, setPopular] = React.useState<Track[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = React.useState<Track | null>(null);

  React.useEffect(() => {
    getPopularTracks().then((items) => setPopular(items.slice(0, 8))).catch(() => {});
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      try { setRecent(raw ? JSON.parse(raw) : []); } catch { setRecent([]); }
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    const initialQuery = String(route.params?.query || '').trim();
    if (initialQuery) setQuery(initialQuery);
  }, [route.params?.query]);

  React.useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults(EMPTY_RESULTS);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await searchEverything(value);
        if (!cancelled) setResults(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Recherche impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 260);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const submitRecent = (value = query.trim()) => {
    if (value.length < 2) return;
    const next = [value, ...recent.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecent(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  };

  const hasResults = results.tracks.length + results.artists.length + results.playlists.length + results.posts.length > 0;

  return (
    <SynauraBackground>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, responsive.contentFrame, { paddingBottom: responsive.miniPlayerClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Recherche" subtitle="Sons, artistes, playlists et communauté" onBack={() => navigation.goBack()} />
        <View style={styles.search}>
          <Ionicons name="search" size={19} color={colors.textTertiary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submitRecent()}
            placeholder="Que veux-tu écouter ?"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            style={styles.input}
          />
          {query ? <Pressable onPress={() => setQuery('')} style={styles.clear}><Ionicons name="close" size={17} color={colors.textSecondary} /></Pressable> : null}
        </View>

        {loading ? <LoadingSkeleton rows={4} /> : null}

        {!loading && query.trim().length < 2 ? (
          <>
            {recent.length ? <Section title="Recherches récentes" action="Effacer" onAction={() => { setRecent([]); AsyncStorage.removeItem(RECENT_KEY).catch(() => {}); }}>
              <View style={styles.chips}>{recent.map((item) => <Pressable key={item} onPress={() => setQuery(item)} style={styles.chip}><Ionicons name="time-outline" size={14} color={colors.textSecondary} /><Text style={styles.chipText}>{item}</Text></Pressable>)}</View>
            </Section> : null}
            <Section title="Tendances">
              <View style={styles.list}>{popular.map((track) => <TrackListItem key={track._id} track={track} active={player.current?._id === track._id} favorite={library.isFavorite(track._id)} onPlay={() => { submitRecent(track.title); void player.playTrack(track); }} onToggleFavorite={() => library.toggleFavorite(track)} onMore={() => setSelectedTrack(track)} />)}</View>
            </Section>
          </>
        ) : null}

        {!loading && query.trim().length >= 2 && !hasResults ? <EmptyState icon="search-outline" title="Aucun résultat" text={error || `Rien trouvé pour « ${query.trim()} ». Essaie un artiste, un titre ou un style.`} /> : null}

        {!loading && results.artists.length ? <Section title="Artistes">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
            {results.artists.map((artist) => <ArtistCard key={artist.id} artist={artist} onPress={() => { submitRecent(); navigation.navigate('PublicProfile', { username: artist.handle.replace(/^@/, '') }); }} />)}
          </ScrollView>
        </Section> : null}

        {!loading && results.tracks.length ? <Section title="Sons" action={`${results.tracks.length}`}>
          <View style={styles.list}>{results.tracks.map((track) => <TrackListItem key={track._id} track={track} active={player.current?._id === track._id} favorite={library.isFavorite(track._id)} onPlay={() => { submitRecent(); void player.playTrack(track); }} onToggleFavorite={() => library.toggleFavorite(track)} onMore={() => setSelectedTrack(track)} />)}</View>
        </Section> : null}

        {!loading && results.playlists.length ? <Section title="Playlists">
          <View style={styles.playlistGrid}>{results.playlists.map((playlist) => <Pressable key={playlist.id} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })} style={[styles.playlist, { width: responsive.gridColumns === 3 ? '31.5%' : responsive.gridColumns === 2 ? '47%' : '100%' }]}><View style={styles.playlistCover}>{playlist.covers[0] ? <Image source={{ uri: playlist.covers[0] }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={24} color={colors.textTertiary} />}</View><Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text><Text numberOfLines={1} style={styles.playlistMeta}>{playlist.curator}</Text></Pressable>)}</View>
        </Section> : null}

        {!loading && results.posts.length ? <Section title="Communauté">
          <View style={styles.list}>{results.posts.map((post) => <Pressable key={post.id} onPress={() => navigation.navigate('PostDetail', { postId: post.id })} style={styles.post}><View style={styles.postAvatar}><Text style={styles.postAvatarText}>{post.author.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.postAuthor}>{post.author}</Text><Text numberOfLines={2} style={styles.postText}>{post.text}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /></Pressable>)}</View>
        </Section> : null}
      </ScrollView>
      <TrackActionsSheet track={selectedTrack} onClose={() => setSelectedTrack(null)} />
    </SynauraBackground>
  );
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>{children}</View>;
}

function ArtistCard({ artist, onPress }: { artist: Creator; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.artistCard}><View style={[styles.artistAvatar, { backgroundColor: artist.tint }]}>{artist.avatar?.startsWith('http') ? <Image source={{ uri: artist.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.artistInitial}>{artist.name.slice(0, 1)}</Text>}</View><Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text><Text numberOfLines={1} style={styles.artistMeta}>{artist.tag}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 170, gap: spacing.xl },
  search: { height: 52, marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 2 },
  input: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  clear: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.05)' },
  section: { gap: spacing.md },
  sectionHeader: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, marginHorizontal: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionAction: { color: colors.accent, fontSize: 11, fontWeight: '900' },
  list: { paddingHorizontal: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingHorizontal: spacing.md },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  artistRail: { gap: spacing.md, paddingHorizontal: spacing.lg },
  artistCard: { width: 88, alignItems: 'center' },
  artistAvatar: { width: 66, height: 66, overflow: 'hidden', borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  artistInitial: { color: colors.white, fontSize: 24, fontWeight: '900' },
  artistName: { width: 88, marginTop: spacing.sm, color: colors.text, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  artistMeta: { width: 88, marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  playlistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg },
  playlist: { width: '47%' },
  playlistCover: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  playlistTitle: { marginTop: spacing.sm, color: colors.text, fontSize: 12, fontWeight: '900' },
  playlistMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  post: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingVertical: spacing.md },
  postAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  postAvatarText: { color: colors.white, fontWeight: '900' },
  postAuthor: { color: colors.text, fontSize: 12, fontWeight: '900' },
  postText: { marginTop: 3, color: colors.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
});
