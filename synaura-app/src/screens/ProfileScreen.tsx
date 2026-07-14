import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteTrack, getMusicClips, getMyProfile, getNotifications, getPendingApprovals, getSubscriptionUsage, getUserPosts, getUserVariations, pinPost, unpinPost, updateTrackMetadata, type MobileProfile, type MobileProfileTrack, type SubscriptionUsage } from '@/api/client';
import type { HomePost, MusicClip, PendingVariation, UserVariation } from '@/api/types';
import { DEFAULT_REMIX_PERMISSIONS } from '@/api/types';
import { PendingApprovalsModal } from '@/components/variations/PendingApprovalsModal';
import { useAuth } from '@/auth/AuthProvider';
import { TrackCover } from '@/components/TrackCover';
import { CreatorLevelCard } from '@/components/events/SynauraEvents';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackEditBottomSheet, type TrackEditForm } from '@/components/profile/TrackEditBottomSheet';
import { usePlayer } from '@/player/PlayerProvider';
import { useLibrary } from '@/library/LibraryProvider';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { MobileBadge } from '@/components/mobile/MobileBadge';
import { AppHeader } from '@/components/ui/AppHeader';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';
import { MotionPressable } from '@/components/motion/Motion';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ProfileIdentityHero, ProfileIdentityHeroSkeleton } from '@/components/profile/ProfileIdentityHero';
import { ProfileMusicCatalog } from '@/components/profile/ProfileMusicCatalog';
import { ProfileShareSheet } from '@/components/profile/ProfileShareSheet';
import { ProfileTrackActionsSheet } from '@/components/profile/ProfileTrackActionsSheet';
import { ShareSheet } from '@/components/swipe/ShareSheet';

type ProfileTab = 'sons' | 'clips' | 'variations' | 'playlists' | 'posts';

const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
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

