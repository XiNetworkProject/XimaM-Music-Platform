import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiscoverOverview, getUserPreferences } from '@/api/client';
import type { Track } from '@/api/types';
import { UniversalSearchModal } from '@/components/HomeOverlays';
import { getTrackCoverImage } from '@/components/TrackCover';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { CollectionReveal, CollectionSurface, CollectionHeader, CollectionIconButton, CollectionTabs, CollectionHeading, CollectionEmpty, MusicTile, useCollectionPalette, musicArtist } from '@/components/mobile/CollectionUI';
import { usePlayer } from '@/player/PlayerProvider';
import { useAuth } from '@/auth/AuthProvider';
import { DISCOVER_MOODS, matchesMoodKeywords } from '@/discover/moods';
import { COMMUNITY_CLUBS } from '@/community/clubs';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { readDiscoverVisualCache, writeDiscoverVisualCache } from '@/discover/discoverCache';

const INTENTION_TO_CLUB_SLUG: Record<string, string> = {
  remix: 'remix',
  collab: 'collab',
  create_ai: 'ai',
};

type EditorialCollection = {
  id?: string;
  playlistId: string;
  slug?: string;
  title: string;
  subtitle?: string;
  description?: string;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  themeColors?: string[];
  badge?: string;
  trackCount?: number;
  isFeatured?: boolean;
};

type ArtistPairing = {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
  track: Track;
};

