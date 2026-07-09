import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { MobileBadge } from '@/components/mobile/MobileBadge';
import { MobileSocialLinks } from '@/components/mobile/MobileSocialLinks';
import { AppHeader } from '@/components/ui/AppHeader';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';

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
  const player = usePlayer();
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MobileProfileTrack | null>(null);
  const [trackForm, setTrackForm] = useState<TrackEditForm>({ title: '', description: '', genreText: '', tagsText: '', isPublic: true, remixPermissions: DEFAULT_REMIX_PERMISSIONS });
  const [trackSaving, setTrackSaving] = useState(false);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [profileTab, setProfileTab] = useState<ProfileTab>('sons');
  const [clips, setClips] = useState<MusicClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsLoaded, setClipsLoaded] = useState(false);
  const [variations, setVariations] = useState<UserVariation[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [pendingVariations, setPendingVariations] = useState<PendingVariation[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const library = useLibrary();

  const topTracks = useMemo(() => [...(profile?.tracks || [])].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 4), [profile?.tracks]);
  const recentTracks = useMemo(() => (profile?.tracks || []).slice(0, 6), [profile?.tracks]);
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
      const [nextProfile, nextUsage] = await Promise.all([
        getMyProfile(auth.user.username),
        getSubscriptionUsage(),
      ]);
      setProfile(nextProfile);
      setUsage(nextUsage);
      const nextPosts = await getUserPosts(nextProfile.id);
      setPosts(nextPosts.map((post) => ({ ...post, isPinned: post.id === nextProfile.pinnedPostId })).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil impossible à charger');
    } finally {
      setLoading(false);
    }
  }, [auth.user?.username]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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

  // Chargement paresseux : Clips et Variations ne sont recuperes que lorsque
  // l'onglet correspondant est ouvert, pour eviter des appels systematiques.
  useEffect(() => {
    if (!profile?.id) return;
    if (profileTab === 'clips' && !clipsLoaded && !clipsLoading) {
      setClipsLoading(true);
      getMusicClips({ creatorId: profile.id, limit: 40 })
        .then((result) => setClips(result.clips))
        .catch(() => setClips([]))
        .finally(() => { setClipsLoading(false); setClipsLoaded(true); });
    }
    if (profileTab === 'variations' && !variationsLoaded && !variationsLoading && profile.username) {
      setVariationsLoading(true);
      getUserVariations(profile.username)
        .then((next) => setVariations(next))
        .catch(() => setVariations([]))
        .finally(() => { setVariationsLoading(false); setVariationsLoaded(true); });
    }
  }, [profileTab, profile?.id, profile?.username, clipsLoaded, clipsLoading, variationsLoaded, variationsLoading]);

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

  const shareProfile = async () => {
    if (!profile) return;
    await Share.share({
      title: `${profile.name} sur Synaura`,
      message: `Découvre ${profile.name} sur Synaura: https://xima-m-music-platform.vercel.app/profile/${profile.username}`,
    });
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

  const confirmDeleteTrack = (track: MobileProfileTrack) => {
    Alert.alert('Supprimer ce son ?', track.title, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteTrack(track._id);
          setProfile((current) => current ? { ...current, tracks: current.tracks.filter((item) => item._id !== track._id), tracksCount: Math.max(0, current.tracksCount - 1) } : current);
        },
      },
    ]);
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
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 28 }]}>
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
        contentContainerStyle={[styles.content, { paddingTop: 0 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} />}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader flush title="Profil" subtitle="Ton univers sur Synaura" action={{ icon: 'settings-outline', label: 'Paramètres', onPress: () => navigation.navigate('Settings') }} />
        <View style={styles.hero}>
          <View style={styles.banner}>
            {profile?.banner ? <Image source={{ uri: profile.banner }} style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#FFB4A8', '#BCA7FF', '#8DE7EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bannerFallback}><Ionicons name="musical-notes" size={34} color="rgba(255,249,239,0.72)" /></LinearGradient>}
          </View>
          <View style={styles.heroBody}>
            <View style={styles.avatarWrap}>
              {profile?.avatar ? <Image source={{ uri: profile.avatar }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(profile?.name || auth.user.name || 'S').slice(0, 1).toUpperCase()}</Text>}
            </View>
            <View style={styles.nameRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.name}>{profile?.name || auth.user.name || auth.user.username}</Text>
                <Text style={styles.handle}>@{profile?.username || auth.user.username}</Text>
              </View>
              {profile?.isVerified ? <Ionicons name="checkmark-circle" size={24} color="#7C5CFF" /> : null}
            </View>
            <Text numberOfLines={3} style={styles.bio}>{profile?.bio || 'Ajoute une bio, une bannière et tes genres pour donner une vraie identité à ton profil.'}</Text>
            <View style={styles.heroPills}>
              {profile?.isArtist ? <Pill label="Artiste" /> : <Pill label="Membre" />}
              {profile?.genre?.slice(0, 2).map((genre) => <Pill key={genre} label={genre} />)}
              {profile?.location ? <Pill label={profile.location} /> : null}
              {profile?.badges.slice(0, 3).map((badge) => <Text key={badge} style={styles.badge}>{badge}</Text>)}
            </View>
            {profile ? <View style={styles.socialRow}><MobileSocialLinks links={profile.socialLinks} /></View> : null}
            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate('Settings')} style={styles.actionPrimary}><Text style={styles.actionPrimaryText}>Modifier</Text></Pressable>
              <Pressable onPress={shareProfile} style={styles.actionGhost}><Ionicons name="share-outline" size={17} color="#171313" /></Pressable>
              <Pressable onPress={() => navigation.navigate('CreateHub')} style={styles.actionGhost}><Ionicons name="add" size={18} color="#171313" /></Pressable>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statsGrid}>
          <Stat label="Followers" value={compact(profile?.followerCount || 0)} />
          <Stat label="Following" value={compact(profile?.followingCount || 0)} />
          <Stat label="Sons" value={compact(profile?.tracksCount || 0)} />
          <Stat label="Plays" value={compact(profile?.totalPlays || 0)} />
        </View>

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

        {spotlightTrack ? (
          <View style={styles.featured}>
            <Pressable onPress={() => player.playTrack(spotlightTrack)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <TrackCover track={spotlightTrack} style={styles.featuredCover} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.featuredKicker}>À ÉCOUTER MAINTENANT</Text>
                <Text numberOfLines={1} style={styles.featuredTitle}>{spotlightTrack.title}</Text>
                <Text style={styles.featuredMeta}>{compact(spotlightTrack.plays || 0)} écoutes · {compact(spotlightTrack.likesCount || 0)} likes</Text>
              </View>
            </Pressable>
            <View style={styles.featuredPlay}><Ionicons name="play" size={17} color="#FFFAF2" /></View>
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
              <Text style={styles.resumeKicker}>CONTINUER À ÉCOUTER</Text>
              <Text numberOfLines={1} style={styles.resumeTitle}>{lastPlayed.title}</Text>
            </View>
            <Ionicons name="play" size={16} color="#171313" />
          </Pressable>
        ) : null}

        <View style={styles.quickGrid}>
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
        </View>

        {usage ? (
          <Pressable onPress={() => navigation.navigate('Subscriptions')} style={styles.card}>
            <SectionTitle title="Plan & quotas" action={usage.plan} />
            <UsageRow label="Tracks" used={usage.tracks.used} limit={usage.tracks.limit} percentage={usage.tracks.percentage} />
            <UsageRow label="Playlists" used={usage.playlists.used} limit={usage.playlists.limit} percentage={usage.playlists.percentage} />
            <View style={styles.planLink}><Text style={styles.planLinkText}>Comparer et gérer les plans</Text><Ionicons name="arrow-forward" size={16} color="#7C5CFF" /></View>
          </Pressable>
        ) : null}

        <View style={styles.profileTabs}>
          {(['sons', 'clips', 'variations', 'playlists', 'posts'] as ProfileTab[]).map((item) => (
            <Pressable key={item} onPress={() => setProfileTab(item)} style={[styles.profileTab, profileTab === item && styles.profileTabActive]}>
              <Text style={[styles.profileTabText, profileTab === item && styles.profileTabTextActive]}>{PROFILE_TAB_LABELS[item]}</Text>
            </Pressable>
          ))}
        </View>

        {profileTab === 'sons' ? <>
        <TrackSection title="Top tracks" tracks={topTracks} onPlay={(track) => player.playTrack(track)} onEdit={openTrackEdit} onDelete={confirmDeleteTrack} />
        <TrackSection title="Derniers sons" tracks={recentTracks} onPlay={(track) => player.playTrack(track)} onEdit={openTrackEdit} onDelete={confirmDeleteTrack} />
        </> : null}

        {profileTab === 'clips' ? (
        <View style={styles.card}>
          <SectionTitle title="Clips" action={clips.length ? `${clips.length}` : undefined} />
          {clipsLoading ? <Empty text="Chargement…" /> : clips.length ? (
            <View style={styles.clipsGrid}>
              {clips.map((clip) => (
                <Pressable key={clip.id} onPress={() => navigation.navigate('Swipe', { mode: 'clips', sourceTrackId: clip.sourceTrackId })} style={styles.clipTile}>
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
                {post.isPinned ? <Text style={styles.postPinned}>ÉPINGLÉ</Text> : null}
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
        onDelete={() => editingTrack && confirmDeleteTrack(editingTrack)}
      />
      <PendingApprovalsModal
        visible={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        items={pendingVariations}
        onDecided={handleVariationDecided}
      />
    </SynauraBackground>
  );
}

function Pill({ label }: { label: string }) {
  return <Text style={styles.pill}>{label}</Text>;
}

function GuestHighlight({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.guestHighlight}>
      <Ionicons name={icon} size={17} color="#7C5CFF" />
      <Text style={styles.guestHighlightText}>{text}</Text>
    </View>
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

function QuickAction({ icon, title, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={18} color="#7C5CFF" /></View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickText}>{text}</Text>
    </Pressable>
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

function TrackSection({ title, tracks, onPlay, onEdit, onDelete }: { title: string; tracks: MobileProfileTrack[]; onPlay: (track: MobileProfileTrack) => void; onEdit: (track: MobileProfileTrack) => void; onDelete: (track: MobileProfileTrack) => void }) {
  return (
    <View style={styles.card}>
      <SectionTitle title={title} action={tracks.length ? `${tracks.length}` : undefined} />
      {tracks.length ? tracks.map((track) => (
        <Pressable key={track._id} onPress={() => onPlay(track)} style={styles.trackRow}>
          <TrackCover track={track} style={styles.trackCover} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
            <Text style={styles.trackMeta}>{compact(track.plays || 0)} plays · {compact(track.likesCount || 0)} likes</Text>
          </View>
          <Ionicons name="play" size={16} color="#171313" />
          <Pressable onPress={() => onEdit(track)} style={styles.miniIcon}><Ionicons name="create-outline" size={15} color="#171313" /></Pressable>
          <Pressable onPress={() => onDelete(track)} style={styles.miniIcon}><Ionicons name="trash-outline" size={15} color="#B91C1C" /></Pressable>
        </Pressable>
      )) : <Empty text="Aucun son à afficher." />}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 145, gap: 11 },
  loginHero: { borderRadius: 30, backgroundColor: 'rgba(255,250,242,0.9)', padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  loginIcon: { width: 74, height: 74, borderRadius: 26, backgroundColor: '#171313', alignItems: 'center', justifyContent: 'center' },
  loginTitle: { marginTop: 16, color: '#171313', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  loginText: { marginTop: 8, color: 'rgba(23,19,19,0.56)', textAlign: 'center', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  inputMulti: { minHeight: 92, paddingTop: 12, paddingBottom: 12 },
  guestHighlights: { alignSelf: 'stretch', marginTop: 18, gap: 8 },
  guestHighlight: { minHeight: 44, borderRadius: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(23,19,19,0.045)' },
  guestHighlightText: { flex: 1, color: 'rgba(23,19,19,0.58)', fontSize: 12, fontWeight: '800' },
  guestActions: { alignSelf: 'stretch', marginTop: 17, gap: 9 },
  primaryButton: { height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  registerButton: { height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCCFBB', backgroundColor: '#FFFFFF' },
  registerText: { color: '#7C5CFF', fontSize: 13, fontWeight: '900' },
  hero: { overflow: 'hidden', borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  banner: { height: 118, backgroundColor: colors.black },
  bannerFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroBody: { padding: 13, marginTop: -43 },
  avatarWrap: { width: 86, height: 86, borderRadius: 24, borderWidth: 3, borderColor: colors.surface, backgroundColor: '#E8DCCA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#171313', fontSize: 34, fontWeight: '900' },
  nameRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  handle: { marginTop: 2, color: 'rgba(23,19,19,0.48)', fontSize: 12, fontWeight: '800' },
  bio: { marginTop: 10, color: 'rgba(23,19,19,0.62)', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  heroPills: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(23,19,19,0.07)', color: '#171313', fontSize: 10, fontWeight: '900' },
  badge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(124,92,255,0.13)', color: '#5B3FD6', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  socialRow: { marginTop: 11, flexDirection: 'row', gap: 7 },
  badgesPanel: { gap: 8, borderRadius: 14, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actions: { marginTop: 15, flexDirection: 'row', gap: 8 },
  actionPrimary: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  actionPrimaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  actionGhost: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEECE8' },
  statsGrid: { flexDirection: 'row', gap: 2 },
  featured: { minHeight: 74, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, backgroundColor: colors.black },
  featuredCover: { width: 60, height: 60, borderRadius: 17 },
  featuredKicker: { color: '#C7B8FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  featuredTitle: { marginTop: 4, color: '#FFFAF2', fontSize: 15, fontWeight: '900' },
  featuredMeta: { marginTop: 3, color: 'rgba(255,250,242,0.42)', fontSize: 10, fontWeight: '800' },
  featuredPlay: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.12)' },
  profileTabs: { flexDirection: 'row', gap: 7 },
  profileTab: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  profileTabActive: { backgroundColor: '#171313', borderColor: '#171313' },
  profileTabText: { color: 'rgba(23,19,19,0.52)', fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  profileTabTextActive: { color: '#FFFAF2' },
  stat: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  statLabel: { marginTop: 3, color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAction: { width: '48%', minHeight: 116, borderRadius: 22, padding: 13, backgroundColor: 'rgba(255,250,242,0.86)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  quickIcon: { width: 36, height: 36, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,92,255,0.1)' },
  quickTitle: { marginTop: 10, color: '#171313', fontSize: 14, fontWeight: '900' },
  quickText: { marginTop: 3, color: 'rgba(23,19,19,0.48)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  card: { gap: 9, borderRadius: 14, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  planLink: { minHeight: 38, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, backgroundColor: 'rgba(124,92,255,0.08)' },
  planLinkText: { color: '#7C5CFF', fontSize: 10, fontWeight: '900' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#171313', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  sectionAction: { color: 'rgba(23,19,19,0.42)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  usageRow: { gap: 6 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { color: '#171313', fontSize: 12, fontWeight: '900' },
  usageMeta: { color: 'rgba(23,19,19,0.45)', fontSize: 11, fontWeight: '800' },
  usageTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.08)', overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 999, backgroundColor: '#7C5CFF' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  trackCover: { width: 50, height: 50, borderRadius: 15 },
  trackTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  trackMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  variationStatus: { marginTop: 2, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  miniIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.055)' },
  visibilityToggle: { height: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(23,19,19,0.055)' },
  visibilityText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  editActions: { flexDirection: 'row', gap: 8 },
  secondaryEdit: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  secondaryEditText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  saveEdit: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  saveEditText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  playlistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', padding: 9 },
  playlistCover: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.07)' },
  playlistTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  playlistMeta: { marginTop: 3, color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '800' },
  postRow: { minHeight: 68, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, backgroundColor: 'rgba(23,19,19,0.045)' },
  postText: { color: '#171313', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  postPinned: { marginBottom: 4, color: '#7C5CFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  postMeta: { marginTop: 5, color: 'rgba(23,19,19,0.42)', fontSize: 9, fontWeight: '800' },
  emptyAction: { minHeight: 50, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(124,92,255,0.08)' },
  emptyActionText: { color: '#5B3FD6', fontSize: 11, fontWeight: '900' },
  empty: { borderRadius: 18, padding: 14, backgroundColor: 'rgba(23,19,19,0.045)', color: 'rgba(23,19,19,0.48)', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  error: { overflow: 'hidden', borderRadius: 16, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', color: colors.danger, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  identityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  identityPillCyan: { backgroundColor: 'rgba(0,194,203,0.10)', borderColor: 'rgba(0,194,203,0.25)' },
  identityPillCoral: { backgroundColor: 'rgba(255,111,97,0.10)', borderColor: 'rgba(255,111,97,0.25)' },
  identityPillText: { fontSize: 10, fontWeight: '900' },
  resumeCard: { minHeight: 66, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  resumeKicker: { color: '#7357C6', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  resumeTitle: { marginTop: 3, color: '#171313', fontSize: 13, fontWeight: '900' },
  clipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clipTile: { width: '31%', aspectRatio: 9 / 16, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  clipTileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: 'rgba(23,19,19,0.55)' },
  clipTileTitle: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
});
