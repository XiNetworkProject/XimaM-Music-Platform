import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  createCommunityPost,
  createCommunityReply,
  getCommunityPosts,
  getCommunityReplies,
  getMusicChallenges,
  likeCommunityPost,
} from '@/api/client';
import type { CommunityPost, CommunityReply, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { TrackCover } from '@/components/TrackCover';
import { SynauraBackground } from '@/components/SynauraBackground';
import { AppHeader } from '@/components/ui/AppHeader';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { getClubBySlug } from '@/community/clubs';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

function relativeDate(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

// Repli pour les défis créés avant l'ajout du champ clubSlug en admin : un club
// "remix" affiche alors les défis Clip, "ai" les défis Variation IA. Utilisé
// uniquement quand le défi n'a pas de clubSlug explicite.
const LEGACY_CLUB_CHALLENGE_CONTENT_TYPE: Record<string, string> = { remix: 'clip', ai: 'variation' };

function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

export function ClubDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const auth = useAuth();
  const player = usePlayer();
  const library = useLibrary();
  const club = getClubBySlug(route.params?.slug);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTrack, setComposerTrack] = useState<Track | null>(null);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [clubChallenge, setClubChallenge] = useState<{ id: string; title: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const postsAnchorY = useRef(0);

  useEffect(() => {
    if (!club) {
      setClubChallenge(null);
      return;
    }
    let mounted = true;
    const legacyContentType = LEGACY_CLUB_CHALLENGE_CONTENT_TYPE[club.slug] || null;
    getMusicChallenges('active')
      .then((challenges) => {
        if (!mounted) return;
        // Le clubSlug choisi en admin est la source de vérité ; le contentType ne
        // sert de repli que pour les défis antérieurs à ce champ (clubSlug absent).
        const match =
          challenges.find((challenge) => challenge.clubSlug === club.slug) ||
          (legacyContentType ? challenges.find((challenge) => !challenge.clubSlug && challenge.contentType === legacyContentType) : null);
        setClubChallenge(match ? { id: match.id, title: match.title } : null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [club]);

  // Entrées venues d'ailleurs (ShareSheet, CreateHub) : ouvre directement le composer,
  // avec un son préselectionné si fourni.
  useEffect(() => {
    if (!route.params?.compose) return;
    if (!auth.requireAuth()) {
      navigation.getParent()?.navigate('Login', { message: 'Connecte-toi pour participer aux Clubs.' });
    } else {
      setComposerTrack(route.params.track || null);
      setComposerOpen(true);
    }
    navigation.setParams({ compose: undefined, track: undefined });
  }, [auth, navigation, route.params]);

  const load = useCallback(async (refresh = false) => {
    if (!club) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getCommunityPosts(club.category, 1, 30);
      setPosts(data.posts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [club]);

  useEffect(() => {
    void load();
  }, [load]);

  const updatePost = useCallback((postId: string, change: (post: CommunityPost) => CommunityPost) => {
    setPosts((current) => current.map((post) => post.id === postId ? change(post) : post));
    setActivePost((current) => current?.id === postId ? change(current) : current);
  }, []);

  const requireLogin = useCallback((message: string) => {
    navigation.getParent()?.navigate('Login', { message });
  }, [navigation]);

  const openComposer = useCallback(() => {
    if (!auth.requireAuth()) {
      requireLogin('Connecte-toi pour participer aux Clubs.');
      return;
    }
    setComposerOpen(true);
  }, [auth, requireLogin]);

  const scrollToPosts = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, postsAnchorY.current - 12), animated: true });
  }, []);

  const toggleLike = useCallback(async (post: CommunityPost) => {
    if (!auth.requireAuth()) {
      requireLogin('Connecte-toi pour aimer cette discussion.');
      return;
    }
    const willLike = !post.isLiked;
    updatePost(post.id, (item) => ({ ...item, isLiked: willLike, likesCount: Math.max(0, item.likesCount + (willLike ? 1 : -1)) }));
    Haptics.selectionAsync().catch(() => {});
    try {
      await likeCommunityPost(post.id, willLike);
    } catch {
      updatePost(post.id, (item) => ({ ...item, isLiked: !willLike, likesCount: Math.max(0, item.likesCount + (willLike ? -1 : 1)) }));
    }
  }, [auth, requireLogin, updatePost]);

  const postCreated = useCallback((post: CommunityPost) => {
    setPosts((current) => [post, ...current]);
  }, []);

  if (!club) {
    return (
      <SynauraBackground>
        <AppHeader title="Club" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Ce Club est introuvable.</Text>
        </View>
      </SynauraBackground>
    );
  }

  return (
    <SynauraBackground>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 140, responsive.miniPlayerClearance) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={club.accent} />}
      >
        <AppHeader title="Clubs" onBack={() => navigation.goBack()} />

        <View style={[styles.banner, { backgroundColor: club.accent }]}>
          <View style={styles.bannerIcon}><Ionicons name={club.icon as any} size={22} color="#FFFAF2" /></View>
          <Text style={styles.bannerTitle}>{club.name}</Text>
          <Text style={styles.bannerPromise}>{club.promise}</Text>
          <View style={styles.bannerActions}>
            {club.actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.kind === 'compose' ? openComposer : scrollToPosts}
                style={action.kind === 'compose' ? styles.bannerActionPrimary : styles.bannerActionSecondary}
              >
                <Text style={action.kind === 'compose' ? styles.bannerActionPrimaryText : styles.bannerActionSecondaryText}>{action.label}</Text>
                {action.kind === 'view-posts' ? <Ionicons name="arrow-forward" size={13} color="#FFFAF2" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        {clubChallenge ? (
          <Pressable
            onPress={() => navigation.navigate('ChallengeDetail', { challengeId: clubChallenge.id })}
            style={[styles.challengeBanner, { borderColor: `${club.accent}33` }]}
          >
            <View style={[styles.challengeIcon, { backgroundColor: club.accent }]}>
              <Ionicons name="trophy" size={18} color="#FFFAF2" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.challengeKicker}>DÉFI EN COURS</Text>
              <Text numberOfLines={1} style={styles.challengeTitle}>{clubChallenge.title}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        ) : null}

        <View onLayout={(event) => { postsAnchorY.current = event.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Discussions du Club</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}><ActivityIndicator color={club.accent} /></View>
        ) : posts.length ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              accent={club.accent}
              playing={player.current?._id === post.track?._id && player.isPlaying}
              onPlay={() => post.track && void player.playTrack(post.track)}
              onLike={() => void toggleLike(post)}
              onOpen={() => setActivePost(post)}
              onProfile={() => post.author.username && navigation.navigate('PublicProfile', { username: post.author.username })}
            />
          ))
        ) : (
          <View style={styles.emptyPosts}>
            <Ionicons name="chatbubbles-outline" size={26} color={club.accent} />
            <Text style={styles.emptyPostsText}>Aucune discussion dans ce Club pour le moment.</Text>
            <Pressable onPress={openComposer} style={[styles.emptyPostsButton, { backgroundColor: club.accent }]}>
              <Text style={styles.emptyPostsButtonText}>{club.actions[0].label}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ComposerModal
        visible={composerOpen}
        club={club}
        initialTrack={composerTrack}
        tracks={[...library.recent, ...library.favorites].filter((track, index, all) => all.findIndex((item) => item._id === track._id) === index)}
        onClose={() => {
          setComposerOpen(false);
          setComposerTrack(null);
        }}
        onCreated={postCreated}
      />
      <DiscussionModal
        post={activePost}
        accent={club.accent}
        onClose={() => setActivePost(null)}
        onPlay={(track) => void player.playTrack(track)}
        onReply={() => activePost && updatePost(activePost.id, (item) => ({ ...item, repliesCount: item.repliesCount + 1 }))}
      />
    </SynauraBackground>
  );
}

