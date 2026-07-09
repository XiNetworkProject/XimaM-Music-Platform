import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
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
import * as Haptics from 'expo-haptics';
import {
  getArtistFollowState,
  getTrackLikeStatus,
  setTrackLike,
  toggleArtistFollow,
} from '@/api/client';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { colors } from '@/theme/tokens';

type Props = {
  tracks: Track[];
  loading?: boolean;
  compact?: boolean;
  title?: string;
  onViewAll?: () => void;
};

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function formatCount(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  if (!safe) return '';
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function trackReasons(track: Track) {
  return Array.isArray(track.radarReasons) ? track.radarReasons.filter(Boolean).slice(0, 3) : [];
}

function useRadarPlay(tracks: Track[]) {
  const player = usePlayer();

  return useCallback(async (track: Track, openFullPlayer = false) => {
    const playable = tracks.filter((item) => item.audioUrl);
    if (!playable.length) return;
    const index = Math.max(0, playable.findIndex((item) => item._id === track._id));
    await player.setQueueAndPlay(playable, index >= 0 ? index : 0);
    if (openFullPlayer) {
      setTimeout(() => DeviceEventEmitter.emit('synaura:open-full-player'), 80);
    }
  }, [player, tracks]);
}

export function RadarMobileSection({
  tracks,
  loading = false,
  compact = false,
  title = 'Radar des petits créateurs',
  onViewAll,
}: Props) {
  const play = useRadarPlay(tracks);
  const visibleTracks = compact ? tracks.slice(0, 8) : tracks;
  const newThisWeek = tracks.filter((track) => track.isNewThisWeek).slice(0, compact ? 3 : 6);
  const featured = !compact ? visibleTracks[0] : null;
  const rest = compact ? visibleTracks : visibleTracks.slice(1);

  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <LinearGradient
        colors={['rgba(115,87,198,0.25)', 'rgba(74,158,170,0.13)', 'rgba(217,109,99,0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.sectionInner}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <View style={styles.badge}>
              <Ionicons name="radio-outline" size={13} color="#FFFFFF" />
              <Text style={styles.badgeText}>Radar Synaura</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Découvre les sons avant tout le monde. Sur Synaura, même un petit créateur peut trouver ses premiers vrais auditeurs.
            </Text>
          </View>
          {onViewAll ? (
            <Pressable onPress={onViewAll} style={styles.viewAll}>
              <Text style={styles.viewAllText}>Voir tout</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.black} />
            </Pressable>
          ) : null}
        </View>

        {newThisWeek.length ? (
          <View style={styles.newBox}>
            <Text style={styles.newLabel}>Nouveaux cette semaine</Text>
            <View style={styles.newChips}>
              {newThisWeek.map((track) => (
                <Text key={track._id} numberOfLines={1} style={styles.newChip}>
                  {track.title}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {loading && !tracks.length ? (
          <ActivityIndicator color="#FFFFFF" style={styles.loader} />
        ) : tracks.length ? (
          compact ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactRail}>
              {visibleTracks.map((track) => (
                <RadarTrackCard
                  key={track._id}
                  track={track}
                  tracks={tracks}
                  compact
                  onPlay={() => void play(track)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.fullList}>
              {featured ? (
                <RadarTrackCard
                  track={featured}
                  tracks={tracks}
                  featured
                  onPlay={() => void play(featured)}
                />
              ) : null}
              {rest.map((track) => (
                <RadarTrackCard
                  key={track._id}
                  track={track}
                  tracks={tracks}
                  onPlay={() => void play(track)}
                />
              ))}
            </View>
          )
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Le Radar attend les prochains signaux.</Text>
            <Text style={styles.emptyText}>Dès que des morceaux publics avec audio remontent des signaux réels, ils apparaîtront ici.</Text>
          </View>
        )}

        {!compact && tracks.length ? <EmergingArtists tracks={tracks} /> : null}
      </View>
    </View>
  );
}

function RadarTrackCard({
  track,
  tracks,
  compact = false,
  featured = false,
  onPlay,
}: {
  track: Track;
  tracks: Track[];
  compact?: boolean;
  featured?: boolean;
  onPlay: () => void;
}) {
  const navigation = useNavigation<any>();
  const play = useRadarPlay(tracks);
  const player = usePlayer();
  const playing = player.current?._id === track._id && player.isPlaying;
  const [liked, setLiked] = useState(Boolean(track.isLiked));
  const [likesCount, setLikesCount] = useState(Number(track.likesCount || track.likes?.length || 0));
  const [following, setFollowing] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const username = track.artist?.username || '';
  const reasons = trackReasons(track);
  const duration = formatDuration(track.duration);
  const score = Math.max(0, Math.round(Number(track.radarScore || 0)));
  const completionRate = Math.max(0, Math.round(Number(track.completionRate || 0)));

  useEffect(() => {
    let mounted = true;
    void getTrackLikeStatus(track._id).then((data) => {
      if (!mounted || !data) return;
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    });
    return () => {
      mounted = false;
    };
  }, [track._id]);

  useEffect(() => {
    if (!username) return;
    let mounted = true;
    void getArtistFollowState(username).then((next) => {
      if (mounted) setFollowing(next);
    });
    return () => {
      mounted = false;
    };
  }, [username]);

  const toggleLike = useCallback(async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await setTrackLike(track._id, nextLiked);
      if (result) {
        setLiked(result.liked);
        setLikesCount(result.likesCount);
      } else {
        setLiked(previousLiked);
        setLikesCount(previousCount);
      }
    } finally {
      setLikeBusy(false);
    }
  }, [likeBusy, liked, likesCount, track._id]);

  const toggleFollow = useCallback(async () => {
    if (!username || followBusy) return;
    setFollowBusy(true);
    const previous = following;
    setFollowing(!following);
    Haptics.selectionAsync().catch(() => {});
    try {
      const result = await toggleArtistFollow(username);
      if (result) setFollowing(result.following);
      else setFollowing(previous);
    } finally {
      setFollowBusy(false);
    }
  }, [followBusy, following, username]);

  const openDetail = () => navigation.navigate('TrackDetail', { trackId: track._id, track });
  const openFull = () => void play(track, true);

  return (
    <View style={[styles.card, compact && styles.cardCompact, featured && styles.cardFeatured]}>
      <Pressable onPress={openDetail} style={[styles.coverWrap, compact && styles.coverCompact, featured && styles.coverFeatured]}>
        <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.cover} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.76)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.cardBadges}>
          <View style={styles.radarPill}>
            <Ionicons name="radio-outline" size={10} color="#FFFFFF" />
            <Text style={styles.radarPillText}>Radar</Text>
          </View>
          {track.isNewThisWeek ? <Text style={styles.newPill}>Nouveau</Text> : null}
        </View>
        <Pressable onPress={onPlay} style={styles.coverPlay}>
          <Ionicons name={playing ? 'pause' : 'play'} size={16} color={colors.black} />
        </Pressable>
      </Pressable>

      <View style={styles.cardBody}>
        <Pressable onPress={openDetail}>
          <View style={styles.signalRow}>
            <Text numberOfLines={1} style={styles.signalText}>{track.radarSignalLabel || 'Signal Radar'}</Text>
            {duration ? <Text style={styles.duration}>{duration}</Text> : null}
          </View>
          <Text numberOfLines={featured ? 2 : 1} style={[styles.trackTitle, featured && styles.trackTitleFeatured]}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.trackArtist}>{artistName(track)}</Text>
        </Pressable>

        <View style={styles.statsGrid}>
          <Stat label="Ecoutes" value={formatCount(track.plays)} />
          <Stat label="Score" value={formatCount(score)} />
          <Stat label="Signaux" value={formatCount((track.commentsCount || 0) + (track.reactionsCount || 0))} />
        </View>

        {completionRate > 0 || reasons.length ? (
          <View style={styles.reasons}>
            {completionRate > 0 ? <Text style={styles.reasonChip}>{completionRate}% completion</Text> : null}
            {reasons.map((reason) => <Text key={reason} numberOfLines={1} style={styles.reasonChip}>{reason}</Text>)}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={onPlay} style={styles.primaryAction}>
            <Ionicons name="play" size={13} color={colors.black} />
            <Text style={styles.primaryActionText}>Play</Text>
          </Pressable>
          <Pressable disabled={likeBusy} onPress={() => void toggleLike()} style={[styles.iconAction, liked && styles.iconActionLiked]}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#FFFFFF' : 'rgba(255,255,255,0.74)'} />
            <Text style={[styles.iconActionText, liked && styles.iconActionTextActive]}>{formatCount(likesCount)}</Text>
          </Pressable>
          {username ? (
            <Pressable disabled={followBusy} onPress={() => void toggleFollow()} style={[styles.iconAction, following && styles.iconActionFollowed]}>
              <Ionicons name={following ? 'checkmark' : 'person-add-outline'} size={15} color={following ? colors.black : 'rgba(255,255,255,0.74)'} />
              <Text style={[styles.iconActionText, following && styles.iconActionTextDark]}>{following ? 'Suivi' : 'Suivre'}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={openFull} style={styles.iconAction}>
            <Ionicons name="expand-outline" size={15} color="rgba(255,255,255,0.74)" />
            <Text style={styles.iconActionText}>Plein écran</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function EmergingArtists({ tracks }: { tracks: Track[] }) {
  const navigation = useNavigation<any>();
  const artists = useMemo(() => {
    const byId = new Map<string, { artist: NonNullable<Track['artist']>; count: number; cover?: string | null }>();
    tracks.forEach((track) => {
      const id = track.artist?._id || track.artist?.username;
      if (!id || !track.artist) return;
      const previous = byId.get(id);
      byId.set(id, {
        artist: track.artist,
        count: (previous?.count || 0) + 1,
        cover: previous?.cover || track.coverUrl || null,
      });
    });
    return Array.from(byId.values()).slice(0, 6);
  }, [tracks]);

  if (!artists.length) return null;

  return (
    <View style={styles.artistsSection}>
      <Text style={styles.artistsKicker}>Nouveaux artistes prometteurs</Text>
      <Text style={styles.artistsTitle}>Des univers à suivre tôt.</Text>
      <View style={styles.artistGrid}>
        {artists.map(({ artist, count, cover }) => {
          const label = artist.artistName || artist.name || artist.username || 'Artiste Synaura';
          const username = artist.username || '';
          return (
            <Pressable
              key={artist._id || artist.username || label}
              disabled={!username}
              onPress={() => navigation.navigate('PublicProfile', { username })}
              style={styles.artistCard}
            >
              <View style={styles.artistAvatar}>
                {artist.avatar || cover ? (
                  <Image source={{ uri: artist.avatar || cover || '' }} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <Text style={styles.artistInitial}>{label.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.artistMeta}>
                <Text numberOfLines={1} style={styles.artistName}>{label}</Text>
                <Text style={styles.artistSignal}>{count} son{count > 1 ? 's' : ''} dans le Radar</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#111111',
    shadowColor: '#111111',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7,
  },
  sectionCompact: { marginTop: 22 },
  sectionInner: { padding: 15 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerCopy: { flex: 1, minWidth: 0 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { marginTop: 12, color: '#FFFFFF', fontSize: 26, lineHeight: 28, fontWeight: '900' },
  subtitle: { marginTop: 8, color: 'rgba(255,255,255,0.64)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  viewAllText: { color: colors.black, fontSize: 11, fontWeight: '900' },
  newBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 10,
  },
  newLabel: { color: 'rgba(255,255,255,0.44)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  newChips: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  newChip: {
    maxWidth: '100%',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.74)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  loader: { marginVertical: 28 },
  compactRail: { gap: 12, paddingTop: 14, paddingRight: 10 },
  fullList: { gap: 12, marginTop: 14 },
  empty: {
    marginTop: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
  },
  emptyTitle: { color: 'rgba(255,255,255,0.76)', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  emptyText: { marginTop: 7, color: 'rgba(255,255,255,0.48)', fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 10,
  },
  cardCompact: { width: 246 },
  cardFeatured: { padding: 12 },
  coverWrap: {
    height: 154,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  coverCompact: { height: 154 },
  coverFeatured: { height: 260 },
  cover: { width: '100%', height: '100%' },
  cardBadges: { position: 'absolute', left: 9, top: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(115,87,198,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  radarPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  newPill: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(74,158,170,0.94)',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: '900',
  },
  coverPlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardBody: { marginTop: 11 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalText: {
    flex: 1,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  duration: { color: 'rgba(255,255,255,0.44)', fontSize: 11, fontWeight: '800' },
  trackTitle: { marginTop: 7, color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  trackTitleFeatured: { fontSize: 24, lineHeight: 27 },
  trackArtist: { marginTop: 3, color: 'rgba(255,255,255,0.52)', fontSize: 12, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', gap: 6, marginTop: 12 },
  stat: {
    flex: 1,
    minWidth: 0,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.065)',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  statLabel: { color: 'rgba(255,255,255,0.36)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  statValue: { marginTop: 4, color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  reasonChip: {
    maxWidth: '100%',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.075)',
    color: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '800',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  primaryActionText: { color: colors.black, fontSize: 11, fontWeight: '900' },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
  },
  iconActionLiked: { backgroundColor: 'rgba(217,109,99,0.28)', borderColor: 'rgba(217,109,99,0.42)' },
  iconActionFollowed: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  iconActionText: { color: 'rgba(255,255,255,0.74)', fontSize: 10, fontWeight: '900' },
  iconActionTextActive: { color: '#FFFFFF' },
  iconActionTextDark: { color: colors.black },
  artistsSection: { marginTop: 18 },
  artistsKicker: { color: 'rgba(255,255,255,0.42)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  artistsTitle: { marginTop: 4, color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  artistGrid: { gap: 9, marginTop: 11 },
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 9,
  },
  artistAvatar: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  artistInitial: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  artistMeta: { flex: 1, minWidth: 0 },
  artistName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  artistSignal: { marginTop: 3, color: 'rgba(255,255,255,0.46)', fontSize: 11, fontWeight: '800' },
});
