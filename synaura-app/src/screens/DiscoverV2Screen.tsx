import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiscoverRadar, getEditorialCollections, getHomeData, getUserPreferences } from '@/api/client';
import type { Creator, HomeData, Playlist, Track } from '@/api/types';
import { UniversalSearchModal } from '@/components/HomeOverlays';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { RadarMobileSection } from '@/components/radar/RadarMobileSection';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { useAuth } from '@/auth/AuthProvider';
import { DISCOVER_MOODS } from '@/discover/moods';
import { COMMUNITY_CLUBS } from '@/community/clubs';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius } from '@/theme/tokens';

// Intentions creatives (onboarding "Personnaliser mes gouts") qui mettent un Club
// en avant. Ne masque jamais les autres Clubs, se contente de les prioriser.
const INTENTION_TO_CLUB_SLUG: Record<string, string> = {
  remix: 'remix',
  collab: 'collab',
  create_ai: 'ai',
};

const emptyHome: HomeData = {
  forYou: [],
  trending: [],
  recent: [],
  boosted: [],
  playlists: [],
  creators: [],
  posts: [],
};

type ArtistPairing = { creator: Creator; track: Track };

export function DiscoverV2Screen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const auth = useAuth();
  const [home, setHome] = useState<HomeData>(emptyHome);
  const [radar, setRadar] = useState<Track[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [favoriteMoodIds, setFavoriteMoodIds] = useState<string[]>([]);
  const [highlightedClubSlugs, setHighlightedClubSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.requireAuth()) return;
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

  // Priorite visuelle aux ambiances/Clubs choisis a l'onboarding, sans jamais
  // masquer les autres options : simple reordonnancement stable.
  const orderedMoods = useMemo(() => {
    if (!favoriteMoodIds.length) return DISCOVER_MOODS;
    return [...DISCOVER_MOODS].sort((a, b) => {
      const aFav = favoriteMoodIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteMoodIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [favoriteMoodIds]);

  const orderedClubs = useMemo(() => {
    if (!highlightedClubSlugs.length) return COMMUNITY_CLUBS;
    return [...COMMUNITY_CLUBS].sort((a, b) => {
      const aFav = highlightedClubSlugs.includes(a.slug) ? 0 : 1;
      const bFav = highlightedClubSlugs.includes(b.slug) ? 0 : 1;
      return aFav - bFav;
    });
  }, [highlightedClubSlugs]);

  const load = useCallback(async () => {
    setLoading(true);
    // Chaque section apparait des qu'elle est prete; le Radar ne reste plus
    // bloque par la requete home ou les collections editoriales.
    void getHomeData().then(setHome).catch(() => {});
    void getEditorialCollections().then(setCollections).catch(() => {});
    try {
      setRadar(await getDiscoverRadar(16));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trackPool = useMemo(() => {
    const map = new Map<string, Track>();
    [...home.trending, ...home.recent, ...home.forYou].forEach((track) => {
      if (track?._id && track.audioUrl && !map.has(track._id)) map.set(track._id, track);
    });
    return Array.from(map.values());
  }, [home.forYou, home.recent, home.trending]);

  const artistPairings = useMemo<ArtistPairing[]>(() => {
    const pairings: ArtistPairing[] = [];
    for (const creator of home.creators) {
      const track = trackPool.find((item) => item.artist?._id === creator.id);
      if (track) pairings.push({ creator, track });
      if (pairings.length >= 10) break;
    }
    return pairings;
  }, [home.creators, trackPool]);

  const featuredCollection = useMemo(
    () => home.playlists.find((playlist) => playlist.isEditorial || playlist.collection || playlist.bannerUrl) || null,
    [home.playlists],
  );

  const playFrom = useCallback(async (queue: Track[], track: Track) => {
    const playable = queue.filter((item) => item.audioUrl);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
        <ScreenIntro
          eyebrow="Explorer"
          title="Découvrir"
          description="Entre par une ambiance, un signal ou une communauté."
          trailing={<MobileAccountButton compact />}
        />

        <MotionPressable onPress={() => setSearchOpen(true)} style={styles.search} scaleTo={0.98}>
          <Ionicons name="search" size={19} color={colors.textSecondary} />
          <Text style={styles.searchText}>Sons, artistes, playlists, clubs...</Text>
          <View style={styles.searchArrow}><Ionicons name="arrow-forward" size={15} color={colors.text} /></View>
        </MotionPressable>

        <SectionHeader title="Explorer par ambiance" subtitle="Une porte d’entrée vers les sons qui correspondent à ton moment." />
        <View style={styles.moodGrid}>
          {orderedMoods.map((mood, index) => {
            const highlighted = favoriteMoodIds.includes(mood.id);
            return (
              <Reveal key={mood.id} delay={Math.min(index * 45, 220)} distance={8} scaleFrom={0.985} style={styles.moodReveal}>
                <MotionPressable
                  onPress={() => navigation.navigate('DiscoverMood', { moodId: mood.id })}
                  style={styles.moodPressable}
                  scaleTo={0.975}
                >
                  <LinearGradient
                    colors={mood.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.moodTile, highlighted && styles.moodTileHighlighted]}
                  >
                    {highlighted ? <View style={styles.moodBadge}><Text style={styles.moodBadgeText}>Pour toi</Text></View> : null}
                    <View>
                      <Text style={styles.moodLabel}>{mood.label}</Text>
                      <Text numberOfLines={2} style={styles.moodPromise}>{mood.promise}</Text>
                    </View>
                    <View style={styles.moodEnter}>
                      <Text style={styles.moodEnterText}>Entrer</Text>
                      <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                    </View>
                  </LinearGradient>
                </MotionPressable>
              </Reveal>
            );
          })}
        </View>

        <RadarMobileSection
          tracks={radar}
          loading={loading}
          compact
          onViewAll={() => navigation.navigate('Radar')}
        />

        {featuredCollection ? (
          <CollectionFeatureCard
            playlist={featuredCollection}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: featuredCollection.slug || featuredCollection.id })}
          />
        ) : null}

        {home.playlists.length ? (
          <View>
            <SectionHeader title="Collections éditoriales" subtitle="Des sélections construites autour d’une histoire musicale." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistRail}>
              {home.playlists.map((playlist) => (
                <MotionPressable key={playlist.id} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.slug || playlist.id })} style={styles.playlistTile} scaleTo={0.97}>
                  <View style={styles.playlistCover}>
                    {playlist.bannerUrl || playlist.covers?.[0] ? (
                      <Image source={{ uri: playlist.bannerUrl || playlist.covers[0] }} style={StyleSheet.absoluteFillObject} />
                    ) : (
                      <Ionicons name="albums-outline" size={24} color={colors.textTertiary} />
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text>
                </MotionPressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {artistPairings.length ? (
          <View>
            <SectionHeader title="Artistes à découvrir" subtitle="Un premier morceau pour entrer dans leur univers." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
              {artistPairings.map(({ creator, track }) => (
                <ArtistDiscoverCard
                  key={creator.id}
                  creator={creator}
                  track={track}
                  playing={player.current?._id === track._id && player.isPlaying}
                  onPlay={() => void playFrom([track], track)}
                  onOpen={() => navigation.navigate('PublicProfile', { username: creator.handle.replace(/^@/, '') })}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.clubsSection}>
          <SectionHeader title="Créer avec d'autres" subtitle="Rejoins un espace centré sur une façon de faire de la musique." actionLabel="Tous les Clubs" onAction={() => navigation.navigate('Community')} />
          <View style={styles.clubsGrid}>
            {orderedClubs.map((club) => {
              const highlighted = highlightedClubSlugs.includes(club.slug);
              return (
                <Pressable
                  key={club.slug}
                  onPress={() => navigation.navigate('ClubDetail', { slug: club.slug })}
                  style={[styles.clubChip, highlighted && styles.clubChipHighlighted]}
                >
                  <View style={[styles.clubDot, { backgroundColor: club.accent }]} />
                  <Text numberOfLines={1} style={styles.clubChipText}>{club.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </View>
  );
}

function CollectionFeatureCard({ playlist, onPress }: { playlist: Playlist; onPress: () => void }) {
  const collection = playlist.collection;
  const cardColors = collection?.themeColors?.length ? collection.themeColors : playlist.themeColors?.length ? playlist.themeColors : ['#7357C6', '#4A9EAA'];
  const banner = playlist.bannerUrl || collection?.bannerUrl || playlist.coverUrl || playlist.covers[0];

  return (
    <MotionPressable onPress={onPress} style={styles.collectionFeature} scaleTo={0.985}>
      <LinearGradient colors={cardColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      {banner ? <Image source={{ uri: banner }} style={styles.collectionFeatureImage} /> : null}
      <LinearGradient colors={['rgba(19,16,17,0.20)', 'rgba(19,16,17,0.86)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.collectionFeatureBody}>
        <Text style={styles.collectionFeatureBadge}>{playlist.badge || collection?.badge || 'Collection officielle'}</Text>
        <Text numberOfLines={2} style={styles.collectionFeatureTitle}>{collection?.title || playlist.title}</Text>
        <Text numberOfLines={2} style={styles.collectionFeatureText}>{collection?.subtitle || playlist.vibe}</Text>
        <View style={styles.collectionFeatureAction}>
          <Ionicons name="albums-outline" size={17} color={colors.text} />
          <Text style={styles.collectionFeatureActionText}>Explorer</Text>
        </View>
      </View>
    </MotionPressable>
  );
}

function ArtistDiscoverCard({ creator, track, playing, onPlay, onOpen }: {
  creator: Creator;
  track: Track;
  playing: boolean;
  onPlay: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.artistCard}>
      <Pressable onPress={onOpen} style={styles.artistTop}>
        <View style={[styles.artistAvatar, { backgroundColor: creator.tint || '#8B8193' }]}>
          {creator.avatar?.startsWith('http')
            ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFill} />
            : <Text style={styles.artistInitial}>{creator.avatar || creator.name.slice(0, 1)}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.artistName}>{creator.name}</Text>
          {track.genre?.[0] ? <Text numberOfLines={1} style={styles.artistStyle}>{track.genre[0]}</Text> : null}
        </View>
      </Pressable>

      <Pressable onPress={onPlay} style={styles.artistTrack}>
        <TrackCover track={track} active={playing} style={styles.artistTrackCover} />
        <Text numberOfLines={1} style={styles.artistTrackTitle}>{track.title}</Text>
        <View style={styles.artistTrackPlay}><Ionicons name={playing ? 'pause' : 'play'} size={13} color={colors.paper} /></View>
      </Pressable>

      <Pressable onPress={onOpen} style={styles.artistCta}>
        <Text style={styles.artistCtaText}>Découvrir son univers</Text>
        <Ionicons name="arrow-forward" size={13} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 160, gap: 20 },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  searchText: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  searchArrow: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.05)' },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  moodReveal: { width: '48.5%' },
  moodPressable: { width: '100%', borderRadius: radius.lg, overflow: 'hidden' },
  moodTile: { minHeight: 142, borderRadius: radius.lg, padding: 13, justifyContent: 'space-between' },
  moodTileHighlighted: { borderWidth: 2, borderColor: colors.violet },
  moodBadge: { position: 'absolute', left: 12, top: 12, zIndex: 1, borderRadius: 999, backgroundColor: colors.violet, paddingHorizontal: 9, paddingVertical: 4 },
  moodBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  moodLabel: { color: colors.paper, fontSize: 15, lineHeight: 18, fontWeight: '900' },
  moodPromise: { marginTop: 5, color: 'rgba(255,250,242,0.72)', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  moodEnter: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  moodEnterText: { color: 'rgba(255,250,242,0.9)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  collectionFeature: { minHeight: 250, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.text, shadowColor: colors.text, shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  collectionFeatureImage: { ...StyleSheet.absoluteFillObject, opacity: 0.48 },
  collectionFeatureBody: { flex: 1, justifyContent: 'flex-end', padding: 17 },
  collectionFeatureBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(255,249,239,0.18)', paddingHorizontal: 11, paddingVertical: 6, color: colors.paper, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  collectionFeatureTitle: { marginTop: 11, color: colors.paper, fontSize: 27, lineHeight: 29, fontWeight: '900' },
  collectionFeatureText: { marginTop: 8, color: 'rgba(255,249,239,0.78)', fontSize: 13, lineHeight: 19, fontWeight: '800' },
  collectionFeatureAction: { alignSelf: 'flex-start', marginTop: 14, height: 42, borderRadius: radius.md, backgroundColor: colors.paper, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 7 },
  collectionFeatureActionText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  playlistRail: { gap: 11, paddingRight: 18 },
  playlistTile: { width: 118 },
  playlistCover: { width: 118, height: 92, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.md, backgroundColor: 'rgba(23,19,19,0.06)' },
  playlistTitle: { marginTop: 7, color: colors.text, fontSize: 11, fontWeight: '900' },
  artistRail: { gap: 10, paddingRight: 18 },
  artistCard: { width: 190, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.76)', padding: 11, gap: 9 },
  artistTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  artistAvatar: { width: 44, height: 44, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  artistInitial: { color: colors.paper, fontSize: 17, fontWeight: '900' },
  artistName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  artistStyle: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  artistTrack: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, backgroundColor: 'rgba(23,19,19,0.045)', padding: 6 },
  artistTrackCover: { width: 32, height: 32, borderRadius: 9 },
  artistTrackTitle: { flex: 1, minWidth: 0, color: colors.text, fontSize: 10, fontWeight: '900' },
  artistTrackPlay: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  artistCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, borderRadius: radius.md, backgroundColor: 'rgba(23,19,19,0.05)' },
  artistCtaText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  clubsSection: { gap: 12, paddingTop: 4 },
  clubsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clubsTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  clubsLink: { color: colors.textTertiary, fontSize: 10, fontWeight: '900' },
  clubsGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clubChip: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 10 },
  clubChipHighlighted: { borderColor: colors.violet, borderWidth: 1.5 },
  clubDot: { width: 7, height: 7, borderRadius: 4 },
  clubChipText: { flex: 1, minWidth: 0, color: colors.text, fontSize: 10, fontWeight: '900' },
});

export default DiscoverV2Screen;
