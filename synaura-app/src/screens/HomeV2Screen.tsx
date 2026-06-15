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
import { getHomeData, getNotifications } from '@/api/client';
import type { Creator, HomeData, Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { UniversalSearchModal, NotificationModal } from '@/components/HomeOverlays';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { SynauraBackground } from '@/components/SynauraBackground';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, spacing } from '@/theme/tokens';

const emptyHome: HomeData = {
  forYou: [],
  trending: [],
  recent: [],
  boosted: [],
  playlists: [],
  creators: [],
  posts: [],
};

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function uniqueTracks(tracks: Track[]) {
  const byId = new Map<string, Track>();
  tracks.forEach((track) => {
    if (track?._id && !byId.has(track._id)) byId.set(track._id, track);
  });
  return Array.from(byId.values());
}

export function HomeV2Screen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [data, setData] = useState<HomeData>(emptyHome);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await getHomeData();
      setData(next);
      void getNotifications().then((result) => setUnread(result.unread)).catch(() => {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recommendations = useMemo(
    () => uniqueTracks([...data.forYou, ...data.boosted, ...data.trending]).slice(0, 8),
    [data],
  );
  const recent = useMemo(() => uniqueTracks(data.recent).slice(0, 4), [data.recent]);
  const hero = recommendations[0] || recent[0] || player.current;

  const playFrom = useCallback(async (tracks: Track[], track: Track) => {
    const playable = tracks.filter((item) => item.audioUrl);
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index);
  }, [player]);

  return (
    <View style={styles.root}>
      <SynauraBackground variant="warm" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text} />}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('../assets/synaura-symbol-2026.png')} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Synaura</Text>
              <Text style={styles.brandLine}>Ton monde musical</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Rechercher" onPress={() => setSearchOpen(true)} style={styles.headerButton}>
              <Ionicons name="search" size={18} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Notifications" onPress={() => setNotificationsOpen(true)} style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={19} color={colors.text} />
              {unread ? <View style={styles.unreadDot} /> : null}
            </Pressable>
            <MobileAccountButton compact />
          </View>
        </View>

        {player.current ? (
          <Pressable onPress={() => navigation.navigate('Swipe')} style={styles.resume}>
            <TrackCover track={player.current} active={player.isPlaying} style={styles.resumeCover} />
            <View style={styles.resumeCopy}>
              <Text style={styles.resumeKicker}>REPRENDRE L'ÉCOUTE</Text>
              <Text numberOfLines={1} style={styles.resumeTitle}>{player.current.title}</Text>
              <Text numberOfLines={1} style={styles.resumeArtist}>{artistName(player.current)}</Text>
            </View>
            <Pressable onPress={() => void player.togglePlayPause()} style={styles.resumePlay}>
              <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={18} color={colors.paper} />
            </Pressable>
          </Pressable>
        ) : null}

        {hero ? (
          <View style={styles.hero}>
            <TrackCover track={hero} active={player.current?._id === hero._id && player.isPlaying} autoPlayVideo style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(19,16,17,0.02)', 'rgba(19,16,17,0.82)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <Text style={styles.heroKicker}>CHOISI POUR TOI</Text>
              <Text numberOfLines={2} style={styles.heroTitle}>{hero.title}</Text>
              <Text numberOfLines={1} style={styles.heroArtist}>{artistName(hero)}</Text>
              <View style={styles.heroActions}>
                <Pressable onPress={() => playFrom(recommendations.length ? recommendations : [hero], hero)} style={styles.heroPlay}>
                  <Ionicons name={player.current?._id === hero._id && player.isPlaying ? 'pause' : 'play'} size={18} color={colors.text} />
                  <Text style={styles.heroPlayText}>{player.current?._id === hero._id && player.isPlaying ? 'En lecture' : 'Écouter'}</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate('Swipe')} style={styles.heroScroll}>
                  <Text style={styles.heroScrollLetter}>S</Text>
                  <Text style={styles.heroScrollText}>Entrer dans le Scroll</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : loading ? <ActivityIndicator color={colors.text} style={styles.loader} /> : null}

        <View style={styles.shortcutRow}>
          <Shortcut icon="musical-notes-outline" title="Scroll" subtitle="Découvrir maintenant" onPress={() => navigation.navigate('Swipe')} />
          <Shortcut icon="sparkles-outline" title="Studio" subtitle="Créer un morceau" onPress={() => navigation.navigate('AIStudio')} />
        </View>

        <SectionHeader title="À écouter maintenant" action="Tout voir" onPress={() => navigation.navigate('Discover')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
          {recommendations.slice(1, 7).map((track) => (
            <TrackTile
              key={track._id}
              track={track}
              playing={player.current?._id === track._id && player.isPlaying}
              onPress={() => playFrom(recommendations, track)}
            />
          ))}
        </ScrollView>

        {data.creators.length ? (
          <>
            <SectionHeader title="Artistes qui montent" action="Explorer" onPress={() => navigation.navigate('Discover')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRail}>
              {data.creators.slice(0, 8).map((creator) => (
                <CreatorBubble key={creator.id} creator={creator} onPress={() => navigation.navigate('PublicProfile', { username: creator.handle.replace(/^@/, '') })} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {recent.length ? (
          <>
            <SectionHeader title="Nouveautés" />
            <View style={styles.recentList}>
              {recent.map((track) => (
                <Pressable key={track._id} onPress={() => playFrom(recent, track)} style={styles.recentRow}>
                  <TrackCover track={track} active={player.current?._id === track._id && player.isPlaying} style={styles.recentCover} />
                  <View style={styles.recentCopy}>
                    <Text numberOfLines={1} style={styles.recentTitle}>{track.title}</Text>
                    <Text numberOfLines={1} style={styles.recentArtist}>{artistName(track)}</Text>
                  </View>
                  <Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause-circle' : 'play-circle'} size={32} color={colors.text} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <UniversalSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationModal visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} onUnreadChange={setUnread} />
    </View>
  );
}

function Shortcut({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <View style={styles.shortcutIcon}><Ionicons name={icon} size={19} color={colors.text} /></View>
      <View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{title}</Text><Text numberOfLines={1} style={styles.shortcutSubtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

function TrackTile({ track, playing, onPress }: { track: Track; playing: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.trackTile}>
      <View style={styles.trackTileCoverWrap}>
        <TrackCover track={track} active={playing} style={styles.trackTileCover} />
        <View style={styles.trackTilePlay}><Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} /></View>
      </View>
      <Text numberOfLines={1} style={styles.trackTileTitle}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.trackTileArtist}>{artistName(track)}</Text>
    </Pressable>
  );
}

function CreatorBubble({ creator, onPress }: { creator: Creator; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.creator}>
      <View style={[styles.creatorAvatar, { backgroundColor: creator.tint || '#8B8193' }]}>
        {creator.avatar?.startsWith('http') ? <Image source={{ uri: creator.avatar }} style={StyleSheet.absoluteFill} /> : <Text style={styles.creatorInitial}>{creator.avatar || creator.name.slice(0, 1)}</Text>}
      </View>
      <Text numberOfLines={1} style={styles.creatorName}>{creator.name}</Text>
      <Text numberOfLines={1} style={styles.creatorTag}>{creator.tag || creator.handle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 145 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 31, height: 31, borderRadius: 9 },
  brandName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  brandLine: { marginTop: 1, color: colors.textTertiary, fontSize: 8, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  unreadDot: { position: 'absolute', top: 7, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#D46C78' },
  search: { marginTop: 16, height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  searchText: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  resume: { marginTop: 12, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 7 },
  resumeCover: { width: 40, height: 40, borderRadius: 9 },
  resumeCopy: { flex: 1, minWidth: 0 },
  resumeKicker: { color: colors.textTertiary, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  resumeTitle: { marginTop: 3, color: colors.text, fontSize: 13, fontWeight: '900' },
  resumeArtist: { marginTop: 2, color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  resumePlay: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  hero: { height: 224, marginTop: 12, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 16, backgroundColor: colors.black },
  heroContent: { padding: 16 },
  heroKicker: { color: 'rgba(255,249,239,0.62)', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  heroTitle: { marginTop: 5, maxWidth: '92%', color: colors.paper, fontSize: 22, lineHeight: 24, fontWeight: '900' },
  heroArtist: { marginTop: 5, color: 'rgba(255,249,239,0.7)', fontSize: 13, fontWeight: '800' },
  heroActions: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroPlay: { height: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: colors.paper, paddingHorizontal: 13 },
  heroPlayText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  heroScroll: { height: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11 },
  heroScrollLetter: { color: colors.paper, fontSize: 18, fontWeight: '900' },
  heroScrollText: { color: colors.paper, fontSize: 10, fontWeight: '800' },
  loader: { marginVertical: 90 },
  shortcutRow: { marginTop: 8, flexDirection: 'row', gap: 8 },
  shortcut: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9 },
  shortcutIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.09)' },
  shortcutCopy: { flex: 1 },
  shortcutTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  shortcutSubtitle: { display: 'none' },
  sectionHeader: { marginTop: 19, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionAction: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  trackRail: { gap: 12, paddingRight: 18 },
  trackTile: { width: 118 },
  trackTileCoverWrap: { width: 118, height: 118, overflow: 'hidden', borderRadius: 13, backgroundColor: 'rgba(17,17,17,0.06)' },
  trackTileCover: { width: '100%', height: '100%' },
  trackTilePlay: { position: 'absolute', right: 7, bottom: 7, width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
  trackTileTitle: { marginTop: 8, color: colors.text, fontSize: 12, fontWeight: '900' },
  trackTileArtist: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  creatorRail: { gap: 15, paddingRight: 18 },
  creator: { width: 78, alignItems: 'center' },
  creatorAvatar: { width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)' },
  creatorInitial: { color: colors.paper, fontSize: 20, fontWeight: '900' },
  creatorName: { marginTop: 7, width: 78, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  creatorTag: { marginTop: 1, width: 78, color: colors.textTertiary, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  recentList: { gap: 7 },
  recentRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 7 },
  recentCover: { width: 42, height: 42, borderRadius: 9 },
  recentCopy: { flex: 1, minWidth: 0 },
  recentTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  recentArtist: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
});