function PostCard({ post, accent, playing, onPlay, onLike, onOpen, onProfile }: {
  post: CommunityPost;
  accent: string;
  playing: boolean;
  onPlay: () => void;
  onLike: () => void;
  onOpen: () => void;
  onProfile: () => void;
}) {
  const hasTrack = Boolean(post.track);
  return (
    <View style={[styles.postCard, !hasTrack && styles.postCardMuted]}>
      {hasTrack ? (
        <Pressable onPress={onPlay} style={styles.trackCard}>
          <TrackCover track={post.track!} active={false} style={styles.trackCover} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.trackTitle}>{post.track!.title}</Text>
            <Text numberOfLines={1} style={styles.trackArtist}>{post.track!.artist?.name || post.track!.artist?.username || 'Synaura'}</Text>
          </View>
          <View style={[styles.trackPlay, playing && { backgroundColor: accent }]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={17} color={playing ? '#FFFAF2' : '#171313'} />
          </View>
        </Pressable>
      ) : null}
      <Pressable onPress={onProfile} style={styles.authorRow}>
        <Avatar name={post.author.name} uri={post.author.avatar} size={hasTrack ? 34 : 28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.authorMeta}>@{post.author.username || 'membre'} · {relativeDate(post.createdAt)}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onOpen}>
        <Text style={hasTrack ? styles.postTitle : styles.postTitleMuted}>{post.title}</Text>
        <Text numberOfLines={hasTrack ? 3 : 2} style={hasTrack ? styles.postContent : styles.postContentMuted}>{post.content}</Text>
      </Pressable>
      <View style={styles.postActions}>
        <Pressable onPress={onLike} style={[styles.postAction, post.isLiked && styles.postActionLiked]}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={16} color={accent} />
          <Text style={styles.postActionText}>{post.likesCount}</Text>
        </Pressable>
        <Pressable onPress={onOpen} style={styles.postAction}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
          <Text style={styles.postActionText}>{post.repliesCount} réponses</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ComposerModal({ visible, club, initialTrack, tracks, onClose, onCreated }: {
  visible: boolean;
  club: NonNullable<ReturnType<typeof getClubBySlug>>;
  initialTrack?: Track | null;
  tracks: Track[];
  onClose: () => void;
  onCreated: (post: CommunityPost) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [track, setTrack] = useState<Track | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setContent('');
    setTrack(initialTrack || null);
    setError('');
  }, [initialTrack, visible]);

  const submit = async () => {
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const post = await createCommunityPost({ title: title.trim(), content: content.trim(), category: club.category, trackId: track?._id });
      if (!post) throw new Error('Discussion non créée.');
      onCreated(post);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (submitError: any) {
      setError(submitError?.message || 'Publication impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalKicker}>{club.name}</Text>
              <Text style={styles.modalTitle}>{club.question}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.circleButton}><Ionicons name="close" size={23} color="#171313" /></Pressable>
          </View>
          <Text style={styles.fieldLabel}>TITRE</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="De quoi veux-tu parler ?" placeholderTextColor="rgba(23,19,19,0.35)" style={styles.input} />
          <Text style={styles.fieldLabel}>MESSAGE</Text>
          <TextInput value={content} onChangeText={setContent} multiline placeholder="Donne du contexte, explique ce que tu recherches..." placeholderTextColor="rgba(23,19,19,0.35)" style={[styles.input, styles.textarea]} />
          {tracks.length ? (
            <>
              <Text style={styles.fieldLabel}>SON ATTACHÉ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackPickerRow}>
                <Pressable onPress={() => setTrack(null)} style={[styles.trackPickerNone, !track && { borderColor: club.accent, borderWidth: 2 }]}><Ionicons name="close" size={18} color="#171313" /><Text style={styles.trackPickerText}>Aucun</Text></Pressable>
                {tracks.slice(0, 12).map((item) => (
                  <Pressable key={item._id} onPress={() => setTrack(item)} style={[styles.trackPicker, track?._id === item._id && { borderColor: club.accent, borderWidth: 2 }]}>
                    <TrackCover track={item} active={false} style={styles.trackPickerCover} />
                    <Text numberOfLines={1} style={styles.trackPickerText}>{item.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable disabled={!title.trim() || !content.trim() || busy} onPress={() => void submit()} style={[styles.submitButton, { backgroundColor: club.accent }, (!title.trim() || !content.trim() || busy) && styles.disabled]}>
            {busy ? <ActivityIndicator color="#FFFAF2" /> : <Ionicons name="send" size={18} color="#FFFAF2" />}
            <Text style={styles.submitButtonText}>{busy ? 'Publication...' : 'Publier la discussion'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DiscussionModal({ post, accent, onClose, onPlay, onReply }: { post: CommunityPost | null; accent: string; onClose: () => void; onPlay: (track: Track) => void; onReply: () => void }) {
  const insets = useSafeAreaInsets();
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!post) return;
    setLoading(true);
    getCommunityReplies(post.id).then(setReplies).catch(() => setReplies([])).finally(() => setLoading(false));
  }, [post]);

  const submit = async () => {
    if (!post || !content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const reply = await createCommunityReply(post.id, content.trim());
      setReplies((current) => [...current, reply]);
      setContent('');
      onReply();
    } catch (submitError: any) {
      setError(submitError?.message || 'Réponse impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!post} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.discussionBody, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{post?.title || 'Discussion'}</Text>
              <Text style={styles.modalSubtitle}>{post ? `${post.repliesCount} réponses` : ''}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.circleButton}><Ionicons name="close" size={23} color="#171313" /></Pressable>
          </View>
          {post ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.repliesContent} keyboardShouldPersistTaps="handled">
              <View style={styles.originalPost}>
                <Text style={styles.originalContent}>{post.content}</Text>
                {post.track ? (
                  <Pressable onPress={() => onPlay(post.track!)} style={styles.inlineTrack}>
                    <TrackCover track={post.track} active={false} style={styles.inlineTrackCover} />
                    <Text numberOfLines={1} style={styles.inlineTrackText}>{post.track.title}</Text>
                    <Ionicons name="play" size={16} color="#F7F6F3" />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.fieldLabel}>RÉPONSES</Text>
              {loading ? <ActivityIndicator color={accent} /> : replies.map((reply) => (
                <View key={reply.id} style={styles.reply}>
                  <Avatar name={reply.author.name} uri={reply.author.avatar} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.replyAuthor}>{reply.author.name}</Text>
                    <Text style={styles.replyContent}>{reply.content}</Text>
                    <Text style={styles.replyDate}>{relativeDate(reply.createdAt)}</Text>
                  </View>
                </View>
              ))}
              {!loading && !replies.length ? <Text style={styles.emptyText}>Sois la première personne à répondre.</Text> : null}
            </ScrollView>
          ) : null}
          <View style={[styles.replyComposer, { paddingBottom: Math.max(12, insets.bottom) }]}>
            <View style={{ flex: 1 }}>
              {error ? <Text style={styles.replyError}>{error}</Text> : null}
              <TextInput value={content} onChangeText={setContent} placeholder="Ajouter une réponse..." placeholderTextColor={colors.textTertiary} multiline style={styles.replyInput} />
            </View>
            <Pressable disabled={!content.trim() || busy} onPress={() => void submit()} style={[styles.replySend, { backgroundColor: accent }, (!content.trim() || busy) && styles.disabled]}>
              <Ionicons name="send" size={18} color="#FFFAF2" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 10 },
  emptyState: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  banner: { borderRadius: 16, padding: 18, marginTop: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.2)' },
  bannerTitle: { marginTop: 12, color: '#FFFAF2', fontSize: 24, fontWeight: '900' },
  bannerPromise: { marginTop: 4, color: 'rgba(255,250,242,0.78)', fontSize: 13, lineHeight: 19, fontWeight: '700', maxWidth: '92%' },
  bannerActions: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bannerActionPrimary: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#FFFAF2' },
  bannerActionPrimaryText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  bannerActionSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: 'rgba(255,250,242,0.16)' },
  bannerActionSecondaryText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  challengeBanner: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3 },
  challengeIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  challengeKicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  challengeTitle: { marginTop: 2, color: colors.text, fontSize: 13, fontWeight: '900' },
  sectionTitle: { marginTop: 18, marginBottom: 4, color: colors.text, fontSize: 19, fontWeight: '900' },
  loadingState: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  postCard: { position: 'relative', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 2, gap: 10 },
  postCardMuted: { backgroundColor: colors.surfaceMuted, borderStyle: 'dashed', opacity: 0.85 },
  trackCard: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 10, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border },
  trackCover: { width: 48, height: 48, borderRadius: 4 },
  trackTitle: { color: '#F7F6F3', fontSize: 13, fontWeight: '900' },
  trackArtist: { color: 'rgba(247,246,243,0.52)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  trackPlay: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFAF2' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { overflow: 'hidden', backgroundColor: '#171313', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  authorName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  authorMeta: { color: colors.textTertiary, fontSize: 10, fontWeight: '700', marginTop: 1 },
  postTitle: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  postTitleMuted: { color: colors.textSecondary, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  postContent: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  postContentMuted: { color: colors.textTertiary, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 3 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceMuted },
  postActionLiked: { backgroundColor: 'rgba(217,109,99,0.12)' },
  postActionText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  emptyPosts: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surface, padding: 20 },
  emptyPostsText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  emptyPostsButton: { marginTop: 4, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  emptyPostsButtonText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalContent: { alignSelf: 'center', width: '100%', maxWidth: 680, paddingHorizontal: 16, gap: 13 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalKicker: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  modalTitle: { color: colors.text, fontSize: 24, lineHeight: 28, fontWeight: '900', marginTop: 3 },
  modalSubtitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 3 },
  circleButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 5 },
  input: { minHeight: 52, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14, fontWeight: '700' },
  textarea: { minHeight: 150, textAlignVertical: 'top' },
  trackPickerRow: { gap: 8, paddingRight: 20 },
  trackPicker: { width: 100, padding: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, gap: 6 },
  trackPickerNone: { width: 72, minHeight: 99, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', gap: 8 },
  trackPickerCover: { width: '100%', aspectRatio: 1, borderRadius: 4 },
  trackPickerText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 4, paddingVertical: 15, marginTop: 8 },
  submitButtonText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.35 },
  errorText: { color: '#D92D20', fontSize: 11, fontWeight: '800' },
  discussionBody: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 680, paddingHorizontal: 16 },
  repliesContent: { paddingBottom: 20, gap: 12 },
  originalPost: { padding: 15, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  originalContent: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '650' as any },
  inlineTrack: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 4, backgroundColor: '#111111' },
  inlineTrackCover: { width: 40, height: 40, borderRadius: 4 },
  inlineTrackText: { flex: 1, color: '#F7F6F3', fontSize: 12, fontWeight: '900' },
  reply: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  replyAuthor: { color: colors.text, fontSize: 12, fontWeight: '900' },
  replyContent: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  replyDate: { color: colors.textTertiary, fontSize: 9, fontWeight: '800', marginTop: 6 },
  replyComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  replyError: { color: '#D92D20', fontSize: 9, fontWeight: '800', marginBottom: 5, marginLeft: 8 },
  replyInput: { flex: 1, maxHeight: 110, minHeight: 48, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 13, fontWeight: '700' },
  replySend: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});

export default ClubDetailScreen;
