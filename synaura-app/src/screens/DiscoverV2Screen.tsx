import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiscoverPage, getHomeData } from '@/api/client';
import type { Creator, HomeData, Track } from '@/api/types';
import { UniversalSearchModal } from '@/components/HomeOverlays';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { colors } from '@/theme/tokens';

const emptyHome: HomeData = {
  forYou: [],
  trending: [],
  recent: [],
  boosted: [],
  playlists: [],
  creators: [],
  posts: [],
};

const categories = [
  { id: 'all', label: 'Pour toi', icon: 'sparkles-outline' },
  { id: 'pop', label: 'Pop', icon: 'heart-outline' },
  { id: 'rap', label: 'Rap', icon: 'mic-outline' },
  { id: 'electronic', label: 'Electronic', icon: 'pulse-outline' },
  { id: 'ambient', label: 'Calme', icon: 'moon-outline' },
] as const;

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

export function DiscoverV2Screen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [home, setHome] = useState<HomeData>(emptyHome);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Creator[]>([]);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [homeResult, discoverResult] = await Promise.all([
        getHomeData(),
        getDiscoverPage({ category, sort: 'trending', page: 0, profilePage: 0, limit: 18 }),
      ]);
      setHome(homeResult);
      setTracks(discoverResult.tracks);
      setArtists(discoverResult.artists);
      setPage(discoverResult.nextPage);
      setHasMore(discoverResult.hasMore || discoverResult.hasMoreProfiles);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (paging || !hasMore) return;
    setPaging(true);
    try {
      const next = await getDiscoverPage({ category, sort: 'trending', page, profilePage: page, limit: 18 });
      setTracks((current) => uniqueTracks([...current, ...next.tracks]));
      setArtists((current) => {
        const byId = new Map(current.map((creator) => [creator.id, creator]));
        next.artists.forEach((creator) => byId.set(creator.id, creator));
        return Array.from(byId.values());
      });
      setPage(next.nextPage);
      setHasMore(next.hasMore || next.hasMoreProfiles);
    } finally {
      setPaging(false);
    }
  }, [category, hasMore, page, paging]);

  const trending = useMemo(
    () => uniqueTracks([...home.trending, ...home.boosted, ...tracks]).slice(0, 10),
    [home.boosted, home.trending, tracks],
  );
  const fresh = useMemo(() => uniqueTracks([...home.recent, ...tracks]).slice(0, 14), [home.recent, tracks]);
  const creators = useMemo(() => {
    const byId = new Map<string, Creator>();
    [...home.creators, ...artists].forEach((creator) => byId.set(creator.id, creator));
    return Array.from(byId.values()).slice(0, 12);
  }, [artists, home.creators]);
  const hero = trending[0] || fresh[0];

  const playFrom = useCallback(async (queue: Track[], track: Track) => {
    const playable = queue.filter((item) => item.audioUrl);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text} />}
        onScroll={({ nativeEvent }) => {
          const remaining = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
          if (remaining < 520) void loadMore();
        }}
        scrollEventThrottle={180}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>EXPLORER SYNAURA</Text>
            <Text style={styles.title}>Découvrir</Text>
          </View>
          <MobileAccountButton compact />
        </View>

        <Pressable onPress={() => setSearchOpen(true)} style={styles.search}>
          <Ionicons name="search" size={19} color={colors.textSecondary} />
          <Text style={styles.searchText}>Sons, artistes, playlists...</Text>
          <View style={styles.searchArrow}><Ionicons name="arrow-forward" size={15} color={colors.text} /></View>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {categories.map((item) => {
            const selected = item.id === category;
            return (
              <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, selected && styles.categoryActive]}>
                <Ionicons name={item.icon} size={15} color={selected ? colors.paper : colors.textSecondary} />
                <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {hero ? (
          <Pressable onPress={() => playFrom(trending, hero)} style={styles.hero}>
            <TrackCover track={hero} active={player.current?._id === hero._id && player.isPlaying} autoPlayVideo style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(17,14,15,0.03)', 'rgba(17,14,15,0.84)']} locations={[0.18, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>TENDANCE DU MOMENT</Text></View>
              <Text numberOfLines={2} style={styles.heroTitle}>{hero.title}</Text>
              <Text numberOfLines={1} style={styles.heroArtist}>{artistName(hero)}</Text>
              <View style={styles.heroPlay}>
                <Ionicons name={player.current?._id === hero._id && player.isPlaying ? 'pause' : 'play'} size={18} color={colors.text} />
                <Text style={styles.heroPlayText}>{player.current?._id === hero._id && player.isPlaying ? 'En lecture' : 'Écouter'}</Text>
              </View>
            </View>
          </Pressable>
        ) : loading ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}

        <SectionTitle title="En ce moment" subtitle="Les sons qui circulent le plus" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
          {trending.slice(1, 8).map((track) => (
            <TrackCard
              key={track._id}
              track={track}
              playing={player.current?._id === track._id && player.isPlaying}
              onPress={() => playFrom(trending, track)}
            />
          ))}
        </ScrollView>

        {creators.length ? (
          <>
            <SectionTitle title="Nouveaux univers" subtitle="Des artistes à suivre dès maintenant" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
              {creators.map((creator) => (
                <ArtistCard key={creator.id} creator={creator} onPress={() => navigation.navigate('PublicProfile', { username: creator.handle.replace(/^@/, '') })} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionTitle title="Nouveautés" subtitle="Les dernières sorties sur Synaura" />
        <View style={styles.rows}>
          {fresh.map((track) => (
            <Pressable key={track._id} onPress={() => playFrom(fresh, track)} style={styles.row}>
              <TrackCover track={track} active={player.current?._id === track._id && player.isPlaying} style={styles.rowCover} />
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={styles.rowTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.rowArtist}>{artistName(track)}</Text>
              </View>
              <View style={styles.rowPlay}>
                <Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause' : 'play'} size={15} color={colors.text} />
              </View>
            </Pressable>
          ))}
        </View>
        {paging ? <ActivityIndicator color={colors.text} style={styles.paging} /> : null}
      </ScrollView>
      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function TrackCard({ track, playing, onPress }: { track: Track; playing: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.trackCard}>
      <TrackCover track={track} active={playing} style={styles.trackCover} />
      <View style={styles.trackPlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View>
      <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.trackArtist}>{artistName(track)}</Text>
    </Pressable>
  );
}

function ArtistCard({ creator, onPress }: { creator: Creator; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.artistCard}>
      <View style={[styles.artistAvatar, { backgroundColor: creator.tint || '#8B8193' }]}>
        {creator.avatar?.startsWith('http')
          ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFill} />
          : <Text style={styles.artistInitial}>{creator.avatar || creator.name.slice(0, 1)}</Text>}
      </View>
      <Text numberOfLines={1} style={styles.artistName}>{creator.name}</Text>
      <Text numberOfLines={1} style={styles.artistHandle}>{creator.handle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 145 },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { marginTop: 1, color: colors.text, fontSize: 25, fontWeight: '900' },
  search: { height: 44, marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  searchText: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  searchArrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.05)' },
  categories: { gap: 6, paddingTop: 11, paddingRight: 16 },
  category: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11 },
  categoryActive: { backgroundColor: colors.text, borderColor: colors.text },
  categoryText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  categoryTextActive: { color: colors.paper },
  hero: { height: 210, marginTop: 12, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 16, backgroundColor: colors.black },
  heroContent: { padding: 15 },
  heroBadge: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 8, paddingVertical: 4 },
  heroBadgeText: { color: 'rgba(255,249,239,0.78)', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  heroTitle: { marginTop: 6, maxWidth: '88%', color: colors.paper, fontSize: 20, lineHeight: 22, fontWeight: '900' },
  heroArtist: { marginTop: 4, color: 'rgba(255,249,239,0.68)', fontSize: 11, fontWeight: '800' },
  heroPlay: { alignSelf: 'flex-start', height: 37, marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, backgroundColor: colors.paper, paddingHorizontal: 12 },
  heroPlayText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  loader: { marginVertical: 90 },
  sectionTitle: { marginTop: 18, marginBottom: 9 },
  sectionHeading: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  trackRail: { gap: 11, paddingRight: 18 },
  trackCard: { width: 118 },
  trackCover: { width: 118, height: 136, borderRadius: 13 },
  trackPlay: { position: 'absolute', top: 98, right: 7, width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  trackTitle: { marginTop: 8, color: colors.text, fontSize: 11, fontWeight: '900' },
  trackArtist: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  artistRail: { gap: 9, paddingRight: 18 },
  artistCard: { width: 92, minHeight: 118, alignItems: 'center', justifyContent: 'center', padding: 7 },
  artistAvatar: { width: 60, height: 60, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  artistInitial: { color: colors.paper, fontSize: 21, fontWeight: '900' },
  artistName: { width: 86, marginTop: 9, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  artistHandle: { width: 86, marginTop: 2, color: colors.textTertiary, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  rows: { gap: 7 },
  row: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 7 },
  rowCover: { width: 43, height: 43, borderRadius: 9 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  rowArtist: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  rowPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.05)' },
  paging: { marginVertical: 24 },
});
