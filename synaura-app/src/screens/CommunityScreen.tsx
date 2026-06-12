import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  createCommunityPost,
  createCommunityReply,
  getCommunityFaq,
  getCommunityPosts,
  getCommunityReplies,
  getCommunityStats,
  getSynauraCity,
  likeCommunityPost,
} from '@/api/client';
import type { CommunityFaq, CommunityPost, CommunityReply, CommunityStats, SynauraCityData, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { TrackCover } from '@/components/TrackCover';
import { SynauraBackground } from '@/components/SynauraBackground';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { EventTicker, EventsRail, VoteCountdownBanner } from '@/components/events/SynauraEvents';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const categories = [
  { id: 'all', label: 'Tout', icon: 'apps', tint: '#171313' },
  { id: 'feedback', label: 'Avis', icon: 'heart', tint: '#FF6F61' },
  { id: 'collab', label: 'Feat', icon: 'people', tint: '#7C5CFF' },
  { id: 'remix', label: 'Remix', icon: 'flash', tint: '#F59E0B' },
  { id: 'ai_prompt', label: 'Prompts IA', icon: 'sparkles', tint: '#14B8A6' },
  { id: 'top_tracks', label: 'Top sons', icon: 'trophy', tint: '#38BDF8' },
  { id: 'question', label: 'Questions', icon: 'help-circle', tint: '#F59E0B' },
  { id: 'announcement', label: 'Annonces', icon: 'megaphone', tint: '#EF4444' },
] as const;

const intentions = [
  { category: 'feedback', title: 'Avis sur mon son', text: 'Mix, hook, cover ou potentiel.', icon: 'heart', tint: '#FF6F61' },
  { category: 'collab', title: 'Recherche feat', text: 'Trouve une voix ou un beatmaker.', icon: 'people', tint: '#7C5CFF' },
  { category: 'remix', title: 'Défi remix', text: 'Lance une source à transformer.', icon: 'flash', tint: '#F59E0B' },
  { category: 'ai_prompt', title: 'Partager un prompt', text: 'Compare les recettes créatives.', icon: 'sparkles', tint: '#14B8A6' },
] as const;

const weeklyLoops = [
  { category: 'feedback', title: 'Feedback Friday', text: "sons en attente d'avis", icon: 'chatbubbles', status: 'ouvert', tint: '#FF6F61' },
  { category: 'collab', title: 'Open feat', text: 'artistes cherchent une voix', icon: 'mic', status: 'live', tint: '#7C5CFF' },
  { category: 'ai_prompt', title: 'Prompt battle', text: 'prompts en compétition', icon: 'sparkles', status: 'battle', tint: '#14B8A6' },
] as const;

const emptyStats: CommunityStats = {
  resolvedQuestions: 0,
  forumPosts: 0,
  activeMembers: 0,
  implementedSuggestions: 0,
};

function categoryMeta(category: string) {
  return categories.find((item) => item.id === category) || categories[0];
}

function relativeDate(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

function Avatar({ name, uri, size = 42 }: { name: string; uri?: string | null; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

export function CommunityScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const player = usePlayer();
  const library = useLibrary();
  const [category, setCategory] = useState('all');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [stats, setStats] = useState<CommunityStats>(emptyStats);
  const [faqs, setFaqs] = useState<CommunityFaq[]>([]);
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [composerTrack, setComposerTrack] = useState<Track | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [postData, nextStats, nextFaqs, nextCity] = await Promise.all([
        getCommunityPosts(category, 1, 18),
        getCommunityStats(),
        getCommunityFaq(20),
        getSynauraCity().catch(() => null),
      ]);
      setPosts(postData.posts);
      setStats(nextStats);
      setFaqs(nextFaqs);
      setCity(nextCity);
    } catch (loadError: any) {
      setError(loadError?.message || 'Impossible de charger la communauté.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  const openComposer = useCallback((preset?: string) => {
    if (!auth.requireAuth()) {
      navigation.getParent()?.navigate('Login', { message: 'Connecte-toi pour participer à la communauté.' });
      return;
    }
    if (preset && preset !== 'all') setCategory(preset);
    setComposerOpen(true);
  }, [auth, navigation]);

  useEffect(() => {
    if (!route.params?.compose) return;
    if (!auth.requireAuth()) {
      navigation.getParent()?.navigate('Login', { message: 'Connecte-toi pour participer à la communauté.' });
      return;
    }
    setCategory(route.params.category || 'feedback');
    setComposerTrack(route.params.track || null);
    setComposerOpen(true);
    navigation.setParams({ compose: false, category: undefined, track: undefined });
  }, [auth, navigation, route.params]);

  const updatePost = useCallback((postId: string, change: (post: CommunityPost) => CommunityPost) => {
    setPosts((current) => current.map((post) => post.id === postId ? change(post) : post));
    setActivePost((current) => current?.id === postId ? change(current) : current);
  }, []);

  const toggleLike = useCallback(async (post: CommunityPost) => {
    if (!auth.requireAuth()) {
      navigation.getParent()?.navigate('Login', { message: 'Connecte-toi pour aimer cette discussion.' });
      return;
    }
    const willLike = !post.isLiked;
    updatePost(post.id, (item) => ({
      ...item,
      isLiked: willLike,
      likesCount: Math.max(0, item.likesCount + (willLike ? 1 : -1)),
    }));
    Haptics.selectionAsync().catch(() => {});
    try {
      await likeCommunityPost(post.id, willLike);
    } catch {
      updatePost(post.id, (item) => ({
        ...item,
        isLiked: !willLike,
        likesCount: Math.max(0, item.likesCount + (willLike ? -1 : 1)),
      }));
    }
  }, [auth, navigation, updatePost]);

  const postCreated = useCallback((post: CommunityPost) => {
    setPosts((current) => [post, ...current]);
    setStats((current) => ({ ...current, forumPosts: current.forumPosts + 1 }));
  }, []);

  const remixPosts = posts.filter((post) => post.category === 'remix').slice(0, 2);
  const collabPosts = posts.filter((post) => post.category === 'collab').slice(0, 2);

  const header = useMemo(() => (
    <View style={styles.headerContent}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>ESPACE SYNAURA</Text>
          <Text style={styles.pageTitle}>Communauté</Text>
          <Text style={styles.pageSubtitle}>Des avis utiles, des feats et des idées à remixer.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Ouvrir le hub créer" onPress={() => navigation.navigate('CreateHub')} style={styles.circleButton}>
            <Ionicons name="add" size={23} color="#171313" />
          </Pressable>
          <Pressable accessibilityLabel="FAQ communauté" onPress={() => setFaqOpen(true)} style={styles.circleButton}>
            <Ionicons name="help-circle-outline" size={23} color="#171313" />
          </Pressable>
          <MobileAccountButton compact />
        </View>
      </View>

      <Reveal distance={8}>
        <View style={styles.heroPanel}>
          <View style={styles.heroGlowCoral} />
          <View style={styles.heroGlowViolet} />
          <View style={styles.heroTopRow}>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>COMMUNAUTÉ LIVE</Text></View>
            <PulseWave tint="#FF6F61" />
          </View>
          <Text style={styles.heroTitle}>Fais avancer ton prochain son.</Text>
          <Text style={styles.heroText}>Demande un retour, trouve une voix ou lance un défi à la communauté.</Text>
          <MotionPressable onPress={() => openComposer(category)} style={styles.primaryButton} scaleTo={0.95}>
            <Ionicons name="add" size={19} color="#171313" />
            <Text style={styles.primaryButtonText}>Nouvelle discussion</Text>
          </MotionPressable>
        </View>
      </Reveal>

      {city ? <EventTicker city={city} tone="coral" onPress={() => navigation.navigate('City')} /> : null}
      {city ? <VoteCountdownBanner current={city.currentVoteSession} next={city.nextVoteSession} onOpen={() => navigation.navigate('City')} onNotify={() => navigation.navigate('Settings')} /> : null}
      <EventsRail city={city} onOpen={() => navigation.navigate('City')} title="Votes, Pulse et challenges" />

      <QuickComposer
        name={auth.user?.name || auth.user?.username || 'Synaura'}
        avatar={auth.user?.avatar}
        onPress={() => openComposer(category)}
      />

      <View>
        <Text style={styles.sectionEyebrow}>TON INTENTION</Text>
        <Text style={styles.sectionTitle}>Entre directement dans la musique</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.intentRow}>
          {intentions.map((item, index) => (
            <Reveal key={item.category} delay={index * 55} distance={8}>
              <IntentCard item={item} onPress={() => openComposer(item.category)} />
            </Reveal>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsRow}>
        <Stat value={stats.forumPosts} label="discussions" />
        <Stat value={stats.activeMembers} label="membres actifs" />
        <Stat value={stats.resolvedQuestions} label="résolues" />
      </View>

      <CommunityLiveBoard onOpen={setCategory} />

      {remixPosts.length || collabPosts.length ? (
        <View>
          <Text style={styles.sectionEyebrow}>ÇA BOUGE MAINTENANT</Text>
          <Text style={styles.sectionTitle}>Remix et collaborations ouvertes</Text>
          <View style={styles.spotlightGrid}>
            {remixPosts[0] ? <SpotlightCard post={remixPosts[0]} tint="#F59E0B" icon="flash" onPress={() => setActivePost(remixPosts[0])} /> : null}
            {collabPosts[0] ? <SpotlightCard post={collabPosts[0]} tint="#7C5CFF" icon="mic" onPress={() => setActivePost(collabPosts[0])} /> : null}
          </View>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {categories.map((item) => {
          const selected = category === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[styles.categoryButton, selected && { backgroundColor: item.tint, borderColor: item.tint }]}
            >
              <Ionicons name={item.icon as any} size={15} color={selected ? '#FFFAF2' : item.tint} />
              <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionTitleRow}>
        <View>
          <Text style={styles.sectionTitle}>Discussions récentes</Text>
          <Text style={styles.sectionSubtitle}>Réponds, écoute et collabore.</Text>
        </View>
        <Pressable onPress={() => void load(true)} style={styles.refreshButton}>
          <Ionicons name="refresh" size={17} color="#171313" />
        </Pressable>
      </View>
    </View>
  ), [auth.user?.avatar, auth.user?.name, auth.user?.username, category, city, collabPosts, load, navigation, openComposer, remixPosts, stats]);

  return (
    <SynauraBackground variant="warm">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Reveal delay={Math.min(index * 35, 180)} distance={10}>
            <CommunityPostCard
              post={item}
              playing={player.current?._id === item.track?._id && player.isPlaying}
              onPlay={() => item.track && void player.playTrack(item.track)}
              onLike={() => void toggleLike(item)}
              onOpen={() => setActivePost(item)}
              onProfile={() => item.author.username && navigation.navigate('PublicProfile', { username: item.author.username })}
            />
          </Reveal>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? (
          <View style={styles.state}><ActivityIndicator color="#7C5CFF" /><Text style={styles.stateText}>Chargement de la communauté...</Text></View>
        ) : (
          <View style={styles.state}><Ionicons name="chatbubbles-outline" size={28} color="#7C5CFF" /><Text style={styles.stateText}>{error || 'Aucune discussion ici pour le moment.'}</Text></View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#7C5CFF" />}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 18, paddingBottom: 170 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />

      <ComposerModal
        visible={composerOpen}
        initialCategory={category === 'all' ? 'feedback' : category}
        initialTrack={composerTrack}
        tracks={[...library.recent, ...library.favorites].filter((track, index, all) => all.findIndex((item) => item._id === track._id) === index)}
        onClose={() => {
          setComposerOpen(false);
          setComposerTrack(null);
        }}
        onCreated={postCreated}
      />
      <FaqModal visible={faqOpen} faqs={faqs} onClose={() => setFaqOpen(false)} />
      <DiscussionModal
        post={activePost}
        onClose={() => setActivePost(null)}
        onPlay={(track) => void player.playTrack(track)}
        onReply={() => activePost && updatePost(activePost.id, (item) => ({ ...item, repliesCount: item.repliesCount + 1 }))}
      />
    </SynauraBackground>
  );
}

function PulseWave({ tint }: { tint: string }) {
  const isFocused = useIsFocused();
  const { settings } = useMobileSettings();
  const pulse = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isFocused || settings.reducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(0.35);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 760, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 760, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isFocused, pulse, settings.reducedMotion]);
  return (
    <View style={styles.wave}>
      {[0.45, 0.8, 0.6, 1, 0.7, 0.9, 0.5].map((height, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              height: 22 * height,
              backgroundColor: tint,
              transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55 + index * 0.03, 1 - index * 0.025] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function QuickComposer({ name, avatar, onPress }: { name: string; avatar?: string | null; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={styles.quickComposer} scaleTo={0.98}>
      <Avatar name={name} uri={avatar} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={styles.quickComposerTitle}>Quoi de neuf dans ton univers ?</Text>
        <Text style={styles.quickComposerText}>Partage un son, une idée ou une recherche de feat.</Text>
      </View>
      <View style={styles.quickComposerButton}><Ionicons name="send" size={16} color="#FFFAF2" /></View>
    </MotionPressable>
  );
}

function IntentCard({ item, onPress }: { item: typeof intentions[number]; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={[styles.intentCard, { borderColor: `${item.tint}35` }]} scaleTo={0.96}>
      <View style={[styles.intentIcon, { backgroundColor: item.tint }]}><Ionicons name={item.icon as any} size={19} color="#FFFAF2" /></View>
      <Text style={styles.intentTitle}>{item.title}</Text>
      <Text style={styles.intentText}>{item.text}</Text>
      <View style={styles.intentVisual}><PulseWave tint={item.tint} /></View>
      <View style={styles.intentCta}><Text style={[styles.intentCtaText, { color: item.tint }]}>Commencer</Text><Ionicons name="arrow-forward" size={14} color={item.tint} /></View>
    </MotionPressable>
  );
}

function CommunityLiveBoard({ onOpen }: { onOpen: (category: string) => void }) {
  return (
    <View style={styles.liveBoard}>
      <View style={styles.liveBoardHeader}>
        <View>
          <Text style={styles.liveBoardKicker}>RITUELS DE LA SEMAINE</Text>
          <Text style={styles.liveBoardTitle}>Toujours une raison de participer.</Text>
        </View>
        <Ionicons name="flame" size={22} color="#FF6F61" />
      </View>
      {weeklyLoops.map((item) => (
        <MotionPressable key={item.title} onPress={() => onOpen(item.category)} style={styles.loopRow} scaleTo={0.98}>
          <View style={[styles.loopIcon, { backgroundColor: item.tint }]}><Ionicons name={item.icon as any} size={17} color="#FFFAF2" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.loopTitle}>{item.title}</Text>
            <Text style={styles.loopText}>{item.text}</Text>
          </View>
          <View style={styles.loopStatus}><Text style={styles.loopStatusText}>{item.status}</Text></View>
        </MotionPressable>
      ))}
    </View>
  );
}

function SpotlightCard({ post, tint, icon, onPress }: { post: CommunityPost; tint: string; icon: string; onPress: () => void }) {
  return (
    <MotionPressable onPress={onPress} style={styles.spotlightCard} scaleTo={0.97}>
      <View style={[styles.spotlightIcon, { backgroundColor: tint }]}><Ionicons name={icon as any} size={18} color="#FFFAF2" /></View>
      <Text style={styles.spotlightKicker}>{categoryMeta(post.category).label}</Text>
      <Text numberOfLines={2} style={styles.spotlightTitle}>{post.title}</Text>
      <View style={styles.spotlightFooter}><Text numberOfLines={1} style={styles.spotlightAuthor}>{post.author.name}</Text><Ionicons name="arrow-forward" size={15} color="#171313" /></View>
    </MotionPressable>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function CommunityPostCard({ post, playing, onPlay, onLike, onOpen, onProfile }: {
  post: CommunityPost;
  playing: boolean;
  onPlay: () => void;
  onLike: () => void;
  onOpen: () => void;
  onProfile: () => void;
}) {
  const meta = categoryMeta(post.category);
  return (
    <View style={styles.postCard}>
      <View style={[styles.postAccent, { backgroundColor: meta.tint }]} />
      <Pressable onPress={onProfile} style={styles.authorRow}>
        <Avatar name={post.author.name} uri={post.author.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.authorMeta}>@{post.author.username || 'membre'} · {relativeDate(post.createdAt)}</Text>
        </View>
        <View style={[styles.postCategory, { backgroundColor: `${meta.tint}18` }]}>
          <Ionicons name={meta.icon as any} size={12} color={meta.tint} />
          <Text style={[styles.postCategoryText, { color: meta.tint }]}>{meta.label}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onOpen}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text numberOfLines={3} style={styles.postContent}>{post.content}</Text>
      </Pressable>
      {post.track ? (
        <Pressable onPress={onPlay} style={styles.trackCard}>
          <TrackCover track={post.track} active={false} style={styles.trackCover} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.trackTitle}>{post.track.title}</Text>
            <Text numberOfLines={1} style={styles.trackArtist}>{post.track.artist?.name || post.track.artist?.username || 'Synaura'}</Text>
          </View>
          <View style={[styles.trackPlay, playing && styles.trackPlayActive]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={17} color={playing ? '#FFFAF2' : '#171313'} />
          </View>
        </Pressable>
      ) : null}
      <View style={styles.postActions}>
        <Pressable onPress={onLike} style={[styles.postAction, post.isLiked && styles.postActionLiked]}><Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={18} color="#FF6F61" /><Text style={styles.postActionText}>{post.likesCount}</Text></Pressable>
        <Pressable onPress={onOpen} style={styles.postAction}><Ionicons name="chatbubble-ellipses-outline" size={18} color="#7C5CFF" /><Text style={styles.postActionText}>{post.repliesCount} réponses</Text></Pressable>
        <Pressable onPress={onOpen} style={[styles.postAction, { marginLeft: 'auto' }]}><Text style={styles.postActionText}>Ouvrir</Text><Ionicons name="arrow-forward" size={16} color="#171313" /></Pressable>
      </View>
    </View>
  );
}

function ComposerModal({ visible, initialCategory, initialTrack, tracks, onClose, onCreated }: {
  visible: boolean;
  initialCategory: string;
  initialTrack?: Track | null;
  tracks: Track[];
  onClose: () => void;
  onCreated: (post: CommunityPost) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [track, setTrack] = useState<Track | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCategory(initialCategory);
    setTrack(initialTrack || null);
  }, [initialCategory, initialTrack, visible]);

  const submit = async () => {
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const post = await createCommunityPost({ title: title.trim(), content: content.trim(), category, trackId: track?._id });
      if (!post) throw new Error('Discussion non créée.');
      onCreated(post);
      setTitle('');
      setContent('');
      setTrack(null);
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
          <ModalHeader title="Nouvelle discussion" subtitle="Lance une conversation utile." onClose={onClose} />
          <Text style={styles.fieldLabel}>INTENTION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.slice(1).map((item) => (
              <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.categoryButton, category === item.id && { backgroundColor: item.tint, borderColor: item.tint }]}>
                <Ionicons name={item.icon as any} size={15} color={category === item.id ? '#FFFAF2' : item.tint} />
                <Text style={[styles.categoryText, category === item.id && styles.categoryTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.fieldLabel}>TITRE</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="De quoi veux-tu parler ?" placeholderTextColor="rgba(23,19,19,0.35)" style={styles.input} />
          <Text style={styles.fieldLabel}>MESSAGE</Text>
          <TextInput value={content} onChangeText={setContent} multiline placeholder="Donne du contexte, explique ce que tu recherches..." placeholderTextColor="rgba(23,19,19,0.35)" style={[styles.input, styles.textarea]} />
          {tracks.length ? (
            <>
              <Text style={styles.fieldLabel}>SON ATTACHÉ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackPickerRow}>
                <Pressable onPress={() => setTrack(null)} style={[styles.trackPickerNone, !track && styles.trackPickerSelected]}><Ionicons name="close" size={18} color="#171313" /><Text style={styles.trackPickerText}>Aucun</Text></Pressable>
                {tracks.slice(0, 12).map((item) => (
                  <Pressable key={item._id} onPress={() => setTrack(item)} style={[styles.trackPicker, track?._id === item._id && styles.trackPickerSelected]}>
                    <TrackCover track={item} active={false} style={styles.trackPickerCover} />
                    <Text numberOfLines={1} style={styles.trackPickerText}>{item.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable disabled={!title.trim() || !content.trim() || busy} onPress={() => void submit()} style={[styles.submitButton, (!title.trim() || !content.trim() || busy) && styles.disabled]}>
            {busy ? <ActivityIndicator color="#FFFAF2" /> : <Ionicons name="send" size={18} color="#FFFAF2" />}
            <Text style={styles.submitButtonText}>{busy ? 'Publication...' : 'Publier la discussion'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DiscussionModal({ post, onClose, onPlay, onReply }: { post: CommunityPost | null; onClose: () => void; onPlay: (track: Track) => void; onReply: () => void }) {
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
          <ModalHeader title={post?.title || 'Discussion'} subtitle={post ? `${post.repliesCount} réponses` : ''} onClose={onClose} />
          {post ? <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.repliesContent} keyboardShouldPersistTaps="handled">
            <View style={styles.originalPost}><Text style={styles.originalContent}>{post.content}</Text>{post.track ? <Pressable onPress={() => onPlay(post.track!)} style={styles.inlineTrack}><TrackCover track={post.track} active={false} style={styles.inlineTrackCover} /><Text numberOfLines={1} style={styles.inlineTrackText}>{post.track.title}</Text><Ionicons name="play" size={16} color="#171313" /></Pressable> : null}</View>
            <Text style={styles.fieldLabel}>RÉPONSES</Text>
            {loading ? <ActivityIndicator color="#7C5CFF" /> : replies.map((reply) => <View key={reply.id} style={styles.reply}><Avatar name={reply.author.name} uri={reply.author.avatar} size={36} /><View style={{ flex: 1 }}><Text style={styles.replyAuthor}>{reply.author.name}</Text><Text style={styles.replyContent}>{reply.content}</Text><Text style={styles.replyDate}>{relativeDate(reply.createdAt)}</Text></View></View>)}
            {!loading && !replies.length ? <Text style={styles.stateText}>Sois la première personne à répondre.</Text> : null}
          </ScrollView> : null}
          <View style={[styles.replyComposer, { paddingBottom: Math.max(12, insets.bottom) }]}>
            <View style={{ flex: 1 }}>
              {error ? <Text style={styles.replyError}>{error}</Text> : null}
              <TextInput value={content} onChangeText={setContent} placeholder="Ajouter une réponse..." placeholderTextColor="rgba(23,19,19,0.35)" multiline style={styles.replyInput} />
            </View>
            <Pressable disabled={!content.trim() || busy} onPress={() => void submit()} style={[styles.replySend, (!content.trim() || busy) && styles.disabled]}><Ionicons name="send" size={18} color="#FFFAF2" /></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FaqModal({ visible, faqs, onClose }: { visible: boolean; faqs: CommunityFaq[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState('');
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <ScrollView contentContainerStyle={[styles.modalContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
          <ModalHeader title="FAQ communauté" subtitle="Les réponses aux questions fréquentes." onClose={onClose} />
          {faqs.map((faq) => <Pressable key={faq.id} onPress={() => setOpenId((current) => current === faq.id ? '' : faq.id)} style={styles.faqItem}><View style={styles.faqQuestionRow}><Text style={styles.faqQuestion}>{faq.question}</Text><Ionicons name={openId === faq.id ? 'chevron-up' : 'chevron-down'} size={18} color="#171313" /></View>{openId === faq.id ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}</Pressable>)}
          {!faqs.length ? <Text style={styles.stateText}>La FAQ est vide pour le moment.</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.modalTitle}>{title}</Text><Text style={styles.modalSubtitle}>{subtitle}</Text></View><Pressable onPress={onClose} style={styles.circleButton}><Ionicons name="close" size={23} color="#171313" /></Pressable></View>;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 14, gap: 12 },
  headerContent: { gap: 18, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActions: { flexDirection: 'row', gap: 7 },
  kicker: { color: 'rgba(23,19,19,0.46)', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  pageTitle: { color: '#171313', fontSize: 38, lineHeight: 43, fontWeight: '900', marginTop: 4 },
  pageSubtitle: { color: 'rgba(23,19,19,0.58)', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 5, maxWidth: 290 },
  circleButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFAF2', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', alignItems: 'center', justifyContent: 'center' },
  heroPanel: { backgroundColor: '#171313', borderRadius: 28, padding: 20, overflow: 'hidden' },
  heroGlowCoral: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,111,97,0.16)', left: -75, top: -105 },
  heroGlowViolet: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(124,92,255,0.17)', right: -100, bottom: -140 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,250,242,0.1)', borderWidth: 1, borderColor: 'rgba(255,250,242,0.12)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  liveBadgeText: { color: 'rgba(255,250,242,0.7)', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#FFFAF2', fontSize: 27, lineHeight: 30, fontWeight: '900', marginTop: 9, maxWidth: 300 },
  heroText: { color: 'rgba(255,250,242,0.58)', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 9 },
  primaryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFAF2', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, marginTop: 16 },
  primaryButtonText: { color: '#171313', fontSize: 12, fontWeight: '900' },
  wave: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar: { width: 3, borderRadius: 999, opacity: 0.82 },
  quickComposer: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'rgba(255,250,242,0.9)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,111,97,0.25)', padding: 12 },
  quickComposerTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  quickComposerText: { color: 'rgba(23,19,19,0.46)', fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 2 },
  quickComposerButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6F61' },
  sectionEyebrow: { color: 'rgba(23,19,19,0.38)', fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginBottom: 4 },
  intentRow: { gap: 10, paddingTop: 12, paddingRight: 20 },
  intentCard: { width: 178, minHeight: 204, padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,250,242,0.92)', borderWidth: 1, justifyContent: 'space-between' },
  intentIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  intentTitle: { color: '#171313', fontSize: 15, lineHeight: 18, fontWeight: '900', marginTop: 10 },
  intentText: { color: 'rgba(23,19,19,0.48)', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 5 },
  intentVisual: { marginTop: 8, paddingHorizontal: 9, borderRadius: 13, backgroundColor: 'rgba(23,19,19,0.035)' },
  intentCta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  intentCtaText: { fontSize: 10, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 72, backgroundColor: 'rgba(255,250,242,0.82)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', padding: 12, justifyContent: 'center' },
  statValue: { color: '#171313', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(23,19,19,0.46)', fontSize: 9, lineHeight: 12, fontWeight: '900', textTransform: 'uppercase', marginTop: 3 },
  liveBoard: { padding: 16, borderRadius: 25, backgroundColor: '#171313', gap: 8 },
  liveBoardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  liveBoardKicker: { color: 'rgba(255,250,242,0.38)', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  liveBoardTitle: { color: '#FFFAF2', fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 4, maxWidth: 270 },
  loopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 17, backgroundColor: 'rgba(255,250,242,0.07)', borderWidth: 1, borderColor: 'rgba(255,250,242,0.08)', padding: 10 },
  loopIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  loopTitle: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  loopText: { color: 'rgba(255,250,242,0.42)', fontSize: 9, fontWeight: '700', marginTop: 2 },
  loopStatus: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,250,242,0.1)' },
  loopStatusText: { color: 'rgba(255,250,242,0.65)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  spotlightGrid: { flexDirection: 'row', gap: 9, marginTop: 11 },
  spotlightCard: { flex: 1, minHeight: 145, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,250,242,0.9)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  spotlightIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  spotlightKicker: { color: 'rgba(23,19,19,0.4)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 10 },
  spotlightTitle: { color: '#171313', fontSize: 13, lineHeight: 17, fontWeight: '900', marginTop: 4 },
  spotlightFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  spotlightAuthor: { flex: 1, color: 'rgba(23,19,19,0.45)', fontSize: 9, fontWeight: '800' },
  categoryRow: { gap: 8, paddingRight: 18 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,250,242,0.76)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  categoryText: { color: '#171313', fontSize: 11, fontWeight: '900' },
  categoryTextActive: { color: '#FFFAF2' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: '#171313', fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { color: 'rgba(23,19,19,0.48)', fontSize: 11, fontWeight: '700', marginTop: 3 },
  refreshButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.8)' },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { color: 'rgba(23,19,19,0.52)', fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  postCard: { position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(255,250,242,0.92)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', padding: 14, marginBottom: 12 },
  postAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 999 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { overflow: 'hidden', backgroundColor: '#171313', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  authorName: { color: '#171313', fontSize: 13, fontWeight: '900' },
  authorMeta: { color: 'rgba(23,19,19,0.45)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  postCategory: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  postCategoryText: { fontSize: 9, fontWeight: '900' },
  postTitle: { color: '#171313', fontSize: 19, lineHeight: 23, fontWeight: '900', marginTop: 14 },
  postContent: { color: 'rgba(23,19,19,0.65)', fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 7 },
  trackCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13, padding: 9, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)' },
  trackCover: { width: 52, height: 52, borderRadius: 13 },
  trackTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  trackArtist: { color: 'rgba(23,19,19,0.46)', fontSize: 11, fontWeight: '700', marginTop: 3 },
  trackPlay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFAF2' },
  trackPlayActive: { backgroundColor: '#171313' },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.045)' },
  postActionLiked: { backgroundColor: 'rgba(255,111,97,0.12)' },
  postActionText: { color: 'rgba(23,19,19,0.7)', fontSize: 10, fontWeight: '900' },
  modalRoot: { flex: 1, backgroundColor: '#F4EFE6' },
  modalContent: { paddingHorizontal: 16, gap: 13 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalTitle: { color: '#171313', fontSize: 27, lineHeight: 31, fontWeight: '900' },
  modalSubtitle: { color: 'rgba(23,19,19,0.48)', fontSize: 11, fontWeight: '700', marginTop: 3 },
  fieldLabel: { color: '#7C5CFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 5 },
  input: { minHeight: 52, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#FFFAF2', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', color: '#171313', fontSize: 14, fontWeight: '700' },
  textarea: { minHeight: 150, textAlignVertical: 'top' },
  trackPickerRow: { gap: 8, paddingRight: 20 },
  trackPicker: { width: 100, padding: 7, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', backgroundColor: '#FFFAF2', gap: 6 },
  trackPickerNone: { width: 72, minHeight: 99, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', backgroundColor: '#FFFAF2', alignItems: 'center', justifyContent: 'center', gap: 8 },
  trackPickerSelected: { borderColor: '#7C5CFF', borderWidth: 2 },
  trackPickerCover: { width: '100%', aspectRatio: 1, borderRadius: 12 },
  trackPickerText: { color: '#171313', fontSize: 10, fontWeight: '900' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 999, backgroundColor: '#171313', paddingVertical: 15, marginTop: 8 },
  submitButtonText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.35 },
  errorText: { color: '#D92D20', fontSize: 11, fontWeight: '800' },
  discussionBody: { flex: 1, paddingHorizontal: 16 },
  repliesContent: { paddingBottom: 20, gap: 12 },
  originalPost: { padding: 15, borderRadius: 21, backgroundColor: '#FFFAF2', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  originalContent: { color: '#171313', fontSize: 14, lineHeight: 21, fontWeight: '650' as any },
  inlineTrack: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, borderRadius: 15, backgroundColor: 'rgba(23,19,19,0.05)' },
  inlineTrackCover: { width: 40, height: 40, borderRadius: 10 },
  inlineTrackText: { flex: 1, color: '#171313', fontSize: 12, fontWeight: '900' },
  reply: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 19, backgroundColor: 'rgba(255,250,242,0.78)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.07)' },
  replyAuthor: { color: '#171313', fontSize: 12, fontWeight: '900' },
  replyContent: { color: 'rgba(23,19,19,0.7)', fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  replyDate: { color: 'rgba(23,19,19,0.38)', fontSize: 9, fontWeight: '800', marginTop: 6 },
  replyComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(23,19,19,0.08)' },
  replyError: { color: '#D92D20', fontSize: 9, fontWeight: '800', marginBottom: 5, marginLeft: 8 },
  replyInput: { flex: 1, maxHeight: 110, minHeight: 48, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFAF2', color: '#171313', fontSize: 13, fontWeight: '700' },
  replySend: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF' },
  faqItem: { padding: 15, borderRadius: 20, backgroundColor: '#FFFAF2', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestion: { flex: 1, color: '#171313', fontSize: 14, fontWeight: '900' },
  faqAnswer: { color: 'rgba(23,19,19,0.62)', fontSize: 12, lineHeight: 19, fontWeight: '600', marginTop: 12 },
});
