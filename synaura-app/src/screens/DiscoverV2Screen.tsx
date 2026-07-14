import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  InteractionManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDiscoverPage,
  getDiscoverRadar,
  getEditorialCollections,
  getUserPreferences,
} from '@/api/client';
import type { Track } from '@/api/types';
import { UniversalSearchModal } from '@/components/HomeOverlays';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { RadarMobileSection } from '@/components/radar/RadarMobileSection';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { useAuth } from '@/auth/AuthProvider';
import { DISCOVER_MOODS, matchesMoodKeywords, type MoodConfig } from '@/discover/moods';
import { COMMUNITY_CLUBS } from '@/community/clubs';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, shadows } from '@/theme/tokens';
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

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function trackImage(track: Track) {
  return track.coverUrl || track.coverVideoPosterUrl || track.musicVideoPosterUrl || null;
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

export function DiscoverV2Screen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const player = usePlayer();
  const auth = useAuth();
  const requestId = useRef(0);
  const backgroundTask = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
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
    if (!auth.user) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    backgroundTask.current?.cancel();
    if (showInitialLoader) setLoading(true);
    else setRefreshing(true);
    setRadarLoading(true);
    setLoadError(false);

    const cached = showInitialLoader ? await readDiscoverVisualCache<EditorialCollection>() : null;
    if (currentRequest !== requestId.current) return;
    const snapshot = {
      newest: cached?.newest || [],
      popular: cached?.popular || [],
      hidden: cached?.hidden || [],
      radar: cached?.radar || [],
      collections: cached?.collections || [],
      totalTracks: cached?.totalTracks || 0,
    };
    if (cached) {
      setNewestTracks(cached.newest);
      setPopularTracks(cached.popular);
      setHiddenTracks(cached.hidden);
      setRadar(cached.radar);
      setCollections(cached.collections);
      setTotalTracks(cached.totalTracks);
      setLoading(false);
      setRadarLoading(false);
    }

    let contentRevealed = false;
    const revealContent = () => {
      if (contentRevealed || currentRequest !== requestId.current) return;
      contentRevealed = true;
      setLoading(false);
    };

    const persistSnapshot = () => writeDiscoverVisualCache<EditorialCollection>(snapshot);
    const newestRequest = getDiscoverPage({ sort: 'newest', limit: 20, profileLimit: 4 })
      .then((page) => {
        if (currentRequest !== requestId.current) return;
        snapshot.newest = page.tracks;
        snapshot.totalTracks = page.total;
        setNewestTracks(page.tracks);
        setTotalTracks(page.total);
        revealContent();
      });
    const radarRequest = getDiscoverRadar(12)
      .then((tracks) => {
        if (currentRequest === requestId.current) {
          snapshot.radar = tracks;
          setRadar(tracks);
        }
      })
      .finally(() => {
        if (currentRequest === requestId.current) setRadarLoading(false);
      });
    const collectionsRequest = getEditorialCollections().then((items) => {
      if (currentRequest === requestId.current) {
        snapshot.collections = items as EditorialCollection[];
        setCollections(snapshot.collections);
      }
    });

    const primaryResults = await Promise.allSettled([
      newestRequest,
      radarRequest,
      collectionsRequest,
    ]);
    if (currentRequest !== requestId.current) return;
    setLoading(false);
    setLoadError(!cached && primaryResults.every((result) => result.status === 'rejected'));
    void persistSnapshot();

    const loadSecondary = async () => {
      const [popularResult, hiddenResult] = await Promise.allSettled([
        getDiscoverPage({ sort: 'popular', limit: 20, profileLimit: 4 }),
        getDiscoverPage({ sort: 'hidden', limit: 20, profileLimit: 4 }),
      ]);
      if (currentRequest !== requestId.current) return;
      if (popularResult.status === 'fulfilled') {
        snapshot.popular = popularResult.value.tracks;
        setPopularTracks(snapshot.popular);
      }
      if (hiddenResult.status === 'fulfilled') {
        snapshot.hidden = hiddenResult.value.tracks;
        setHiddenTracks(snapshot.hidden);
      }
      setRefreshing(false);
      await persistSnapshot();
    };

    if (showInitialLoader) {
      backgroundTask.current = InteractionManager.runAfterInteractions(() => {
        void loadSecondary();
      });
    } else {
      await loadSecondary();
    }
  }, []);

  useEffect(() => {
    void load(true);
    return () => {
      backgroundTask.current?.cancel();
      requestId.current += 1;
    };
  }, [load]);

  const trackPool = useMemo(
    () => uniqueTracks([...newestTracks, ...hiddenTracks, ...radar, ...popularTracks]),
    [hiddenTracks, newestTracks, popularTracks, radar],
  );

  const leadTrack = newestTracks[0] || radar[0] || popularTracks[0] || hiddenTracks[0] || null;
  const leadLabel = leadTrack && newestTracks.some((track) => track._id === leadTrack._id)
    ? 'Nouveau sur Synaura'
    : leadTrack && radar.some((track) => track._id === leadTrack._id)
      ? 'Signal Radar'
      : 'À découvrir';

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

  const newestRailTracks = useMemo(
    () => newestTracks.length > 1 && leadTrack ? newestTracks.filter((track) => track._id !== leadTrack._id) : newestTracks,
    [leadTrack, newestTracks],
  );
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

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(false)} tintColor={colors.violet} colors={[colors.violet]} />}
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: insets.top + 14, paddingBottom: responsive.miniPlayerClearance + 16 },
        ]}
      >
        <ScreenIntro
          eyebrow="Explorer"
          title="Découvrir"
          description="Des portes d'entrée visuelles vers toute la musique publiée sur Synaura."
          trailing={<MobileAccountButton compact />}
        />

        <MotionPressable onPress={() => setSearchOpen(true)} style={styles.search} scaleTo={0.98}>
          <Ionicons name="search" size={19} color={colors.textSecondary} />
          <Text style={styles.searchText}>Sons, artistes, playlists, clubs...</Text>
          <View style={styles.searchArrow}><Ionicons name="arrow-forward" size={15} color={colors.text} /></View>
        </MotionPressable>

        {leadTrack ? (
          <DiscoverLeadCard
            track={leadTrack}
            label={leadLabel}
            totalTracks={totalTracks}
            playing={player.current?._id === leadTrack._id && player.isPlaying}
            tablet={responsive.isTablet}
            onPlay={() => void playFrom(newestTracks.length ? newestTracks : trackPool, leadTrack)}
            onOpen={() => openTrack(leadTrack)}
          />
        ) : loading ? <DiscoverLeadSkeleton tablet={responsive.isTablet} /> : null}

        <View>
          <SectionHeader title="Explorer par ambiance" subtitle="Chaque carte est illustrée par des pochettes qui correspondent réellement à son univers." />
          <View style={styles.moodGrid}>
            {orderedMoods.map((mood, index) => (
              <Reveal
                key={mood.id}
                delay={Math.min(index * 38, 190)}
                distance={7}
                scaleFrom={0.988}
                style={{ width: responsive.isTablet ? '23.7%' : '48.4%' }}
              >
                <MoodImageCard
                  mood={mood}
                  covers={moodCovers.get(mood.id) || []}
                  highlighted={favoriteMoodIds.includes(mood.id)}
                  onPress={() => navigation.navigate('DiscoverMood', { moodId: mood.id })}
                />
              </Reveal>
            ))}
          </View>
        </View>

        <DiscoverTrackRail
          title="Tout juste publiés"
          subtitle="Les dernières sorties publiques, sans attendre qu'elles deviennent populaires."
          tracks={newestRailTracks}
          loading={loading}
          tablet={responsive.isTablet}
          currentTrackId={player.current?._id}
          isPlaying={player.isPlaying}
          onOpen={openTrack}
          onPlay={(track) => void playFrom(newestRailTracks, track)}
        />

        <RadarMobileSection tracks={radar} loading={radarLoading} compact onViewAll={() => navigation.navigate('Radar')} />

        <DiscoverTrackRail
          title="Pépites à découvrir"
          subtitle="Des morceaux publics encore peu écoutés, remontés hors des classements habituels."
          tracks={hiddenRailTracks}
          tablet={responsive.isTablet}
          currentTrackId={player.current?._id}
          isPlaying={player.isPlaying}
          onOpen={openTrack}
          onPlay={(track) => void playFrom(hiddenRailTracks, track)}
        />

        {featuredCollection ? (
          <View>
            <SectionHeader title="Sélection Synaura" subtitle="Une collection éditoriale pour prolonger l'écoute." />
            <CollectionFeatureCard
              collection={featuredCollection}
              tablet={responsive.isTablet}
              onPress={() => navigation.navigate('PlaylistDetail', { playlistId: featuredCollection.slug || featuredCollection.playlistId })}
            />
          </View>
        ) : null}

        {collectionRail.length ? (
          <View>
            <SectionHeader title="Collections éditoriales" subtitle="Des sélections publiées autour d'une histoire musicale." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionRail}>
              {collectionRail.map((collection) => (
                <CollectionTile
                  key={collection.id || collection.playlistId}
                  collection={collection}
                  tablet={responsive.isTablet}
                  onPress={() => navigation.navigate('PlaylistDetail', { playlistId: collection.slug || collection.playlistId })}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <DiscoverTrackRail
          title="Plébiscités sur Synaura"
          subtitle="Les morceaux qui cumulent le plus d'amour et d'écoutes sur la plateforme."
          tracks={popularRailTracks}
          tablet={responsive.isTablet}
          currentTrackId={player.current?._id}
          isPlaying={player.isPlaying}
          onOpen={openTrack}
          onPlay={(track) => void playFrom(popularRailTracks, track)}
        />

        {artistPairings.length ? (
          <View>
            <SectionHeader title="Artistes à découvrir" subtitle="Chaque profil est présenté avec un morceau réel pour entrer directement dans son univers." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
              {artistPairings.map((artist) => (
                <ArtistDiscoverCard
                  key={artist.id}
                  artist={artist}
                  tablet={responsive.isTablet}
                  playing={player.current?._id === artist.track._id && player.isPlaying}
                  onPlay={() => void playFrom([artist.track], artist.track)}
                  onOpen={() => navigation.navigate('PublicProfile', { username: artist.username })}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.clubsSection}>
          <SectionHeader title="Créer avec d'autres" subtitle="Des espaces centrés sur une façon de faire de la musique." actionLabel="Tous les Clubs" onAction={() => navigation.navigate('Community')} />
          <View style={styles.clubsGrid}>
            {orderedClubs.map((club) => {
              const highlighted = highlightedClubSlugs.includes(club.slug);
              return (
                <Pressable
                  key={club.slug}
                  onPress={() => navigation.navigate('ClubDetail', { slug: club.slug })}
                  style={[
                    styles.clubChip,
                    { width: responsive.isTablet ? '23.7%' : '48.4%' },
                    highlighted && styles.clubChipHighlighted,
                  ]}
                >
                  <View style={[styles.clubDot, { backgroundColor: club.accent }]} />
                  <Text numberOfLines={1} style={styles.clubChipText}>{club.name}</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {loadError && !trackPool.length ? (
          <View style={styles.errorState}>
            <Ionicons name="cloud-offline-outline" size={23} color={colors.coral} />
            <Text style={styles.errorTitle}>Discover n'a pas pu se charger.</Text>
            <Pressable onPress={() => void load(true)} style={styles.retryButton}><Text style={styles.retryText}>Réessayer</Text></Pressable>
          </View>
        ) : null}
      </ScrollView>
      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </View>
  );
}

function DiscoverLeadCard({ track, label, totalTracks, playing, tablet, onPlay, onOpen }: {
  track: Track;
  label: string;
  totalTracks: number;
  playing: boolean;
  tablet: boolean;
  onPlay: () => void;
  onOpen: () => void;
}) {
  const image = trackImage(track);
  return (
    <MotionPressable onPress={onOpen} style={[styles.leadCard, tablet && styles.leadCardTablet]} scaleTo={0.99}>
      {image ? <Image source={{ uri: image }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#111111', '#7357C6']} style={StyleSheet.absoluteFillObject} />}
      <LinearGradient colors={['rgba(17,17,17,0.05)', 'rgba(17,17,17,0.9)']} locations={[0.12, 0.9]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.leadTop}>
        <View style={styles.leadBadge}><Ionicons name="sparkles-outline" size={12} color="#FFFFFF" /><Text style={styles.leadBadgeText}>{label}</Text></View>
        {totalTracks > 0 ? <Text style={styles.leadTotal}>{compact(totalTracks)} sons publics</Text> : null}
      </View>
      <View style={styles.leadBody}>
        <Text numberOfLines={2} style={styles.leadTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.leadArtist}>{artistName(track)}</Text>
        <View style={styles.leadMetaRow}>
          <View style={styles.leadMeta}><Ionicons name="headset-outline" size={13} color="rgba(255,255,255,0.72)" /><Text style={styles.leadMetaText}>{compact(track.plays || 0)} écoutes</Text></View>
          {track.genre?.[0] ? <Text numberOfLines={1} style={styles.leadGenre}>{track.genre[0]}</Text> : null}
        </View>
        <Pressable onPress={(event) => { event.stopPropagation(); onPlay(); }} style={styles.leadPlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors.text} />
          <Text style={styles.leadPlayText}>{playing ? 'Pause' : 'Écouter'}</Text>
        </Pressable>
      </View>
    </MotionPressable>
  );
}

function DiscoverLeadSkeleton({ tablet }: { tablet: boolean }) {
  return (
    <View style={[styles.leadCard, styles.leadSkeleton, tablet && styles.leadCardTablet]}>
      <View style={styles.skeletonBadge} />
      <View style={styles.skeletonCopy}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonButton} />
      </View>
    </View>
  );
}

function MoodImageCard({ mood, covers, highlighted, onPress }: { mood: MoodConfig; covers: string[]; highlighted: boolean; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={[styles.moodCard, highlighted && styles.moodCardHighlighted]} scaleTo={0.97}>
      <LinearGradient colors={mood.gradient} style={StyleSheet.absoluteFillObject} />
      {covers.length ? <CoverMosaic covers={covers} /> : null}
      <LinearGradient colors={['rgba(17,17,17,0.05)', 'rgba(17,17,17,0.84)']} style={StyleSheet.absoluteFillObject} />
      {highlighted ? <Text style={styles.moodFavorite}>Pour toi</Text> : null}
      <View style={styles.moodBody}>
        <Text numberOfLines={2} style={styles.moodLabel}>{mood.label}</Text>
        <Text numberOfLines={2} style={styles.moodPromise}>{mood.promise}</Text>
        <View style={styles.moodAction}><Text style={styles.moodActionText}>Explorer</Text><Ionicons name="arrow-forward" size={12} color="#FFFFFF" /></View>
      </View>
    </MotionPressable>
  );
}

function CoverMosaic({ covers }: { covers: string[] }) {
  const count = Math.min(4, covers.length);
  return (
    <View style={styles.mosaic}>
      {covers.slice(0, count).map((cover, index) => (
        <Image
          key={`${cover}-${index}`}
          source={{ uri: cover }}
          resizeMode="cover"
          style={[
            styles.mosaicImage,
            count === 1 && styles.mosaicImageSingle,
            count === 2 && styles.mosaicImagePair,
          ]}
        />
      ))}
    </View>
  );
}

function DiscoverTrackRail({ title, subtitle, tracks, loading = false, tablet, currentTrackId, isPlaying, onPlay, onOpen }: {
  title: string;
  subtitle: string;
  tracks: Track[];
  loading?: boolean;
  tablet: boolean;
  currentTrackId?: string | null;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onOpen: (track: Track) => void;
}) {
  if (!tracks.length && !loading) return null;
  return (
    <View>
      <SectionHeader title={title} subtitle={subtitle} />
      {tracks.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
          {tracks.slice(0, 20).map((track) => (
            <DiscoverTrackCard
              key={track._id}
              track={track}
              tablet={tablet}
              playing={currentTrackId === track._id && isPlaying}
              onPlay={() => onPlay(track)}
              onOpen={() => onOpen(track)}
            />
          ))}
        </ScrollView>
      ) : <LoadingTrackRail tablet={tablet} />}
    </View>
  );
}

function DiscoverTrackCard({ track, tablet, playing, onPlay, onOpen }: { track: Track; tablet: boolean; playing: boolean; onPlay: () => void; onOpen: () => void }) {
  const handlePlay = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPlay();
  };
  return (
    <MotionPressable onPress={onOpen} style={[styles.trackCard, tablet && styles.trackCardTablet]} scaleTo={0.975}>
      <View style={styles.trackCoverWrap}>
        <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.trackCover} />
        <LinearGradient colors={['transparent', 'rgba(17,17,17,0.5)']} style={StyleSheet.absoluteFillObject} />
        <Pressable accessibilityLabel={playing ? 'Mettre en pause' : 'Lire'} onPress={handlePlay} style={styles.trackPlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={16} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.trackBody}>
        <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.trackArtist}>{artistName(track)}</Text>
        <View style={styles.trackStats}>
          <View style={styles.trackStat}><Ionicons name="headset-outline" size={11} color={colors.textTertiary} /><Text style={styles.trackStatText}>{compact(track.plays || 0)}</Text></View>
          <View style={styles.trackStat}><Ionicons name="heart-outline" size={11} color={colors.textTertiary} /><Text style={styles.trackStatText}>{compact(track.likesCount || 0)}</Text></View>
        </View>
      </View>
    </MotionPressable>
  );
}

function LoadingTrackRail({ tablet }: { tablet: boolean }) {
  return (
    <View style={styles.loadingRail}>
      {[0, 1, 2].map((index) => <View key={index} style={[styles.loadingTrack, tablet && styles.trackCardTablet]} />)}
    </View>
  );
}

function CollectionFeatureCard({ collection, tablet, onPress }: { collection: EditorialCollection; tablet: boolean; onPress: () => void }) {
  const banner = collection.bannerUrl || collection.coverUrl || null;
  const configuredColors = (collection.themeColors || []).filter(Boolean).slice(0, 3);
  const gradient = configuredColors.length >= 2 ? configuredColors : ['#7357C6', '#4A9EAA', '#D96D63'];
  return (
    <MotionPressable onPress={onPress} style={[styles.collectionFeature, tablet && styles.collectionFeatureTablet]} scaleTo={0.99}>
      <LinearGradient colors={gradient as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      {banner ? <Image source={{ uri: banner }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : null}
      <LinearGradient colors={['rgba(17,17,17,0.1)', 'rgba(17,17,17,0.88)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.collectionFeatureBody}>
        <Text style={styles.collectionBadge}>{collection.badge || 'Collection Synaura'}</Text>
        <Text numberOfLines={2} style={styles.collectionTitle}>{collection.title}</Text>
        {collection.subtitle || collection.description ? <Text numberOfLines={2} style={styles.collectionText}>{collection.subtitle || collection.description}</Text> : null}
        <View style={styles.collectionFooter}>
          {Number(collection.trackCount || 0) > 0 ? <Text style={styles.collectionCount}>{collection.trackCount} sons</Text> : <View />}
          <View style={styles.collectionOpen}><Text style={styles.collectionOpenText}>Explorer</Text><Ionicons name="arrow-forward" size={13} color={colors.text} /></View>
        </View>
      </View>
    </MotionPressable>
  );
}

function CollectionTile({ collection, tablet, onPress }: { collection: EditorialCollection; tablet: boolean; onPress: () => void }) {
  const image = collection.coverUrl || collection.bannerUrl;
  return (
    <MotionPressable onPress={onPress} style={[styles.collectionTile, tablet && styles.collectionTileTablet]} scaleTo={0.97}>
      <View style={styles.collectionTileImage}>
        {image ? <Image source={{ uri: image }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#7357C6', '#4A9EAA']} style={StyleSheet.absoluteFillObject} />}
      </View>
      <Text numberOfLines={2} style={styles.collectionTileTitle}>{collection.title}</Text>
      {Number(collection.trackCount || 0) > 0 ? <Text style={styles.collectionTileMeta}>{collection.trackCount} sons</Text> : null}
    </MotionPressable>
  );
}

function ArtistDiscoverCard({ artist, tablet, playing, onPlay, onOpen }: { artist: ArtistPairing; tablet: boolean; playing: boolean; onPlay: () => void; onOpen: () => void }) {
  return (
    <View style={[styles.artistCard, tablet && styles.artistCardTablet]}>
      <Pressable onPress={onOpen} style={styles.artistIdentity}>
        <View style={styles.artistAvatar}>
          {artist.avatar ? <Image source={{ uri: artist.avatar }} style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#7357C6', '#D96D63']} style={StyleSheet.absoluteFillObject} />}
          {!artist.avatar ? <Text style={styles.artistInitial}>{artist.name.slice(0, 1).toUpperCase()}</Text> : null}
        </View>
        <View style={styles.artistCopy}>
          <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
          <Text numberOfLines={1} style={styles.artistHandle}>@{artist.username}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onPlay} style={styles.artistTrack}>
        <TrackCover track={artist.track} active={playing} style={styles.artistTrackCover} />
        <View style={styles.artistTrackCopy}>
          <Text numberOfLines={1} style={styles.artistTrackTitle}>{artist.track.title}</Text>
          {artist.track.genre?.[0] ? <Text numberOfLines={1} style={styles.artistTrackGenre}>{artist.track.genre[0]}</Text> : null}
        </View>
        <View style={styles.artistPlay}><Ionicons name={playing ? 'pause' : 'play'} size={13} color="#FFFFFF" /></View>
      </Pressable>
      <Pressable onPress={onOpen} style={styles.artistOpen}><Text style={styles.artistOpenText}>Voir le profil</Text><Ionicons name="arrow-forward" size={13} color={colors.text} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 160, gap: 22 },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  searchText: { flex: 1, minWidth: 0, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  searchArrow: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  leadCard: { height: 300, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.black, ...shadows.floating },
  leadCardTablet: { height: 360 },
  leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9, padding: 14 },
  leadBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(17,17,17,0.5)' },
  leadBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  leadTotal: { flexShrink: 1, color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '800' },
  leadBody: { position: 'absolute', left: 15, right: 15, bottom: 15 },
  leadTitle: { maxWidth: 620, color: '#FFFFFF', fontSize: 29, lineHeight: 32, fontWeight: '900' },
  leadArtist: { marginTop: 4, color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '800' },
  leadMetaRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  leadMetaText: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  leadGenre: { maxWidth: 170, overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.14)', fontSize: 9, fontWeight: '900' },
  leadPlay: { alignSelf: 'flex-start', marginTop: 13, minWidth: 112, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: '#FFFFFF', paddingHorizontal: 14 },
  leadPlayText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  leadSkeleton: { backgroundColor: '#DCD8D2' },
  skeletonBadge: { width: 120, height: 26, margin: 14, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.44)' },
  skeletonCopy: { position: 'absolute', left: 15, right: 15, bottom: 15 },
  skeletonTitle: { width: '72%', height: 26, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.68)' },
  skeletonLine: { width: '42%', height: 11, marginTop: 9, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.48)' },
  skeletonButton: { width: 112, height: 42, marginTop: 14, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.72)' },
  moodGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodCard: { width: '100%', minHeight: 174, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.black, ...shadows.soft },
  moodCardHighlighted: { borderWidth: 2, borderColor: colors.violet },
  mosaic: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.65 },
  mosaicImage: { width: '50%', height: '50%' },
  mosaicImageSingle: { width: '100%', height: '100%' },
  mosaicImagePair: { width: '50%', height: '100%' },
  moodFavorite: { position: 'absolute', left: 10, top: 10, overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 5, color: '#FFFFFF', backgroundColor: colors.violet, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  moodBody: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  moodLabel: { color: '#FFFFFF', fontSize: 16, lineHeight: 19, fontWeight: '900' },
  moodPromise: { marginTop: 4, color: 'rgba(255,255,255,0.7)', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  moodAction: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  moodActionText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  trackRail: { gap: 10, paddingTop: 12, paddingRight: 18 },
  trackCard: { width: 156, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.soft },
  trackCardTablet: { width: 190 },
  trackCoverWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  trackCover: { width: '100%', height: '100%' },
  trackPlay: { position: 'absolute', right: 8, bottom: 8, width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  trackBody: { padding: 10 },
  trackTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  trackArtist: { marginTop: 3, color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  trackStats: { marginTop: 8, flexDirection: 'row', gap: 9 },
  trackStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trackStatText: { color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  loadingRail: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  loadingTrack: { width: 156, height: 222, borderRadius: radius.md, backgroundColor: '#E1DDD7' },
  collectionFeature: { minHeight: 270, marginTop: 12, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.black, ...shadows.floating },
  collectionFeatureTablet: { minHeight: 330 },
  collectionFeatureBody: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  collectionBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.16)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  collectionTitle: { maxWidth: 650, marginTop: 10, color: '#FFFFFF', fontSize: 26, lineHeight: 29, fontWeight: '900' },
  collectionText: { maxWidth: 560, marginTop: 6, color: 'rgba(255,255,255,0.74)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  collectionFooter: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  collectionCount: { color: 'rgba(255,255,255,0.68)', fontSize: 10, fontWeight: '800' },
  collectionOpen: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  collectionOpenText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  collectionRail: { gap: 10, paddingTop: 12, paddingRight: 18 },
  collectionTile: { width: 150 },
  collectionTileTablet: { width: 190 },
  collectionTileImage: { width: '100%', aspectRatio: 1.25, overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  collectionTileTitle: { marginTop: 7, color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '900' },
  collectionTileMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  artistRail: { gap: 10, paddingTop: 12, paddingRight: 18 },
  artistCard: { width: 210, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 10, gap: 9, ...shadows.soft },
  artistCardTablet: { width: 240 },
  artistIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  artistAvatar: { width: 48, height: 48, overflow: 'hidden', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  artistInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  artistCopy: { flex: 1, minWidth: 0 },
  artistName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  artistHandle: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '800' },
  artistTrack: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 7, backgroundColor: colors.surfaceMuted },
  artistTrackCover: { width: 38, height: 38, borderRadius: radius.sm },
  artistTrackCopy: { flex: 1, minWidth: 0 },
  artistTrackTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  artistTrackGenre: { marginTop: 2, color: colors.violet, fontSize: 8, fontWeight: '800' },
  artistPlay: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  artistOpen: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, backgroundColor: colors.violetSoft },
  artistOpenText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  clubsSection: { gap: 2 },
  clubsGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  clubChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 10 },
  clubChipHighlighted: { borderColor: colors.violet, backgroundColor: colors.violetSoft },
  clubDot: { width: 7, height: 7, borderRadius: 4 },
  clubChipText: { flex: 1, minWidth: 0, color: colors.text, fontSize: 10, fontWeight: '900' },
  errorState: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 18 },
  errorTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  retryButton: { minWidth: 104, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.text },
  retryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});

export default DiscoverV2Screen;
