import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { followUser, getMusicClips, getPublicProfile, getUserPosts, getUserVariations, type MobileProfile } from '@/api/client';
import type { HomePost, MusicClip, UserVariation } from '@/api/types';
import type { RootTabsParamList } from '@/navigation/Tabs';
import { SynauraBackground } from '@/components/SynauraBackground';
import { CreatorLevelCard } from '@/components/events/SynauraEvents';
import { usePlayer } from '@/player/PlayerProvider';
import { MobileBadge } from '@/components/mobile/MobileBadge';
import { AppHeader } from '@/components/ui/AppHeader';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { ProfileIdentityHero } from '@/components/profile/ProfileIdentityHero';
import { ProfileMusicCatalog } from '@/components/profile/ProfileMusicCatalog';
import { ProfileShareSheet } from '@/components/profile/ProfileShareSheet';

type Tab = 'sons' | 'clips' | 'variations' | 'playlists' | 'posts';

const TAB_LABELS: Record<Tab, string> = {
  sons: 'Sons',
  clips: 'Clips',
  variations: 'Variations',
  playlists: 'Playlists',
  posts: 'Posts',
};

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

export function PublicProfileScreen() {
  const route = useRoute<RouteProp<RootTabsParamList, 'PublicProfile'>>();
  const navigation = useNavigation<any>();
  const responsive = useResponsiveLayout();
  const player = usePlayer();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('sons');
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsError, setClipsError] = useState<string | null>(null);
  const [variations, setVariations] = useState<UserVariation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const username = route.params?.username;

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const nextProfile = await getPublicProfile(username);
      setProfile(nextProfile);
      void getUserPosts(nextProfile.id)
        .then((nextPosts) => {
          setPosts(nextPosts.map((post) => ({ ...post, isPinned: post.id === nextProfile.pinnedPostId })).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))));
        })
        .catch(() => setPosts([]));
    } finally {
      setLoading(false);
    }
  }, [username]);

  const loadClips = useCallback(async () => {
    if (!username) return;
    setClipsLoading(true);
    setClipsError(null);
    try {
      const result = await getMusicClips({ creatorUsername: username, limit: 40 });
      setClips(result.clips);
    } catch (clipError) {
      setClipsError(clipError instanceof Error ? clipError.message : 'Impossible de charger les clips.');
    } finally {
      setClipsLoading(false);
    }
  }, [username]);

  useFocusEffect(useCallback(() => {
    void load();
    void loadClips();
  }, [load, loadClips]));

  // Les variations restent chargees a la demande. Les Clips sont recuperes des
  // l'ouverture du profil afin d'apparaitre aussi dans son apercu principal.
  useEffect(() => {
    if (!profile?.id) return;
    if (tab === 'variations' && !variationsLoaded && !variationsLoading && username) {
      setVariationsLoading(true);
      getUserVariations(username)
        .then((next) => setVariations(next))
        .catch(() => setVariations([]))
        .finally(() => { setVariationsLoading(false); setVariationsLoaded(true); });
    }
  }, [tab, profile?.id, username, variationsLoaded, variationsLoading]);

  // Mise en avant musicale : morceau epingle si deja marque comme tel, sinon le
  // plus ecoute, sinon le plus recent. Aucune nouvelle logique de pinning.
  const spotlightTrack = useMemo(() => {
    const pool = profile?.tracks || [];
    if (!pool.length) return null;
    const pinned = pool.find((track) => track._id === profile?.featuredTrackId || track.rawId === profile?.featuredTrackId || track.isFeatured);
    if (pinned) return pinned;
    const mostPlayed = [...pool].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];
    if (mostPlayed && (mostPlayed.plays || 0) > 0) return mostPlayed;
    return [...pool].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0] || null;
  }, [profile]);

  // Signaux d'identite createur : uniquement deduits des permissions reelles
  // deja presentes sur les morceaux (pas de nouveau champ "disponible pour feat").
  const acceptsVariations = useMemo(
    () => (profile?.tracks || []).some((t: any) => t.allowAiVariation && t.remixVisibility && t.remixVisibility !== 'disabled'),
    [profile],
  );
  const clipsAllowed = useMemo(
    () => (profile?.tracks || []).some((t: any) => t.allowClips && t.remixVisibility && t.remixVisibility !== 'disabled'),
    [profile],
  );

  const toggleFollow = async () => {
    if (!profile || followLoading) return;
    const wasFollowing = Boolean(profile.isFollowing);
    setFollowLoading(true);
    setProfile((current) => current ? {
      ...current,
      isFollowing: !wasFollowing,
      followerCount: Math.max(0, current.followerCount + (wasFollowing ? -1 : 1)),
    } : current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const result = await followUser(profile.username);
      setProfile((current) => current ? {
        ...current,
        isFollowing: result.isFollowing,
        followerCount: Math.max(0, current.followerCount + (result.isFollowing === !wasFollowing ? 0 : result.isFollowing ? 1 : -1)),
      } : current);
      if (result.isFollowing) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setProfile((current) => current ? {
        ...current,
        isFollowing: wasFollowing,
        followerCount: Math.max(0, current.followerCount + (wasFollowing ? 1 : -1)),
      } : current);
    } finally {
      setFollowLoading(false);
    }
  };

  const share = () => setShareOpen(true);

  if (loading) {
    return (
      <SynauraBackground variant="warm">
        <View style={styles.center}><ActivityIndicator color="#171313" /></View>
      </SynauraBackground>
    );
  }

  if (!profile) {
    return (
      <SynauraBackground variant="warm">
        <View style={styles.center}><Text style={styles.title}>Profil introuvable</Text></View>
      </SynauraBackground>
    );
  }

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: 0, paddingBottom: responsive.miniPlayerClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader flush title="Profil artiste" subtitle={`@${profile.username}`} onBack={() => navigation.goBack()} action={{ icon: 'share-outline', label: 'Partager', onPress: () => void share() }} />

        <ProfileIdentityHero
          profile={profile}
          spotlightTrack={spotlightTrack}
          primaryAction={{
            label: profile.isFollowing ? 'Abonné' : 'Suivre',
            icon: profile.isFollowing ? 'checkmark' : 'person-add-outline',
            onPress: () => void toggleFollow(),
            active: Boolean(profile.isFollowing),
            loading: followLoading,
          }}
          onShare={() => void share()}
          onPlaySpotlight={() => {
            if (!spotlightTrack) return;
            if (player.current?._id === spotlightTrack._id) void player.togglePlayPause();
            else void player.playTrack(spotlightTrack);
          }}
        />

        <SegmentedControl value={tab} compact options={(Object.keys(TAB_LABELS) as Tab[]).map((item) => ({ value: item, label: TAB_LABELS[item] }))} onChange={setTab} />

        {tab === 'sons' && (clipsLoading || Boolean(clipsError) || clips.length > 0) ? (
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Clips recents</Text>
              {clips.length ? <Pressable onPress={() => setTab('clips')}><Text style={styles.sectionLink}>Tout voir ({clips.length})</Text></Pressable> : null}
            </View>
            {clipsLoading ? (
              <ActivityIndicator color="#171313" style={{ marginVertical: 20 }} />
            ) : clipsError ? (
              <Pressable onPress={() => void loadClips()} style={styles.retryButton}>
                <Ionicons name="refresh" size={17} color="#5B3FD6" />
                <Text style={styles.retryText}>Recharger les clips</Text>
              </Pressable>
            ) : (
              <View style={styles.clipsGrid}>
                {clips.slice(0, responsive.isTablet ? 4 : 3).map((clip) => (
                  <Pressable key={`preview-${clip.id}`} onPress={() => navigation.navigate('Swipe', { mode: 'clips', clipId: clip.id })} style={[styles.clipTile, { width: responsive.isTablet ? '23.5%' : responsive.isNarrow ? '47.5%' : '31%' }]}>
                    {clip.posterUrl ? <Image source={{ uri: clip.posterUrl }} style={StyleSheet.absoluteFillObject} /> : null}
                    <View style={styles.clipTileOverlay}><Text numberOfLines={1} style={styles.clipTileTitle}>{clip.sourceTrack?.title || 'Clip'}</Text></View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {tab === 'sons' ? <>
        <ProfileMusicCatalog
          tracks={profile.tracks}
          currentTrackId={player.current?._id}
          isPlaying={player.isPlaying}
          defaultSort="plays"
          onPlay={(track) => {
            if (player.current?._id === track._id) void player.togglePlayPause();
            else void player.playTrack(track);
          }}
          onOpen={(track) => navigation.navigate('TrackDetail', { trackId: track._id, track })}
        />

        <CreatorLevelCard
          tracks={profile.tracksCount}
          plays={profile.totalPlays}
          likes={profile.tracks.reduce((sum, track) => sum + Number(track.likesCount || 0), 0)}
          onOpen={() => navigation.navigate('City')}
        />

        {profile.badges.length ? (
          <View style={styles.badgePanel}>
            <Text style={styles.badgePanelTitle}>Badges de l’artiste</Text>
            {profile.badges.slice(0, 3).map((badge, index) => <MobileBadge key={badge} label={badge} tier={index === 0 ? 'prism' : index === 1 ? 'gold' : 'silver'} description="Débloqué sur Synaura." />)}
          </View>
        ) : null}

        {(acceptsVariations || clipsAllowed) ? (
          <View style={styles.identityRow}>
            {acceptsVariations ? (
              <View style={[styles.identityPill, styles.identityPillCyan]}>
                <Ionicons name="repeat" size={12} color="#00838a" />
                <Text style={[styles.identityPillText, { color: '#00838a' }]}>Accepte les variations</Text>
              </View>
            ) : null}
            {clipsAllowed ? (
              <View style={[styles.identityPill, styles.identityPillCoral]}>
                <Ionicons name="film" size={12} color="#b8463c" />
                <Text style={[styles.identityPillText, { color: '#b8463c' }]}>Clips autorisés</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        </> : null}

        {tab === 'clips' ? (
          <View style={styles.card}>
            {clipsLoading ? (
              <ActivityIndicator color="#171313" style={{ marginVertical: 20 }} />
            ) : clipsError ? (
              <Pressable onPress={() => void loadClips()} style={styles.retryButton}>
                <Ionicons name="refresh" size={17} color="#5B3FD6" />
                <Text style={styles.retryText}>Recharger les clips</Text>
              </Pressable>
            ) : clips.length ? (
              <View style={styles.clipsGrid}>
                {clips.map((clip) => (
                  <Pressable key={clip.id} onPress={() => navigation.navigate('Swipe', { mode: 'clips', clipId: clip.id })} style={[styles.clipTile, { width: responsive.isTablet ? '23.5%' : responsive.isNarrow ? '47.5%' : '31%' }]}>
                    {clip.posterUrl ? <Image source={{ uri: clip.posterUrl }} style={StyleSheet.absoluteFillObject} /> : null}
                    <View style={styles.clipTileOverlay}><Text numberOfLines={1} style={styles.clipTileTitle}>{clip.sourceTrack?.title || 'Clip'}</Text></View>
                  </Pressable>
                ))}
              </View>
            ) : <Text style={styles.empty}>{profile.username === username ? "Tu n'as pas encore publié de clip." : 'Aucun clip publié.'}</Text>}
          </View>
        ) : null}

        {tab === 'variations' ? (
          <View style={styles.card}>
            {variationsLoading ? (
              <ActivityIndicator color="#171313" style={{ marginVertical: 20 }} />
            ) : variations.length ? variations.map((v) => (
              <Pressable key={v.id} onPress={() => navigation.navigate('TrackDetail', { trackId: v.id })} style={styles.trackRow}>
                {v.coverUrl ? <Image source={{ uri: v.coverUrl }} style={styles.trackCover} /> : <View style={styles.trackCover} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.trackTitle}>{v.title}</Text>
                  <Text style={styles.trackMeta}>IA · {compact(v.plays || 0)} écoutes</Text>
                </View>
                <Ionicons name="play" size={16} color="#171313" />
              </Pressable>
            )) : <Text style={styles.empty}>Aucune variation publiée.</Text>}
          </View>
        ) : null}

        {tab === 'playlists' ? (
          <View style={styles.card}>
            {profile.playlists.length ? profile.playlists.map((playlist) => (
              <Pressable key={playlist.id} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })} style={styles.albumRow}>
                <View style={styles.albumCover}>{playlist.coverUrl ? <Image source={{ uri: playlist.coverUrl }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={20} color="rgba(23,19,19,0.4)" />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle}>{playlist.title}</Text>
                  <Text style={styles.trackMeta}>{playlist.tracksCount} sons</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(23,19,19,0.34)" />
              </Pressable>
            )) : <Text style={styles.empty}>Aucune playlist publique.</Text>}
          </View>
        ) : null}

        {tab === 'posts' ? (
          <View style={styles.card}>
            {posts.length ? posts.map((post) => (
              <Pressable key={post.id} onPress={() => navigation.navigate('PostDetail', { postId: post.id })} style={styles.post}>
                <View style={styles.postHead}>
                  <View style={styles.postAvatar}><Text style={styles.postAvatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.trackTitle}>{profile.name}</Text><Text style={styles.trackMeta}>{post.time} · {post.mood}</Text></View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(23,19,19,0.35)" />
                </View>
                <Text style={styles.postText}>{post.text}</Text>
                {post.isPinned ? <Text style={styles.pinned}>Épinglé</Text> : null}
                {post.track ? (
                  <PostAttachedTrackCard
                    track={post.track}
                    compact
                    playing={player.current?._id === post.track._id && player.isPlaying}
                    onPlay={() => player.playTrack(post.track!)}
                    onOpen={() => navigation.navigate('TrackDetail', { trackId: post.track!._id, track: post.track })}
                  />
                ) : null}
                <Text style={styles.postMeta}>{post.likesCount} j’aime · {post.commentsCount} commentaires</Text>
              </Pressable>
            )) : <Text style={styles.empty}>Cet artiste n'a encore rien publié.</Text>}
          </View>
        ) : null}
      </ScrollView>
      <ProfileShareSheet visible={shareOpen} profile={profile} onClose={() => setShareOpen(false)} />
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 130, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#171313', fontSize: 24, fontWeight: '900' },
  badgePanel: { gap: 8, borderRadius: 8, padding: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)' },
  badgePanelTitle: { color: '#171313', fontSize: 17, fontWeight: '900' },
  card: { gap: 8, borderRadius: 8, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)', paddingVertical: 9 },
  trackCover: { width: 52, height: 52, borderRadius: 8 },
  trackTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)', paddingVertical: 9 },
  post: { gap: 10, borderRadius: 8, backgroundColor: 'rgba(23,19,19,0.045)', padding: 11 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  postAvatarText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  postText: { color: '#171313', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  pinned: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, color: '#5B3FD6', backgroundColor: 'rgba(124,92,255,0.12)', fontSize: 8, fontWeight: '900' },
  postMeta: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '800' },
  albumCover: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.07)' },
  empty: { color: 'rgba(23,19,19,0.5)', fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 14 },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  identityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  identityPillCyan: { backgroundColor: 'rgba(0,194,203,0.10)', borderColor: 'rgba(0,194,203,0.25)' },
  identityPillCoral: { backgroundColor: 'rgba(255,111,97,0.10)', borderColor: 'rgba(255,111,97,0.25)' },
  identityPillText: { fontSize: 10, fontWeight: '900' },
  clipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionHead: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { flex: 1, color: '#171313', fontSize: 16, fontWeight: '900' },
  sectionLink: { color: '#5B3FD6', fontSize: 11, fontWeight: '900' },
  retryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: 'rgba(115,87,198,0.1)' },
  retryText: { color: '#5B3FD6', fontSize: 11, fontWeight: '900' },
  clipTile: { width: '31%', aspectRatio: 9 / 16, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  clipTileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: 'rgba(23,19,19,0.55)' },
  clipTileTitle: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
});