function uniqueTracks(tracks: Track[]) {
  const byId = new Map<string, Track>();
  tracks.forEach((track) => {
    if (track?._id && track.audioUrl && !byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

function sortNewest(tracks: Track[]) {
  return uniqueTracks(tracks).sort((left, right) => {
    const leftTimestamp = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTimestamp = right.createdAt ? Date.parse(right.createdAt) : 0;
    const dateDifference = (Number.isFinite(rightTimestamp) ? rightTimestamp : 0) - (Number.isFinite(leftTimestamp) ? leftTimestamp : 0);
    return dateDifference || String(right._id).localeCompare(String(left._id));
  });
}

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function trackImage(track: Track) {
  return getTrackCoverImage(track);
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

export function DiscoverV2Screen() {
  const navigation = useNavigation<any>();
  const p = useCollectionPalette();
  const [section, setSection] = useState<'all' | 'music' | 'artists' | 'collections' | 'community'>('all');
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const player = usePlayer();
  const auth = useAuth();
  const requestId = useRef(0);
  const [newestTracks, setNewestTracks] = useState<Track[]>([]);
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const [hiddenTracks, setHiddenTracks] = useState<Track[]>([]);
  const [radar, setRadar] = useState<Track[]>([]);
  const [collections, setCollections] = useState<EditorialCollection[]>([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [radarLoading, setRadarLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [favoriteMoodIds, setFavoriteMoodIds] = useState<string[]>([]);
  const [highlightedClubSlugs, setHighlightedClubSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.user) {
      setFavoriteMoodIds([]);
      setHighlightedClubSlugs([]);
      return;
    }
    let mounted = true;
    getUserPreferences()
      .then((preferences) => {
        if (!mounted) return;
        const onboarding = (preferences as any)?.onboarding;
        const moods = Array.isArray(onboarding?.favoriteMoods) ? onboarding.favoriteMoods.map(String) : [];
        const intentions: string[] = Array.isArray(onboarding?.creatorIntentions) ? onboarding.creatorIntentions : [];
        setFavoriteMoodIds(moods);
        setHighlightedClubSlugs(intentions.map((id) => INTENTION_TO_CLUB_SLUG[id]).filter((slug): slug is string => Boolean(slug)));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [auth.user?.id]);

  const orderedMoods = useMemo(() => {
    if (!favoriteMoodIds.length) return DISCOVER_MOODS;
    return [...DISCOVER_MOODS].sort((a, b) => Number(!favoriteMoodIds.includes(a.id)) - Number(!favoriteMoodIds.includes(b.id)));
  }, [favoriteMoodIds]);

  const orderedClubs = useMemo(() => {
    if (!highlightedClubSlugs.length) return COMMUNITY_CLUBS;
    return [...COMMUNITY_CLUBS].sort((a, b) => Number(!highlightedClubSlugs.includes(a.slug)) - Number(!highlightedClubSlugs.includes(b.slug)));
  }, [highlightedClubSlugs]);

  const load = useCallback(async (showInitialLoader = true) => {
    const currentRequest = ++requestId.current;
    if (showInitialLoader) setLoading(true);
    else setRefreshing(true);
    setRadarLoading(true);
    setLoadError(false);

    const cached = showInitialLoader ? await readDiscoverVisualCache<EditorialCollection>() : null;
    if (currentRequest !== requestId.current) return;
    const snapshot = {
      newest: sortNewest(cached?.newest || []),
      popular: cached?.popular || [],
      hidden: cached?.hidden || [],
      radar: cached?.radar || [],
      collections: cached?.collections || [],
      totalTracks: cached?.totalTracks || 0,
    };
    if (cached) {
      setNewestTracks(snapshot.newest);
      setPopularTracks(cached.popular);
      setHiddenTracks(cached.hidden);
      setRadar(cached.radar);
      setCollections(cached.collections);
      setTotalTracks(cached.totalTracks);
      setLoading(false);
      setRadarLoading(false);
    }

    try {
      const overview = await getDiscoverOverview();
      if (currentRequest !== requestId.current) return;
      snapshot.newest = sortNewest(overview.newest);
      snapshot.popular = overview.popular;
      snapshot.hidden = overview.hidden;
      snapshot.radar = overview.radar;
      snapshot.collections = overview.collections;
      snapshot.totalTracks = overview.totalTracks;
      setNewestTracks(snapshot.newest);
      setPopularTracks(snapshot.popular);
      setHiddenTracks(snapshot.hidden);
      setRadar(snapshot.radar);
      setCollections(snapshot.collections);
      setTotalTracks(snapshot.totalTracks);
      setLoadError(false);
      await writeDiscoverVisualCache<EditorialCollection>(snapshot);
    } catch {
      if (currentRequest === requestId.current) setLoadError(!cached);
    } finally {
      if (currentRequest !== requestId.current) return;
      setLoading(false);
      setRadarLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const trackPool = useMemo(
    () => uniqueTracks([...newestTracks, ...hiddenTracks, ...radar, ...popularTracks]),
    [hiddenTracks, newestTracks, popularTracks, radar],
  );

  const leadTrack = radar[0] || newestTracks[0] || hiddenTracks[0] || popularTracks[0] || null;
  const leadIsRadar = Boolean(leadTrack && radar.some((track) => track._id === leadTrack._id));
  const leadLabel = leadIsRadar
    ? 'Signal Radar'
    : leadTrack && newestTracks.some((track) => track._id === leadTrack._id)
      ? 'Nouveau sur Synaura'
      : 'À découvrir';
  const leadQueue = leadIsRadar ? radar : newestTracks.length ? newestTracks : trackPool;

  const moodCovers = useMemo(() => {
    const result = new Map<string, string[]>();
    orderedMoods.forEach((mood) => {
      const covers = trackPool
        .filter((track) => matchesMoodKeywords(track, mood))
        .map(trackImage)
        .filter((cover): cover is string => Boolean(cover))
        .filter((cover, index, array) => array.indexOf(cover) === index)
        .slice(0, 4);
      result.set(mood.id, covers);
    });
    return result;
  }, [orderedMoods, trackPool]);

  const artistPairings = useMemo<ArtistPairing[]>(() => {
    const artists = new Map<string, ArtistPairing>();
    trackPool.forEach((track) => {
      const username = String(track.artist?.username || '');
      const id = String(track.artist?._id || track.artist?.id || username);
      if (!id || !username || artists.has(id)) return;
      artists.set(id, {
        id,
        username,
        name: artistName(track),
        avatar: track.artist?.avatar || null,
        track,
      });
    });
    return Array.from(artists.values()).slice(0, 14);
  }, [trackPool]);

  const featuredCollection = useMemo(
    () => collections.find((collection) => collection.isFeatured !== false) || collections[0] || null,
    [collections],
  );
  const collectionRail = useMemo(() => {
    if (!featuredCollection) return collections;
    return collections.filter((collection) => (collection.id || collection.playlistId) !== (featuredCollection.id || featuredCollection.playlistId));
  }, [collections, featuredCollection]);

  const newestRailTracks = newestTracks;
  const hiddenRailTracks = useMemo(() => {
    const newestIds = new Set(newestTracks.map((track) => track._id));
    const distinct = hiddenTracks.filter((track) => !newestIds.has(track._id));
    return distinct.length >= 6 ? distinct : hiddenTracks;
  }, [hiddenTracks, newestTracks]);
  const popularRailTracks = useMemo(() => {
    const seen = new Set([...newestTracks, ...hiddenRailTracks].map((track) => track._id));
    const distinct = popularTracks.filter((track) => !seen.has(track._id));
    return distinct.length >= 6 ? distinct : popularTracks;
  }, [hiddenRailTracks, newestTracks, popularTracks]);

  const playFrom = useCallback(async (queue: Track[], track: Track) => {
    if (player.current?._id === track._id) {
      await player.togglePlayPause();
      return;
    }
    const playable = uniqueTracks(queue);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  const openTrack = (track: Track) => navigation.navigate('TrackDetail', { trackId: track._id, track });

  const launch = (queue: Track[], track: Track) => { void playFrom(queue, track).catch(() => Alert.alert('Lecture indisponible', 'Réessaie dans un instant.')); };
  const isMusic = section === 'all' || section === 'music';
  const show = (key: typeof section) => section === 'all' || section === key;
  const tileWidth = responsive.isTablet ? 196 : responsive.isNarrow ? 142 : 162;
  const rail = (title: string, tracks: Track[], detail?: string, onPress?: () => void) => tracks.length ? <View>
    <CollectionHeading title={title} detail={detail} onPress={onPress} />
    <FlatList horizontal data={tracks} keyExtractor={track => track._id} showsHorizontalScrollIndicator={false} initialNumToRender={3} maxToRenderPerBatch={4} windowSize={3} contentContainerStyle={{ gap: 14 }}
      renderItem={({ item }) => <MusicTile track={item} width={tileWidth} playing={player.current?._id === item._id && player.isPlaying} onOpen={() => openTrack(item)} onPlay={() => launch(tracks, item)} />} />
  </View> : null;
  return <CollectionSurface>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={[responsive.pageContent, { paddingTop: insets.top + 8, paddingBottom: responsive.miniPlayerClearance + 20, gap: 26 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(false)} tintColor={p.blue} colors={[p.blue]} />}>
      <View style={{ gap: 12 }}>
        <CollectionHeader title="Explorer" eyebrow="CHANGE DE FRÉQUENCE" actions={<CollectionIconButton icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />} />
        <EntryPressable accessibilityRole="search" accessibilityLabel="Rechercher des sons, artistes et playlists" onPress={() => setSearchOpen(true)} style={[styles.search, { backgroundColor: p.surface }]}>
          <Ionicons name="search-outline" size={21} color={p.blue} /><Text style={{ color: p.muted, fontSize: 15, flex: 1 }}>Un son, un artiste, une envie…</Text><Ionicons name="arrow-up-outline" size={18} color={p.muted} style={{ transform: [{ rotate: '45deg' }] }} />
        </EntryPressable>
        <CollectionTabs value={section} onChange={value => { setSection(value); scroll.current?.scrollTo({ y: 0, animated: false }); }} options={[{ value: 'all', label: 'Pour explorer' }, { value: 'music', label: 'Musique' }, { value: 'artists', label: 'Artistes' }, { value: 'collections', label: 'Playlists' }, { value: 'community', label: 'Communauté' }]} />
      </View>
      {isMusic && leadTrack ? <CollectionReveal style={[styles.hero, { height: responsive.isTablet ? 420 : 338, backgroundColor: p.surface }]}>
        <SynauraImage source={getTrackCoverImage(leadTrack)} style={StyleSheet.absoluteFillObject} />
        <LinearGradient pointerEvents="none" colors={['rgba(6,10,20,.08)', 'rgba(6,10,20,.18)', 'rgba(6,10,20,.94)']} locations={[0, .35, 1]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.heroTop}><View style={styles.heroBadge}><View style={styles.signal} /><Text style={styles.badgeText}>{leadLabel}</Text></View><CollectionIconButtonOnArt onPress={() => openTrack(leadTrack)} label="Détails du morceau" icon="arrow-up-outline" /></View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroKicker}>LAISSE-TOI SURPRENDRE</Text>
          <EntryPressable accessibilityRole="button" onPress={() => openTrack(leadTrack)}><Text numberOfLines={2} style={styles.heroTitle}>{leadTrack.title}</Text><Text numberOfLines={1} style={styles.heroArtist}>{musicArtist(leadTrack)}</Text></EntryPressable>
          <EntryPressable accessibilityRole="button" accessibilityLabel={player.current?._id === leadTrack._id && player.isPlaying ? 'Mettre en pause' : 'Écouter ' + leadTrack.title} onPress={() => launch(leadQueue, leadTrack)} style={styles.heroPlay}><Ionicons name={player.current?._id === leadTrack._id && player.isPlaying ? 'pause' : 'play'} size={17} color="#111A29" /><Text style={styles.playLabel}>{player.current?._id === leadTrack._id && player.isPlaying ? 'En écoute' : 'Écouter'}</Text></EntryPressable>
        </View>
      </CollectionReveal> : isMusic && loading ? <CollectionEmpty loading title="À la recherche de ton prochain son…" /> : null}
      {loadError ? <CollectionEmpty icon="cloud-offline-outline" title="Connexion interrompue" text="Tu peux réessayer sans perdre ce qui est déjà affiché." action="Réessayer" onPress={() => void load(false)} /> : null}
      {isMusic ? rail('Tout juste sortis', newestRailTracks, 'De nouveaux sons à rencontrer') : null}
      {isMusic ? <View><CollectionHeading title="Ton humeur, ton univers" /><FlatList horizontal data={orderedMoods} keyExtractor={mood => mood.id} showsHorizontalScrollIndicator={false} initialNumToRender={3} windowSize={3} contentContainerStyle={{ gap: 12 }}
        renderItem={({ item: mood }) => <EntryPressable accessibilityRole="button" accessibilityLabel={mood.label} onPress={() => navigation.navigate('DiscoverMood', { moodId: mood.id })} style={[styles.mood, { width: tileWidth }]}>
          <LinearGradient colors={mood.gradient} style={StyleSheet.absoluteFillObject} />
          {moodCovers.get(mood.id)?.[0] ? <SynauraImage source={moodCovers.get(mood.id)![0]} lowPriority style={[StyleSheet.absoluteFillObject, { opacity: .4 }]} /> : null}
          <LinearGradient colors={['rgba(0,0,0,.1)', 'rgba(0,0,0,.75)']} style={StyleSheet.absoluteFillObject} />
          <Ionicons name={mood.icon as any} size={23} color="#FFF" />
          <Text style={styles.moodLabel}>{mood.label}</Text>
        </EntryPressable>} /></View> : null}
      {isMusic ? rail('Hors des radars', hiddenRailTracks, 'Petites audiences. Grandes découvertes.') : null}
      {isMusic ? rail('Radar Synaura', radar, 'Les signaux qui montent', () => navigation.navigate('Radar')) : null}
      {show('artists') ? <View><CollectionHeading title="Derrière la musique" detail="Entre dans leurs univers" />
        {artistPairings.length ? <FlatList horizontal data={artistPairings} keyExtractor={artist => artist.id} showsHorizontalScrollIndicator={false} initialNumToRender={4} windowSize={3} contentContainerStyle={{ gap: 16 }} renderItem={({ item: artist }) => <EntryPressable accessibilityRole="button" accessibilityLabel={'Profil de ' + artist.name} onPress={() => navigation.navigate('PublicProfile', { username: artist.username })} style={{ width: 118, alignItems: 'center' }}>
          <View style={[styles.avatar, { backgroundColor: p.raised }]}>{artist.avatar ? <SynauraImage source={artist.avatar} style={StyleSheet.absoluteFillObject} /> : <Text style={{ color: p.blue, fontSize: 38 }}>{artist.name.charAt(0)}</Text>}</View>
          <Text numberOfLines={1} style={[styles.artistName, { color: p.text }]}>{artist.name}</Text><Text numberOfLines={1} style={{ color: p.muted, fontSize: 11 }}>@{artist.username}</Text>
        </EntryPressable>} /> : <CollectionEmpty loading={loading} title={loading ? 'Chargement…' : 'Aucun artiste disponible'} />}
      </View> : null}
      {show('collections') ? <View><CollectionHeading title="Un son en appelle un autre" detail="Les sélections Synaura" />
        {collections.length ? <FlatList horizontal data={featuredCollection ? [featuredCollection, ...collectionRail] : collections} keyExtractor={collection => String(collection.id || collection.playlistId)} showsHorizontalScrollIndicator={false} initialNumToRender={2} windowSize={3} contentContainerStyle={{ gap: 14 }}
          renderItem={({ item: collection }) => <EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('PlaylistDetail', { playlistId: collection.slug || collection.playlistId })} style={[styles.collection, { width: responsive.isNarrow ? 242 : 280, backgroundColor: p.surface }]}>
            <View style={{ height: 164, overflow: 'hidden', backgroundColor: p.raised }}>{collection.bannerUrl || collection.coverUrl ? <SynauraImage source={collection.bannerUrl || collection.coverUrl} style={StyleSheet.absoluteFillObject} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="albums-outline" size={42} color={p.blue} /></View>}</View>
            <View style={{ padding: 17 }}><Text numberOfLines={2} style={[styles.collectionTitle, { color: p.text }]}>{collection.title}</Text><Text style={{ marginTop: 7, color: p.muted, fontSize: 12 }}>{collection.trackCount != null ? collection.trackCount + ' titres' : collection.subtitle || 'Explorer la sélection'}  ↗</Text></View>
          </EntryPressable>} /> : <CollectionEmpty loading={loading} title={loading ? 'Chargement…' : 'Les prochaines sélections arrivent ici.'} />}
      </View> : null}
      {isMusic ? rail('Vous les aimez', popularRailTracks) : null}
      {show('community') ? <View><CollectionHeading title="La musique, ensemble" action="Communauté" onPress={() => navigation.navigate('Community')} />
        <View style={{ gap: 10 }}>{orderedClubs.map(club => <EntryPressable key={club.slug} accessibilityRole="button" onPress={() => navigation.navigate('ClubDetail', { slug: club.slug })} style={[styles.club, { backgroundColor: p.surface }]}>
          <View style={[styles.clubIcon, { backgroundColor: p.raised }]}><Ionicons name={club.icon as any} size={23} color={p.blue} /></View><View style={{ flex: 1 }}><Text style={[styles.collectionTitle, { color: p.text }]}>{club.name}</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{club.promise}</Text></View><Ionicons name="arrow-forward" size={18} color={p.muted} />
        </EntryPressable>)}</View>
        <EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('City')} style={[styles.club, { marginTop: 14, backgroundColor: p.raised }]}><Ionicons name="planet-outline" size={25} color={p.violet} /><View style={{ flex: 1 }}><Text style={[styles.collectionTitle, { color: p.text }]}>Entrer dans la City</Text><Text style={{ color: p.muted, marginTop: 3, fontSize: 12 }}>Défis, artistes et rencontres</Text></View><Ionicons name="arrow-forward" size={18} color={p.blue} /></EntryPressable>
      </View> : null}
      {totalTracks > 0 && section === 'all' ? <Text style={{ color: p.faint, textAlign: 'center', fontSize: 11 }}>{compact(totalTracks)} morceaux à explorer — et le tien, peut-être.</Text> : null}
    </ScrollView>
    <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
  </CollectionSurface>;
}
function CollectionIconButtonOnArt({ onPress, label, icon }: { onPress: () => void; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return <EntryPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.artIcon}><Ionicons name={icon} size={22} color="#FFF" style={{ transform: [{ rotate: '45deg' }] }} /></EntryPressable>;
}
const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: 18, paddingHorizontal: 17 },
  hero: { borderRadius: 27, overflow: 'hidden', justifyContent: 'space-between' }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 17 }, heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: 'rgba(5,10,20,.68)', borderRadius: 20 }, signal: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#B9DFFF' }, badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  artIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,10,20,.45)' }, heroBottom: { padding: 22, gap: 10 }, heroKicker: { color: '#C5D5E6', fontSize: 9, fontWeight: '700', letterSpacing: 2 }, heroTitle: { color: '#FFF', fontSize: 30, lineHeight: 34, letterSpacing: 0, fontWeight: '800' }, heroArtist: { color: '#CFD6E2', fontSize: 13, marginTop: 5 },
  heroPlay: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#EDF5FF', paddingHorizontal: 20, minHeight: 44, borderRadius: 24, marginTop: 4 }, playLabel: { color: '#111A29', fontSize: 13, fontWeight: '800' },
  mood: { height: 144, borderRadius: 20, overflow: 'hidden', padding: 17, justifyContent: 'space-between' }, moodLabel: { color: '#FFF', fontSize: 21, fontWeight: '800', letterSpacing: 0 },
  avatar: { width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, artistName: { fontSize: 14, fontWeight: '700', marginTop: 11, marginBottom: 5 },
  collection: { borderRadius: 22, overflow: 'hidden' }, collectionTitle: { fontWeight: '700', fontSize: 16, letterSpacing: 0 },
  club: { padding: 16, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 14 }, clubIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
