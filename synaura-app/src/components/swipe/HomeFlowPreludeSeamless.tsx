import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { HomePost, Track } from '@/api/types';
import { MotionPressable } from '@/components/motion/Motion';
import { getTrackCoverImage } from '@/components/TrackCover';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const brandSymbol = require('../../assets/synaura-symbol-2026.png');

const PUNCHLINES = [
  'POV : tu voulais juste écouter un son.',
  'On t’a gardé du lourd pendant ton absence.',
  'Petit scroll innocent, grosse obsession musicale.',
  'Ton Flow a bossé pendant que tu vivais ta vie.',
  'Ça sent le son envoyé à quatre potes direct.',
  'Le Radar a encore cuisiné quelque chose.',
  'Tu viens pour un son, tu repars avec douze.',
  'Promis, juste deux minutes. On connaît.',
  'Ta prochaine claque est peut-être à un swipe.',
  'Ton FYP imaginaire aurait validé ça.',
  'Il s’est passé deux-trois trucs pas mal ici.',
  'Alerte : risque élevé de remettre ce son en boucle.',
];

const BANNER_ROTATION_MS = 4_200;
const FONT_BLACK = Platform.select({ android: 'sans-serif-black', ios: 'System', default: 'System' });
const FONT_BOLD = Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' });

const SIGNAL = {
  black: '#09090B',
  surface: '#111015',
  paper: '#F7F6F3',
  violet: '#7357C6',
  violetSoft: '#A98BE8',
  cyan: '#4A9EAA',
  cyanSoft: '#72BBC5',
  coral: '#D96D63',
  coralSoft: '#F0AAA2',
  orange: '#F4A261',
};

type Props = {
  visible: boolean;
  loading?: boolean;
  error?: boolean;
  tracks: Track[];
  posts: HomePost[];
  currentTrack?: Track | null;
  currentPlaying?: boolean;
  userName?: string | null;
  topPad: number;
  bottomPad: number;
  likedMap?: Record<string, boolean>;
  likesMap?: Record<string, number>;
  commentsMap?: Record<string, number>;
  onEnterFlow: () => void;
  onPlayTrack: (track: Track) => void;
  onOpenTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onOpenComments: (track: Track) => void;
  onShareTrack: (track: Track) => void;
  onOpenPost: (post: HomePost) => void;
  onSearch: () => void;
  onNotifications: () => void;
  onDiscover: () => void;
  onRadar: () => void;
  onStudio: () => void;
  onEvents: () => void;
  onRetry?: () => void;
};

type Shortcut = {
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  onPress: () => void;
};

type RailItem =
  | { id: string; kind: 'post'; post: HomePost | null }
  | { id: string; kind: 'social'; avatars: string[] }
  | { id: string; kind: 'track'; track: Track; badge: string }
  | { id: string; kind: 'shortcut'; shortcut: Shortcut }
  | { id: string; kind: 'studio' };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return String(Math.max(0, Math.round(value)));
}

function postPreview(post: HomePost) {
  if (post.text?.trim()) return post.text.trim();
  if (post.track?.title) return `partage « ${post.track.title} »`;
  if (post.imageUrl) return 'a partagé une nouvelle image';
  return 'vient de publier sur Synaura';
}

function hapticPress(callback: () => void) {
  void Haptics.selectionAsync().catch(() => {});
  callback();
}

function SignalAura({ variant }: { variant: 'primary' | 'secondary' }) {
  const primary = variant === 'primary';
  const suffix = primary ? 'Primary' : 'Secondary';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`homeViolet${suffix}`} cx={primary ? '4' : '38'} cy={primary ? '2' : '20'} rx="76" ry="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.5 : 0.28} />
          <Stop offset="0.36" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.19 : 0.09} />
          <Stop offset="0.78" stopColor={SIGNAL.violet} stopOpacity="0.015" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`homeCoral${suffix}`} cx={primary ? '98' : '74'} cy={primary ? '8' : '36'} rx="72" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.42 : 0.22} />
          <Stop offset="0.4" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.15 : 0.07} />
          <Stop offset="0.8" stopColor={SIGNAL.coral} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`homeCyan${suffix}`} cx={primary ? '52' : '16'} cy={primary ? '20' : '56'} rx="64" ry="58" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.26 : 0.17} />
          <Stop offset="0.42" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.09 : 0.05} />
          <Stop offset="0.84" stopColor={SIGNAL.cyan} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#homeViolet${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#homeCoral${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#homeCyan${suffix})`} />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

