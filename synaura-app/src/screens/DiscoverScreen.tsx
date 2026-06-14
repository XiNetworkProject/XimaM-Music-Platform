import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getDiscoverPage, getHomeData, getSynauraCity } from '@/api/client';
import type { HomeData, SynauraCityData, Track } from '@/api/types';
import { EventTicker, EventsRail } from '@/components/events/SynauraEvents';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { spacing } from '@/theme/tokens';
import { SynauraBackground } from '@/components/SynauraBackground';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { MobileSectionTitle } from '@/components/mobile/MobileSectionTitle';

const genres = ['Tout', 'Pop', 'Hip-Hop', 'Rap', 'Rock', 'Electronic', 'R&B', 'Jazz', 'Lo-Fi', 'Indie', 'Ambient'];
const ambienceTiles = [
  { label: 'Electronic', icon: 'pulse', colors: ['#8B5CF6', '#22D3EE'] },
  { label: 'Rap', icon: 'mic', colors: ['#171313', '#FF6B6B'] },
  { label: 'Pop', icon: 'heart', colors: ['#EC4899', '#F5B84B'] },
  { label: 'Ambient', icon: 'moon', colors: ['#22D3EE', '#8B5CF6'] },
] as const;
const sorts = [
  { id: 'trending', label: 'Moment', icon: 'pulse' },
  { id: 'newest', label: 'Nouveaux', icon: 'sparkles' },
  { id: 'popular', label: 'Plus aimés', icon: 'heart' },
  { id: 'hidden', label: 'Pépites', icon: 'diamond' },
] as const;
const emptyData: HomeData = { forYou: [], trending: [], recent: [], boosted: [], playlists: [], creators: [], posts: [] };

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function uniqueTracks(tracks: Track[]) {
  const result = new Map<string, Track>();
  tracks.forEach((track) => {
    if (track?._id && !result.has(track._id)) result.set(track._id, track);
  });
  return Array.from(result.values());
}

function matchesGenre(track: Track, genre: string) {
  if (genre === 'Tout') return true;
  return (track.genre || []).some((item) => item.toLowerCase().includes(genre.toLowerCase()));
}

