import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { followUser, getPublicProfile, getUserPosts, type MobileProfile } from '@/api/client';
import type { HomePost } from '@/api/types';
import type { RootTabsParamList } from '@/navigation/Tabs';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { CreatorLevelCard } from '@/components/events/SynauraEvents';
import { usePlayer } from '@/player/PlayerProvider';
import { MotionPressable } from '@/components/motion/Motion';

type Tab = 'posts' | 'sons' | 'albums' | 'about';

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
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [sort, setSort] = useState<'recent' | 'plays' | 'likes'>('plays');
  const [followLoading, setFollowLoading] = useState(false);
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

  const tracks = useMemo(() => {
    const list = [...(profile?.tracks || [])];
    return list.sort((a, b) => {
      if (sort === 'plays') return (b.plays || 0) - (a.plays || 0);
      if (sort === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [profile?.tracks, sort]);
  const featuredTrack = useMemo(() => profile?.tracks.find((track) => track._id === profile.featuredTrackId || track.rawId === profile.featuredTrackId || track.isFeatured) || profile?.tracks[0] || null, [profile]);

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
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <Text style={styles.topTitle}>Profil</Text>
          <Pressable onPress={share} style={styles.back}><Ionicons name="share-outline" size={18} color="#171313" /></Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.banner}>{profile.banner ? <Image source={{ uri: profile.banner }} style={StyleSheet.absoluteFillObject} /> : null}</View>
          <View style={styles.heroBody}>
            <View style={styles.avatar}>{profile.avatar ? <Image source={{ uri: profile.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.avatarText}>{profile.name.slice(0, 1).toUpperCase()}</Text>}</View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.handle}>@{profile.username}</Text>
            <Text style={styles.bio}>{profile.bio || 'Artiste Synaura'}</Text>
            {profile.badges.length ? <View style={styles.badges}>{profile.badges.slice(0, 4).map((badge) => <Text key={badge} style={styles.badge}>{badge}</Text>)}</View> : null}
            {Object.keys(profile.socialLinks).length ? (
              <View style={styles.socials}>
                {Object.entries(profile.socialLinks).filter(([, url]) => Boolean(url)).slice(0, 5).map(([name, url]) => (
                  <Pressable key={name} onPress={() => Linking.openURL(url)} style={styles.social}><Ionicons name={name.toLowerCase().includes('instagram') ? 'logo-instagram' : name.toLowerCase().includes('youtube') ? 'logo-youtube' : name.toLowerCase().includes('tiktok') ? 'logo-tiktok' : 'link-outline'} size={16} color="#171313" /></Pressable>
                ))}
              </View>
            ) : null}
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

        {featuredTrack ? (
          <Pressable onPress={() => player.playTrack(featuredTrack)} style={styles.featured}>
            <TrackCover track={featuredTrack} style={styles.featuredCover} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.featuredKicker}>SON VEDETTE</Text>
              <Text numberOfLines={1} style={styles.featuredTitle}>{featuredTrack.title}</Text>
              <Text style={styles.featuredMeta}>{compact(featuredTrack.plays || 0)} écoutes</Text>
            </View>
            <View style={styles.featuredPlay}><Ionicons name="play" size={18} color="#FFFAF2" /></View>
          </Pressable>
        ) : null}

        <View style={styles.tabs}>
          {(['posts', 'sons', 'albums', 'about'] as Tab[]).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

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
                {post.track ? <View style={styles.postTrack}><TrackCover track={post.track} style={styles.postTrackCover} /><Text numberOfLines={1} style={styles.trackTitle}>{post.track.title}</Text><Ionicons name="play" size={15} color="#171313" /></View> : null}
                <Text style={styles.postMeta}>{post.likesCount} j’aime · {post.commentsCount} commentaires</Text>
              </Pressable>
            )) : <Text style={styles.empty}>Cet artiste n'a encore rien publié.</Text>}
          </View>
        ) : null}

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

        {tab === 'albums' ? (
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
            )) : <Text style={styles.empty}>Aucun album public.</Text>}
          </View>
        ) : null}

        {tab === 'about' ? (
          <View style={styles.card}>
            <Info label="Bio" value={profile.bio || 'Aucune bio'} />
            <Info label="Localisation" value={profile.location || 'Non renseignee'} />
            <Info label="Site" value={profile.website || 'Non renseigne'} />
            <Info label="Genres" value={profile.genre.join(', ') || 'Non renseigné'} />
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 170, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.88)' },
  topTitle: { color: '#171313', fontSize: 17, fontWeight: '900' },
  title: { color: '#171313', fontSize: 24, fontWeight: '900' },
  hero: { overflow: 'hidden', borderRadius: 30, backgroundColor: 'rgba(255,250,242,0.92)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  banner: { height: 140, backgroundColor: '#171313' },
  heroBody: { padding: 16, alignItems: 'center', marginTop: -58 },
  avatar: { width: 112, height: 112, borderRadius: 32, overflow: 'hidden', borderWidth: 4, borderColor: '#FFFAF2', backgroundColor: '#E8DCCA', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#171313', fontSize: 36, fontWeight: '900' },
  name: { marginTop: 12, color: '#171313', fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  handle: { marginTop: 2, color: 'rgba(23,19,19,0.45)', fontSize: 12, fontWeight: '800' },
  bio: { marginTop: 9, color: 'rgba(23,19,19,0.58)', textAlign: 'center', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  badges: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  badge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, color: '#5B3FD6', backgroundColor: 'rgba(124,92,255,0.12)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  socials: { marginTop: 10, flexDirection: 'row', gap: 7 },
  social: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  stats: { marginTop: 14, flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 12 },
  statValue: { color: '#171313', fontSize: 18, fontWeight: '900' },
  statLabel: { marginTop: 3, color: 'rgba(23,19,19,0.42)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  actions: { marginTop: 14, flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  featured: { minHeight: 82, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: '#171313' },
  featuredCover: { width: 60, height: 60, borderRadius: 17 },
  featuredKicker: { color: '#C7B8FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  featuredTitle: { marginTop: 4, color: '#FFFAF2', fontSize: 15, fontWeight: '900' },
  featuredMeta: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 10, fontWeight: '800' },
  featuredPlay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.12)' },
  primary: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  primaryFollowing: { backgroundColor: '#7C5CFF' },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  secondary: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  secondaryText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.82)' },
  tabActive: { backgroundColor: '#171313' },
  tabText: { color: 'rgba(23,19,19,0.58)', fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  tabTextActive: { color: '#FFFAF2' },
  card: { gap: 10, borderRadius: 24, padding: 14, backgroundColor: 'rgba(255,250,242,0.88)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  sorts: { flexDirection: 'row', gap: 8 },
  sort: { flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
  sortActive: { backgroundColor: '#171313' },
  sortText: { color: 'rgba(23,19,19,0.55)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  sortTextActive: { color: '#FFFAF2' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  trackCover: { width: 52, height: 52, borderRadius: 15 },
  trackTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
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
  info: { borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 12 },
  infoLabel: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoValue: { marginTop: 5, color: '#171313', fontSize: 13, fontWeight: '800' },
  empty: { color: 'rgba(23,19,19,0.5)', fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 14 },
});
