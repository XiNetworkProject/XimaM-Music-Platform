import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { api, type ApiTrack, type ApiPlaylist, type PopularUser } from '../services/api';
import { usePlayer } from '../contexts/PlayerContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const GRID_PADDING = 16;
const CARD_W = (SCREEN_W - GRID_PADDING * 2 - CARD_GAP) / 2;

type TabKey = 'foryou' | 'trending' | 'new' | 'playlists' | 'artists';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'foryou', label: 'Pour toi' },
  { key: 'trending', label: 'Tendances' },
  { key: 'new', label: 'Nouveautés' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'artists', label: 'Artistes' },
];

const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

const formatPlays = (n?: number) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const artistName = (t: ApiTrack) =>
  t.artist?.artistName || t.artist?.name || t.artist?.username || 'Artiste';

// ─── Component ──────────────────────────────────────────────────

const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { playTrack, setQueueAndPlay, current, isPlaying } = usePlayer();

  const [activeTab, setActiveTab] = useState<TabKey>('foryou');
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [forYouTracks, setForYouTracks] = useState<ApiTrack[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<ApiTrack[]>([]);
  const [newTracks, setNewTracks] = useState<ApiTrack[]>([]);
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [artists, setArtists] = useState<PopularUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // ── Genre fetch ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await api.getGenres();
      if (res.success) {
        const raw: any[] = Array.isArray(res.data?.genres) ? res.data.genres : Array.isArray(res.data) ? res.data : [];
        const parsed = raw.map((g: any) => {
          if (typeof g === 'string') return g;
          if (g && typeof g === 'object' && typeof g.name === 'string') return g.name;
          return '';
        }).filter(Boolean);
        setGenres(parsed);
      }
    })();
  }, []);

  // ── Tab data fetcher ──────────────────────────────────────────
  const fetchTabData = useCallback(
    async (tab: TabKey, showLoader = true) => {
      if (showLoader) setTabLoading(true);
      try {
        switch (tab) {
          case 'foryou': {
            const r = await api.getForYouFeed(30);
            if (r.success) setForYouTracks(r.data.tracks ?? []);
            break;
          }
          case 'trending': {
            const r = await api.getTrendingTracks(50);
            if (r.success) setTrendingTracks(r.data.tracks ?? []);
            break;
          }
          case 'new': {
            const r = await api.getRecentTracks(50);
            if (r.success) setNewTracks(r.data.tracks ?? []);
            break;
          }
          case 'playlists': {
            const r = await api.getPopularPlaylists(20);
            if (r.success) setPlaylists(r.data.playlists ?? []);
            break;
          }
          case 'artists': {
            const r = await api.getPopularUsers(30);
            if (r.success) setArtists(r.data.users ?? []);
            break;
          }
        }
      } finally {
        setTabLoading(false);
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTabData(activeTab, false);
    setRefreshing(false);
  }, [activeTab, fetchTabData]);

  // ── Genre filtering ───────────────────────────────────────────
  const filterByGenre = useCallback(
    (tracks: ApiTrack[]) => {
      if (!selectedGenre) return tracks;
      return tracks.filter((t) =>
        t.genre?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()),
      );
    },
    [selectedGenre],
  );

  const filteredForYou = useMemo(() => filterByGenre(forYouTracks), [filterByGenre, forYouTracks]);
  const filteredTrending = useMemo(() => filterByGenre(trendingTracks), [filterByGenre, trendingTracks]);
  const filteredNew = useMemo(() => filterByGenre(newTracks), [filterByGenre, newTracks]);

  // ── Handlers ──────────────────────────────────────────────────
  const handlePlayTrack = useCallback(
    (tracks: ApiTrack[], index: number) => {
      setQueueAndPlay(tracks, index);
    },
    [setQueueAndPlay],
  );

  // ── Render helpers ────────────────────────────────────────────

  const renderTrackCard = useCallback(
    (track: ApiTrack, index: number, allTracks: ApiTrack[]) => {
      const isCurrent = current?._id === track._id;
      return (
        <Pressable
          key={track._id}
          style={styles.gridCard}
          onPress={() => handlePlayTrack(allTracks, index)}
        >
          <View style={styles.gridCoverWrap}>
            {track.coverUrl ? (
              <Image source={{ uri: track.coverUrl }} style={styles.gridCover} />
            ) : (
              <LinearGradient
                colors={['#6F4CFF', '#00D0BB']}
                style={styles.gridCover}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="musical-notes" size={32} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            )}
            <Pressable
              style={[styles.playBtnOverlay, isCurrent && isPlaying && styles.playBtnActive]}
              onPress={() => handlePlayTrack(allTracks, index)}
            >
              <Ionicons
                name={isCurrent && isPlaying ? 'pause' : 'play'}
                size={18}
                color="#fff"
              />
            </Pressable>
          </View>
          <Text style={styles.gridTitle} numberOfLines={1}>
            {track.title || 'Sans titre'}
          </Text>
          <Text style={styles.gridArtist} numberOfLines={1}>
            {artistName(track)}
          </Text>
        </Pressable>
      );
    },
    [current?._id, isPlaying, handlePlayTrack],
  );

  const renderTrendingRow = useCallback(
    (track: ApiTrack, index: number, allTracks: ApiTrack[]) => {
      const isCurrent = current?._id === track._id;
      const rank = index + 1;
      return (
        <Pressable
          key={track._id}
          style={styles.trendRow}
          onPress={() => handlePlayTrack(allTracks, index)}
        >
          <View style={styles.rankBadge}>
            <Text style={[styles.rankText, rank <= 3 && styles.rankTop3]}>
              {rank}
            </Text>
          </View>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={styles.trendCover} />
          ) : (
            <LinearGradient
              colors={['#6F4CFF', '#00D0BB']}
              style={styles.trendCover}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="musical-notes" size={18} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
          <View style={styles.trendInfo}>
            <Text style={styles.trendTitle} numberOfLines={1}>
              {track.title || 'Sans titre'}
            </Text>
            <Text style={styles.trendArtist} numberOfLines={1}>
              {artistName(track)}
            </Text>
          </View>
          <View style={styles.trendMeta}>
            <Text style={styles.trendPlays}>{formatPlays(track.plays)}</Text>
            <Text style={styles.trendDuration}>{formatDuration(track.duration)}</Text>
          </View>
          <Pressable
            style={styles.trendPlayBtn}
            onPress={() => handlePlayTrack(allTracks, index)}
          >
            <Ionicons
              name={isCurrent && isPlaying ? 'pause' : 'play'}
              size={16}
              color="#fff"
            />
          </Pressable>
        </Pressable>
      );
    },
    [current?._id, isPlaying, handlePlayTrack],
  );

  const renderPlaylistCard = useCallback(
    (pl: ApiPlaylist) => {
      const title = pl.name || pl.title || 'Playlist';
      return (
        <Pressable
          key={pl._id}
          style={styles.gridCard}
          onPress={() => navigation.navigate('Playlist', { id: pl._id })}
        >
          <View style={styles.gridCoverWrap}>
            {pl.coverUrl ? (
              <Image source={{ uri: pl.coverUrl }} style={styles.gridCover} />
            ) : (
              <LinearGradient
                colors={['#6F4CFF', '#00D0BB']}
                style={styles.gridCover}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="list" size={32} color="rgba(255,255,255,0.5)" />
              </LinearGradient>
            )}
          </View>
          <Text style={styles.gridTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.gridArtist} numberOfLines={1}>
            {pl.trackCount ?? 0} titres
          </Text>
        </Pressable>
      );
    },
    [navigation],
  );

  const renderArtistRow = useCallback(
    (user: PopularUser) => {
      const displayName = user.artistName || user.name || user.username;
      return (
        <Pressable
          key={user._id}
          style={styles.artistRow}
          onPress={() =>
            navigation.navigate('Search', {
              initialQuery: user.username,
              filter: 'artists',
            })
          }
        >
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.artistAvatar} />
          ) : (
            <LinearGradient
              colors={['#6F4CFF', '#00D0BB']}
              style={styles.artistAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person" size={22} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          )}
          <View style={styles.artistInfo}>
            <View style={styles.artistNameRow}>
              <Text style={styles.artistName} numberOfLines={1}>{displayName}</Text>
              {user.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#7B61FF" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.artistUsername} numberOfLines={1}>@{user.username}</Text>
          </View>
          <View style={styles.artistStats}>
            <Ionicons name="headset-outline" size={13} color="#94a3b8" />
            <Text style={styles.artistPlays}>{formatPlays(user.totalPlays)}</Text>
          </View>
          <Pressable style={styles.followBtn}>
            <Text style={styles.followBtnText}>Suivre</Text>
          </Pressable>
        </Pressable>
      );
    },
    [navigation],
  );

  // ── Empty / loading states ────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="search-outline" size={48} color="rgba(148,163,184,0.4)" />
      <Text style={styles.emptyText}>Aucun résultat</Text>
    </View>
  );

  const renderLoader = () => (
    <View style={styles.loaderWrap}>
      <ActivityIndicator size="large" color="#7B61FF" />
    </View>
  );

  // ── Tab content builder ───────────────────────────────────────
  const tabContent = useMemo(() => {
    if (tabLoading || loading) return renderLoader();

    switch (activeTab) {
      case 'foryou': {
        const data = filteredForYou;
        if (!data.length) return renderEmpty();
        const rows: React.ReactNode[] = [];
        for (let i = 0; i < data.length; i += 2) {
          rows.push(
            <View key={`row-${i}`} style={styles.gridRow}>
              {renderTrackCard(data[i], i, data)}
              {data[i + 1] ? renderTrackCard(data[i + 1], i + 1, data) : <View style={styles.gridCard} />}
            </View>,
          );
        }
        return <>{rows}</>;
      }
      case 'trending': {
        const data = filteredTrending;
        if (!data.length) return renderEmpty();
        return <>{data.map((t, i) => renderTrendingRow(t, i, data))}</>;
      }
      case 'new': {
        const data = filteredNew;
        if (!data.length) return renderEmpty();
        const rows: React.ReactNode[] = [];
        for (let i = 0; i < data.length; i += 2) {
          rows.push(
            <View key={`row-${i}`} style={styles.gridRow}>
              {renderTrackCard(data[i], i, data)}
              {data[i + 1] ? renderTrackCard(data[i + 1], i + 1, data) : <View style={styles.gridCard} />}
            </View>,
          );
        }
        return <>{rows}</>;
      }
      case 'playlists': {
        if (!playlists.length) return renderEmpty();
        const rows: React.ReactNode[] = [];
        for (let i = 0; i < playlists.length; i += 2) {
          rows.push(
            <View key={`row-${i}`} style={styles.gridRow}>
              {renderPlaylistCard(playlists[i])}
              {playlists[i + 1] ? renderPlaylistCard(playlists[i + 1]) : <View style={styles.gridCard} />}
            </View>,
          );
        }
        return <>{rows}</>;
      }
      case 'artists': {
        if (!artists.length) return renderEmpty();
        return <>{artists.map(renderArtistRow)}</>;
      }
      default:
        return null;
    }
  }, [
    activeTab, tabLoading, loading,
    filteredForYou, filteredTrending, filteredNew, playlists, artists,
    renderTrackCard, renderTrendingRow, renderPlaylistCard, renderArtistRow,
  ]);

  // ── Main render ───────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7B61FF"
            colors={['#7B61FF']}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explorer</Text>
          <Pressable
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={22} color="#f9fafb" />
          </Pressable>
        </View>

        {/* ── Search bar ─────────────────────────────────────── */}
        <Pressable
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', { autoFocus: true })}
        >
          <Ionicons name="search" size={18} color="#94a3b8" />
          <Text style={styles.searchPlaceholder}>Rechercher titres, artistes…</Text>
        </Pressable>

        {/* ── Tab pills ──────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return active ? (
              <LinearGradient
                key={t.key}
                colors={['#6F4CFF', '#00D0BB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabPill}
              >
                <Pressable onPress={() => setActiveTab(t.key)}>
                  <Text style={[styles.tabLabel, styles.tabLabelActive]}>{t.label}</Text>
                </Pressable>
              </LinearGradient>
            ) : (
              <Pressable
                key={t.key}
                style={[styles.tabPill, styles.tabPillInactive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={styles.tabLabel}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Genre chips ────────────────────────────────────── */}
        {genres.length > 0 && (activeTab === 'foryou' || activeTab === 'trending' || activeTab === 'new') && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreRow}
          >
            <Pressable
              style={[styles.genreChip, !selectedGenre && styles.genreChipSelected]}
              onPress={() => setSelectedGenre(null)}
            >
              {!selectedGenre ? (
                <LinearGradient
                  colors={['#6F4CFF', '#00D0BB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.genreGradient}
                >
                  <Text style={styles.genreTextSelected}>Tout</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.genreText}>Tout</Text>
              )}
            </Pressable>
            {genres.map((g, idx) => {
              const label = typeof g === 'string' ? g : ((g as any)?.name || String(g));
              const sel = selectedGenre === label;
              return (
                <Pressable
                  key={`genre-${idx}-${label}`}
                  style={[styles.genreChip, sel && styles.genreChipSelected]}
                  onPress={() => setSelectedGenre(sel ? null : label)}
                >
                  {sel ? (
                    <LinearGradient
                      colors={['#6F4CFF', '#00D0BB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.genreGradient}
                    >
                      <Text style={styles.genreTextSelected}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.genreText}>{label}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── Content ────────────────────────────────────────── */}
        <View style={styles.content}>{tabContent}</View>
      </ScrollView>
    </View>
  );
};

export default DiscoverScreen;

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020017',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: -0.5,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: GRID_PADDING,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  searchPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 10,
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: 8,
    marginBottom: 12,
  },
  tabPill: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabPillInactive: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabLabelActive: {
    color: '#fff',
  },

  /* Genre chips */
  genreRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: 8,
    marginBottom: 16,
  },
  genreChip: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  genreChipSelected: {
    borderWidth: 0,
  },
  genreGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  genreTextSelected: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  /* Content area */
  content: {
    paddingHorizontal: GRID_PADDING,
  },

  /* Grid cards (Pour toi, Nouveautés, Playlists) */
  gridRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  gridCard: {
    width: CARD_W,
  },
  gridCoverWrap: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    marginBottom: 8,
  },
  gridCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(123,97,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: '#00D0BB',
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f9fafb',
  },
  gridArtist: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  /* Trending rows */
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.08)',
  },
  rankBadge: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94a3b8',
  },
  rankTop3: {
    color: '#7B61FF',
    fontSize: 17,
    fontWeight: '900',
  },
  trendCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trendInfo: {
    flex: 1,
    marginRight: 8,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
  },
  trendArtist: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  trendMeta: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  trendPlays: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7B61FF',
  },
  trendDuration: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  trendPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(123,97,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Artist rows */
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.08)',
  },
  artistAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artistInfo: {
    flex: 1,
    marginRight: 8,
  },
  artistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f9fafb',
    flexShrink: 1,
  },
  artistUsername: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  artistStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    gap: 4,
  },
  artistPlays: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7B61FF',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B61FF',
  },

  /* Empty / Loader */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
