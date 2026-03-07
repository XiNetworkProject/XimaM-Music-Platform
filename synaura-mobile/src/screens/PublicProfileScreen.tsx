import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { api, type UserProfile, type ApiTrack, type ApiPlaylist } from '../services/api';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';

type ProfileRouteParams = { PublicProfile: { username: string } };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;
const ACCENT = '#7B61FF';
const ACCENT_CYAN = '#00D0BB';

type TabKey = 'tracks' | 'playlists' | 'about';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatCount(n?: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const PublicProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProfileRouteParams, 'PublicProfile'>>();
  const { username } = route.params;
  const { user: authUser } = useAuth();
  const { playTrack, setQueueAndPlay, current, isPlaying } = usePlayer();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('tracks');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = authUser?.username === username;

  const fetchData = useCallback(async () => {
    const [profileRes, tracksRes, playlistsRes] = await Promise.all([
      api.getUserProfile(username),
      api.getUserTracks(username),
      api.getPlaylists(),
    ]);

    if (profileRes.success) {
      setProfile(profileRes.data.user);
      setIsFollowing(profileRes.data.user.isFollowing ?? false);
    }
    if (tracksRes.success) setTracks(tracksRes.data.tracks);
    if (playlistsRes.success) {
      const userPlaylists = playlistsRes.data.playlists.filter(
        (p) => p.creator?.username === username && p.isPublic !== false
      );
      setPlaylists(userPlaylists);
    }
  }, [username]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    const res = await api.followUser(username);
    if (res.success) {
      setIsFollowing(res.data.followed);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followerCount: (prev.followerCount ?? 0) + (res.data.followed ? 1 : -1),
              isFollowing: res.data.followed,
            }
          : prev
      );
    }
    setFollowLoading(false);
  };

  const handlePlayTrack = (track: ApiTrack, index: number) => {
    setQueueAndPlay(tracks, index);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>Profil introuvable</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButtonAlt}>
          <Text style={styles.backButtonAltText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = profile.artistName || profile.name || profile.username;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'tracks', label: 'Pistes' },
    { key: 'playlists', label: 'Playlists' },
    { key: 'about', label: 'À propos' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* Banner */}
        {profile.banner ? (
          <Image source={{ uri: profile.banner }} style={styles.banner} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[ACCENT, ACCENT_CYAN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          />
        )}

        {/* Back button overlay */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </View>
        </Pressable>

        {/* Avatar + Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[ACCENT, ACCENT_CYAN]}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={ACCENT_CYAN} />
              </View>
            )}
          </View>

          <Text style={styles.username}>@{profile.username}</Text>

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Location + Website */}
          <View style={styles.metaRow}>
            {profile.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.metaText}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.website ? (
              <Pressable
                style={styles.metaItem}
                onPress={() => {
                  const url = profile.website!.startsWith('http') ? profile.website! : `https://${profile.website}`;
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Ionicons name="link-outline" size={14} color={ACCENT_CYAN} />
                <Text style={[styles.metaText, { color: ACCENT_CYAN }]} numberOfLines={1}>
                  {profile.website.replace(/^https?:\/\//, '')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(profile.trackCount)}</Text>
              <Text style={styles.statLabel}>pistes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(profile.followerCount)}</Text>
              <Text style={styles.statLabel}>abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCount(profile.followingCount)}</Text>
              <Text style={styles.statLabel}>abonnements</Text>
            </View>
          </View>

          {/* Follow button */}
          {!isOwnProfile && (
            <Pressable
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'person-add-outline'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.followButtonText}>
                    {isFollowing ? 'Abonné' : 'Suivre'}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'tracks' && <TracksTab tracks={tracks} onPlay={handlePlayTrack} current={current} isPlaying={isPlaying} />}
          {activeTab === 'playlists' && <PlaylistsTab playlists={playlists} navigation={navigation} />}
          {activeTab === 'about' && <AboutTab profile={profile} />}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

/* ─── Tracks Tab ─── */

function TracksTab({
  tracks,
  onPlay,
  current,
  isPlaying,
}: {
  tracks: ApiTrack[];
  onPlay: (track: ApiTrack, index: number) => void;
  current: ApiTrack | null;
  isPlaying: boolean;
}) {
  if (!tracks.length) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="musical-notes-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>Aucune piste publiée</Text>
      </View>
    );
  }

  return (
    <View>
      {tracks.map((track, index) => {
        const isCurrent = current?._id === track._id;
        return (
          <Pressable
            key={track._id}
            style={[styles.trackRow, isCurrent && styles.trackRowActive]}
            onPress={() => onPlay(track, index)}
          >
            <View style={styles.trackCoverWrapper}>
              {track.coverUrl ? (
                <Image source={{ uri: track.coverUrl }} style={styles.trackCover} />
              ) : (
                <LinearGradient
                  colors={[ACCENT, ACCENT_CYAN]}
                  style={styles.trackCover}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="musical-note" size={18} color="#fff" />
                </LinearGradient>
              )}
              <View style={styles.trackPlayOverlay}>
                <Ionicons
                  name={isCurrent && isPlaying ? 'pause' : 'play'}
                  size={16}
                  color="#fff"
                />
              </View>
            </View>

            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, isCurrent && { color: ACCENT }]} numberOfLines={1}>
                {track.title}
              </Text>
              <View style={styles.trackMeta}>
                {track.plays != null && (
                  <View style={styles.trackMetaItem}>
                    <Ionicons name="play" size={11} color={colors.textTertiary} />
                    <Text style={styles.trackMetaText}>{formatCount(track.plays)}</Text>
                  </View>
                )}
                <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
              </View>
            </View>

            <Pressable style={styles.trackMore} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Playlists Tab ─── */

function PlaylistsTab({
  playlists,
  navigation,
}: {
  playlists: ApiPlaylist[];
  navigation: any;
}) {
  if (!playlists.length) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="list-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>Aucune playlist publique</Text>
      </View>
    );
  }

  return (
    <View style={styles.playlistGrid}>
      {playlists.map((pl) => (
        <Pressable key={pl._id} style={styles.playlistCard}>
          {pl.coverUrl ? (
            <Image source={{ uri: pl.coverUrl }} style={styles.playlistCover} />
          ) : (
            <LinearGradient
              colors={[ACCENT, ACCENT_CYAN]}
              style={styles.playlistCover}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="musical-notes" size={28} color="#fff" />
            </LinearGradient>
          )}
          <Text style={styles.playlistTitle} numberOfLines={2}>
            {pl.name || pl.title || 'Playlist'}
          </Text>
          <Text style={styles.playlistMeta}>
            {pl.trackCount ?? 0} piste{(pl.trackCount ?? 0) > 1 ? 's' : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ─── About Tab ─── */

function AboutTab({ profile }: { profile: UserProfile }) {
  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; link?: string }[] = [];

  if (profile.bio) rows.push({ icon: 'information-circle-outline', label: 'Bio', value: profile.bio });
  if (profile.location) rows.push({ icon: 'location-outline', label: 'Localisation', value: profile.location });
  if (profile.website) {
    const url = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
    rows.push({ icon: 'globe-outline', label: 'Site web', value: profile.website.replace(/^https?:\/\//, ''), link: url });
  }
  if (profile.genre?.length) rows.push({ icon: 'pricetag-outline', label: 'Genres', value: profile.genre.map((g: any) => typeof g === 'string' ? g : (g?.name || '')).filter(Boolean).join(', ') });
  if (profile.createdAt) rows.push({ icon: 'calendar-outline', label: 'Membre depuis', value: formatDate(profile.createdAt) });
  if (profile.totalPlays != null) rows.push({ icon: 'play-outline', label: 'Écoutes totales', value: formatCount(profile.totalPlays) });
  if (profile.totalLikes != null) rows.push({ icon: 'heart-outline', label: 'Likes reçus', value: formatCount(profile.totalLikes) });

  if (!rows.length) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>Aucune information</Text>
      </View>
    );
  }

  return (
    <View style={styles.aboutCard}>
      {rows.map((row, i) => (
        <Pressable
          key={i}
          style={[styles.aboutRow, i < rows.length - 1 && styles.aboutRowBorder]}
          onPress={row.link ? () => Linking.openURL(row.link!).catch(() => {}) : undefined}
          disabled={!row.link}
        >
          <View style={styles.aboutIconWrap}>
            <Ionicons name={row.icon} size={18} color={ACCENT} />
          </View>
          <View style={styles.aboutContent}>
            <Text style={styles.aboutLabel}>{row.label}</Text>
            <Text style={[styles.aboutValue, row.link && { color: ACCENT_CYAN }]} numberOfLines={3}>
              {row.value}
            </Text>
          </View>
          {row.link && <Ionicons name="open-outline" size={16} color={colors.textTertiary} />}
        </Pressable>
      ))}
    </View>
  );
}

/* ─── Styles ─── */

const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.08)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020017',
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020017',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  /* Banner */
  banner: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Profile Section */
  profileSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
  },
  avatarWrapper: {
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: '#020017',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: SCREEN_WIDTH - 80,
  },
  verifiedBadge: {
    marginTop: 2,
  },
  username: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 2,
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: CARD_BORDER,
    marginHorizontal: 8,
  },

  /* Follow */
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 8,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 15,
  },
  backButtonAlt: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: ACCENT,
  },
  backButtonAltText: {
    color: '#fff',
    fontWeight: '600',
  },

  /* Track Row */
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  trackRowActive: {
    backgroundColor: 'rgba(123,97,255,0.08)',
  },
  trackCoverWrapper: {
    position: 'relative',
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trackMetaText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  trackDuration: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  trackMore: {
    padding: 4,
  },

  /* Playlists Grid */
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playlistCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  playlistCover: {
    width: '100%',
    height: (SCREEN_WIDTH - 44) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  playlistMeta: {
    fontSize: 12,
    color: colors.textTertiary,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },

  /* About */
  aboutCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  aboutRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  aboutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(123,97,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutContent: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

export default PublicProfileScreen;
