import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL, getPlaylistDetail, setTrackLike, type PlaylistDetail } from '@/api/client';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntityShareSheet } from '@/components/sharing/EntityShareSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';

const CREAM = '#FFFAF2';
const INK = '#171313';

type SortMode = 'position' | 'title' | 'duration';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'position', label: 'Ordre officiel' },
  { value: 'title', label: 'Titre A-Z' },
  { value: 'duration', label: 'Les plus longs' },
];

function formatDuration(seconds?: number, compact = false) {
  const total = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (compact && hours > 0) return `${hours}h ${mins}m`;
  if (compact) return `${mins}m ${secs}s`;
  return hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`;
}

function artistName(track: Track) {
  return track.artist?.name || track.artist?.username || 'Synaura';
}

export function PlaylistDetailScreen() {
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const library = useLibrary();
  const playlistId = String(route.params?.playlistId || route.params?.slug || '');
  const [playlist, setPlaylist] = React.useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = React.useState<Record<string, number>>({});
  const [query, setQuery] = React.useState('');
  const [genre, setGenre] = React.useState('Tous');
  const [sort, setSort] = React.useState<SortMode>('position');
  const [toast, setToast] = React.useState<string | null>(null);
  const [shareCollectionOpen, setShareCollectionOpen] = React.useState(false);
  const [shareTrackTarget, setShareTrackTarget] = React.useState<Track | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  React.useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

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
  const colors = collection?.themeColors?.length
    ? collection.themeColors
    : playlist?.themeColors?.length
      ? playlist.themeColors
      : ['#8B5CF6', '#EC4899', '#22D3EE'];
  const banner = collection?.bannerUrl || playlist?.bannerUrl || playlist?.covers?.[0] || null;
  const cover = collection?.coverUrl || playlist?.coverUrl || playlist?.covers?.[0] || null;

  const tracks = playlist?.tracksList || [];
  const totalDuration = React.useMemo(() => tracks.reduce((sum, track) => sum + Number(track.duration || 0), 0), [tracks]);
  const totalLikes = React.useMemo(() => Object.values(likeCounts).reduce((a, b) => a + Number(b || 0), 0), [likeCounts]);

  const genres = React.useMemo(() => {
    const values = new Set<string>();
    for (const track of tracks) (track.genre || []).forEach((entry) => entry && values.add(entry));
    return ['Tous', ...Array.from(values).slice(0, 16)];
  }, [tracks]);

  const visibleTracks = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...tracks];
    if (genre !== 'Tous') list = list.filter((track) => (track.genre || []).some((entry) => entry.toLowerCase() === genre.toLowerCase()));
    if (q) list = list.filter((track) => `${track.title} ${artistName(track)} ${(track.genre || []).join(' ')}`.toLowerCase().includes(q));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'duration') list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return list;
  }, [tracks, genre, query, sort]);

  const playFrom = React.useCallback((list: Track[], index = 0) => {
    if (!list.length) return;
    Haptics.selectionAsync().catch(() => {});
    player.setQueueAndPlay(list, Math.max(0, index));
  }, [player]);

  const playTrack = React.useCallback((track: Track) => {
    const active = player.current?._id === track._id;
    if (active) {
      player.togglePlayPause();
      return;
    }
    const index = visibleTracks.findIndex((item) => item._id === track._id);
    playFrom(visibleTracks, index >= 0 ? index : 0);
  }, [player, playFrom, visibleTracks]);

  const shufflePlay = React.useCallback(() => {
    if (!tracks.length) return;
    playFrom([...tracks].sort(() => Math.random() - 0.5), 0);
  }, [playFrom, tracks]);

  const cycleSort = React.useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setSort((prev) => {
      const i = SORT_OPTIONS.findIndex((o) => o.value === prev);
      return SORT_OPTIONS[(i + 1) % SORT_OPTIONS.length].value;
    });
  }, []);

  const slug = collection?.slug || playlist?.slug || playlist?.id || '';
  const webUrl = `${API_BASE_URL}/playlists/${encodeURIComponent(slug)}`;

  const copyLink = React.useCallback(async () => {
    await Clipboard.setStringAsync(webUrl);
    Haptics.selectionAsync().catch(() => {});
    showToast('Lien copié');
  }, [showToast, webUrl]);

  const shareCollection = React.useCallback(() => {
    if (playlist) setShareCollectionOpen(true);
  }, [playlist]);

  const queueTrack = React.useCallback((track: Track) => {
    player.addNext(track);
    Haptics.selectionAsync().catch(() => {});
    showToast(`Ajouté à la file · ${track.title}`);
  }, [player, showToast]);

  const toggleLike = React.useCallback(async (track: Track) => {
    const nextLiked = !liked[track._id];
    Haptics.selectionAsync().catch(() => {});
    setLiked((prev) => ({ ...prev, [track._id]: nextLiked }));
    setLikeCounts((prev) => ({ ...prev, [track._id]: Math.max(0, Number(prev[track._id] || 0) + (nextLiked ? 1 : -1)) }));
    const result = await setTrackLike(track._id, nextLiked);
    if (result) {
      setLiked((prev) => ({ ...prev, [track._id]: result.liked }));
      setLikeCounts((prev) => ({ ...prev, [track._id]: result.likesCount }));
    }
  }, [liked]);

  const shareTrack = React.useCallback((track: Track) => setShareTrackTarget(track), []);

  const downloadTrack = React.useCallback(async (track: Track) => {
    if (!track.audioUrl) return;
    if (collection?.downloadEnabled === false || playlist?.downloadEnabled === false) return;
    await library.downloadTrack(track);
    showToast(`Téléchargement · ${track.title}`);
  }, [collection?.downloadEnabled, library, playlist?.downloadEnabled, showToast]);

  const badge = collection?.badge || playlist?.badge || (isEditorial ? 'Synaura Originals' : 'Playlist Synaura');
  const title = collection?.title || playlist?.title || '';
  const subtitle = collection?.subtitle || playlist?.description || playlist?.vibe || 'Une selection musicale Synaura.';
  const extraDescription = collection?.description && collection.description !== collection.subtitle ? collection.description : null;
  const commentsEnabled = collection?.commentsEnabled !== false && playlist?.commentsEnabled !== false;

  const c0 = colors[0] || '#8B5CF6';
  const c2 = colors[2] || colors[1] || c0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Fond degrade sur toute la hauteur du contenu: sombre -> theme -> theme */}
        <View pointerEvents="none" style={styles.bgWrap}>
          <LinearGradient colors={['#171313', c0, c2]} locations={[0, 0.5, 1]} start={{ x: 0.12, y: 0 }} end={{ x: 0.88, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(23,19,19,0.66)', 'rgba(23,19,19,0.40)', 'rgba(23,19,19,0.56)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        </View>

        <View style={[styles.content, responsive.pageContent, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 132, responsive.miniPlayerClearance) }]}>
        {/* Header */}
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,250,242,0.82)" />
            {!responsive.isTiny ? <Text style={styles.backText}>Retour</Text> : null}
          </Pressable>
          <View style={styles.topActions}>
            <Pressable onPress={copyLink} style={styles.iconPill}><Ionicons name="copy-outline" size={16} color="rgba(255,250,242,0.82)" /></Pressable>
            <Pressable onPress={shareCollection} style={styles.sharePill}>
              <Ionicons name="share-social-outline" size={16} color="rgba(255,250,242,0.82)" />
              {!responsive.isNarrow ? <Text style={styles.backText}>Partager</Text> : null}
            </Pressable>
          </View>
        </View>

        {loading ? <ActivityIndicator color={CREAM} style={{ marginTop: 80 }} /> : null}

        {playlist ? (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              {banner ? <Image source={{ uri: banner }} style={styles.heroBanner} blurRadius={2} /> : null}
              <LinearGradient colors={['rgba(17,13,13,0.92)', 'rgba(17,13,13,0.58)', 'rgba(17,13,13,0.20)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              <View style={[styles.heroBody, responsive.isNarrow && styles.heroBodyNarrow]}>
                <View style={styles.badgePill}><Text style={styles.badgeText}>{badge}</Text></View>
                <Text maxFontSizeMultiplier={1.15} style={[styles.heroTitle, responsive.isNarrow && styles.heroTitleNarrow]}>{title}</Text>
                <Text style={styles.heroSubtitle}>{subtitle}</Text>
                {extraDescription ? <Text style={styles.heroDesc}>{extraDescription}</Text> : null}

                <View style={styles.heroActions}>
                  <Pressable onPress={() => playFrom(tracks, 0)} style={styles.primaryAction}>
                    <Ionicons name="play" size={16} color={INK} />
                    <Text style={styles.primaryActionText}>Tout lire</Text>
                  </Pressable>
                  <Pressable onPress={shufflePlay} style={styles.secondaryAction}>
                    <Ionicons name="shuffle" size={16} color={CREAM} />
                    <Text style={styles.secondaryActionText}>Aléatoire</Text>
                  </Pressable>
                  <Pressable onPress={() => visibleTracks[0] && queueTrack(visibleTracks[0])} style={styles.secondaryAction}>
                    <Ionicons name="list" size={16} color={CREAM} />
                    <Text style={styles.secondaryActionText}>Ajouter à la file</Text>
                  </Pressable>
                </View>

                {/* Cover + stats */}
                <View style={[styles.coverBlock, { maxWidth: Math.min(360, responsive.availableContentWidth) }]}>
                  <View style={styles.coverGlow} />
                  <View style={styles.coverWrap}>
                    {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={48} color={CREAM} />}
                  </View>
                  <View style={styles.statsCard}>
                    <Stat label="Titres" value={String(tracks.length)} />
                    <Stat label="Durée" value={formatDuration(totalDuration, true)} />
                    <Stat label="Likes" value={String(totalLikes)} />
                  </View>
                </View>
              </View>
            </View>

            {/* Filter bar */}
            <View style={styles.filterBar}>
              <View style={styles.searchPill}>
                <Ionicons name="search" size={16} color="rgba(255,250,242,0.45)" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Rechercher dans la collection..."
                  placeholderTextColor="rgba(255,250,242,0.36)"
                  style={styles.searchInput}
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')}><Ionicons name="close" size={16} color="rgba(255,250,242,0.45)" /></Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {genres.map((item) => {
                  const on = genre === item;
                  return (
                    <Pressable key={item} onPress={() => setGenre(item)} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable onPress={cycleSort} style={styles.sortSelect}>
                <Text style={styles.sortSelectText}>{SORT_OPTIONS.find((o) => o.value === sort)?.label}</Text>
                <Ionicons name="chevron-down" size={16} color="rgba(255,250,242,0.55)" />
              </Pressable>
            </View>

            {/* Tracks */}
            <View style={styles.list}>
              {visibleTracks.map((track) => {
                const active = player.current?._id === track._id;
                const isPlaying = active && player.isPlaying;
                const canDownload = collection?.downloadEnabled !== false && playlist.downloadEnabled !== false;
                return (
                  <View key={track._id} style={[styles.trackCard, active && styles.trackCardActive]}>
                    <View style={styles.trackMain}>
                      <Pressable onPress={() => playTrack(track)} style={styles.trackCoverBtn}>
                        <TrackCover track={track} style={StyleSheet.absoluteFillObject as any} active={isPlaying} autoPlayVideo={isPlaying} />
                        <View style={styles.playOverlay}>
                          <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={CREAM} style={isPlaying ? undefined : { marginLeft: 2 }} />
                        </View>
                      </Pressable>

                      <View style={styles.trackCopy}>
                        <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                        <Text numberOfLines={1} style={styles.trackMeta}>
                          {artistName(track)}{track.genre?.[0] ? `  ·  ${track.genre[0]}` : ''}  ·  {formatDuration(track.duration)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <Pressable onPress={() => toggleLike(track)} style={[styles.likeBtn, liked[track._id] && styles.likeBtnOn]}>
                        <Ionicons name={liked[track._id] ? 'heart' : 'heart-outline'} size={16} color={liked[track._id] ? '#FFD8EE' : 'rgba(255,250,242,0.62)'} />
                        <Text style={[styles.likeCount, liked[track._id] && styles.likeCountOn]}>{likeCounts[track._id] || 0}</Text>
                      </Pressable>
                      {commentsEnabled ? (
                        <Pressable onPress={() => navigation.navigate('TrackDetail', { trackId: track._id, track })} style={styles.roundBtn}>
                          <Ionicons name="chatbubble-outline" size={16} color="rgba(255,250,242,0.62)" />
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => queueTrack(track)} style={styles.roundBtn}>
                        <Ionicons name="list" size={16} color="rgba(255,250,242,0.62)" />
                      </Pressable>
                      <Pressable onPress={() => shareTrack(track)} style={styles.roundBtn}>
                        <Ionicons name="share-social-outline" size={16} color="rgba(255,250,242,0.62)" />
                      </Pressable>
                      {canDownload && track.audioUrl ? (
                        <Pressable onPress={() => downloadTrack(track)} style={styles.roundBtn}>
                          <Ionicons name="download-outline" size={16} color="rgba(255,250,242,0.62)" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {!visibleTracks.length ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="musical-notes-outline" size={36} color="rgba(255,250,242,0.34)" />
                  <Text style={styles.emptyTitle}>Aucun titre ici</Text>
                  <Text style={styles.emptyText}>Change la recherche ou le filtre de genre.</Text>
                </View>
              ) : null}
            </View>

            {/* Info cards */}
            <InfoCard icon="sparkles-outline" title="À propos">
              <Text style={styles.infoParagraph}>
                {collection?.description || playlist.description || 'Une playlist Synaura à écouter, partager et sauvegarder.'}
              </Text>
            </InfoCard>

            <InfoCard icon="list-outline" title="Actions utiles">
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => playFrom(visibleTracks, 0)} style={styles.utilPrimary}>
                  <Text style={styles.utilPrimaryText}>Lire la sélection visible</Text>
                </Pressable>
                <Pressable onPress={shufflePlay} style={styles.utilBtn}>
                  <Text style={styles.utilBtnText}>Mélanger toute la collection</Text>
                </Pressable>
                <Pressable onPress={copyLink} style={styles.utilBtn}>
                  <Text style={styles.utilBtnText}>Copier le lien public</Text>
                </Pressable>
              </View>
            </InfoCard>

            <InfoCard icon="time-outline" title="Détails">
              <View style={styles.detailGrid}>
                <Stat half label="Titres" value={String(tracks.length)} />
                <Stat half label="Durée" value={formatDuration(totalDuration, true)} />
                <Stat half label="Likes" value={String(totalLikes)} />
                <Stat half label="Accès" value="Public" />
              </View>
            </InfoCard>

            {isEditorial && collection?.slug ? (
              <Pressable onPress={() => Linking.openURL(webUrl)} style={styles.webLink}>
                <Text style={styles.webLinkText}>Ouvrir sur le web</Text>
                <Ionicons name="open-outline" size={15} color={INK} />
              </Pressable>
            ) : null}
          </>
        ) : !loading ? <Text style={styles.empty}>Playlist introuvable.</Text> : null}
        </View>
      </ScrollView>

      <EntityShareSheet
        visible={shareCollectionOpen && Boolean(playlist)}
        title={title || 'Playlist Synaura'}
        subtitle={subtitle}
        kindLabel="Playlist"
        url={webUrl}
        imageUrl={playlist ? `${webUrl}/opengraph-image` : null}
        fileKey={`playlist-${slug || 'synaura'}`}
        onClose={() => setShareCollectionOpen(false)}
      />
      <ShareSheet visible={Boolean(shareTrackTarget)} track={shareTrackTarget} onClose={() => setShareTrackTarget(null)} />

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 96 }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, half }: { label: string; value: string; half?: boolean }) {
  return (
    <View style={[styles.stat, half && styles.statHalf]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function InfoCard({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHead}>
        <Ionicons name={icon} size={18} color="rgba(255,250,242,0.82)" />
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  scroll: { flexGrow: 1 },
  bgWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { paddingHorizontal: 16 },

  // Header
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  backText: { color: 'rgba(255,250,242,0.82)', fontSize: 12, fontWeight: '900' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconPill: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sharePill: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },

  // Hero
  hero: { borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 7 },
  heroBanner: { ...StyleSheet.absoluteFillObject, opacity: 0.48 },
  heroBody: { padding: 22 },
  heroBodyNarrow: { padding: 14 },
  badgePill: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14 },
  badgeText: { color: 'rgba(255,250,242,0.82)', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  heroTitle: { color: CREAM, fontSize: 40, lineHeight: 44, fontWeight: '900' },
  heroTitleNarrow: { fontSize: 30, lineHeight: 34 },
  heroSubtitle: { color: 'rgba(255,250,242,0.78)', fontSize: 16, lineHeight: 24, fontWeight: '700', marginTop: 16 },
  heroDesc: { color: 'rgba(255,250,242,0.56)', fontSize: 13, lineHeight: 20, fontWeight: '600', marginTop: 8 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  primaryAction: { height: 48, borderRadius: 999, backgroundColor: CREAM, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryActionText: { color: INK, fontSize: 14, fontWeight: '900' },
  secondaryAction: { height: 48, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryActionText: { color: CREAM, fontSize: 14, fontWeight: '900' },

  coverBlock: { width: '100%', maxWidth: 360, alignSelf: 'center', marginTop: 28 },
  coverGlow: { position: 'absolute', top: -18, left: -18, right: -18, bottom: 18, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.18)' },
  coverWrap: { width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  statsCard: { flexDirection: 'row', gap: 8, marginTop: -24, marginHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(23,19,19,0.86)', padding: 8 },

  // Stat
  stat: { flex: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)', padding: 12 },
  statHalf: { flex: 0, flexGrow: 0, flexBasis: '48%' },
  statLabel: { color: 'rgba(255,250,242,0.42)', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { color: CREAM, fontSize: 14, fontWeight: '900', marginTop: 5 },

  // Filter bar
  filterBar: { marginTop: 20, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(23,19,19,0.70)', padding: 12, gap: 10 },
  searchPill: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 16 },
  searchInput: { flex: 1, color: CREAM, fontSize: 14, fontWeight: '700', padding: 0 },
  chipRow: { gap: 8, paddingRight: 4 },
  chip: { height: 40, borderRadius: 999, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  chipOn: { backgroundColor: CREAM, borderColor: CREAM },
  chipText: { color: 'rgba(255,250,242,0.58)', fontSize: 12, fontWeight: '900' },
  chipTextOn: { color: INK },
  sortSelect: { height: 44, borderRadius: 999, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sortSelectText: { color: CREAM, fontSize: 13, fontWeight: '900' },

  // Tracks
  list: { marginTop: 16, gap: 12 },
  trackCard: { borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.09)', padding: 12 },
  trackCardActive: { borderColor: 'rgba(255,255,255,0.38)', backgroundColor: 'rgba(255,255,255,0.20)' },
  trackMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackCoverBtn: { width: 64, height: 64, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  playOverlay: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.78)' },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: CREAM, fontSize: 16, fontWeight: '900' },
  trackMeta: { color: 'rgba(255,250,242,0.48)', fontSize: 12, fontWeight: '700', marginTop: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  likeBtn: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.10)' },
  likeBtnOn: { backgroundColor: 'rgba(236,72,153,0.20)' },
  likeCount: { color: 'rgba(255,250,242,0.62)', fontSize: 12, fontWeight: '900' },
  likeCountOn: { color: '#FFD8EE' },
  roundBtn: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },

  emptyCard: { borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.10)', padding: 28, alignItems: 'center' },
  emptyTitle: { color: CREAM, fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptyText: { color: 'rgba(255,250,242,0.50)', fontSize: 13, fontWeight: '700', marginTop: 4, textAlign: 'center' },

  // Info cards
  infoCard: { marginTop: 16, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(23,19,19,0.58)', padding: 20 },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoTitle: { color: CREAM, fontSize: 18, fontWeight: '900' },
  infoParagraph: { color: 'rgba(255,250,242,0.62)', fontSize: 14, lineHeight: 22, fontWeight: '600' },
  utilPrimary: { borderRadius: 16, backgroundColor: CREAM, paddingHorizontal: 16, paddingVertical: 14 },
  utilPrimaryText: { color: INK, fontSize: 14, fontWeight: '900' },
  utilBtn: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 16, paddingVertical: 14 },
  utilBtnText: { color: 'rgba(255,250,242,0.78)', fontSize: 14, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  webLink: { alignSelf: 'flex-start', marginTop: 16, height: 44, borderRadius: 999, backgroundColor: CREAM, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  webLinkText: { color: INK, fontSize: 13, fontWeight: '900' },

  empty: { textAlign: 'center', color: 'rgba(255,250,242,0.68)', fontWeight: '800', marginTop: 70 },

  toast: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  toastText: { overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', color: CREAM, fontSize: 13, fontWeight: '800', paddingHorizontal: 18, paddingVertical: 12 },
});