export function ProfileScreen() {
  const auth = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const player = usePlayer();
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MobileProfileTrack | null>(null);
  const [managedTrack, setManagedTrack] = useState<MobileProfileTrack | null>(null);
  const [shareTrackTarget, setShareTrackTarget] = useState<MobileProfileTrack | null>(null);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [trackDeleting, setTrackDeleting] = useState(false);
  const [trackDeleteError, setTrackDeleteError] = useState<string | null>(null);
  const [trackForm, setTrackForm] = useState<TrackEditForm>({ title: '', description: '', genreText: '', tagsText: '', isPublic: true, remixPermissions: DEFAULT_REMIX_PERMISSIONS });
  const [trackSaving, setTrackSaving] = useState(false);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [profileTab, setProfileTab] = useState<ProfileTab>('sons');
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsError, setClipsError] = useState<string | null>(null);
  const [variations, setVariations] = useState<UserVariation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [pendingVariations, setPendingVariations] = useState<PendingVariation[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const library = useLibrary();

  const draftTracks = useMemo(() => (profile?.tracks || []).filter((t) => t.isPublic === false), [profile?.tracks]);
  // Mise en avant musicale : morceau epingle si deja marque comme tel, sinon le
  // plus ecoute, sinon le plus recent. Aucune nouvelle logique de pinning.
  const spotlightTrack = useMemo(() => {
    const pool = profile?.tracks || [];
    if (!pool.length) return null;
    const pinned = pool.find((track) => track._id === profile?.featuredTrackId || track.rawId === profile?.featuredTrackId || track.isFeatured);
    if (pinned) return pinned;
    const mostPlayed = [...pool].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];
    if (mostPlayed && (mostPlayed.plays || 0) > 0) return mostPlayed;
    return pool[0] || null;
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
  const lastPlayed = library.recent[0] || null;

  const loadProfile = useCallback(async () => {
    if (!auth.user?.username) return;
    setLoading(true);
    setError(null);
    try {
      const nextProfile = await getMyProfile(auth.user.username);
      setProfile(nextProfile);
      void getUserPosts(nextProfile.id)
        .then((nextPosts) => {
          setPosts(nextPosts.map((post) => ({ ...post, isPinned: post.id === nextProfile.pinnedPostId })).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))));
        })
        .catch(() => setPosts([]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil impossible à charger');
    } finally {
      setLoading(false);
    }
  }, [auth.user?.username]);

  const loadClips = useCallback(async () => {
    if (!auth.user?.username) return;
    setClipsLoading(true);
    setClipsError(null);
    try {
      const result = await getMusicClips({ creatorUsername: auth.user.username, limit: 40 });
      setClips(result.clips);
    } catch (clipError) {
      setClipsError(clipError instanceof Error ? clipError.message : 'Impossible de charger les clips.');
    } finally {
      setClipsLoading(false);
    }
  }, [auth.user?.username]);

  const refreshProfile = useCallback(() => {
    void loadProfile();
    void loadClips();
    void getSubscriptionUsage().then(setUsage).catch(() => {});
  }, [loadClips, loadProfile]);

  useFocusEffect(useCallback(() => {
    refreshProfile();
  }, [refreshProfile]));

  // Destination d'une notification ("Mes variations" / "Variations a valider") :
  // params transmis par openInternalLink, appliques une seule fois a l'arrivee.
  useEffect(() => {
    if (route.params?.tab) setProfileTab(route.params.tab);
    if (route.params?.openPendingVariations) setShowPendingModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getNotifications()
      .then((data) => { if (mounted) setUnreadNotifications(data.unread); })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  // Les variations restent chargees a la demande. Les Clips sont recuperes des
  // l'ouverture du profil afin d'apparaitre aussi dans son apercu principal.
  useEffect(() => {
    if (!profile?.id) return;
    if (profileTab === 'variations' && !variationsLoaded && !variationsLoading && profile.username) {
      setVariationsLoading(true);
      getUserVariations(profile.username)
        .then((next) => setVariations(next))
        .catch(() => setVariations([]))
        .finally(() => { setVariationsLoading(false); setVariationsLoaded(true); });
    }
  }, [profileTab, profile?.id, profile?.username, variationsLoaded, variationsLoading]);

  // Inbox "Variations a valider" : ecran du proprietaire uniquement (ProfileScreen
  // n'affiche jamais un autre profil), vide si rien n'est reellement en attente.
  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getPendingApprovals()
      .then((next) => { if (mounted) setPendingVariations(next); })
      .catch(() => { if (mounted) setPendingVariations([]); });
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const handleVariationDecided = (remixId: string) => {
    setPendingVariations((current) => current.filter((item) => item.remixId !== remixId));
    setVariationsLoaded(false);
  };

  const shareProfile = () => {
    if (profile) setShareProfileOpen(true);
  };

  const openTrackEdit = (track: MobileProfileTrack) => {
    setEditingTrack(track);
    setTrackForm({
      title: track.title,
      description: track.description || '',
      genreText: (track.genre || []).join(', '),
      tagsText: (track.tags || []).join(', '),
      isPublic: track.isPublic !== false,
      remixPermissions: {
        allowClips: Boolean(track.allowClips),
        allowAudioRemix: Boolean(track.allowAudioRemix),
        allowAiVariation: Boolean(track.allowAiVariation),
        remixApprovalRequired: Boolean(track.remixApprovalRequired),
        remixVisibility: track.remixVisibility || 'disabled',
      },
    });
  };

  const saveTrackEdit = async () => {
    if (!editingTrack) return;
    setTrackSaving(true);
    try {
      const updated = await updateTrackMetadata(editingTrack._id, {
        title: trackForm.title.trim(),
        description: trackForm.description.trim(),
        genre: trackForm.genreText.split(',').map((item) => item.trim()).filter(Boolean),
        tags: trackForm.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
        isPublic: trackForm.isPublic,
        remixPermissions: trackForm.remixPermissions,
      });
      if (updated) {
        setProfile((current) => current ? { ...current, tracks: current.tracks.map((track) => track._id === editingTrack._id ? { ...track, ...updated } : track) } : current);
      }
      setEditingTrack(null);
    } finally {
      setTrackSaving(false);
    }
  };

  const openTrackMenu = (track: MobileProfileTrack) => {
    setTrackDeleteError(null);
    setDeleteConfirmOpen(false);
    setManagedTrack(track);
  };

  const requestTrackDelete = (track: MobileProfileTrack) => {
    setEditingTrack(null);
    setTrackDeleteError(null);
    setManagedTrack(track);
    setDeleteConfirmOpen(true);
  };

  const deleteManagedTrack = async () => {
    if (!managedTrack || trackDeleting) return;
    const track = managedTrack;
    setTrackDeleting(true);
    setTrackDeleteError(null);
    try {
      await deleteTrack(track._id);
      setProfile((current) => current ? {
        ...current,
        tracks: current.tracks.filter((item) => item._id !== track._id),
        tracksCount: Math.max(0, current.tracksCount - 1),
      } : current);
      setManagedTrack(null);
      setDeleteConfirmOpen(false);
    } catch (deleteError) {
      setTrackDeleteError(deleteError instanceof Error ? deleteError.message : 'La suppression a échoué.');
    } finally {
      setTrackDeleting(false);
    }
  };

  const togglePinnedPost = async (postId: string) => {
    const isPinned = profile?.pinnedPostId === postId;
    setProfile((current) => current ? { ...current, pinnedPostId: isPinned ? null : postId } : current);
    setPosts((current) => current
      .map((post) => ({ ...post, isPinned: isPinned ? false : post.id === postId }))
      .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))));
    try {
      if (isPinned) await unpinPost();
      else await pinPost(postId);
    } catch {
      await loadProfile();
    }
  };

  if (!auth.user) {
    return (
      <SynauraBackground variant="warm">
        <ScrollView contentContainerStyle={[styles.content, responsive.pageContent, { paddingTop: insets.top + 28, paddingBottom: responsive.bottomDockClearance + 24 }]}>
          <View style={styles.loginHero}>
            <View style={styles.loginIcon}><Ionicons name="person-circle" size={38} color="#FFFAF2" /></View>
            <Text style={styles.loginTitle}>Ton espace Synaura</Text>
            <Text style={styles.loginText}>Connecte-toi pour publier, gérer tes sons, suivre tes stats et synchroniser ta bibliothèque.</Text>
            <View style={styles.guestHighlights}>
              <GuestHighlight icon="musical-notes-outline" text="Retrouve ton feed et tes sons" />
              <GuestHighlight icon="notifications-outline" text="Synchronise tes notifications" />
              <GuestHighlight icon="cloud-upload-outline" text="Publie depuis ton téléphone" />
            </View>
            <View style={styles.guestActions}>
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.primaryText}>Se connecter</Text>
              </Pressable>
              <Pressable style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerText}>Créer un compte</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SynauraBackground>
    );
  }

  return (
    <SynauraBackground variant="warm">
      <ScrollView
        contentContainerStyle={[styles.content, responsive.pageContent, { paddingTop: 0, paddingBottom: responsive.miniPlayerClearance }]}
        refreshControl={<RefreshControl refreshing={loading || clipsLoading} onRefresh={refreshProfile} />}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader flush title="Profil" subtitle="Ton univers sur Synaura" action={{ icon: 'settings-outline', label: 'Paramètres', onPress: () => navigation.navigate('Settings') }} />
        {profile ? (
          <ProfileIdentityHero
            profile={profile}
            spotlightTrack={spotlightTrack}
            own
            primaryAction={{ label: 'Modifier le profil', icon: 'create-outline', onPress: () => navigation.navigate('Settings') }}
            secondaryAction={{ label: 'Créer', icon: 'add', onPress: () => navigation.navigate('CreateHub') }}
            onShare={() => void shareProfile()}
            onPlaySpotlight={() => {
              if (!spotlightTrack) return;
              if (player.current?._id === spotlightTrack._id) void player.togglePlayPause();
              else void player.playTrack(spotlightTrack);
            }}
          />
        ) : <ProfileIdentityHeroSkeleton />}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SegmentedControl
          value={profileTab}
          compact
          options={(Object.keys(PROFILE_TAB_LABELS) as ProfileTab[]).map((item) => ({ value: item, label: PROFILE_TAB_LABELS[item] }))}
          onChange={setProfileTab}
        />

        {profileTab === 'sons' && (clipsLoading || Boolean(clipsError) || clips.length > 0) ? (
          <View style={styles.card}>
            <SectionTitle title="Clips recents" action={clips.length ? `${clips.length}` : undefined} />
            {clipsLoading ? <Empty text="Chargement des clips..." /> : clipsError ? (
              <Pressable onPress={() => void loadClips()} style={styles.emptyAction}>
                <Ionicons name="refresh" size={18} color="#7C5CFF" />
                <Text style={styles.emptyActionText}>Recharger les clips</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.clipsGrid}>
                  {clips.slice(0, responsive.isTablet ? 4 : 3).map((clip) => (
                    <Pressable key={`preview-${clip.id}`} onPress={() => navigation.navigate('Swipe', { mode: 'clips', clipId: clip.id })} style={[styles.clipTile, { width: responsive.isTablet ? '23.5%' : responsive.isNarrow ? '47.5%' : '31%' }]}>
                      {clip.posterUrl ? <Image source={{ uri: clip.posterUrl }} style={StyleSheet.absoluteFillObject} /> : null}
                      <View style={styles.clipTileOverlay}><Text numberOfLines={1} style={styles.clipTileTitle}>{clip.sourceTrack?.title || 'Clip'}</Text></View>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setProfileTab('clips')} style={styles.emptyAction}>
                  <Ionicons name="film-outline" size={18} color="#7C5CFF" />
                  <Text style={styles.emptyActionText}>Voir tous les clips</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        {profileTab === 'sons' ? <>
        <ProfileMusicCatalog
          tracks={profile?.tracks || []}
          currentTrackId={player.current?._id}
          isPlaying={player.isPlaying}
          defaultSort="recent"
          emptyText="Publie ton premier morceau pour commencer ta discographie."
          onPlay={(track) => {
            if (player.current?._id === track._id) void player.togglePlayPause();
            else void player.playTrack(track);
          }}
          onOpen={(track) => navigation.navigate('TrackDetail', { trackId: track._id, track })}
          onManage={openTrackMenu}
        />

        <CreatorLevelCard
          tracks={profile?.tracksCount || 0}
          plays={profile?.totalPlays || 0}
          likes={(profile?.tracks || []).reduce((sum, track) => sum + Number(track.likesCount || 0), 0)}
          onOpen={() => navigation.navigate('City')}
        />

        {profile?.badges.length ? (
          <View style={styles.badgesPanel}>
            <SectionTitle title="Badges à l’honneur" action={`${profile.badges.length}`} />
            {profile.badges.slice(0, 3).map((badge, index) => (
              <MobileBadge
                key={badge}
                label={badge}
                tier={index === 0 ? 'prism' : index === 1 ? 'gold' : 'silver'}
                description={index === 0 ? 'Badge principal visible sur ton univers.' : 'Débloqué grâce à ton activité Synaura.'}
              />
            ))}
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

        {lastPlayed ? (
          <Pressable onPress={() => player.playTrack(lastPlayed)} style={styles.resumeCard}>
            <TrackCover track={lastPlayed} style={styles.featuredCover} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.resumeKicker}>Continuer à écouter</Text>
              <Text numberOfLines={1} style={styles.resumeTitle}>{lastPlayed.title}</Text>
            </View>
            <Ionicons name="play" size={16} color="#171313" />
          </Pressable>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickGrid}>
          <QuickAction icon="musical-notes-outline" title="Mes créations" text={`${profile?.tracksCount || 0} son${(profile?.tracksCount || 0) !== 1 ? 's' : ''}`} onPress={() => setProfileTab('sons')} />
          <QuickAction icon="film-outline" title="Mes Clips" text="Vidéos publiées" onPress={() => setProfileTab('clips')} />
          <QuickAction icon="repeat-outline" title="Mes variations" text="Créations IA inspirées" onPress={() => setProfileTab('variations')} />
          {pendingVariations.length > 0 ? (
            <QuickAction
              icon="checkmark-done-outline"
              title="Variations à valider"
              text={`${pendingVariations.length} en attente`}
              onPress={() => setShowPendingModal(true)}
            />
          ) : null}
          <QuickAction
            icon="notifications-outline"
            title="Notifications"
            text={unreadNotifications > 0 ? `${unreadNotifications} non lue${unreadNotifications > 1 ? 's' : ''}` : 'À jour'}
            onPress={() => navigation.navigate('Notifications')}
          />
          <QuickAction icon="library-outline" title="Ma bibliothèque" text="Favoris, playlists, écoutes" onPress={() => navigation.navigate('Library')} />
          <QuickAction
            icon="options-outline"
            title="Mes goûts"
            text="Univers & intentions"
            onPress={() => navigation.getParent()?.navigate('Onboarding', { edit: true })}
          />
          {draftTracks.length > 0 ? (
            <QuickAction icon="document-text-outline" title="Mes brouillons" text={`${draftTracks.length} non publié${draftTracks.length !== 1 ? 's' : ''}`} onPress={() => setProfileTab('sons')} />
          ) : null}
        </ScrollView>

        {usage ? (
          <Pressable onPress={() => navigation.navigate('Subscriptions')} style={styles.card}>
            <SectionTitle title="Plan & quotas" action={usage.plan} />
            <UsageRow label="Tracks" used={usage.tracks.used} limit={usage.tracks.limit} percentage={usage.tracks.percentage} />
            <UsageRow label="Playlists" used={usage.playlists.used} limit={usage.playlists.limit} percentage={usage.playlists.percentage} />
            <View style={styles.planLink}><Text style={styles.planLinkText}>Comparer et gérer les plans</Text><Ionicons name="arrow-forward" size={16} color="#7C5CFF" /></View>
          </Pressable>
        ) : null}
        </> : null}

        {profileTab === 'clips' ? (
        <View style={styles.card}>
          <SectionTitle title="Clips" action={clips.length ? `${clips.length}` : undefined} />
          {clipsLoading ? <Empty text="Chargement…" /> : clipsError ? (
            <Pressable onPress={() => void loadClips()} style={styles.emptyAction}>
              <Ionicons name="refresh" size={18} color="#7C5CFF" />
              <Text style={styles.emptyActionText}>Recharger les clips</Text>
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
          ) : <Empty text="Tu n'as pas encore publié de clip." />}
        </View>
        ) : null}

        {profileTab === 'variations' ? (
        <View style={styles.card}>
          <SectionTitle title="Variations" action={variations.length ? `${variations.length}` : undefined} />
          {variationsLoading ? <Empty text="Chargement…" /> : variations.length ? variations.map((v) => (
            <Pressable key={v.id} onPress={() => navigation.navigate('TrackDetail', { trackId: v.id })} style={styles.trackRow}>
              {v.coverUrl ? <Image source={{ uri: v.coverUrl }} style={styles.trackCover} /> : <View style={styles.trackCover} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.trackTitle}>{v.title}</Text>
                <Text style={styles.trackMeta}>IA · {compact(v.plays || 0)} écoutes</Text>
                {v.status === 'pending_approval' ? <Text style={[styles.variationStatus, { color: '#8a6a2f' }]}>En attente de validation</Text> : null}
                {v.status === 'rejected' ? <Text style={[styles.variationStatus, { color: '#9b352e' }]}>Refusée</Text> : null}
                {v.status === 'published' ? <Text style={[styles.variationStatus, { color: '#1f6e48' }]}>Publiée</Text> : null}
              </View>
              <Ionicons name="play" size={16} color="#171313" />
            </Pressable>
          )) : <Empty text="Tu n'as pas encore publié de variation." />}
        </View>
        ) : null}

        {profileTab === 'posts' ? (
        <View style={styles.card}>
          <SectionTitle title="Publications" action={`${posts.length}`} />
          {posts.length ? posts.slice(0, 8).map((post) => (
            <Pressable key={post.id} onPress={() => navigation.navigate('PostDetail', { postId: post.id })} style={styles.postRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {post.isPinned ? <Text style={styles.postPinned}>Épinglé</Text> : null}
                <Text numberOfLines={2} style={styles.postText}>{post.text}</Text>
                <Text style={styles.postMeta}>{post.time} · {post.likesCount} j’aime · {post.commentsCount} commentaires</Text>
                {post.track ? (
                  <PostAttachedTrackCard
                    track={post.track}
                    compact
                    playing={player.current?._id === post.track._id && player.isPlaying}
                    onPlay={() => player.playTrack(post.track!)}
                    onOpen={() => navigation.navigate('TrackDetail', { trackId: post.track!._id, track: post.track })}
                  />
                ) : null}
              </View>
              <Pressable accessibilityLabel={post.isPinned ? 'Désépingler' : 'Épingler'} onPress={(event) => { event.stopPropagation(); void togglePinnedPost(post.id); }} style={styles.miniIcon}>
                <Ionicons name={post.isPinned ? 'pin' : 'pin-outline'} size={15} color={post.isPinned ? '#7C5CFF' : '#171313'} />
              </Pressable>
              <Ionicons name="chevron-forward" size={16} color="rgba(23,19,19,0.35)" />
            </Pressable>
          )) : <Pressable onPress={() => navigation.navigate('CreatePost')} style={styles.emptyAction}><Ionicons name="add-circle-outline" size={18} color="#7C5CFF" /><Text style={styles.emptyActionText}>Créer mon premier post</Text></Pressable>}
        </View>
        ) : null}

        {profileTab === 'playlists' ? (
        <View style={styles.card}>
          <SectionTitle title="Playlists" action={`${profile?.playlists.length || 0}`} />
          {profile?.playlists.length ? profile.playlists.slice(0, 4).map((playlist) => (
            <View key={playlist.id} style={styles.playlistRow}>
              <View style={styles.playlistCover}>{playlist.coverUrl ? <Image source={{ uri: playlist.coverUrl }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={20} color="rgba(23,19,19,0.42)" />}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.playlistTitle}>{playlist.title}</Text>
                <Text style={styles.playlistMeta}>{playlist.tracksCount} sons {playlist.isAlbum ? '· Album' : ''}</Text>
              </View>
            </View>
          )) : <Empty text="Aucune playlist pour le moment." />}
        </View>
        ) : null}

      </ScrollView>
      <TrackEditBottomSheet
        track={editingTrack}
        form={trackForm}
        saving={trackSaving}
        onChange={(patch) => setTrackForm((current) => ({ ...current, ...patch }))}
        onClose={() => setEditingTrack(null)}
        onSave={saveTrackEdit}
        onDelete={() => editingTrack && requestTrackDelete(editingTrack)}
      />
      <ProfileTrackActionsSheet
        track={managedTrack}
        playing={Boolean(managedTrack && player.current?._id === managedTrack._id && player.isPlaying)}
        confirmDelete={deleteConfirmOpen}
        deleting={trackDeleting}
        error={trackDeleteError}
        onClose={() => {
          setManagedTrack(null);
          setDeleteConfirmOpen(false);
          setTrackDeleteError(null);
        }}
        onPlay={(track) => {
          if (player.current?._id === track._id) void player.togglePlayPause();
          else void player.playTrack(track);
        }}
        onOpen={(track) => {
          setManagedTrack(null);
          navigation.navigate('TrackDetail', { trackId: track._id, track });
        }}
        onEdit={(track) => {
          setManagedTrack(null);
          requestAnimationFrame(() => openTrackEdit(track));
        }}
        onShare={(track) => {
          setManagedTrack(null);
          requestAnimationFrame(() => setShareTrackTarget(track));
        }}
        onRequestDelete={() => {
          setTrackDeleteError(null);
          setDeleteConfirmOpen(true);
        }}
        onCancelDelete={() => {
          setTrackDeleteError(null);
          setDeleteConfirmOpen(false);
        }}
        onConfirmDelete={() => void deleteManagedTrack()}
      />
      <ShareSheet visible={Boolean(shareTrackTarget)} track={shareTrackTarget} onClose={() => setShareTrackTarget(null)} />
      <ProfileShareSheet visible={shareProfileOpen} profile={profile} onClose={() => setShareProfileOpen(false)} />
      <PendingApprovalsModal
        visible={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        items={pendingVariations}
        onDecided={handleVariationDecided}
      />
    </SynauraBackground>
  );
}

function GuestHighlight({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.guestHighlight}>
      <Ionicons name={icon} size={17} color="#7C5CFF" />
      <Text style={styles.guestHighlightText}>{text}</Text>
    </View>
  );
}

function QuickAction({ icon, title, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={styles.quickAction} scaleTo={0.97}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={18} color="#7C5CFF" /></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickText}>{text}</Text>
    </MotionPressable>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function UsageRow({ label, used, limit, percentage }: { label: string; used: number; limit: number; percentage: number }) {
  const unlimited = limit < 0;
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageTop}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageMeta}>{used}/{unlimited ? '∞' : limit}</Text>
      </View>
      <View style={styles.usageTrack}><View style={[styles.usageFill, { width: `${unlimited ? 12 : Math.max(3, Math.min(100, percentage))}%` }]} /></View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 160, gap: 14 },
  loginHero: { borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.86)', padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  loginIcon: { width: 74, height: 74, borderRadius: 8, backgroundColor: '#171313', alignItems: 'center', justifyContent: 'center' },
  loginTitle: { marginTop: 16, color: '#171313', fontSize: 28, fontWeight: '900' },
  loginText: { marginTop: 8, color: 'rgba(23,19,19,0.56)', textAlign: 'center', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  guestHighlights: { alignSelf: 'stretch', marginTop: 18, gap: 8 },
  guestHighlight: { minHeight: 44, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(23,19,19,0.045)' },
  guestHighlightText: { flex: 1, color: 'rgba(23,19,19,0.58)', fontSize: 12, fontWeight: '800' },
  guestActions: { alignSelf: 'stretch', marginTop: 17, gap: 9 },
  primaryButton: { height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  registerButton: { height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#FFFFFF' },
  registerText: { color: '#7C5CFF', fontSize: 13, fontWeight: '900' },
  badgesPanel: { gap: 8, borderRadius: 8, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  featuredCover: { width: 60, height: 60, borderRadius: 8 },
  quickGrid: { gap: 8, paddingRight: 18 },
  quickAction: { width: 150, minHeight: 104, borderRadius: 8, padding: 12, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  quickIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,92,255,0.1)' },
  quickTitle: { marginTop: 10, color: '#171313', fontSize: 14, fontWeight: '900' },
  quickText: { marginTop: 3, color: 'rgba(23,19,19,0.48)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  card: { gap: 9, borderRadius: 8, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  planLink: { minHeight: 38, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, backgroundColor: 'rgba(124,92,255,0.08)' },
  planLinkText: { color: '#7C5CFF', fontSize: 10, fontWeight: '900' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#171313', fontSize: 17, fontWeight: '900' },
  sectionAction: { color: 'rgba(23,19,19,0.42)', fontSize: 11, fontWeight: '900' },
  usageRow: { gap: 6 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { color: '#171313', fontSize: 12, fontWeight: '900' },
  usageMeta: { color: 'rgba(23,19,19,0.45)', fontSize: 11, fontWeight: '800' },
  usageTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.08)', overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 999, backgroundColor: '#7C5CFF' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  trackCover: { width: 50, height: 50, borderRadius: 8 },
  trackTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  variationStatus: { marginTop: 2, fontSize: 10, fontWeight: '900' },
  miniIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
  playlistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  playlistCover: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  playlistTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  playlistMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  postRow: { minHeight: 68, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, backgroundColor: 'rgba(23,19,19,0.045)' },
  postText: { color: '#171313', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  postPinned: { marginBottom: 4, color: '#7C5CFF', fontSize: 8, fontWeight: '900' },
  postMeta: { marginTop: 5, color: 'rgba(23,19,19,0.42)', fontSize: 9, fontWeight: '800' },
  emptyAction: { minHeight: 50, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(124,92,255,0.08)' },
  emptyActionText: { color: '#5B3FD6', fontSize: 11, fontWeight: '900' },
  empty: { borderRadius: 8, padding: 14, backgroundColor: 'rgba(23,19,19,0.045)', color: 'rgba(23,19,19,0.48)', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  error: { overflow: 'hidden', borderRadius: 8, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', color: colors.danger, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  identityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  identityPillCyan: { backgroundColor: 'rgba(0,194,203,0.10)', borderColor: 'rgba(0,194,203,0.25)' },
  identityPillCoral: { backgroundColor: 'rgba(255,111,97,0.10)', borderColor: 'rgba(255,111,97,0.25)' },
  identityPillText: { fontSize: 10, fontWeight: '900' },
  resumeCard: { minHeight: 66, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  resumeKicker: { color: '#7357C6', fontSize: 9, fontWeight: '900' },
  resumeTitle: { marginTop: 3, color: '#171313', fontSize: 13, fontWeight: '900' },
  clipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clipTile: { width: '31%', aspectRatio: 9 / 16, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  clipTileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: 'rgba(23,19,19,0.55)' },
  clipTileTitle: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
});
