import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { createDirectConversation, followUser, getMessagingRelationship, getProfileMusicClips, getPublicProfile, getUserPostsPage, getUserVariations, sendMessageRequest, type MessagingRelationship, type MobileProfile } from '@/api/client';
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
import { ProfileClipGrid } from '@/components/profile/ProfileClipGrid';
import { ProfileMusicCatalog } from '@/components/profile/ProfileMusicCatalog';
import { ProfileShareSheet } from '@/components/profile/ProfileShareSheet';
import { colors } from '@/theme/tokens';
import { useQueryClient } from '@tanstack/react-query';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { navigatePrimaryTab } from '@/navigation/navigatePrimaryTab';
import { useAuth } from '@/auth/AuthProvider';
import { MotionPressable } from '@/components/motion/Motion';

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
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('sons');
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsLoadingMore, setClipsLoadingMore] = useState(false);
  const [clipsCursor, setClipsCursor] = useState(0);
  const [clipsHasMore, setClipsHasMore] = useState(false);
  const [clipsError, setClipsError] = useState<string | null>(null);
  const clipsRequestRef = useRef(0);
  const [variations, setVariations] = useState<UserVariation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [relationship, setRelationship] = useState<MessagingRelationship['relationship']>('none');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const username = route.params?.username;

  const load = useCallback(async () => {
    if (!username) return;
    const profileKey = ['mobile-profile', 'public', username] as const;
    const cachedProfile = queryClient.getQueryData<MobileProfile>(profileKey);
    if (cachedProfile) setProfile(cachedProfile);
    setLoading(!cachedProfile);
    try {
      const nextProfile = await queryClient.fetchQuery({
        queryKey: profileKey,
        queryFn: () => getPublicProfile(username),
        staleTime: 45_000,
      });
      setProfile(nextProfile);
      void queryClient.fetchQuery({
        queryKey: ['profile-posts', nextProfile.id, null],
        queryFn: () => getUserPostsPage(nextProfile.id),
        staleTime: 30_000,
      })
        .then((page) => {
          setPosts(page.posts.map((post) => ({ ...post, isPinned: post.id === nextProfile.pinnedPostId })).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))));
          setPostsCursor(page.nextCursor);
          setPostsHasMore(page.hasMore);
        })
        .catch(() => {
          setPosts([]);
          setPostsCursor(null);
          setPostsHasMore(false);
        });
      return nextProfile;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [queryClient, username]);

  const loadClips = useCallback(async (cursor = 0, target?: { creatorId?: string; creatorUsername?: string }) => {
    const creatorUsername = target?.creatorUsername || username;
    if (!creatorUsername) return;
    const requestId = ++clipsRequestRef.current;
    if (cursor > 0) setClipsLoadingMore(true);
    else setClipsLoading(true);
    setClipsError(null);
    try {
      const input = { creatorUsername, creatorId: target?.creatorId, limit: 24, cursor };
      const result = cursor > 0
        ? await getProfileMusicClips(input)
        : await queryClient.fetchQuery({
          queryKey: ['profile-clips', target?.creatorId || creatorUsername, 0],
          queryFn: () => getProfileMusicClips(input),
          staleTime: 30_000,
        });
      if (requestId !== clipsRequestRef.current) return;
      setClips((current) => {
        if (!cursor) return result.clips;
        const byId = new Map(current.map((clip) => [clip.id, clip]));
        result.clips.forEach((clip) => byId.set(clip.id, clip));
        return Array.from(byId.values());
      });
      setClipsCursor(result.nextCursor);
      setClipsHasMore(result.hasMore);
    } catch (clipError) {
      if (requestId === clipsRequestRef.current) {
        setClipsError(clipError instanceof Error ? clipError.message : 'Impossible de charger les clips.');
      }
    } finally {
      if (requestId === clipsRequestRef.current) {
        setClipsLoading(false);
        setClipsLoadingMore(false);
      }
    }
  }, [queryClient, username]);

  useFocusEffect(useCallback(() => {
    void load().then((nextProfile) => {
      if (nextProfile) void loadClips(0, { creatorId: nextProfile.id, creatorUsername: nextProfile.username });
    });
  }, [load, loadClips]));

  useFocusEffect(useCallback(() => {
    if (!profile?.id || !auth.user?.id || profile.id === auth.user.id) return undefined;
    let active = true;
    void getMessagingRelationship(profile.id)
      .then((result) => {
        if (!active) return;
        setRelationship(result.relationship);
        setConversationId(result.conversationId || null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [auth.user?.id, profile?.id]));

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

  const openMessaging = async () => {
    if (!profile) return;
    if (!auth.requireAuth()) {
      navigation.navigate('Login', { returnTo: { screen: 'PublicProfile', params: { username: profile.username } } });
      return;
    }
    if (relationship === 'friends') {
      setRequestBusy(true);
      try {
        const id = conversationId || await createDirectConversation(profile.id);
        setConversationId(id);
        navigation.navigate('Conversation', { conversationId: id });
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : 'Conversation impossible');
      } finally {
        setRequestBusy(false);
      }
      return;
    }
    if (relationship === 'incoming' || relationship === 'outgoing') {
      navigation.navigate('Messages', { tab: 'requests' });
      return;
    }
    if (relationship === 'none') setRequestModalOpen(true);
  };

  const submitMessageRequest = async () => {
    if (!profile || requestBusy) return;
    setRequestBusy(true);
    setRequestError('');
    try {
      const result = await sendMessageRequest(profile.id, requestMessage);
      setRequestModalOpen(false);
      setRequestMessage('');
      if (result.alreadyConnected || result.autoAccepted) {
        setRelationship('friends');
        const id = result.conversationId || await createDirectConversation(profile.id);
        setConversationId(id);
        navigation.navigate('Conversation', { conversationId: id });
      } else {
        setRelationship('outgoing');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Demande impossible');
    } finally {
      setRequestBusy(false);
    }
  };

  const loadMorePosts = async () => {
    if (!profile?.id || !postsCursor || postsLoadingMore) return;
    setPostsLoadingMore(true);
    try {
      const page = await getUserPostsPage(profile.id, 20, postsCursor);
      setPosts((current) => {
        const byId = new Map(current.map((post) => [post.id, post]));
        page.posts.forEach((post) => byId.set(post.id, { ...post, isPinned: post.id === profile.pinnedPostId }));
        return Array.from(byId.values()).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)));
      });
      setPostsCursor(page.nextCursor);
      setPostsHasMore(page.hasMore);
    } finally {
      setPostsLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <SynauraBackground variant="warm">
        <View style={styles.center}><ActivityIndicator color={colors.violet} /></View>
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
          secondaryAction={profile.id === auth.user?.id || relationship === 'blocked' ? undefined : {
            label: relationship === 'friends' ? 'Message' : relationship === 'incoming' ? 'Répondre à la demande' : relationship === 'outgoing' ? 'Demande envoyée' : 'Ajouter',
            icon: relationship === 'friends' ? 'chatbubble-ellipses-outline' : relationship === 'incoming' ? 'person-add' : relationship === 'outgoing' ? 'time-outline' : 'person-add-outline',
            onPress: () => void openMessaging(),
          }}
          onShare={() => void share()}
          onPlaySpotlight={() => {
            if (!spotlightTrack) return;
            if (player.current?._id === spotlightTrack._id) void player.togglePlayPause();
            else void player.playTrack(spotlightTrack);
          }}
        />

        <SegmentedControl value={tab} compact options={(['sons', 'clips', 'posts', 'playlists', 'variations'] as Tab[]).map((item) => ({ value: item, label: TAB_LABELS[item] }))} onChange={setTab} />

        {tab === 'sons' ? (
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
        ) : null}

        {tab === 'sons' && (clipsLoading || Boolean(clipsError) || clips.length > 0) ? (
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Clips recents</Text>
              {clips.length ? <Pressable onPress={() => setTab('clips')}><Text style={styles.sectionLink}>Tout voir ({clips.length})</Text></Pressable> : null}
            </View>
            {clipsLoading ? (
              <ActivityIndicator color={colors.violet} style={{ marginVertical: 20 }} />
            ) : clipsError ? (
              <Pressable onPress={() => void loadClips(0, { creatorId: profile.id, creatorUsername: profile.username })} style={styles.retryButton}>
                <Ionicons name="refresh" size={17} color="#5B3FD6" />
                <Text style={styles.retryText}>Recharger les clips</Text>
              </Pressable>
            ) : (
              <ProfileClipGrid clips={clips} maxItems={responsive.isTablet ? 4 : 2} onOpen={(clip) => navigatePrimaryTab(navigation, 'Swipe', { mode: 'clips', clipId: clip.id })} />
            )}
          </View>
        ) : null}

        {tab === 'sons' ? <>
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
              <ActivityIndicator color={colors.violet} style={{ marginVertical: 20 }} />
            ) : clipsError ? (
              <Pressable onPress={() => void loadClips(0, { creatorId: profile.id, creatorUsername: profile.username })} style={styles.retryButton}>
                <Ionicons name="refresh" size={17} color="#5B3FD6" />
                <Text style={styles.retryText}>Recharger les clips</Text>
              </Pressable>
            ) : clips.length ? (
              <ProfileClipGrid clips={clips} onOpen={(clip) => navigatePrimaryTab(navigation, 'Swipe', { mode: 'clips', clipId: clip.id })} />
            ) : <Text style={styles.empty}>{profile.username === username ? "Tu n'as pas encore publié de clip." : 'Aucun clip publié.'}</Text>}
            {clipsHasMore ? (
              <Pressable disabled={clipsLoadingMore} onPress={() => void loadClips(clipsCursor, { creatorId: profile.id, creatorUsername: profile.username })} style={styles.retryButton}>
                {clipsLoadingMore ? <ActivityIndicator size="small" color="#5B3FD6" /> : <Ionicons name="chevron-down" size={17} color="#5B3FD6" />}
                <Text style={styles.retryText}>Charger plus de clips</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {tab === 'variations' ? (
          <View style={styles.card}>
            {variationsLoading ? (
              <ActivityIndicator color={colors.violet} style={{ marginVertical: 20 }} />
            ) : variations.length ? variations.map((v) => (
              <Pressable key={v.id} onPress={() => navigation.navigate('TrackDetail', { trackId: v.id })} style={styles.trackRow}>
                {v.coverUrl ? <SynauraImage source={{ uri: v.coverUrl }} lowPriority style={styles.trackCover} /> : <View style={styles.trackCover} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.trackTitle}>{v.title}</Text>
                  <Text style={styles.trackMeta}>IA · {compact(v.plays || 0)} écoutes</Text>
                </View>
                <Ionicons name="play" size={16} color={colors.text} />
              </Pressable>
            )) : <Text style={styles.empty}>Aucune variation publiée.</Text>}
          </View>
        ) : null}

        {tab === 'playlists' ? (
          <View style={styles.card}>
            {profile.playlists.length ? profile.playlists.map((playlist) => (
              <Pressable key={playlist.id} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })} style={styles.albumRow}>
                <View style={styles.albumCover}>{playlist.coverUrl ? <SynauraImage source={{ uri: playlist.coverUrl }} lowPriority style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={20} color={colors.textTertiary} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackTitle}>{playlist.title}</Text>
                  <Text style={styles.trackMeta}>{playlist.tracksCount} sons</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
            {postsHasMore ? (
              <Pressable disabled={postsLoadingMore} onPress={() => void loadMorePosts()} style={styles.retryButton}>
                {postsLoadingMore ? <ActivityIndicator size="small" color="#5B3FD6" /> : <Ionicons name="chevron-down" size={17} color="#5B3FD6" />}
                <Text style={styles.retryText}>Charger plus de publications</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <ProfileShareSheet visible={shareOpen} profile={profile} onClose={() => setShareOpen(false)} />
      <Modal transparent visible={requestModalOpen} animationType="fade" onRequestClose={() => setRequestModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRequestModalOpen(false)}>
          <Pressable style={styles.requestModal} onPress={() => {}}>
            <View style={styles.requestHead}>
              <View style={styles.requestIcon}><Ionicons name="person-add-outline" size={22} color={colors.violet} /></View>
              <View style={styles.requestHeadCopy}><Text numberOfLines={1} style={styles.requestTitle}>Ajouter {profile.name}</Text><Text style={styles.requestSubtitle}>Ajoute un mot pour donner envie de répondre.</Text></View>
            </View>
            <TextInput value={requestMessage} onChangeText={(value) => setRequestMessage(value.slice(0, 280))} multiline maxLength={280} placeholder="Message (optionnel)…" placeholderTextColor={colors.textTertiary} style={styles.requestInput} />
            <Text style={styles.requestCount}>{requestMessage.length}/280</Text>
            {requestError ? <Text style={styles.requestError}>{requestError}</Text> : null}
            <View style={styles.requestActions}><MotionPressable style={styles.requestSecondary} onPress={() => { setRequestModalOpen(false); setRequestError(''); }}><Text style={styles.requestSecondaryText}>Annuler</Text></MotionPressable><MotionPressable disabled={requestBusy} style={[styles.requestPrimary, requestBusy && { opacity: 0.5 }]} onPress={() => void submitMessageRequest()}>{requestBusy ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={styles.requestPrimaryText}>Envoyer</Text>}</MotionPressable></View>
          </Pressable>
        </Pressable>
      </Modal>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 130, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  badgePanel: { gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: 10, backgroundColor: colors.surface, padding: 13 },
  badgePanelTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  card: { gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, borderRadius: 10, backgroundColor: colors.surface, padding: 12 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 9 },
  trackCover: { width: 52, height: 52, borderRadius: 8 },
  trackTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 9 },
  post: { gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 11 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  postAvatarText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  postText: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  pinned: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, color: '#5B3FD6', backgroundColor: 'rgba(124,92,255,0.12)', fontSize: 8, fontWeight: '900' },
  postMeta: { color: colors.textTertiary, fontSize: 10, fontWeight: '800' },
  albumCover: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  empty: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 14 },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  identityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  identityPillCyan: { backgroundColor: 'rgba(0,194,203,0.10)', borderColor: 'rgba(0,194,203,0.25)' },
  identityPillCoral: { backgroundColor: 'rgba(255,111,97,0.10)', borderColor: 'rgba(255,111,97,0.25)' },
  identityPillText: { fontSize: 10, fontWeight: '900' },
  sectionHead: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  sectionLink: { color: '#5B3FD6', fontSize: 11, fontWeight: '900' },
  retryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: 'rgba(115,87,198,0.1)' },
  retryText: { color: '#5B3FD6', fontSize: 11, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.62)' },
  requestModal: { width: '100%', maxWidth: 520, marginBottom: 8, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, padding: 18, backgroundColor: colors.elevatedSurface },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  requestIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violetSoft },
  requestHeadCopy: { flex: 1, minWidth: 0 },
  requestTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  requestSubtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  requestInput: { minHeight: 104, maxHeight: 160, marginTop: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, backgroundColor: colors.surface, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlignVertical: 'top' },
  requestCount: { marginTop: 5, color: colors.textTertiary, textAlign: 'right', fontSize: 9, fontWeight: '700' },
  requestError: { marginTop: 7, color: colors.coral, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  requestActions: { marginTop: 14, flexDirection: 'row', gap: 8 },
  requestSecondary: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  requestSecondaryText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  requestPrimary: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  requestPrimaryText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
