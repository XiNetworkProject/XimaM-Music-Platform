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
import type { Creator, HomeData, HomePost, Playlist, Track } from '@/api/types';
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
  { id: 'all', label: 'Tout', icon: 'sparkles-outline' },
  { id: 'pop', label: 'Pop', icon: 'heart-outline' },
  { id: 'rap', label: 'Rap', icon: 'mic-outline' },
  { id: 'electronic', label: 'Electronic', icon: 'pulse-outline' },
  { id: 'rock', label: 'Rock', icon: 'flash-outline' },
  { id: 'ambient', label: 'Calme', icon: 'moon-outline' },
] as const;

const sorts = [
  { id: 'trending', label: 'Tendances', icon: 'flame-outline' },
  { id: 'newest', label: 'Recent', icon: 'time-outline' },
  { id: 'popular', label: 'Likes', icon: 'heart-outline' },
  { id: 'hidden', label: 'Pepites', icon: 'diamond-outline' },
  { id: 'featured', label: 'Selection', icon: 'ribbon-outline' },
] as const;

const ambiances = [
  { id: 'studio', label: 'Studio IA', text: 'Creer dans un style', icon: 'sparkles-outline', colors: ['#8B5CF6', '#EC4899'] },
  { id: 'events', label: 'Events', text: 'Votes et battles', icon: 'trophy-outline', colors: ['#FF6B6B', '#F5B84B'] },
  { id: 'hidden', label: 'Radar', text: 'Profils a decouvrir', icon: 'radio-outline', colors: ['#22D3EE', '#8B5CF6'] },
  { id: 'community', label: 'Avis', text: 'Posts et sons partages', icon: 'chatbubbles-outline', colors: ['#171313', '#766B66'] },
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

function uniqueCreators(creators: Creator[]) {
  const result = new Map<string, Creator>();
  creators.forEach((creator) => {
    if (creator?.id && !result.has(creator.id)) result.set(creator.id, creator);
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
  const [sort, setSort] = useState<(typeof sorts)[number]['id']>('trending');
  const [page, setPage] = useState(1);
  const [profilePage, setProfilePage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [homeResult, discoverResult] = await Promise.all([
        getHomeData(),
        getDiscoverPage({ category, sort, page: 0, profilePage: 0, limit: 22 }),
      ]);
      setHome(homeResult);
      setTracks(discoverResult.tracks);
      setArtists(discoverResult.artists);
      setPage(discoverResult.nextPage);
      setProfilePage(discoverResult.nextProfilePage);
      setHasMore(discoverResult.hasMore || discoverResult.hasMoreProfiles);
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (paging || !hasMore) return;
    setPaging(true);
    try {
      const next = await getDiscoverPage({ category, sort, page, profilePage, limit: 22 });
      setTracks((current) => uniqueTracks([...current, ...next.tracks]));
      setArtists((current) => uniqueCreators([...current, ...next.artists]));
      setPage(next.nextPage);
      setProfilePage(next.nextProfilePage);
      setHasMore(next.hasMore || next.hasMoreProfiles);
    } finally {
      setPaging(false);
    }
  }, [category, hasMore, page, paging, profilePage, sort]);

  const forYou = useMemo(() => uniqueTracks([...home.forYou, ...home.boosted, ...tracks]).slice(0, 10), [home.boosted, home.forYou, tracks]);
  const trending = useMemo(() => uniqueTracks([...home.trending, ...home.boosted, ...tracks]).slice(0, 12), [home.boosted, home.trending, tracks]);
  const fresh = useMemo(() => uniqueTracks([...home.recent, ...tracks]).slice(0, 20), [home.recent, tracks]);
  const hidden = useMemo(() => [...fresh].sort((a, b) => (a.plays || 0) - (b.plays || 0)).slice(0, 8), [fresh]);
  const creators = useMemo(() => uniqueCreators([...home.creators, ...artists]).slice(0, 18), [artists, home.creators]);
  const posts = useMemo(() => home.posts.slice(0, 5), [home.posts]);
  const playlists = useMemo(() => home.playlists.slice(0, 8), [home.playlists]);
  const hero = trending[0] || forYou[0] || fresh[0];

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
            <Text style={styles.title}>Decouvrir</Text>
          </View>
          <MobileAccountButton compact />
        </View>

        <Pressable onPress={() => setSearchOpen(true)} style={styles.search}>
          <Ionicons name="search" size={19} color={colors.textSecondary} />
          <Text style={styles.searchText}>Sons, artistes, playlists, posts...</Text>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
          {sorts.map((item) => {
            const selected = item.id === sort;
            return (
              <Pressable key={item.id} onPress={() => setSort(item.id)} style={[styles.sort, selected && styles.sortActive]}>
                <Ionicons name={item.icon} size={14} color={selected ? colors.text : colors.textSecondary} />
                <Text style={[styles.sortText, selected && styles.sortTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {hero ? (
          <Pressable onPress={() => playFrom(trending, hero)} style={styles.hero}>
            <TrackCover track={hero} active={player.current?._id === hero._id && player.isPlaying} autoPlayVideo style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(17,14,15,0.04)', 'rgba(17,14,15,0.86)']} locations={[0.16, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>TENDANCE DU MOMENT</Text></View>
              <Text numberOfLines={2} style={styles.heroTitle}>{hero.title}</Text>
              <Text numberOfLines={1} style={styles.heroArtist}>{artistName(hero)}</Text>
              <View style={styles.heroActions}>
                <View style={styles.heroPlay}>
                  <Ionicons name={player.current?._id === hero._id && player.isPlaying ? 'pause' : 'play'} size={18} color={colors.text} />
                  <Text style={styles.heroPlayText}>{player.current?._id === hero._id && player.isPlaying ? 'En lecture' : 'Ecouter'}</Text>
                </View>
                <Pressable onPress={() => navigation.navigate('Swipe')} style={styles.heroScroll}>
                  <Text style={styles.heroScrollS}>S</Text>
                  <Text style={styles.heroScrollText}>Scroll</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ) : loading ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}

        <Rail title="Pour toi" tracks={forYou} player={player} onPlay={(track) => playFrom(forYou, track)} />

        <View style={styles.ambienceSection}>
          <SectionTitle title="Explorer par envie" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ambienceRail}>
            {ambiances.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.id === 'studio') navigation.navigate('AIStudio');
                  else if (item.id === 'events') navigation.navigate('City');
                  else if (item.id === 'community') navigation.navigate('Community');
                  else setSort('hidden');
                }}
                style={styles.ambiencePressable}
              >
                <LinearGradient colors={item.colors as any} style={styles.ambienceTile}>
                  <Ionicons name={item.icon} size={21} color={colors.paper} />
                  <View>
                    <Text style={styles.ambienceLabel}>{item.label}</Text>
                    <Text style={styles.ambienceText}>{item.text}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Rows title="Tendances" tracks={trending.slice(0, 7)} player={player} onPlay={(track) => playFrom(trending, track)} />

        <CreatorRail
          title="Artistes qui montent"
          creators={creators.slice(0, 10)}
          onOpen={(username) => navigation.navigate('PublicProfile', { username })}
        />

        <Rail title="Nouveaux sons" tracks={fresh.slice(0, 12)} player={player} onPlay={(track) => playFrom(fresh, track)} />

        <PlaylistRail playlists={playlists} onOpen={(playlistId) => navigation.navigate('PlaylistDetail', { playlistId })} />

        <PostRail
          posts={posts}
          activeId={player.current?._id}
          isPlaying={player.isPlaying}
          onOpen={(postId) => navigation.navigate('PostDetail', { postId })}
          onProfile={(username) => navigation.navigate('PublicProfile', { username })}
          onPlay={(track) => playFrom([track, ...forYou, ...trending], track)}
        />

        <Rail title="Pepites peu connues" tracks={hidden} player={player} onPlay={(track) => playFrom(hidden, track)} />

        <Rows title="Continuer a explorer" tracks={fresh.slice(8, 20)} player={player} onPlay={(track) => playFrom(fresh, track)} />

        <CreatorRail
          title="Tous les profils Synaura"
          creators={creators.slice(10, 18)}
          onOpen={(username) => navigation.navigate('PublicProfile', { username })}
        />

        {paging ? <ActivityIndicator color={colors.text} style={styles.paging} /> : null}
      </ScrollView>
      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </View>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionHeading}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function Rail({
  title,
  subtitle,
  tracks,
  player,
  onPlay,
}: {
  title: string;
  subtitle?: string;
  tracks: Track[];
  player: ReturnType<typeof usePlayer>;
  onPlay: (track: Track) => void;
}) {
  if (!tracks.length) return null;
  return (
    <View>
      <SectionTitle title={title} subtitle={subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
        {tracks.map((track) => (
          <TrackCard
            key={track._id}
            track={track}
            playing={player.current?._id === track._id && player.isPlaying}
            onPress={() => onPlay(track)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TrackCard({ track, playing, onPress }: { track: Track; playing: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.trackCard}>
      <View style={styles.trackCoverWrap}>
        <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.trackCover} />
        <View style={styles.trackPlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View>
      </View>
      <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.trackArtist}>{artistName(track)}</Text>
      <View style={styles.trackMetaLine}>
        <Text numberOfLines={1} style={styles.trackTiny}>{track.genre?.[0] || 'Synaura'}</Text>
        <Text style={styles.trackTiny}>{track.plays || 0} ecoutes</Text>
      </View>
    </Pressable>
  );
}

function Rows({
  title,
  subtitle,
  tracks,
  player,
  onPlay,
}: {
  title: string;
  subtitle?: string;
  tracks: Track[];
  player: ReturnType<typeof usePlayer>;
  onPlay: (track: Track) => void;
}) {
  if (!tracks.length) return null;
  return (
    <View>
      <SectionTitle title={title} subtitle={subtitle} />
      <View style={styles.rows}>
        {tracks.map((track, index) => (
          <Pressable key={track._id} onPress={() => onPlay(track)} style={styles.row}>
            <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
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
    </View>
  );
}

function CreatorRail({ title, subtitle, creators, onOpen }: { title: string; subtitle?: string; creators: Creator[]; onOpen: (username: string) => void }) {
  if (!creators.length) return null;
  return (
    <View>
      <SectionTitle title={title} subtitle={subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
        {creators.map((creator) => (
          <Pressable key={creator.id} onPress={() => onOpen(creator.handle.replace(/^@/, ''))} style={styles.artistCard}>
            <View style={[styles.artistAvatar, { backgroundColor: creator.tint || '#8B8193' }]}>
              {creator.avatar?.startsWith('http')
                ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFill} />
                : <Text style={styles.artistInitial}>{creator.avatar || creator.name.slice(0, 1)}</Text>}
            </View>
            <Text numberOfLines={1} style={styles.artistName}>{creator.name}</Text>
            <Text numberOfLines={1} style={styles.artistHandle}>{creator.handle}</Text>
            <Text numberOfLines={1} style={styles.artistTag}>{creator.followers || creator.tag || 'Profil Synaura'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function PlaylistRail({ playlists, onOpen }: { playlists: Playlist[]; onOpen: (playlistId: string) => void }) {
  if (!playlists.length) return null;
  return (
    <View>
      <SectionTitle title="Playlists et ambiances" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistRail}>
        {playlists.map((playlist) => {
          const covers = playlist.covers.filter(Boolean).slice(0, 4);
          const banner = playlist.bannerUrl || playlist.collection?.bannerUrl;
          const badge = playlist.badge || playlist.collection?.badge;
          return (
            <Pressable key={playlist.id} onPress={() => onOpen(playlist.id)} style={styles.playlistTile}>
              {banner ? (
                <View style={styles.playlistBanner}>
                  <Image source={{ uri: banner }} style={StyleSheet.absoluteFillObject} />
                  <LinearGradient colors={['rgba(23,19,19,0.02)', 'rgba(23,19,19,0.66)']} style={StyleSheet.absoluteFillObject} />
                  {badge ? <Text numberOfLines={1} style={styles.playlistBadge}>{badge}</Text> : null}
                </View>
              ) : (
                <View style={styles.playlistCover}>
                  {covers.length ? covers.map((cover, index) => (
                    <Image key={`${cover}-${index}`} source={{ uri: cover }} style={styles.playlistCoverPart} />
                  )) : <Ionicons name="albums-outline" size={26} color={colors.textTertiary} />}
                </View>
              )}
              <Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text>
              <Text numberOfLines={1} style={styles.playlistMeta}>{playlist.tracks || playlist.vibe}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function PostRail({
  posts,
  activeId,
  isPlaying,
  onOpen,
  onProfile,
  onPlay,
}: {
  posts: HomePost[];
  activeId?: string;
  isPlaying: boolean;
  onOpen: (postId: string) => void;
  onProfile: (username: string) => void;
  onPlay: (track: Track) => void;
}) {
  if (!posts.length) return null;
  return (
    <View>
      <SectionTitle title="Posts et avis" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postRail}>
        {posts.map((post) => {
          const playing = Boolean(post.track && activeId === post.track._id && isPlaying);
          return (
            <Pressable key={post.id} onPress={() => onOpen(post.id)} style={styles.postCard}>
              <Pressable onPress={() => onProfile(post.handle.replace(/^@/, ''))} style={styles.postTop}>
                <View style={styles.postAvatar}>
                  {post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFill} /> : <Text style={styles.postAvatarText}>{post.avatar || post.author.slice(0, 1)}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.postAuthor}>{post.author}</Text>
                  <Text numberOfLines={1} style={styles.postMeta}>{post.mood} · {post.time}</Text>
                </View>
              </Pressable>
              <Text numberOfLines={3} style={styles.postText}>{post.text}</Text>
              {post.track ? (
                <View style={styles.postTrack}>
                  <TrackCover track={post.track} active={playing} style={styles.postTrackCover} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={styles.postTrackTitle}>{post.track.title}</Text>
                    <Text numberOfLines={1} style={styles.postTrackArtist}>{artistName(post.track)}</Text>
                  </View>
                  <Pressable onPress={() => onPlay(post.track!)} style={styles.postPlay}>
                    <Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.paper} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.postBottom}>
                <Text style={styles.postBottomText}>{post.likesCount || 0} likes</Text>
                <Text style={styles.postBottomText}>{post.commentsCount || 0} avis</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
  sorts: { gap: 6, paddingTop: 8, paddingBottom: 4, paddingRight: 16 },
  sort: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, backgroundColor: 'rgba(23,19,19,0.045)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.05)', paddingHorizontal: 10 },
  sortActive: { backgroundColor: 'rgba(255,255,255,0.78)', borderColor: 'rgba(23,19,19,0.08)' },
  sortText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  sortTextActive: { color: colors.text },
  hero: { height: 214, marginTop: 12, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 16, backgroundColor: colors.black },
  heroContent: { padding: 15 },
  heroBadge: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 8, paddingVertical: 4 },
  heroBadgeText: { color: 'rgba(255,249,239,0.78)', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  heroTitle: { marginTop: 6, maxWidth: '88%', color: colors.paper, fontSize: 20, lineHeight: 22, fontWeight: '900' },
  heroArtist: { marginTop: 4, color: 'rgba(255,249,239,0.68)', fontSize: 11, fontWeight: '800' },
  heroActions: { marginTop: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPlay: { height: 37, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, backgroundColor: colors.paper, paddingHorizontal: 12 },
  heroPlayText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  heroScroll: { height: 37, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11 },
  heroScrollS: { color: colors.paper, fontSize: 18, fontWeight: '900' },
  heroScrollText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  loader: { marginVertical: 90 },
  sectionTitle: { marginTop: 18, marginBottom: 9, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionHeading: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  sectionAction: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  trackRail: { gap: 11, paddingRight: 18 },
  trackCard: { width: 121 },
  trackCoverWrap: { width: 121, height: 130, overflow: 'hidden', borderRadius: 14, backgroundColor: 'rgba(17,17,17,0.06)' },
  trackCover: { width: '100%', height: '100%' },
  trackPlay: { position: 'absolute', right: 7, bottom: 7, width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  trackTitle: { marginTop: 8, color: colors.text, fontSize: 11, fontWeight: '900' },
  trackArtist: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  trackMetaLine: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  trackTiny: { flex: 1, color: colors.textTertiary, fontSize: 8, fontWeight: '800' },
  ambienceSection: { marginTop: 2 },
  ambienceRail: { gap: 10, paddingRight: 18 },
  ambiencePressable: { borderRadius: 15, overflow: 'hidden' },
  ambienceTile: { width: 132, height: 86, justifyContent: 'space-between', borderRadius: 15, padding: 12 },
  ambienceLabel: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  ambienceText: { marginTop: 2, color: 'rgba(255,249,239,0.72)', fontSize: 9, fontWeight: '800' },
  rows: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.84)' },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 7 },
  rank: { width: 22, color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  rowCover: { width: 42, height: 42, borderRadius: 9 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  rowArtist: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  rowPlay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.05)' },
  artistRail: { gap: 9, paddingRight: 18 },
  artistCard: { width: 102, minHeight: 128, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,250,242,0.7)', borderWidth: 1, borderColor: colors.border, padding: 8 },
  artistAvatar: { width: 58, height: 58, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  artistInitial: { color: colors.paper, fontSize: 21, fontWeight: '900' },
  artistName: { width: 88, marginTop: 8, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  artistHandle: { width: 88, marginTop: 2, color: colors.textTertiary, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  artistTag: { width: 88, marginTop: 4, color: colors.textSecondary, fontSize: 8, fontWeight: '800', textAlign: 'center' },
  playlistRail: { gap: 12, paddingRight: 18 },
  playlistTile: { width: 128 },
  playlistCover: { width: 128, height: 96, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', borderRadius: 14, backgroundColor: 'rgba(23,19,19,0.06)', alignItems: 'center', justifyContent: 'center' },
  playlistCoverPart: { width: '50%', height: '50%' },
  playlistBanner: { width: 128, height: 96, overflow: 'hidden', borderRadius: 14, backgroundColor: 'rgba(23,19,19,0.08)', justifyContent: 'flex-end', padding: 9 },
  playlistBadge: { color: colors.paper, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  playlistTitle: { marginTop: 8, color: colors.text, fontSize: 12, fontWeight: '900' },
  playlistMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  postRail: { gap: 11, paddingRight: 18 },
  postCard: { width: 258, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.86)', padding: 12 },
  postTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postAvatar: { width: 34, height: 34, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  postAvatarText: { color: colors.paper, fontSize: 14, fontWeight: '900' },
  postAuthor: { color: colors.text, fontSize: 12, fontWeight: '900' },
  postMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  postText: { marginTop: 11, minHeight: 54, color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  postTrack: { marginTop: 10, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, backgroundColor: 'rgba(23,19,19,0.055)', padding: 8 },
  postTrackCover: { width: 44, height: 44, borderRadius: 11 },
  postTrackTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  postTrackArtist: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  postPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  postBottom: { marginTop: 9, flexDirection: 'row', gap: 10 },
  postBottomText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  paging: { marginVertical: 24 },
});