export function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<HomeData>(emptyData);
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [genre, setGenre] = useState('Tout');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<(typeof sorts)[number]['id']>('trending');
  const [exploreTracks, setExploreTracks] = useState<Track[]>([]);
  const [exploreCreators, setExploreCreators] = useState<HomeData['creators']>([]);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [paging, setPaging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const player = usePlayer();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [homeResult, cityResult, discoverResult] = await Promise.allSettled([getHomeData(), getSynauraCity(), getDiscoverPage({ sort, page: 0 })]);
      if (homeResult.status === 'rejected') throw homeResult.reason;
      setData(homeResult.value);
      if (cityResult.status === 'fulfilled') setCity(cityResult.value);
      if (discoverResult.status === 'fulfilled') {
        setExploreTracks(discoverResult.value.tracks);
        setExploreCreators(discoverResult.value.artists);
        setNextPage(discoverResult.value.nextPage);
        setHasMore(discoverResult.value.hasMore || discoverResult.value.hasMoreProfiles);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (paging || !hasMore || query.trim()) return;
    setPaging(true);
    try {
      const page = await getDiscoverPage({ sort, page: nextPage, profilePage: nextPage });
      setExploreTracks((current) => uniqueTracks([...current, ...page.tracks]));
      setExploreCreators((current) => {
        const byId = new Map(current.map((creator) => [creator.id, creator]));
        page.artists.forEach((creator) => byId.set(creator.id, creator));
        return Array.from(byId.values());
      });
      setNextPage(page.nextPage);
      setHasMore(page.hasMore || page.hasMoreProfiles);
    } finally {
      setPaging(false);
    }
  }, [hasMore, nextPage, paging, query, sort]);

  const allTracks = useMemo(
    () => uniqueTracks([...data.forYou, ...data.trending, ...data.recent, ...data.boosted, ...exploreTracks]),
    [data, exploreTracks],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTracks.filter((track) => {
      if (!matchesGenre(track, genre)) return false;
      if (!q) return true;
      return `${track.title} ${artistName(track)} ${(track.genre || []).join(' ')}`.toLowerCase().includes(q);
    });
  }, [allTracks, genre, query]);
  const forYou = useMemo(() => data.forYou.filter((track) => matchesGenre(track, genre)).slice(0, 10), [data.forYou, genre]);
  const trending = useMemo(() => data.trending.filter((track) => matchesGenre(track, genre)).slice(0, 10), [data.trending, genre]);
  const recent = useMemo(() => data.recent.filter((track) => matchesGenre(track, genre)).slice(0, 10), [data.recent, genre]);
  const heroTrack = filtered[0] || allTracks[0];

  const playFrom = useCallback(async (tracks: Track[], track: Track) => {
    const playable = tracks.filter((item) => item.audioUrl);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  return (
    <View style={styles.root}>
      <DiscoverBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={warm.ink} />}
        onScroll={({ nativeEvent }) => {
          const remaining = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
          if (remaining < 700) void loadMore();
        }}
        scrollEventThrottle={220}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.kicker}>Catalogue ouvert</Text>
            <Text style={styles.title}>Découvrir</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => heroTrack && playFrom(filtered.length ? filtered : allTracks, heroTrack)} style={styles.playAll}>
              <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={18} color={warm.paper} />
            </Pressable>
            <MobileAccountButton />
          </View>
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={warm.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Titre, artiste ou genre..."
            placeholderTextColor={warm.muted}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={warm.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genres}>
          {genres.map((item) => (
            <Pressable key={item} onPress={() => setGenre(item)} style={[styles.genre, genre === item && styles.genreActive]}>
              <Text style={[styles.genreText, genre === item && styles.genreTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
          {sorts.map((item) => (
            <Pressable key={item.id} onPress={() => setSort(item.id)} style={[styles.sort, sort === item.id && styles.sortActive]}>
              <Ionicons name={item.icon} size={14} color={sort === item.id ? warm.paper : '#7C5CFF'} />
              <Text style={[styles.sortText, sort === item.id && styles.sortTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <EventTicker city={city} onPress={() => navigation.navigate('City')} tone="cyan" />
        <View style={styles.ambienceSection}>
          <MobileSectionTitle title="Ambiances" subtitle="entre par une couleur, reste pour le son" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ambienceRail}>
            {ambienceTiles.map((item) => (
              <Pressable key={item.label} onPress={() => setGenre(item.label)} style={styles.ambiencePressable}>
                <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ambienceTile}>
                  <Ionicons name={item.icon} size={20} color={warm.paper} />
                  <Text style={styles.ambienceLabel}>{item.label}</Text>
                  <View style={styles.ambienceLine} />
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <Pressable onPress={() => navigation.navigate('Subscriptions')} style={styles.plusNudge}>
          <View style={styles.plusIcon}><Ionicons name="sparkles" size={18} color={warm.paper} /></View>
          <View style={{ flex: 1 }}><Text style={styles.plusTitle}>Plus de Studio, sans casser ton flow</Text><Text style={styles.plusText}>Découvre les modèles IA et outils inclus dans Synaura Plus.</Text></View>
          <Ionicons name="arrow-forward" size={17} color={warm.ink} />
        </Pressable>
        {heroTrack ? <DiscoverHero track={heroTrack} playing={player.current?._id === heroTrack._id && player.isPlaying} onPlay={() => playFrom(filtered.length ? filtered : allTracks, heroTrack)} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && !allTracks.length ? <ActivityIndicator color={warm.ink} style={styles.loader} /> : null}

        {query.trim() ? (
          <DiscoverRows title={`Résultats pour "${query.trim()}"`} tracks={filtered.slice(0, 30)} player={player} onPlay={(track) => playFrom(filtered, track)} />
        ) : (
          <>
            <DiscoverRail title="Pour toi" subtitle="une sélection qui suit tes écoutes" tracks={forYou} player={player} onPlay={(track) => playFrom(forYou, track)} />
            {city?.pulse?.length ? <DiscoverRail title="Sons qui montent" subtitle="le Pulse Synaura en temps réel" tracks={city.pulse.slice(0, 10)} player={player} onPlay={(track) => playFrom(city.pulse, track)} /> : null}
            <EventsRail city={city} onOpen={() => navigation.navigate('City')} />
            <DiscoverRows title="Top hits" tracks={trending.slice(0, 6)} player={player} onPlay={(track) => playFrom(trending, track)} />
            <DiscoverRail title="Fraîchement publié" subtitle="les dernières sorties Synaura" tracks={recent} player={player} onPlay={(track) => playFrom(recent, track)} />
            <CreatorRail creators={data.creators.slice(0, 8)} onOpen={(username) => navigation.navigate('PublicProfile', { username })} />
            <PlaylistRail playlists={data.playlists.slice(0, 8)} onOpen={(playlistId) => navigation.navigate('PlaylistDetail', { playlistId })} />
            <DiscoverRows title={sort === 'hidden' ? 'Pépites à dénicher' : 'Explorer sans fin'} tracks={exploreTracks} player={player} onPlay={(track) => playFrom(exploreTracks, track)} />
            <CreatorRail title="Tous les profils Synaura" subtitle="nouveaux, actifs et encore peu connus" creators={exploreCreators} onOpen={(username) => navigation.navigate('PublicProfile', { username })} />
            {paging ? <ActivityIndicator color="#7C5CFF" style={styles.loader} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DiscoverBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SynauraBackground variant="warm" />
    </View>
  );
}

function DiscoverHero({ track, playing, onPlay }: { track: Track; playing: boolean; onPlay: () => void }) {
  return (
    <View style={styles.heroCard}>
      <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.heroImage} />
      <LinearGradient colors={['rgba(23,19,19,0.28)', 'rgba(23,19,19,0.96)']} style={StyleSheet.absoluteFill} />
      <View style={styles.heroContent}>
        <Text style={styles.heroKicker}>Entre par les tendances</Text>
        <Text numberOfLines={2} style={styles.heroTitle}>Découvre, écoute, enchaîne.</Text>
        <Text numberOfLines={1} style={styles.heroNow}>{track.title} · {artistName(track)}</Text>
        <Pressable onPress={onPlay} style={styles.heroButton}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={warm.ink} />
          <Text style={styles.heroButtonText}>{playing ? 'En lecture' : 'Écouter maintenant'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DiscoverRail({ title, subtitle, tracks, player, onPlay }: { title: string; subtitle: string; tracks: Track[]; player: ReturnType<typeof usePlayer>; onPlay: (track: Track) => void }) {
  if (!tracks.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle title={title} subtitle={subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {tracks.map((track) => (
          <Pressable key={track._id} onPress={() => onPlay(track)} style={styles.tile}>
            <View style={styles.tileCoverWrap}>
              <TrackCover
                track={track}
                active={player.current?._id === track._id && player.isPlaying}
                autoPlayVideo={player.current?._id === track._id && player.isPlaying}
                style={styles.tileCover}
              />
              <View style={styles.tilePlay}>
                <Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause' : 'play'} size={16} color={warm.ink} />
              </View>
            </View>
            <Text numberOfLines={1} style={styles.tileTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.tileArtist}>{artistName(track)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function DiscoverRows({ title, tracks, player, onPlay }: { title: string; tracks: Track[]; player: ReturnType<typeof usePlayer>; onPlay: (track: Track) => void }) {
  if (!tracks.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle title={title} subtitle="les morceaux qui circulent fort maintenant" />
      <View style={styles.rows}>
        {tracks.map((track, index) => (
          <Pressable key={track._id} onPress={() => onPlay(track)} style={styles.row}>
            <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
            <TrackCover track={track} active style={styles.rowCover} />
            <View style={styles.rowMeta}>
              <Text numberOfLines={1} style={styles.rowTitle}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.rowArtist}>{artistName(track)}</Text>
            </View>
            <Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause-circle' : 'play-circle'} size={30} color={warm.ink} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CreatorRail({ title = 'Artistes chauds', subtitle = 'des profils à suivre maintenant', creators, onOpen }: { title?: string; subtitle?: string; creators: HomeData['creators']; onOpen: (username: string) => void }) {
  if (!creators.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle title={title} subtitle={subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {creators.map((creator) => (
          <Pressable key={creator.id} onPress={() => onOpen(creator.handle.replace(/^@/, ''))} style={styles.creator}>
            <View style={[styles.creatorAvatar, { backgroundColor: creator.tint }]}>
              {creator.avatar?.startsWith('http') ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.creatorInitial}>{creator.avatar}</Text>}
            </View>
            <Text numberOfLines={1} style={styles.creatorName}>{creator.name}</Text>
            <Text numberOfLines={1} style={styles.tileArtist}>{creator.handle}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function PlaylistRail({ playlists, onOpen }: { playlists: HomeData['playlists']; onOpen: (playlistId: string) => void }) {
  if (!playlists.length) return null;
  return (
    <View style={styles.section}>
      <SectionTitle title="Playlists visibles" subtitle="des portes d’entrée dans le catalogue" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {playlists.map((playlist) => (
          <Pressable key={playlist.id} onPress={() => onOpen(playlist.id)} style={styles.tile}>
            <Image source={{ uri: playlist.covers[0] || undefined }} style={styles.playlistCover} />
            <Text numberOfLines={1} style={styles.tileTitle}>{playlist.title}</Text>
            <Text numberOfLines={1} style={styles.tileArtist}>{playlist.tracks}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <MobileSectionTitle title={title} subtitle={subtitle} style={styles.sectionTitleWrap} />;
}

const warm = {
  paper: '#FFFAF2',
  ink: '#171313',
  muted: 'rgba(23,19,19,0.40)',
  soft: 'rgba(23,19,19,0.58)',
  border: 'rgba(23,19,19,0.08)',
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EFE6' },
  content: { paddingHorizontal: spacing.md, paddingTop: 54, paddingBottom: 190 },
  field: { position: 'absolute', width: 440, height: 260, borderRadius: 130, opacity: 0.09 },
  fieldCoral: { left: -250, top: -50, backgroundColor: '#FF6F61' },
  fieldViolet: { right: -270, top: 250, backgroundColor: '#7C5CFF' },
  fieldCyan: { left: -260, bottom: 50, backgroundColor: '#00C2CB' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { color: warm.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { marginTop: 2, color: warm.ink, fontSize: 32, fontWeight: '900' },
  playAll: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: warm.ink },
  search: { marginTop: spacing.lg, height: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 24, borderWidth: 1, borderColor: warm.border, backgroundColor: 'rgba(255,250,242,0.88)', paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: warm.ink, fontSize: 13, fontWeight: '800' },
  genres: { gap: spacing.sm, paddingVertical: spacing.md },
  sorts: { gap: spacing.sm, paddingBottom: spacing.md },
  sort: { minHeight: 38, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, backgroundColor: 'rgba(124,92,255,0.08)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.12)' },
  sortActive: { backgroundColor: warm.ink, borderColor: warm.ink },
  sortText: { color: warm.soft, fontSize: 10, fontWeight: '900' },
  sortTextActive: { color: warm.paper },
  genre: { height: 36, justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.055)', paddingHorizontal: 14 },
  genreActive: { backgroundColor: warm.ink },
  genreText: { color: warm.soft, fontSize: 11, fontWeight: '900' },
  genreTextActive: { color: warm.paper },
  plusNudge: { minHeight: 72, marginTop: spacing.md, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.18)' },
  plusIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF' },
  plusTitle: { color: warm.ink, fontSize: 12, fontWeight: '900' },
  plusText: { marginTop: 3, color: warm.muted, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  heroCard: { minHeight: 270, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 24, backgroundColor: warm.ink },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroContent: { padding: spacing.lg },
  heroKicker: { color: 'rgba(255,250,242,0.48)', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  heroTitle: { marginTop: spacing.sm, color: warm.paper, fontSize: 31, lineHeight: 34, fontWeight: '900' },
  heroNow: { marginTop: spacing.sm, color: 'rgba(255,250,242,0.58)', fontSize: 12, fontWeight: '800' },
  heroButton: { marginTop: spacing.lg, height: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 22, backgroundColor: warm.paper, paddingHorizontal: spacing.lg },
  heroButtonText: { color: warm.ink, fontSize: 13, fontWeight: '900' },
  ambienceSection: { marginTop: spacing.lg },
  ambienceRail: { gap: spacing.sm, paddingRight: spacing.md },
  ambiencePressable: { borderRadius: 20, overflow: 'hidden' },
  ambienceTile: { width: 132, height: 92, justifyContent: 'space-between', borderRadius: 20, padding: 13 },
  ambienceLabel: { color: warm.paper, fontSize: 15, fontWeight: '900' },
  ambienceLine: { width: 46, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,250,242,0.68)' },
  error: { marginTop: spacing.md, color: '#B91C1C', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  loader: { marginVertical: spacing.xl },
  section: { marginTop: spacing.xl },
  sectionTitleWrap: { marginBottom: spacing.md },
  rail: { gap: spacing.sm, paddingRight: spacing.md },
  tile: { width: 148, borderRadius: 20, backgroundColor: 'rgba(255,250,242,0.76)', padding: spacing.sm },
  tileCoverWrap: { aspectRatio: 1, overflow: 'hidden', borderRadius: 16, backgroundColor: 'rgba(23,19,19,0.06)' },
  tileCover: { width: '100%', height: '100%' },
  tilePlay: { position: 'absolute', right: 8, bottom: 8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: warm.paper },
  tileTitle: { marginTop: spacing.sm, color: warm.ink, fontSize: 13, fontWeight: '900' },
  tileArtist: { marginTop: 2, color: warm.muted, fontSize: 11, fontWeight: '700' },
  rows: { overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: warm.border, backgroundColor: 'rgba(255,250,242,0.82)' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: warm.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rank: { width: 22, color: warm.muted, fontSize: 11, fontWeight: '900' },
  rowCover: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(23,19,19,0.06)' },
  rowMeta: { flex: 1, minWidth: 0 },
  rowTitle: { color: warm.ink, fontSize: 13, fontWeight: '900' },
  rowArtist: { marginTop: 3, color: warm.muted, fontSize: 11, fontWeight: '700' },
  creator: { width: 126, alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,250,242,0.76)', padding: spacing.md },
  creatorAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  creatorInitial: { color: warm.paper, fontSize: 20, fontWeight: '900' },
  creatorName: { marginTop: spacing.sm, color: warm.ink, fontSize: 12, fontWeight: '900' },
  playlistCover: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: 'rgba(23,19,19,0.06)' },
});