export function HomeFlowPrelude(props: Props) {
  const {
    visible,
    tracks,
    posts,
    currentTrack,
    currentPlaying,
    userName,
    topPad,
    bottomPad,
    onEnterFlow,
    onPlayTrack,
    onOpenTrack,
    onOpenPost,
    onSearch,
    onNotifications,
    onDiscover,
    onRadar,
    onStudio,
    onEvents,
  } = props;

  const navigation = useNavigation<any>();
  const responsive = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [activeRailIndex, setActiveRailIndex] = useState(0);

  const exitProgress = useRef(new Animated.Value(0)).current;
  const exitProgressValue = useRef(0);
  const bannerIn = useRef(new Animated.Value(1)).current;
  const bannerProgress = useRef(new Animated.Value(0)).current;
  const cardsIn = useRef(new Animated.Value(0)).current;
  const cardMotion = useRef(new Animated.Value(0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;
  const hintMotion = useRef(new Animated.Value(0)).current;
  const finishingRef = useRef(false);

  const playableTracks = useMemo(() => tracks.filter((track) => Boolean(track.audioUrl)), [tracks]);
  const firstTrack = playableTracks[0] || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const discoveryTracks = playableTracks.filter((track) => track._id !== featuredTrack?._id).slice(0, 4);
  const latestPost = posts[0] || null;
  const greetingName = userName?.trim().split(/\s+/)[0] || null;

  const bannerItems = useMemo(() => [
    latestPost ? `${latestPost.author} vient de publier` : 'La communauté se réveille doucement',
    featuredTrack ? `Fais partie des premiers sur « ${featuredTrack.title} »` : 'Ton prochain son est en approche',
    currentPlaying ? 'Ton Flow joue déjà derrière cet écran' : 'Le premier morceau est déjà prêt derrière l’accueil',
    'Quelqu’un pourrait t’avoir suivi récemment 👀',
    'Le Radar pense avoir trouvé ta prochaine boucle',
    'Ton algorithme a bossé pendant ton absence',
  ], [currentPlaying, featuredTrack, latestPost]);

  const avatarCandidates = useMemo(
    () => playableTracks.map((track) => track.artist?.avatar).filter((avatar): avatar is string => Boolean(avatar)).slice(0, 3),
    [playableTracks],
  );

  const shortcuts = useMemo<Shortcut[]>(() => [
    { label: 'Découvrir', sub: 'Trouve ton mood', icon: 'compass-outline', accent: SIGNAL.orange, onPress: onDiscover },
    { label: 'Radar', sub: 'Ce qui chauffe', icon: 'radio-outline', accent: SIGNAL.cyan, onPress: onRadar },
    { label: 'Studio IA', sub: 'Crée maintenant', icon: 'sparkles-outline', accent: SIGNAL.coral, onPress: onStudio },
    { label: 'Événements', sub: 'La scène Synaura', icon: 'calendar-outline', accent: SIGNAL.violetSoft, onPress: onEvents },
  ], [onDiscover, onEvents, onRadar, onStudio]);

  const railItems = useMemo<RailItem[]>(() => {
    const items: RailItem[] = [
      { id: 'activity', kind: 'post', post: latestPost },
      { id: 'social', kind: 'social', avatars: avatarCandidates },
    ];
    discoveryTracks.forEach((track, index) => items.push({ id: `track-${track._id}`, kind: 'track', track, badge: index === 0 ? 'Premiers auditeurs' : index === 1 ? 'Ça monte' : 'Pour toi' }));
    shortcuts.forEach((shortcut) => items.push({ id: `shortcut-${shortcut.label}`, kind: 'shortcut', shortcut }));
    items.push({ id: 'studio-push', kind: 'studio' });
    return items;
  }, [avatarCandidates, discoveryTracks, latestPost, shortcuts]);

  const availableHeight = Math.max(420, responsive.height - Math.max(0, bottomPad));
  const compact = responsive.isNarrow || responsive.isShort;
  const headerHeight = topPad + (compact ? 52 : 58);
  const minFlowVisible = responsive.isVeryShort ? 154 : compact ? 188 : 224;
  const desiredPulseHeight = availableHeight * (responsive.isVeryShort ? 0.35 : responsive.isTall ? 0.43 : 0.4);
  const maxPulseHeight = Math.max(188, availableHeight - headerHeight - minFlowVisible);
  const pulseHeight = clamp(Math.min(desiredPulseHeight, maxPulseHeight), responsive.isVeryShort ? 188 : 226, responsive.isTall ? 342 : 318);
  const chromeHeight = headerHeight + pulseHeight;
  const railHeight = clamp(pulseHeight * 0.38, responsive.isVeryShort ? 86 : 104, 132);
  const cardWidth = clamp(responsive.safeWidth * 0.64, responsive.isTiny ? 204 : 218, 278);

  useEffect(() => {
    const id = exitProgress.addListener(({ value }) => { exitProgressValue.current = value; });
    return () => exitProgress.removeListener(id);
  }, [exitProgress]);

  useEffect(() => {
    if (!visible) return;
    finishingRef.current = false;
    exitProgress.stopAnimation();
    exitProgress.setValue(0);
    exitProgressValue.current = 0;
    setPhraseIndex(Math.floor(Math.random() * PUNCHLINES.length));
    setBannerIndex(0);
    setActiveRailIndex(0);
    cardsIn.setValue(0);

    const reveal = Animated.timing(cardsIn, { toValue: 1, duration: settings.reducedMotion ? 1 : 520, delay: settings.reducedMotion ? 0 : 80, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    reveal.start();

    if (settings.reducedMotion) {
      auraOne.setValue(0.5);
      auraTwo.setValue(0.5);
      cardMotion.setValue(0.5);
      hintMotion.setValue(0.5);
      return () => reveal.stop();
    }

    const auraOneLoop = Animated.loop(Animated.sequence([
      Animated.timing(auraOne, { toValue: 1, duration: 6_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const auraTwoLoop = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8_600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8_600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const cardLoop = Animated.loop(Animated.sequence([
      Animated.timing(cardMotion, { toValue: 1, duration: 2_900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(cardMotion, { toValue: 0, duration: 2_900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const hintLoop = Animated.loop(Animated.sequence([
      Animated.timing(hintMotion, { toValue: 1, duration: 1_250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(hintMotion, { toValue: 0, duration: 1_250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    auraOneLoop.start();
    auraTwoLoop.start();
    cardLoop.start();
    hintLoop.start();
    return () => { reveal.stop(); auraOneLoop.stop(); auraTwoLoop.stop(); cardLoop.stop(); hintLoop.stop(); };
  }, [auraOne, auraTwo, cardMotion, cardsIn, exitProgress, hintMotion, settings.reducedMotion, visible]);

  useEffect(() => {
    if (!visible || bannerItems.length < 2) return;
    const interval = setInterval(() => setBannerIndex((current) => (current + 1) % bannerItems.length), BANNER_ROTATION_MS);
    return () => clearInterval(interval);
  }, [bannerItems.length, visible]);

  useEffect(() => {
    if (!visible) return;
    bannerIn.stopAnimation();
    bannerProgress.stopAnimation();
    bannerIn.setValue(0);
    bannerProgress.setValue(0);
    Animated.parallel([
      Animated.timing(bannerIn, { toValue: 1, duration: settings.reducedMotion ? 1 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bannerProgress, { toValue: 1, duration: settings.reducedMotion ? 1 : BANNER_ROTATION_MS, easing: Easing.linear, useNativeDriver: false }),
    ]).start();
  }, [bannerIn, bannerIndex, bannerProgress, settings.reducedMotion, visible]);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    void Haptics.selectionAsync().catch(() => {});
    if (settings.reducedMotion) {
      exitProgress.setValue(1);
      onEnterFlow();
      return;
    }
    Animated.timing(exitProgress, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) onEnterFlow();
      else finishingRef.current = false;
    });
  }, [exitProgress, onEnterFlow, settings.reducedMotion]);

  const reset = useCallback(() => {
    if (finishingRef.current) return;
    Animated.spring(exitProgress, { toValue: 0, speed: 28, bounciness: 2, useNativeDriver: true }).start();
  }, [exitProgress]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.18,
    onPanResponderMove: (_, gesture) => exitProgress.setValue(clamp(-gesture.dy / Math.max(160, chromeHeight * 0.82), 0, 1)),
    onPanResponderRelease: (_, gesture) => {
      if (exitProgressValue.current > 0.16 || gesture.vy < -0.32) finish();
      else reset();
    },
    onPanResponderTerminate: reset,
  }), [chromeHeight, exitProgress, finish, reset]);

  if (!visible) return null;

  const chromeTranslateY = exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -chromeHeight - 18] });
  const chromeOpacity = exitProgress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0.92, 0], extrapolate: 'clamp' });
  const bridgeOpacity = exitProgress.interpolate({ inputRange: [0, 0.48, 1], outputRange: [1, 0.8, 0], extrapolate: 'clamp' });
  const bridgeTranslateY = exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const bannerWidth = bannerProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const cardsTranslateY = cardsIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 16] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1.14] }) },
    ],
  };
  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.8] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [14, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1.03] }) },
    ],
  };

  const renderRailItem = ({ item, index }: { item: RailItem; index: number }) => {
    const width = item.kind === 'shortcut' ? Math.max(146, cardWidth * 0.66) : cardWidth;
    const direction = index % 2 ? 1 : -1;
    const floatY = cardMotion.interpolate({ inputRange: [0, 1], outputRange: [direction * -2.5, direction * 2.5] });
    const scale = cardMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.008, 1] });
    const frame = [styles.railFrame, { width, height: railHeight, transform: [{ translateY: floatY }, { scale }] }];

    if (item.kind === 'post') {
      const post = item.post;
      return (
        <Animated.View style={frame}>
          <MotionPressable accessibilityLabel={post ? `Ouvrir le post de ${post.author}` : 'Découvrir la communauté'} onPress={() => post ? hapticPress(() => onOpenPost(post)) : hapticPress(onDiscover)} style={styles.railCard} scaleTo={0.975}>
            <LinearGradient colors={['rgba(217,109,99,0.32)', 'rgba(30,23,29,0.98)', 'rgba(244,162,97,0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <GlassOutline radius={20} opacity={0.24} />
            <View style={styles.cardHeader}><View style={styles.kickerRow}><View style={[styles.liveDot, { backgroundColor: SIGNAL.coral }]} /><Text style={[styles.cardKicker, { color: SIGNAL.coralSoft }]}>ÇA BOUGE MAINTENANT</Text></View><Ionicons name="trending-up" size={14} color={SIGNAL.orange} /></View>
            <View style={styles.postBody}>
              <View style={styles.postAvatarRing}>{post?.avatar ? <ExpoImage source={{ uri: post.avatar }} contentFit="cover" style={styles.postAvatar} /> : <Image source={brandSymbol} resizeMode="contain" style={styles.postFallback} />}</View>
              <View style={styles.postCopy}><Text numberOfLines={1} style={styles.postName}>{post?.author || 'La communauté'}</Text><Text numberOfLines={2} style={styles.postText}>{post ? postPreview(post) : 'Les prochaines publications apparaîtront ici.'}</Text></View>
            </View>
            <View style={styles.cardFooter}><Text numberOfLines={1} style={styles.cardCta}>{post ? 'Voir ce que t’as raté' : 'Explorer la communauté'}</Text><Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.78)" /></View>
          </MotionPressable>
        </Animated.View>
      );
    }

    if (item.kind === 'social') {
      return (
        <Animated.View style={frame}>
          <MotionPressable accessibilityLabel="Ouvrir ton réseau" onPress={() => hapticPress(onDiscover)} style={styles.railCard} scaleTo={0.975}>
            <LinearGradient colors={['rgba(115,87,198,0.34)', 'rgba(24,20,31,0.98)', 'rgba(74,158,170,0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <GlassOutline radius={20} opacity={0.24} />
            <View style={styles.cardHeader}><View style={styles.socialIcon}><Ionicons name="person-add-outline" size={19} color="#DCCEFF" /></View><Text style={styles.socialBadge}>SOCIAL</Text></View>
            <Text numberOfLines={3} style={styles.socialTitle}>Quelqu’un t’a peut-être suivi récemment 👀</Text>
            <View style={styles.socialFooter}><View style={styles.avatarStack}>{(item.avatars.length ? item.avatars : [null]).map((avatar, avatarIndex) => <View key={`${avatar || 'fallback'}-${avatarIndex}`} style={[styles.stackAvatarWrap, avatarIndex ? { marginLeft: -9 } : null]}>{avatar ? <ExpoImage source={{ uri: avatar }} contentFit="cover" style={styles.stackAvatar} /> : <Image source={brandSymbol} resizeMode="contain" style={styles.stackFallback} />}</View>)}</View><Text style={styles.socialHint}>Ouvre ton réseau</Text></View>
          </MotionPressable>
        </Animated.View>
      );
    }

    if (item.kind === 'track') {
      const cover = getTrackCoverImage(item.track);
      return (
        <Animated.View style={frame}>
          <MotionPressable accessibilityLabel={`Ouvrir ${item.track.title}`} onPress={() => hapticPress(() => onOpenTrack(item.track))} style={styles.railCard} scaleTo={0.975}>
            {cover ? <ExpoImage source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#362640', '#142B2F', '#151217']} style={StyleSheet.absoluteFillObject} />}
            <LinearGradient colors={['rgba(5,5,7,0.02)', 'rgba(5,5,7,0.16)', 'rgba(5,5,7,0.95)']} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFillObject} />
            <GlassOutline radius={20} opacity={0.25} />
            <View style={styles.trackCardContent}><Text style={styles.trackBadge}>{item.badge}</Text><View><Text numberOfLines={2} style={styles.trackTitle}>{item.track.title}</Text><Text numberOfLines={1} style={styles.trackArtist}>{artistName(item.track)}</Text><View style={styles.trackMeta}><Ionicons name="headset-outline" size={12} color="rgba(255,255,255,0.8)" /><Text style={styles.trackMetaText}>{compactCount(item.track.plays || 0)} écoutes</Text></View></View></View>
          </MotionPressable>
        </Animated.View>
      );
    }

    if (item.kind === 'shortcut') {
      const { shortcut } = item;
      return (
        <Animated.View style={frame}>
          <MotionPressable accessibilityLabel={shortcut.label} onPress={() => hapticPress(shortcut.onPress)} style={styles.railCard} scaleTo={0.97}>
            <LinearGradient colors={[`${shortcut.accent}42`, 'rgba(22,20,26,0.98)', `${shortcut.accent}0F`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <GlassOutline radius={20} opacity={0.22} />
            <View style={styles.shortcutContent}><View style={[styles.shortcutIcon, { backgroundColor: `${shortcut.accent}26`, borderColor: `${shortcut.accent}66` }]}><Ionicons name={shortcut.icon} size={19} color={shortcut.accent} /></View><View><Text style={styles.shortcutTitle}>{shortcut.label}</Text><Text numberOfLines={1} style={styles.shortcutSub}>{shortcut.sub}</Text></View></View>
          </MotionPressable>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={frame}>
        <MotionPressable accessibilityLabel="Ouvrir le Studio IA" onPress={() => hapticPress(onStudio)} style={styles.railCard} scaleTo={0.975}>
          <LinearGradient colors={['rgba(217,109,99,0.34)', 'rgba(115,87,198,0.24)', 'rgba(18,16,23,0.98)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <GlassOutline radius={20} opacity={0.24} />
          <View style={styles.studioIcon}><Ionicons name="flash-outline" size={21} color="#FFD8D3" /></View><Text numberOfLines={3} style={styles.studioTitle}>Ton prochain banger attend juste un clic.</Text><View style={styles.studioCtaRow}><Text style={styles.studioCta}>Va cuisiner ça</Text><Ionicons name="chevron-forward" size={13} color={SIGNAL.coralSoft} /></View>
        </MotionPressable>
      </Animated.View>
    );
  };

  return (
    <View {...panResponder.panHandlers} pointerEvents="box-none" style={styles.overlay}>
      <Animated.View pointerEvents="box-none" style={[styles.chrome, { height: chromeHeight, opacity: chromeOpacity, transform: [{ translateY: chromeTranslateY }] }]}>
        <LinearGradient colors={['#09090B', '#0D0C11', '#09090B']} locations={[0, 0.56, 1]} style={StyleSheet.absoluteFillObject} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><SignalAura variant="primary" /></Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><SignalAura variant="secondary" /></Animated.View>

        <View style={[styles.header, { height: headerHeight, paddingTop: topPad + 5, paddingHorizontal: responsive.gutter }]}>
          <MotionPressable accessibilityLabel="Continuer dans le Flow" onPress={finish} style={styles.brandRow} scaleTo={0.97}>
            <View style={styles.brandLogo}><Image source={brandSymbol} resizeMode="contain" style={styles.brandImage} /></View>
            <View style={styles.brandCopy}><Text style={styles.brandName}>Synaura</Text><Text numberOfLines={1} style={styles.brandLine}>{greetingName ? `Salut ${greetingName}, regarde ce que t’as raté` : 'Écoute, crée, partage'}</Text></View>
          </MotionPressable>
          <View style={styles.headerActions}>
            <MotionPressable accessibilityLabel="Rechercher" onPress={() => hapticPress(onSearch)} style={styles.headerButton} scaleTo={0.9}><Ionicons name="search" size={compact ? 17 : 18} color="rgba(255,255,255,0.88)" /></MotionPressable>
            <MotionPressable accessibilityLabel="Messages" onPress={() => hapticPress(() => navigation.navigate('Messages'))} style={styles.headerButton} scaleTo={0.9}><Ionicons name="chatbubble-outline" size={compact ? 17 : 18} color="rgba(255,255,255,0.88)" /></MotionPressable>
            <MotionPressable accessibilityLabel="Notifications" onPress={() => hapticPress(onNotifications)} style={styles.headerButton} scaleTo={0.9}><Ionicons name="notifications-outline" size={compact ? 18 : 19} color="rgba(255,255,255,0.88)" /></MotionPressable>
          </View>
        </View>

        <View style={[styles.pulseSection, { height: pulseHeight, paddingHorizontal: responsive.gutter }]}>
          <LinearGradient colors={['rgba(20,18,26,0.96)', 'rgba(12,11,15,0.94)', 'rgba(9,9,11,0.9)']} locations={[0, 0.56, 1]} style={styles.pulseCard}>
            <GlassOutline radius={26} opacity={0.21} />
            <View style={styles.pulseHeader}>
              <View style={styles.badgeRow}><View style={[styles.badge, styles.badgeViolet]}><Text style={[styles.badgeText, { color: '#DCCEFF' }]}>PENDANT TON ABSENCE</Text></View><View style={[styles.badge, styles.badgeCyan]}><Text style={[styles.badgeText, { color: '#A8DEE5' }]}>SWIPE LES CARTES</Text></View></View>
              <Text maxFontSizeMultiplier={1.08} numberOfLines={3} adjustsFontSizeToFit style={[styles.punchline, compact && styles.punchlineCompact]}>{PUNCHLINES[phraseIndex]}</Text>
            </View>

            <View style={styles.ticker}>
              <LinearGradient colors={['rgba(115,87,198,0.18)', 'rgba(255,255,255,0.06)', 'rgba(74,158,170,0.16)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
              <GlassOutline radius={14} opacity={0.19} />
              <Animated.View key={bannerIndex} style={[styles.tickerContent, { opacity: bannerIn, transform: [{ translateY: bannerIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}><View style={styles.tickerIcon}><Ionicons name="flash-outline" size={13} color="#A8DEE5" /></View>{!responsive.isTiny ? <Text style={styles.tickerLabel}>EN CE MOMENT</Text> : null}<Text numberOfLines={1} style={styles.tickerMessage}>{bannerItems[bannerIndex]}</Text><Text style={styles.tickerCount}>{String(bannerIndex + 1).padStart(2, '0')} / {String(bannerItems.length).padStart(2, '0')}</Text></Animated.View>
              <Animated.View style={[styles.progressClip, { width: bannerWidth }]}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></Animated.View>
            </View>

            <Animated.View style={[styles.railWrap, { flex: 1, opacity: cardsIn, transform: [{ translateY: cardsTranslateY }] }]}>
              <LinearGradient pointerEvents="none" colors={['#100F14', 'rgba(16,15,20,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.leftFade} />
              <LinearGradient pointerEvents="none" colors={['rgba(16,15,20,0)', '#100F14']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.rightFade} />
              <FlatList horizontal data={railItems} keyExtractor={(item) => item.id} renderItem={renderRailItem} ItemSeparatorComponent={() => <View style={styles.railGap} />} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent} snapToAlignment="start" decelerationRate="fast" disableIntervalMomentum onMomentumScrollEnd={(event) => { const next = Math.max(0, Math.round(event.nativeEvent.contentOffset.x / Math.max(1, cardWidth + 10))); setActiveRailIndex(next); void Haptics.selectionAsync().catch(() => {}); }} />
              <View pointerEvents="none" style={styles.railPosition}><Text style={styles.railPositionText}>{String(Math.min(activeRailIndex + 1, railItems.length)).padStart(2, '0')}</Text><Text style={styles.railPositionDivider}>/</Text><Text style={styles.railPositionTotal}>{String(railItems.length).padStart(2, '0')}</Text></View>
            </Animated.View>
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View pointerEvents="box-none" style={[styles.flowBridge, { top: chromeHeight - 1, opacity: bridgeOpacity, transform: [{ translateY: bridgeTranslateY }] }]}>
        <View pointerEvents="none" style={styles.bridgeEdge}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>
        <View pointerEvents="none" style={styles.bridgeWhiteEdge} />
        <MotionPressable accessibilityLabel="Continuer naturellement dans le Flow" onPress={finish} style={styles.flowHint} scaleTo={0.96}>
          <GlassOutline radius={18} opacity={0.28} />
          <Animated.View style={{ transform: [{ translateY: hintMotion.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) }] }}><Ionicons name="chevron-up" size={15} color="#DCCEFF" /></Animated.View>
          <View style={styles.hintCopy}><Text style={styles.hintKicker}>LE FLOW EST DÉJÀ LÀ</Text><Text style={styles.hintText}>Glisse, le morceau continue</Text></View>
        </MotionPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 120, backgroundColor: 'transparent' },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: SIGNAL.black, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  header: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 8, gap: 10 },
  brandRow: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: SIGNAL.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', shadowColor: SIGNAL.violet, shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  brandImage: { width: 25, height: 25 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 18, lineHeight: 19, fontWeight: '900', letterSpacing: 0 },
  brandLine: { marginTop: 3, color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BOLD, fontSize: 9.5, lineHeight: 12, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  pulseSection: { width: '100%', paddingBottom: 12 },
  pulseCard: { flex: 1, overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.21)', backgroundColor: SIGNAL.surface },
  pulseHeader: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 9 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { minHeight: 24, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1 },
  badgeViolet: { backgroundColor: 'rgba(115,87,198,0.18)', borderColor: 'rgba(169,139,232,0.46)' },
  badgeCyan: { backgroundColor: 'rgba(74,158,170,0.14)', borderColor: 'rgba(114,187,197,0.4)' },
  badgeText: { fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 1.15 },
  punchline: { marginTop: 9, maxWidth: '96%', color: '#FFF', fontFamily: FONT_BLACK, fontSize: 31, lineHeight: 29, fontWeight: '900', letterSpacing: 0 },
  punchlineCompact: { fontSize: 27, lineHeight: 26, letterSpacing: 0 },
  ticker: { minHeight: 42, marginHorizontal: 14, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.045)' },
  tickerContent: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  tickerIcon: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,158,170,0.17)', borderWidth: 1, borderColor: 'rgba(114,187,197,0.44)' },
  tickerLabel: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.05 },
  tickerMessage: { flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.78)', fontFamily: FONT_BLACK, fontSize: 9.5, fontWeight: '900' },
  tickerCount: { color: 'rgba(255,255,255,0.38)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressClip: { position: 'absolute', bottom: 0, left: 0, height: 2.5, overflow: 'hidden', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  railWrap: { marginTop: 9, overflow: 'hidden' },
  railContent: { paddingLeft: 14, paddingRight: 48, paddingVertical: 3 },
  railGap: { width: 10 },
  leftFade: { position: 'absolute', zIndex: 5, left: 0, top: 0, bottom: 0, width: 18 },
  rightFade: { position: 'absolute', zIndex: 5, right: 0, top: 0, bottom: 0, width: 34 },
  railFrame: { overflow: 'visible' },
  railCard: { width: '100%', height: '100%', overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.23)', backgroundColor: '#17151B', padding: 13, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  cardHeader: { minHeight: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kickerRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, shadowColor: SIGNAL.coral, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  cardKicker: { fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.95 },
  postBody: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 5 },
  postAvatarRing: { width: 47, height: 47, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)' },
  postAvatar: { width: '100%', height: '100%' },
  postFallback: { width: 29, height: 29 },
  postCopy: { flex: 1, minWidth: 0 },
  postName: { color: 'rgba(255,255,255,0.96)', fontFamily: FONT_BLACK, fontSize: 13.5, fontWeight: '900', letterSpacing: 0 },
  postText: { marginTop: 4, color: 'rgba(255,255,255,0.52)', fontFamily: FONT_BOLD, fontSize: 9.5, lineHeight: 13, fontWeight: '700' },
  cardFooter: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardCta: { flex: 1, color: 'rgba(255,255,255,0.78)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  socialIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.26)', borderWidth: 1, borderColor: 'rgba(169,139,232,0.48)' },
  socialBadge: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 9, paddingVertical: 5, color: 'rgba(255,255,255,0.66)', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  socialTitle: { marginTop: 8, flex: 1, color: '#FFF', fontFamily: FONT_BLACK, fontSize: 16.5, lineHeight: 17.5, fontWeight: '900', letterSpacing: 0 },
  socialFooter: { minHeight: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatarWrap: { width: 25, height: 25, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#17151B', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.82)' },
  stackAvatar: { width: '100%', height: '100%' },
  stackFallback: { width: 15, height: 15 },
  socialHint: { color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BOLD, fontSize: 8, fontWeight: '700' },
  trackCardContent: { flex: 1, justifyContent: 'space-between' },
  trackBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(114,187,197,0.5)', backgroundColor: 'rgba(74,158,170,0.18)', paddingHorizontal: 8, paddingVertical: 5, color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.75, textTransform: 'uppercase' },
  trackTitle: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 15.5, lineHeight: 16.5, fontWeight: '900', letterSpacing: 0 },
  trackArtist: { marginTop: 3, color: 'rgba(255,255,255,0.62)', fontFamily: FONT_BOLD, fontSize: 9, fontWeight: '700' },
  trackMeta: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackMetaText: { color: 'rgba(255,255,255,0.68)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900' },
  shortcutContent: { flex: 1, justifyContent: 'space-between' },
  shortcutIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  shortcutTitle: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 13.5, fontWeight: '900' },
  shortcutSub: { marginTop: 3, color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BOLD, fontSize: 8.5, fontWeight: '700' },
  studioIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,109,99,0.22)', borderWidth: 1, borderColor: 'rgba(240,170,162,0.46)' },
  studioTitle: { marginTop: 8, flex: 1, color: '#FFF', fontFamily: FONT_BLACK, fontSize: 16, lineHeight: 17.5, fontWeight: '900', letterSpacing: 0 },
  studioCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  studioCta: { color: SIGNAL.coralSoft, fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  railPosition: { position: 'absolute', right: 12, bottom: 4, zIndex: 8, minWidth: 43, height: 22, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: 'rgba(9,9,11,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  railPositionText: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900' },
  railPositionDivider: { color: 'rgba(255,255,255,0.28)', fontSize: 7 },
  railPositionTotal: { color: 'rgba(255,255,255,0.42)', fontFamily: FONT_BLACK, fontSize: 7, fontWeight: '900' },
  flowBridge: { position: 'absolute', left: 0, right: 0, height: 76, zIndex: 124, pointerEvents: 'box-none' },
  bridgeEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, opacity: 0.94 },
  bridgeWhiteEdge: { position: 'absolute', top: 2.5, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  flowHint: { position: 'absolute', top: 12, alignSelf: 'center', minHeight: 44, maxWidth: 236, flexDirection: 'row', alignItems: 'center', gap: 9, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', backgroundColor: 'rgba(9,9,11,0.66)', paddingHorizontal: 13, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  hintCopy: { minWidth: 0 },
  hintKicker: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  hintText: { marginTop: 2, color: 'rgba(255,255,255,0.72)', fontFamily: FONT_BOLD, fontSize: 8.5, fontWeight: '700' },
});

export default HomeFlowPrelude;
