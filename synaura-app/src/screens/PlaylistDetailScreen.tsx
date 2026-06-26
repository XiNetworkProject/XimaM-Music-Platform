import React from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlaylistDetail, setTrackLike, type PlaylistDetail } from '@/api/client';
import type { Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';

function formatDuration(seconds?: number) {
  const total = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function artistName(track: Track) {
  return track.artist?.name || track.artist?.username || 'Synaura';
}

export function PlaylistDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const library = useLibrary();
  const playlistId = String(route.params?.playlistId || route.params?.slug || '');
  const [playlist, setPlaylist] = React.useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPlaylistDetail(playlistId)
      .then((next) => {
        if (!mounted) return;
        setPlaylist(next);
        setLiked(Object.fromEntries(next.tracksList.map((track) => [track._id, Boolean(track.isLiked)])));
        setLikeCounts(Object.fromEntries(next.tracksList.map((track) => [track._id, Number(track.likesCount || 0)])));
      })
      .catch(() => { if (mounted) setPlaylist(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [playlistId]);

  const isEditorial = Boolean(playlist?.isEditorial || playlist?.collection);
  const collection = playlist?.collection || null;
  const colors = collection?.themeColors?.length ? collection.themeColors : playlist?.themeColors?.length ? playlist.themeColors : ['#8B5CF6', '#EC4899', '#22D3EE'];
  const banner = collection?.bannerUrl || playlist?.bannerUrl || playlist?.covers?.[0] || null;
  const cover = collection?.coverUrl || playlist?.coverUrl || playlist?.covers?.[0] || null;
  const totalDuration = React.useMemo(() => (playlist?.tracksList || []).reduce((sum, track) => sum + Number(track.duration || 0), 0), [playlist?.tracksList]);

  const playAll = React.useCallback((index = 0) => {
    if (!playlist?.tracksList.length) return;
    player.setQueueAndPlay(playlist.tracksList, Math.max(0, index));
  }, [player, playlist?.tracksList]);

  const shareCollection = React.useCallback(async () => {
    if (!playlist) return;
    const slug = playlist.collection?.slug || playlist.slug || playlist.id;
    await Share.share({
      title: playlist.title,
      message: `Ecoute ${playlist.title} sur Synaura: https://www.synaura.fr/playlists/${slug}`,
    });
  }, [playlist]);

  const toggleLike = React.useCallback(async (track: Track) => {
    const nextLiked = !liked[track._id];
    setLiked((prev) => ({ ...prev, [track._id]: nextLiked }));
    setLikeCounts((prev) => ({ ...prev, [track._id]: Math.max(0, Number(prev[track._id] || 0) + (nextLiked ? 1 : -1)) }));
    const result = await setTrackLike(track._id, nextLiked);
    if (result) {
      setLiked((prev) => ({ ...prev, [track._id]: result.liked }));
      setLikeCounts((prev) => ({ ...prev, [track._id]: result.likesCount }));
    }
  }, [liked]);

  const shareTrack = React.useCallback(async (track: Track) => {
    await Share.share({
      title: track.title,
      message: `Ecoute ${track.title} sur Synaura: https://www.synaura.fr/track/${track._id}`,
    });
  }, []);

  const downloadTrack = React.useCallback(async (track: Track) => {
    if (!track.audioUrl) return;
    if (collection?.downloadEnabled === false || playlist?.downloadEnabled === false) return;
    await library.downloadTrack(track);
  }, [collection?.downloadEnabled, library, playlist?.downloadEnabled]);

  return (
    <SynauraBackground variant="warm">
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 132 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <Text style={styles.topTitle}>{isEditorial ? 'Collection' : 'Playlist'}</Text>
          <Pressable onPress={shareCollection} style={styles.iconBtn}><Ionicons name="share-social-outline" size={18} color="#171313" /></Pressable>
        </View>

        {loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} /> : null}

        {playlist ? (
          <>
            <View style={[styles.hero, isEditorial && styles.heroEditorial]}>
              <LinearGradient colors={[colors[0] || '#8B5CF6', colors[1] || '#EC4899', colors[2] || '#22D3EE'] as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              {banner ? <Image source={{ uri: banner }} style={styles.bannerImage} blurRadius={isEditorial ? 2 : 0} /> : null}
              <View style={styles.heroShade} />
              <View style={styles.heroBody}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{collection?.badge || playlist.badge || (isEditorial ? 'Synaura Originals' : 'Playlist')}</Text>
                  <Text style={styles.badgeSoft}>{playlist.tracks}</Text>
                </View>
                <View style={styles.coverStack}>
                  <View style={styles.coverGlow} />
                  <View style={styles.coverWrap}>
                    {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={42} color="#FFF7ED" />}
                  </View>
                </View>
                <Text style={styles.title}>{playlist.title}</Text>
                <Text style={styles.meta}>{playlist.curator} - {formatDuration(totalDuration)}</Text>
                <Text style={styles.description}>{collection?.subtitle || playlist.description || playlist.vibe}</Text>
                <View style={styles.heroActions}>
                  <Pressable onPress={() => playAll(0)} style={styles.primaryAction}><Ionicons name="play" size={18} color="#171313" /><Text style={styles.primaryActionText}>Tout lire</Text></Pressable>
                  <Pressable onPress={() => playlist.tracksList.length && playAll(Math.floor(Math.random() * playlist.tracksList.length))} style={styles.secondaryAction}><Ionicons name="shuffle" size={18} color="#FFF7ED" /></Pressable>
                  <Pressable onPress={shareCollection} style={styles.secondaryAction}><Ionicons name="share-outline" size={18} color="#FFF7ED" /></Pressable>
                </View>
              </View>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Titres</Text>
              <Text style={styles.sectionMeta}>{playlist.tracksList.length} sons</Text>
            </View>

            <View style={styles.list}>
              {playlist.tracksList.map((track, index) => {
                const active = player.current?._id === track._id;
                const canDownload = collection?.downloadEnabled !== false && playlist.downloadEnabled !== false;
                return (
                  <View key={track._id} style={[styles.trackCard, active && styles.trackCardActive]}>
                    <Pressable onPress={() => playAll(index)} style={styles.trackMain}>
                      <TrackCover track={track} style={styles.trackCover} active={active && player.isPlaying} autoPlayVideo={active && player.isPlaying} />
                      <View style={styles.trackCopy}>
                        <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                        <Text numberOfLines={1} style={styles.trackMeta}>{artistName(track)}{track.genre?.[0] ? ` - ${track.genre[0]}` : ''}</Text>
                      </View>
                      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
                    </Pressable>
                    <View style={styles.actions}>
                      <Pressable onPress={() => toggleLike(track)} style={[styles.actionBtn, liked[track._id] && styles.actionLiked]}>
                        <Ionicons name={liked[track._id] ? 'heart' : 'heart-outline'} size={18} color={liked[track._id] ? '#EC4899' : '#6B5F5A'} />
                        {likeCounts[track._id] ? <Text style={styles.actionCount}>{likeCounts[track._id]}</Text> : null}
                      </Pressable>
                      {collection?.commentsEnabled !== false && playlist.commentsEnabled !== false ? (
                        <Pressable onPress={() => navigation.navigate('TrackDetail', { trackId: track._id, track })} style={styles.actionBtn}>
                          <Ionicons name="chatbubble-outline" size={17} color="#6B5F5A" />
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => shareTrack(track)} style={styles.actionBtn}><Ionicons name="share-social-outline" size={17} color="#6B5F5A" /></Pressable>
                      {canDownload ? <Pressable onPress={() => downloadTrack(track)} style={styles.actionBtn}><Ionicons name="download-outline" size={18} color="#6B5F5A" /></Pressable> : null}
                      <Pressable onPress={() => navigation.navigate('TrackDetail', { trackId: track._id, track })} style={styles.actionBtn}><Ionicons name="ellipsis-horizontal" size={18} color="#6B5F5A" /></Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {isEditorial ? (
              <View style={styles.aboutCard}>
                <Text style={styles.aboutEyebrow}>Collection officielle</Text>
                <Text style={styles.aboutTitle}>{collection?.title || playlist.title}</Text>
                <Text style={styles.aboutText}>{collection?.description || playlist.description || 'Une selection officielle pensee pour decouvrir Synaura.'}</Text>
                {collection?.slug ? (
                  <Pressable onPress={() => Linking.openURL(`https://www.synaura.fr/playlists/${collection.slug}`)} style={styles.aboutLink}>
                    <Text style={styles.aboutLinkText}>Ouvrir sur le web</Text>
                    <Ionicons name="open-outline" size={16} color="#171313" />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>
        ) : !loading ? <Text style={styles.empty}>Playlist introuvable.</Text> : null}
      </ScrollView>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconBtn: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#FFF9EF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)' },
  topTitle: { flex: 1, color: '#171313', fontSize: 24, fontWeight: '900' },
  hero: { minHeight: 420, borderRadius: 30, overflow: 'hidden', backgroundColor: '#171313', borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)', shadowColor: '#171313', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  heroEditorial: { minHeight: 470 },
  bannerImage: { ...StyleSheet.absoluteFillObject, opacity: 0.32 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,19,19,0.42)' },
  heroBody: { flex: 1, padding: 18, justifyContent: 'flex-end' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(255,249,239,0.18)', paddingHorizontal: 12, paddingVertical: 7, color: '#FFF9EF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  badgeSoft: { overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(255,249,239,0.12)', paddingHorizontal: 12, paddingVertical: 7, color: 'rgba(255,249,239,0.78)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  coverStack: { width: 190, height: 190, alignSelf: 'center', marginBottom: 18 },
  coverGlow: { position: 'absolute', top: -16, left: -16, right: -16, bottom: -16, borderRadius: 36, backgroundColor: 'rgba(255,249,239,0.22)' },
  coverWrap: { width: 190, height: 190, borderRadius: 30, backgroundColor: 'rgba(255,249,239,0.18)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,249,239,0.26)' },
  title: { color: '#FFF9EF', fontSize: 34, lineHeight: 36, fontWeight: '900', textAlign: 'center' },
  meta: { color: 'rgba(255,249,239,0.72)', fontSize: 12, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  description: { color: 'rgba(255,249,239,0.82)', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  heroActions: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
  primaryAction: { height: 50, borderRadius: 25, backgroundColor: '#FFF9EF', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryActionText: { color: '#171313', fontSize: 14, fontWeight: '900' },
  secondaryAction: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,249,239,0.16)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,249,239,0.14)' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { color: '#171313', fontSize: 24, fontWeight: '900' },
  sectionMeta: { color: '#7C7470', fontSize: 12, fontWeight: '900' },
  list: { gap: 12 },
  trackCard: { borderRadius: 24, backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)', padding: 10 },
  trackCardActive: { borderColor: 'rgba(139,92,246,0.42)', backgroundColor: '#FFFFFF' },
  trackMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackCover: { width: 56, height: 56, borderRadius: 16 },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: '#171313', fontSize: 15, fontWeight: '900' },
  trackMeta: { color: '#7C7470', fontSize: 12, fontWeight: '700', marginTop: 4 },
  duration: { color: '#9A918B', fontSize: 11, fontWeight: '900' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 68 },
  actionBtn: { minWidth: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(17,17,17,0.045)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 9, gap: 4 },
  actionLiked: { backgroundColor: 'rgba(236,72,153,0.10)' },
  actionCount: { color: '#EC4899', fontSize: 11, fontWeight: '900' },
  aboutCard: { marginTop: 18, borderRadius: 28, backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)', padding: 18 },
  aboutEyebrow: { color: '#8B5CF6', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  aboutTitle: { color: '#171313', fontSize: 22, fontWeight: '900', marginTop: 5 },
  aboutText: { color: '#6B5F5A', fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 8 },
  aboutLink: { alignSelf: 'flex-start', marginTop: 14, height: 42, borderRadius: 21, backgroundColor: 'rgba(17,17,17,0.055)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  aboutLinkText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  empty: { textAlign: 'center', color: '#6B5F5A', fontWeight: '800', marginTop: 60 },
});
