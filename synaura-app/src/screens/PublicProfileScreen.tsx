import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { followUser, getMusicClips, getPublicProfile, getUserPosts, getUserVariations, type MobileProfile } from '@/api/client';
import type { HomePost, MusicClip, UserVariation } from '@/api/types';
import type { RootTabsParamList } from '@/navigation/Tabs';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { CreatorLevelCard } from '@/components/events/SynauraEvents';
import { usePlayer } from '@/player/PlayerProvider';
import { MotionPressable } from '@/components/motion/Motion';
import { MobileBadge } from '@/components/mobile/MobileBadge';
import { MobileSocialLinks } from '@/components/mobile/MobileSocialLinks';
import { AppHeader } from '@/components/ui/AppHeader';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';

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
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('sons');
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [sort, setSort] = useState<'recent' | 'plays' | 'likes'>('plays');
  const [followLoading, setFollowLoading] = useState(false);
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsLoaded, setClipsLoaded] = useState(false);
  const [variations, setVariations] = useState<UserVariation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const username = route.params?.username;

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const nextProfile = await getPublicProfile(username);
      setProfile(nextProfile);
      const nextPosts = await getUserPosts(nextProfile.id);
      setPosts(nextPosts.map((post) => ({ ...post, isPinned: post.id === nextProfile.pinnedPostId })).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  // Chargement paresseux : Clips et Variations ne sont recuperes que lorsque
  // l'onglet correspondant est ouvert, pour eviter des appels systematiques.
  useEffect(() => {
    if (!profile?.id) return;
    if (tab === 'clips' && !clipsLoaded && !clipsLoading) {
      setClipsLoading(true);
      getMusicClips({ creatorId: profile.id, limit: 40 })
        .then((result) => setClips(result.clips))
        .catch(() => setClips([]))
        .finally(() => { setClipsLoading(false); setClipsLoaded(true); });
    }
    if (tab === 'variations' && !variationsLoaded && !variationsLoading && username) {
      setVariationsLoading(true);
      getUserVariations(username)
        .then((next) => setVariations(next))
        .catch(() => setVariations([]))
        .finally(() => { setVariationsLoading(false); setVariationsLoaded(true); });
    }
  }, [tab, profile?.id, username, clipsLoaded, clipsLoading, variationsLoaded, variationsLoading]);

  const tracks = useMemo(() => {
    const list = [...(profile?.tracks || [])];
    return list.sort((a, b) => {
      if (sort === 'plays') return (b.plays || 0) - (a.plays || 0);
      if (sort === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [profile?.tracks, sort]);
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

  const share = async () => {
    if (!profile) return;
    await Share.share({ message: `Découvre ${profile.name} sur Synaura: https://xima-m-music-platform.vercel.app/profile/${profile.username}` });
  };

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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 0 }]} showsVerticalScrollIndicator={false}>
        <AppHeader flush title="Profil artiste" subtitle={`@${profile.username}`} onBack={() => navigation.goBack()} action={{ icon: 'share-outline', label: 'Partager', onPress: () => void share() }} />

        <View style={styles.hero}>
          <View style={styles.banner}>{profile.banner ? <Image source={{ uri: profile.banner }} style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#FFB4A8', '#BCA7FF', '#8DE7EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />}</View>
          <View style={styles.heroBody}>
            <View style={styles.avatar}>{profile.avatar ? <Image source={{ uri: profile.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text>}</View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.handle}>@{profile.username}</Text>
            <Text style={styles.bio}>{profile.bio || 'Artiste Synaura'}</Text>
            {profile.genre?.length ? <View style={styles.badges}>{profile.genre.slice(0, 5).map((g) => <Text key={g} style={styles.genreTag}>{g}</Text>)}</View> : null}
            {profile.badges.length ? <View style={styles.badges}>{profile.badges.slice(0, 4).map((badge) => <Text key={badge} style={styles.badge}>{badge}</Text>)}</View> : null}
            <View style={styles.socials}><MobileSocialLinks links={profile.socialLinks} /></View>
            <View style={styles.stats}>
              <Stat label="Followers" value={compact(profile.followerCount)} />
              <Stat label="Sons" value={compact(profile.tracksCount)} />
              <Stat label="Plays" value={compact(profile.totalPlays)} />
            </View>
            <View style={styles.actions}>
              <MotionPressable disabled={followLoading} onPress={toggleFollow} style={[styles.primary, profile.isFollowing && styles.primaryFollowing]} scaleTo={0.94}>
                <Ionicons name={followLoading ? 'ellipsis-horizontal' : profile.isFollowing ? 'checkmark' : 'add'} size={16} color="#FFFAF2" />
                <Text style={styles.primaryText}>{profile.isFollowing ? 'Suivi' : 'Suivre'}</Text>
              </MotionPressable>
              <Pressable onPress={share} style={styles.secondary}><Text style={styles.secondaryText}>Partager</Text></Pressable>
            </View>
          </View>
        </View>

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

        {spotlightTrack ? (
          <View style={styles.featured}>
            <Pressable onPress={() => player.playTrack(spotlightTrack)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <TrackCover track={spotlightTrack} style={styles.featuredCover} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.featuredKicker}>À ÉCOUTER MAINTENANT</Text>
                <Text numberOfLines={1} style={styles.featuredTitle}>{spotlightTrack.title}</Text>
                <Text style={styles.featuredMeta}>{compact(spotlightTrack.plays || 0)} écoutes</Text>
              </View>
            </Pressable>
            <Pressable accessibilityLabel="Ajouter a la file" onPress={() => void player.addNext(spotlightTrack)} style={styles.featuredPlay}>
              <Ionicons name="add" size={20} color="#FFFAF2" />
            </Pressable>
            <Pressable accessibilityLabel="Ecouter" onPress={() => player.playTrack(spotlightTrack)} style={styles.featuredPlay}>
              <Ionicons name="play" size={18} color="#FFFAF2" />
            </Pressable>
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

        <View style={styles.tabs}>
          {(['sons', 'clips', 'variations', 'playlists', 'posts'] as Tab[]).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{TAB_LABELS[item]}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'sons' ? (
          <View style={styles.card}>
            <View style={styles.sorts}>
              {(['plays', 'recent', 'likes'] as const).map((item) => (
                <Pressable key={item} onPress={() => setSort(item)} style={[styles.sort, sort === item && styles.sortActive]}>
                  <Text style={[styles.sortText, sort === item && styles.sortTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>
            {tracks.length ? tracks.map((track) => (
              <Pressable key={track._id} onPress={() => player.playTrack(track)} style={styles.trackRow}>
                <TrackCover track={track} style={styles.trackCover} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackMeta}>{compact(track.plays || 0)} plays · {compact(track.likesCount || 0)} likes</Text>
                </View>
                <Ionicons name="play" size={16} color="#171313" />
              </Pressable>
            )) : <Text style={styles.empty}>Aucun son public.</Text>}
          </View>
        ) : null}

        {tab === 'clips' ? (
          <View style={styles.card}>
            {clipsLoading ? (
              <ActivityIndicator color="#171313" style={{ marginVertical: 20 }} />
            ) : clips.length ? (
              <View style={styles.clipsGrid}>
                {clips.map((clip) => (
                  <Pressable key={clip.id} onPress={() => navigation.navigate('Swipe', { mode: 'clips', sourceTrackId: clip.sourceTrackId })} style={styles.clipTile}>
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
                {post.isPinned ? <Text style={styles.pinned}>ÉPINGLÉ</Text> : null}
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
    </SynauraBackground>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 130, gap: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  topTitle: { color: '#171313', fontSize: 17, fontWeight: '900' },
  title: { color: '#171313', fontSize: 24, fontWeight: '900' },
  hero: { overflow: 'hidden', borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)' },
  banner: { height: 112, backgroundColor: '#171313' },
  heroBody: { padding: 14, alignItems: 'center', marginTop: -46 },
  avatar: { width: 92, height: 92, borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#E8DCCA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#171313', fontSize: 36, fontWeight: '900' },
  name: { marginTop: 10, color: '#171313', fontSize: 23, fontWeight: '900' },
  handle: { marginTop: 2, color: 'rgba(23,19,19,0.45)', fontSize: 12, fontWeight: '800' },
  bio: { marginTop: 9, color: 'rgba(23,19,19,0.58)', textAlign: 'center', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  badges: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  badge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, color: '#5B3FD6', backgroundColor: 'rgba(124,92,255,0.12)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  socials: { marginTop: 10, flexDirection: 'row', gap: 7 },
  social: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  badgePanel: { gap: 8, borderRadius: 14, padding: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)' },
  badgePanelTitle: { color: '#171313', fontSize: 17, fontWeight: '900' },
  stats: { marginTop: 12, flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(17,17,17,0.075)' },
  stat: { flex: 1, alignItems: 'center', padding: 11 },
  statValue: { color: '#171313', fontSize: 18, fontWeight: '900' },
  statLabel: { marginTop: 3, color: 'rgba(23,19,19,0.42)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  actions: { marginTop: 14, flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  featured: { minHeight: 76, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, backgroundColor: '#171313' },
  featuredCover: { width: 58, height: 58, borderRadius: 10 },
  featuredKicker: { color: '#C7B8FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  featuredTitle: { marginTop: 4, color: '#FFFAF2', fontSize: 15, fontWeight: '900' },
  featuredMeta: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 10, fontWeight: '800' },
  featuredPlay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.12)' },
  primary: { flex: 1, height: 44, borderRadius: 11, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  primaryFollowing: { backgroundColor: '#7C5CFF' },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  secondary: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.06)' },
  secondaryText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  tabActive: { backgroundColor: '#171313' },
  tabText: { color: 'rgba(23,19,19,0.58)', fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  tabTextActive: { color: '#FFFAF2' },
  card: { gap: 8, borderRadius: 14, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(17,17,17,0.075)' },
  sorts: { flexDirection: 'row', gap: 8 },
  sort: { flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
  sortActive: { backgroundColor: '#171313' },
  sortText: { color: 'rgba(23,19,19,0.55)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  sortTextActive: { color: '#FFFAF2' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)', paddingVertical: 9 },
  trackCover: { width: 52, height: 52, borderRadius: 15 },
  trackTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(17,17,17,0.06)', paddingVertical: 9 },
  post: { gap: 10, borderRadius: 20, backgroundColor: 'rgba(23,19,19,0.045)', padding: 11 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  postAvatarText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  postText: { color: '#171313', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  pinned: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, color: '#5B3FD6', backgroundColor: 'rgba(124,92,255,0.12)', fontSize: 8, fontWeight: '900' },
  postTrack: { minHeight: 58, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, backgroundColor: 'rgba(23,19,19,0.055)' },
  postTrackCover: { width: 42, height: 42, borderRadius: 12 },
  postMeta: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '800' },
  albumCover: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.07)' },
  empty: { color: 'rgba(23,19,19,0.5)', fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 14 },
  genreTag: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, color: '#7357C6', backgroundColor: 'rgba(115,87,198,0.10)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  identityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  identityPillCyan: { backgroundColor: 'rgba(0,194,203,0.10)', borderColor: 'rgba(0,194,203,0.25)' },
  identityPillCoral: { backgroundColor: 'rgba(255,111,97,0.10)', borderColor: 'rgba(255,111,97,0.25)' },
  identityPillText: { fontSize: 10, fontWeight: '900' },
  clipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clipTile: { width: '31%', aspectRatio: 9 / 16, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  clipTileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: 'rgba(23,19,19,0.55)' },
  clipTileTitle: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
});
