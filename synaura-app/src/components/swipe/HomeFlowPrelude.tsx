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
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';
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

const BANNER_ROTATION_MS = 4200;
const FONT_BLACK = Platform.select({ android: 'sans-serif-black', ios: 'System', default: 'System' });
const FONT_BOLD = Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' });

const COLORS = {
  violet: '#7357C6',
  violetSoft: '#A98BE8',
  cyan: '#4A9EAA',
  cyanSoft: '#72BBC5',
  coral: '#D96D63',
  coralSoft: '#F0AAA2',
  orange: '#F4A261',
  paper: '#F7F6F3',
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

function countOf(value: number | string[] | undefined | null) {
  return Array.isArray(value) ? value.length : Number(value || 0);
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

function AuraBackground({ variant }: { variant: 'primary' | 'secondary' }) {
  const suffix = variant === 'primary' ? 'One' : 'Two';
  const primary = variant === 'primary';

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <SvgRadialGradient
          id={`violetAura${suffix}`}
          cx={primary ? '6' : '32'}
          cy={primary ? '4' : '18'}
          rx={primary ? '74' : '62'}
          ry={primary ? '64' : '56'}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={COLORS.violet} stopOpacity={primary ? 0.5 : 0.28} />
          <Stop offset="0.34" stopColor={COLORS.violet} stopOpacity={primary ? 0.2 : 0.1} />
          <Stop offset="0.74" stopColor={COLORS.violet} stopOpacity={primary ? 0.04 : 0.018} />
          <Stop offset="1" stopColor={COLORS.violet} stopOpacity="0" />
        </SvgRadialGradient>
        <SvgRadialGradient
          id={`coralAura${suffix}`}
          cx={primary ? '98' : '74'}
          cy={primary ? '10' : '34'}
          rx={primary ? '70' : '66'}
          ry={primary ? '60' : '62'}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={COLORS.coral} stopOpacity={primary ? 0.42 : 0.24} />
          <Stop offset="0.38" stopColor={COLORS.coral} stopOpacity={primary ? 0.17 : 0.08} />
          <Stop offset="0.77" stopColor={COLORS.coral} stopOpacity={primary ? 0.03 : 0.012} />
          <Stop offset="1" stopColor={COLORS.coral} stopOpacity="0" />
        </SvgRadialGradient>
        <SvgRadialGradient
          id={`cyanAura${suffix}`}
          cx={primary ? '52' : '18'}
          cy={primary ? '18' : '48'}
          rx={primary ? '58' : '64'}
          ry={primary ? '50' : '58'}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={COLORS.cyan} stopOpacity={primary ? 0.27 : 0.2} />
          <Stop offset="0.42" stopColor={COLORS.cyan} stopOpacity={primary ? 0.1 : 0.07} />
          <Stop offset="0.82" stopColor={COLORS.cyan} stopOpacity={primary ? 0.018 : 0.012} />
          <Stop offset="1" stopColor={COLORS.cyan} stopOpacity="0" />
        </SvgRadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#violetAura${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#coralAura${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#cyanAura${suffix})`} />
    </Svg>
  );
}

function CardAura({ color, opacity, id }: { color: string; opacity: number; id: string }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <SvgRadialGradient id={id} cx="94" cy="4" rx="78" ry="86" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.4" stopColor={color} stopOpacity={opacity * 0.38} />
          <Stop offset="0.78" stopColor={color} stopOpacity={opacity * 0.055} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgRadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.2 }: { radius: number; opacity?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: `rgba(255,255,255,${opacity})`,
        },
      ]}
    />
  );
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

  const exitProgress = useRef(new Animated.Value(0)).current;
  const exitProgressValue = useRef(0);
  const bannerIn = useRef(new Animated.Value(1)).current;
  const bannerProgress = useRef(new Animated.Value(0)).current;
  const cardsIn = useRef(new Animated.Value(0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;
  const cardMotion = useRef(new Animated.Value(0)).current;
  const coverBreathe = useRef(new Animated.Value(0)).current;
  const swipeGuide = useRef(new Animated.Value(0)).current;
  const playPulse = useRef(new Animated.Value(0)).current;
  const equalizer = useRef(new Animated.Value(0)).current;
  const finishingRef = useRef(false);

  const playableTracks = useMemo(() => tracks.filter((track) => Boolean(track.audioUrl)), [tracks]);
  const firstTrack = playableTracks[0] || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const featuredCover = getTrackCoverImage(featuredTrack);
  const nextTrack = playableTracks.find((track) => track._id !== featuredTrack?._id) || null;
  const discoveryTracks = playableTracks.filter((track) => track._id !== featuredTrack?._id).slice(0, 4);
  const latestPost = posts[0] || null;
  const greetingName = userName?.trim().split(/\s+/)[0] || null;
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isPlayingFeatured = Boolean(isCurrentTrack && currentPlaying);

  const bannerItems = useMemo(
    () => [
      latestPost ? `${latestPost.author} vient de publier` : 'La communauté se réveille doucement',
      featuredTrack ? `Fais partie des premiers sur « ${featuredTrack.title} »` : 'Ton prochain son est en approche',
      'Quelqu’un pourrait t’avoir suivi récemment 👀',
      'Le Radar pense avoir trouvé ta prochaine boucle',
      'Pas de drama, juste des sons à découvrir',
      'Ton algorithme a bossé pendant ton absence',
    ],
    [featuredTrack, latestPost],
  );

  const avatarCandidates = useMemo(
    () => playableTracks
      .map((track) => track.artist?.avatar)
      .filter((avatar): avatar is string => Boolean(avatar))
      .slice(0, 3),
    [playableTracks],
  );

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      { label: 'Découvrir', sub: 'Trouve ton mood', icon: 'compass-outline', accent: COLORS.orange, onPress: onDiscover },
      { label: 'Radar', sub: 'Ce qui chauffe', icon: 'radio-outline', accent: COLORS.cyan, onPress: onRadar },
      { label: 'Studio IA', sub: 'Crée maintenant', icon: 'sparkles-outline', accent: COLORS.coral, onPress: onStudio },
      { label: 'Événements', sub: 'La scène Synaura', icon: 'calendar-outline', accent: COLORS.violetSoft, onPress: onEvents },
    ],
    [onDiscover, onEvents, onRadar, onStudio],
  );

  const railItems = useMemo<RailItem[]>(() => {
    const items: RailItem[] = [
      { id: 'activity', kind: 'post', post: latestPost },
      { id: 'social', kind: 'social', avatars: avatarCandidates },
    ];

    discoveryTracks.forEach((track, index) => {
      items.push({
        id: `track-${track._id}`,
        kind: 'track',
        track,
        badge: index === 0 ? 'Fais partie des premiers' : index === 1 ? 'Ça monte' : 'Pour toi',
      });
    });

    shortcuts.forEach((shortcut) => {
      items.push({ id: `shortcut-${shortcut.label}`, kind: 'shortcut', shortcut });
    });

    items.push({ id: 'studio-push', kind: 'studio' });
    return items;
  }, [avatarCandidates, discoveryTracks, latestPost, shortcuts]);

  const availableHeight = Math.max(420, responsive.height - Math.max(0, bottomPad));
  const pulseHeight = clamp(
    availableHeight * (responsive.isVeryShort ? 0.39 : responsive.isTall ? 0.45 : 0.43),
    responsive.isVeryShort ? 220 : 258,
    responsive.isTall ? 352 : 326,
  );
  const railHeight = clamp(pulseHeight * 0.37, responsive.isVeryShort ? 94 : 110, 138);
  const cardWidth = clamp(responsive.safeWidth * 0.64, responsive.isTiny ? 205 : 220, 278);
  const compact = responsive.isNarrow || responsive.isShort;

  useEffect(() => {
    const id = exitProgress.addListener(({ value }) => {
      exitProgressValue.current = value;
    });
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
    cardsIn.setValue(0);

    const cardsAnimation = Animated.timing(cardsIn, {
      toValue: 1,
      duration: settings.reducedMotion ? 1 : 520,
      delay: settings.reducedMotion ? 0 : 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    cardsAnimation.start();

    if (settings.reducedMotion) {
      auraOne.setValue(0.5);
      auraTwo.setValue(0.5);
      cardMotion.setValue(0.5);
      coverBreathe.setValue(0);
      swipeGuide.setValue(0);
      playPulse.setValue(0);
      equalizer.setValue(0.5);
      return () => cardsAnimation.stop();
    }

    const auraOneLoop = Animated.loop(Animated.sequence([
      Animated.timing(auraOne, { toValue: 1, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const auraTwoLoop = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const cardLoop = Animated.loop(Animated.timing(cardMotion, {
      toValue: 1,
      duration: 5200,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }));
    const coverLoop = Animated.loop(Animated.sequence([
      Animated.timing(coverBreathe, { toValue: 1, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coverBreathe, { toValue: 0, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const swipeLoop = Animated.loop(Animated.sequence([
      Animated.delay(160),
      Animated.timing(swipeGuide, { toValue: 1, duration: 1350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(swipeGuide, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.delay(180),
    ]));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(playPulse, { toValue: 1, duration: 1750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(playPulse, { toValue: 0, duration: 1, useNativeDriver: true }),
    ]));
    const eqLoop = Animated.loop(Animated.sequence([
      Animated.timing(equalizer, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(equalizer, { toValue: 0, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));

    auraOneLoop.start();
    auraTwoLoop.start();
    cardLoop.start();
    coverLoop.start();
    swipeLoop.start();
    pulseLoop.start();
    eqLoop.start();

    return () => {
      cardsAnimation.stop();
      auraOneLoop.stop();
      auraTwoLoop.stop();
      cardLoop.stop();
      coverLoop.stop();
      swipeLoop.stop();
      pulseLoop.stop();
      eqLoop.stop();
    };
  }, [
    auraOne,
    auraTwo,
    cardMotion,
    cardsIn,
    coverBreathe,
    equalizer,
    exitProgress,
    playPulse,
    settings.reducedMotion,
    swipeGuide,
    visible,
  ]);

  useEffect(() => {
    if (!visible || bannerItems.length < 2) return;
    const interval = setInterval(() => {
      setBannerIndex((current) => (current + 1) % bannerItems.length);
    }, BANNER_ROTATION_MS);
    return () => clearInterval(interval);
  }, [bannerItems.length, visible]);

  useEffect(() => {
    if (!visible) return;

    bannerIn.stopAnimation();
    bannerProgress.stopAnimation();
    bannerIn.setValue(0);
    bannerProgress.setValue(0);

    Animated.parallel([
      Animated.timing(bannerIn, {
        toValue: 1,
        duration: settings.reducedMotion ? 1 : 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bannerProgress, {
        toValue: 1,
        duration: settings.reducedMotion ? 1 : BANNER_ROTATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
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

    Animated.timing(exitProgress, {
      toValue: 1,
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onEnterFlow();
      else finishingRef.current = false;
    });
  }, [exitProgress, onEnterFlow, settings.reducedMotion]);

  const resetExit = useCallback(() => {
    if (finishingRef.current) return;
    Animated.spring(exitProgress, {
      toValue: 0,
      speed: 28,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  }, [exitProgress]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.22
    ),
    onPanResponderMove: (_, gesture) => {
      exitProgress.setValue(clamp(-gesture.dy / Math.max(1, responsive.height), 0, 1));
    },
    onPanResponderRelease: (_, gesture) => {
      if (exitProgressValue.current > 0.055 || gesture.vy < -0.3) finish();
      else resetExit();
    },
    onPanResponderTerminate: resetExit,
  }), [exitProgress, finish, resetExit, responsive.height]);

  if (!visible) return null;

  const screenTranslateY = exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -responsive.height] });
  const screenOpacity = exitProgress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 0.98, 0.72], extrapolate: 'clamp' });
  const contentTranslateY = exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -48] });
  const contentScale = exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
  const bannerWidth = bannerProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const cardsTranslateY = cardsIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const coverScale = coverBreathe.interpolate({ inputRange: [0, 1], outputRange: [1.01, 1.065] });
  const fingerTranslateY = swipeGuide.interpolate({ inputRange: [0, 1], outputRange: [22, -26] });
  const fingerOpacity = swipeGuide.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const pulseScale = playPulse.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1.62] });
  const pulseOpacity = playPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 16] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1.13] }) },
      { rotate: auraOne.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1.2deg'] }) },
    ],
  };

  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.82] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [15, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1.02] }) },
      { rotate: auraTwo.interpolate({ inputRange: [0, 1], outputRange: ['1.4deg', '-1deg'] }) },
    ],
  };

  const renderRailItem = ({ item, index }: { item: RailItem; index: number }) => {
    const width = item.kind === 'shortcut' ? Math.max(148, cardWidth * 0.66) : cardWidth;
    const direction = index % 2 === 0 ? -1 : 1;
    const floatY = cardMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, direction * 3.5, 0] });
    const floatX = cardMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, direction * 1.5, 0] });
    const cardScale = cardMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.008, 1] });
    const auraShift = cardMotion.interpolate({ inputRange: [0, 1], outputRange: [direction * -8, direction * 8] });
    const auraOpacity = cardMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 1, 0.72] });

    const frameStyle = [
      styles.railFrame,
      {
        width,
        height: railHeight,
        transform: [{ translateY: floatY }, { translateX: floatX }, { scale: cardScale }],
      },
    ];

    const animatedAura = (color: string, opacity: number, id: string) => (
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: auraOpacity,
            transform: [{ translateX: auraShift }, { scale: 1.08 }],
          },
        ]}
      >
        <CardAura color={color} opacity={opacity} id={id} />
      </Animated.View>
    );

    if (item.kind === 'post') {
      const post = item.post;
      return (
        <Animated.View style={frameStyle}>
          <MotionPressable
            accessibilityLabel={post ? `Ouvrir le post de ${post.author}` : 'Découvrir la communauté'}
            onPress={() => post ? hapticPress(() => onOpenPost(post)) : hapticPress(onDiscover)}
            style={styles.railCard}
            scaleTo={0.975}
          >
            <LinearGradient colors={['rgba(217,109,99,0.28)', 'rgba(31,24,29,0.98)', 'rgba(244,162,97,0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            {animatedAura(COLORS.coral, 0.34, `postAura${index}`)}
            <GlassOutline radius={20} opacity={0.23} />
            <View style={styles.cardHeader}>
              <View style={styles.cardKickerRow}>
                <View style={[styles.liveDot, { backgroundColor: COLORS.coral }]} />
                <Text style={[styles.cardKicker, { color: COLORS.coralSoft }]}>ÇA BOUGE MAINTENANT</Text>
              </View>
              <Ionicons name="trending-up" size={14} color={COLORS.orange} />
            </View>
            <View style={styles.postBody}>
              <View style={styles.postAvatarRing}>
                {post?.avatar ? (
                  <ExpoImage source={{ uri: post.avatar }} contentFit="cover" transition={140} style={styles.postAvatar} />
                ) : (
                  <Image source={brandSymbol} resizeMode="contain" style={styles.postAvatarFallback} />
                )}
              </View>
              <View style={styles.postCopy}>
                <Text numberOfLines={1} style={styles.postName}>{post?.author || 'La communauté'}</Text>
                <Text numberOfLines={2} style={styles.postText}>{post ? postPreview(post) : 'Les prochaines publications apparaîtront ici.'}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.cardCtaRow}>
                <Text style={styles.cardCta}>{post ? 'Voir ce que t’as raté' : 'Explorer la communauté'}</Text>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.76)" />
              </View>
              {post ? (
                <View style={styles.postCounts}>
                  <Ionicons name="heart-outline" size={11} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.postCountText}>{compactCount(post.likesCount)}</Text>
                  <Ionicons name="chatbubble-outline" size={11} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.postCountText}>{compactCount(post.commentsCount)}</Text>
                </View>
              ) : null}
            </View>
          </MotionPressable>
        </Animated.View>
      );
    }

    if (item.kind === 'social') {
      const avatars = item.avatars.length ? item.avatars : [];
      return (
        <Animated.View style={frameStyle}>
          <MotionPressable accessibilityLabel="Ouvrir ton réseau" onPress={() => hapticPress(onDiscover)} style={styles.railCard} scaleTo={0.975}>
            <LinearGradient colors={['rgba(115,87,198,0.32)', 'rgba(24,20,31,0.98)', 'rgba(74,158,170,0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            {animatedAura(COLORS.violet, 0.36, `socialAura${index}`)}
            <GlassOutline radius={20} opacity={0.23} />
            <View style={styles.cardHeader}>
              <View style={styles.socialIcon}><Ionicons name="person-add-outline" size={19} color="#DCCEFF" /></View>
              <Text style={styles.socialBadge}>SOCIAL</Text>
            </View>
            <Text numberOfLines={3} style={styles.socialTitle}>Quelqu’un t’a peut-être suivi récemment 👀</Text>
            <View style={styles.socialFooter}>
              <View style={styles.avatarStack}>
                {(avatars.length ? avatars : [null]).map((avatar, avatarIndex) => (
                  <View key={`${avatar || 'fallback'}-${avatarIndex}`} style={[styles.stackAvatarWrap, avatarIndex ? { marginLeft: -9 } : null]}>
                    {avatar ? <ExpoImage source={{ uri: avatar }} contentFit="cover" style={styles.stackAvatar} /> : <Image source={brandSymbol} resizeMode="contain" style={styles.stackAvatarFallback} />}
                  </View>
                ))}
              </View>
              <Text style={styles.socialHint}>Ouvre ton réseau</Text>
            </View>
          </MotionPressable>
        </Animated.View>
      );
    }

    if (item.kind === 'track') {
      const cover = getTrackCoverImage(item.track);
      return (
        <Animated.View style={frameStyle}>
          <MotionPressable accessibilityLabel={`Ouvrir ${item.track.title}`} onPress={() => hapticPress(() => onOpenTrack(item.track))} style={styles.railCard} scaleTo={0.975}>
            {cover ? <ExpoImage source={{ uri: cover }} contentFit="cover" transition={160} style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#362640', '#142B2F', '#151217']} style={StyleSheet.absoluteFillObject} />}
            <LinearGradient colors={['rgba(5,5,7,0.02)', 'rgba(5,5,7,0.16)', 'rgba(5,5,7,0.94)']} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={['rgba(5,5,7,0.62)', 'rgba(5,5,7,0.04)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
            {animatedAura(COLORS.cyan, 0.2, `trackAura${index}`)}
            <GlassOutline radius={20} opacity={0.24} />
            <View style={styles.trackCardContent}>
              <Text style={styles.trackBadge}>{item.badge}</Text>
              <View>
                <Text numberOfLines={2} style={styles.trackCardTitle}>{item.track.title}</Text>
                <Text numberOfLines={1} style={styles.trackCardArtist}>{artistName(item.track)}</Text>
                <View style={styles.trackMeta}>
                  <Ionicons name="headset-outline" size={12} color="rgba(255,255,255,0.82)" />
                  <Text style={styles.trackMetaText}>{compactCount(item.track.plays || 0)} écoutes</Text>
                </View>
              </View>
            </View>
          </MotionPressable>
        </Animated.View>
      );
    }

    if (item.kind === 'shortcut') {
      const { shortcut } = item;
      return (
        <Animated.View style={frameStyle}>
          <MotionPressable accessibilityLabel={shortcut.label} onPress={() => hapticPress(shortcut.onPress)} style={[styles.railCard, { borderColor: `${shortcut.accent}6A` }]} scaleTo={0.97}>
            <LinearGradient colors={[`${shortcut.accent}38`, 'rgba(22,20,26,0.98)', `${shortcut.accent}10`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            {animatedAura(shortcut.accent, 0.28, `shortcutAura${index}`)}
            <GlassOutline radius={20} opacity={0.2} />
            <View style={styles.shortcutCardContent}>
              <View style={[styles.shortcutIcon, { backgroundColor: `${shortcut.accent}26`, borderColor: `${shortcut.accent}66` }]}>
                <Ionicons name={shortcut.icon} size={19} color={shortcut.accent} />
              </View>
              <View>
                <Text style={styles.shortcutTitle}>{shortcut.label}</Text>
                <Text numberOfLines={1} style={styles.shortcutSub}>{shortcut.sub}</Text>
              </View>
            </View>
          </MotionPressable>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={frameStyle}>
        <MotionPressable accessibilityLabel="Ouvrir le Studio IA" onPress={() => hapticPress(onStudio)} style={styles.railCard} scaleTo={0.975}>
          <LinearGradient colors={['rgba(217,109,99,0.31)', 'rgba(115,87,198,0.22)', 'rgba(18,16,23,0.98)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          {animatedAura(COLORS.coral, 0.33, `studioAura${index}`)}
          <GlassOutline radius={20} opacity={0.23} />
          <View style={styles.studioIcon}><Ionicons name="flash-outline" size={21} color="#FFD8D3" /></View>
          <Text numberOfLines={3} style={styles.studioTitle}>Ton prochain banger attend juste un clic.</Text>
          <View style={styles.studioCtaRow}><Text style={styles.studioCta}>Va cuisiner ça</Text><Ionicons name="chevron-forward" size={13} color={COLORS.coralSoft} /></View>
        </MotionPressable>
      </Animated.View>
    );
  };

  return (
    <Animated.View {...panResponder.panHandlers} style={[styles.overlay, { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }]}>
      <View style={[styles.surface, { paddingBottom: bottomPad }]}> 
        <LinearGradient pointerEvents="none" colors={['#09090B', '#0C0B10', '#09090B']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFillObject} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><AuraBackground variant="primary" /></Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><AuraBackground variant="secondary" /></Animated.View>

        <Animated.View style={[styles.stage, { transform: [{ translateY: contentTranslateY }, { scale: contentScale }] }]}> 
          <View style={[styles.header, { minHeight: topPad + (compact ? 50 : 56), paddingTop: topPad + 6, paddingHorizontal: responsive.gutter }]}> 
            <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={styles.brandRow} scaleTo={0.97}>
              <View style={styles.brandLogo}>
                <Animated.View style={[styles.brandPulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                <Image source={brandSymbol} resizeMode="contain" style={styles.brandImage} />
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.brandName}>Synaura</Text>
                <Text numberOfLines={1} style={styles.brandLine}>{greetingName ? `Salut ${greetingName}, regarde ce que t’as raté` : 'Écoute, crée, partage'}</Text>
              </View>
            </MotionPressable>

            <View style={styles.headerActions}>
              <MotionPressable accessibilityLabel="Rechercher" onPress={() => hapticPress(onSearch)} style={styles.headerButton} scaleTo={0.9}><Ionicons name="search" size={compact ? 17 : 18} color="rgba(255,255,255,0.88)" /></MotionPressable>
              <MotionPressable accessibilityLabel="Messages" onPress={() => hapticPress(() => navigation.navigate('Messages'))} style={styles.headerButton} scaleTo={0.9}><Ionicons name="chatbubble-outline" size={compact ? 17 : 18} color="rgba(255,255,255,0.88)" /></MotionPressable>
              <MotionPressable accessibilityLabel="Notifications" onPress={() => hapticPress(onNotifications)} style={styles.headerButton} scaleTo={0.9}><Ionicons name="notifications-outline" size={compact ? 18 : 19} color="rgba(255,255,255,0.88)" /></MotionPressable>
            </View>
          </View>

          <View style={[styles.pulseSection, { height: pulseHeight, paddingHorizontal: responsive.gutter }]}> 
            <LinearGradient colors={['rgba(20,18,26,0.96)', 'rgba(12,11,15,0.94)', 'rgba(9,9,11,0.9)']} locations={[0, 0.56, 1]} style={styles.pulseCard}>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.82] }), transform: [{ translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) }, { scale: 1.06 }] }]}>
                <CardAura color={COLORS.violet} opacity={0.16} id="pulseAura" />
              </Animated.View>
              <GlassOutline radius={26} opacity={0.2} />

              <View style={styles.pulseHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, styles.badgeViolet]}><Text style={[styles.badgeText, { color: '#DCCEFF' }]}>PENDANT TON ABSENCE</Text></View>
                  <View style={[styles.badge, styles.badgeCyan]}><Text style={[styles.badgeText, { color: '#A8DEE5' }]}>SWIPE LES CARTES</Text></View>
                </View>
                <Text maxFontSizeMultiplier={1.08} numberOfLines={3} adjustsFontSizeToFit style={[styles.punchline, compact && styles.punchlineCompact]}>{PUNCHLINES[phraseIndex]}</Text>
              </View>

              <View style={styles.ticker}>
                <LinearGradient colors={['rgba(115,87,198,0.18)', 'rgba(255,255,255,0.06)', 'rgba(74,158,170,0.16)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
                <GlassOutline radius={14} opacity={0.18} />
                <Animated.View key={bannerIndex} style={[styles.tickerContent, { opacity: bannerIn, transform: [{ translateY: bannerIn.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>
                  <View style={styles.tickerIcon}><Ionicons name="flash-outline" size={13} color="#A8DEE5" /></View>
                  {!responsive.isTiny ? <Text style={styles.tickerLabel}>EN CE MOMENT</Text> : null}
                  <Text numberOfLines={1} style={styles.tickerMessage}>{bannerItems[bannerIndex]}</Text>
                  <Text style={styles.tickerCount}>{String(bannerIndex + 1).padStart(2, '0')} / {String(bannerItems.length).padStart(2, '0')}</Text>
                </Animated.View>
                <Animated.View style={[styles.tickerProgressClip, { width: bannerWidth }]}> 
                  <LinearGradient colors={[COLORS.violet, COLORS.cyan, COLORS.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
                </Animated.View>
              </View>

              <Animated.View style={[styles.railWrap, { flex: 1, opacity: cardsIn, transform: [{ translateY: cardsTranslateY }] }]}> 
                <LinearGradient pointerEvents="none" colors={['#100F14', 'rgba(16,15,20,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.leftFade} />
                <LinearGradient pointerEvents="none" colors={['rgba(16,15,20,0)', '#100F14']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.rightFade} />
                <FlatList
                  horizontal
                  data={railItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRailItem}
                  ItemSeparatorComponent={() => <View style={styles.railGap} />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.railContent}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onMomentumScrollEnd={() => { void Haptics.selectionAsync().catch(() => {}); }}
                />
              </Animated.View>
            </LinearGradient>
          </View>

          <View style={styles.flowPreview}>
            {featuredCover ? (
              <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: coverScale }] }]}>
                <ExpoImage source={{ uri: featuredCover }} contentFit="cover" transition={180} cachePolicy="memory-disk" style={StyleSheet.absoluteFillObject} />
              </Animated.View>
            ) : (
              <LinearGradient colors={['#2C1830', '#143239', '#0A0A0D']} style={StyleSheet.absoluteFillObject} />
            )}
            <LinearGradient colors={['rgba(6,6,8,0.12)', 'rgba(6,6,8,0.04)', 'rgba(6,6,8,0.76)', 'rgba(6,6,8,0.98)']} locations={[0, 0.32, 0.78, 1]} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={['rgba(6,6,8,0.6)', 'rgba(6,6,8,0.06)', 'rgba(6,6,8,0.01)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
            <View pointerEvents="none" style={styles.flowTopOutline} />

            <View style={styles.previewBadge}><View style={styles.previewDot} /><Text style={styles.previewBadgeText}>APERÇU DU FLOW</Text></View>
            <View style={[styles.flowChips, { left: responsive.gutter }]}>
              <MotionPressable accessibilityLabel="Pour toi" onPress={onDiscover} style={styles.chip} scaleTo={0.95}><Text style={styles.chipText}>Pour toi</Text></MotionPressable>
              <MotionPressable accessibilityLabel="Ça monte" onPress={onRadar} style={[styles.chip, styles.chipHot]} scaleTo={0.95}><Text style={[styles.chipText, { color: '#FFD4CE' }]}>Ça monte</Text></MotionPressable>
            </View>

            <View style={[styles.flowCopy, { left: responsive.gutter, maxWidth: responsive.safeWidth * (responsive.isTiny ? 0.61 : 0.68) }]}>
              <Text style={styles.flowKicker}>{isCurrentTrack ? 'REPRENDRE MAINTENANT' : 'PREMIER SON DE TON FLOW'}</Text>
              <MotionPressable accessibilityLabel="Ouvrir le morceau" disabled={!featuredTrack} onPress={() => featuredTrack && hapticPress(() => onOpenTrack(featuredTrack))} style={styles.trackCopy} scaleTo={0.99}>
                <Text maxFontSizeMultiplier={1.08} numberOfLines={2} adjustsFontSizeToFit style={[styles.flowTitle, compact && styles.flowTitleCompact]}>{featuredTrack?.title || 'Ton Flow se prépare'}</Text>
                <Text numberOfLines={1} style={styles.flowArtist}>{featuredTrack ? artistName(featuredTrack) : 'Synaura prépare ta sélection'}</Text>
              </MotionPressable>

              {featuredTrack ? (
                <View style={styles.flowMeta}>
                  <Text style={styles.flowMetaText}>{compactCount(featuredTrack.plays || 0)} écoutes</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.flowMetaText}>{compactCount(countOf(featuredTrack.likesCount ?? featuredTrack.likes))} j’aime</Text>
                  {nextTrack && !responsive.isTiny ? <Text numberOfLines={1} style={styles.nextTrack}>Ensuite : {nextTrack.title}</Text> : null}
                </View>
              ) : null}

              <View style={styles.flowButtons}>
                <MotionPressable accessibilityLabel="Écouter" disabled={!featuredTrack} onPress={() => featuredTrack && hapticPress(() => onPlayTrack(featuredTrack))} style={[styles.playButton, !featuredTrack && styles.disabledButton]} scaleTo={0.92}>
                  <Animated.View style={[styles.playPulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                  {isPlayingFeatured ? (
                    <View style={styles.equalizer}>
                      {[0, 1, 2, 3].map((bar) => (
                        <Animated.View key={bar} style={[styles.eqBar, { transform: [{ scaleY: equalizer.interpolate({ inputRange: [0, 1], outputRange: bar % 2 ? [1, 0.38] : [0.38, 1] }) }] }]} />
                      ))}
                    </View>
                  ) : (
                    <Ionicons name="play" size={compact ? 21 : 23} color="#111111" style={styles.playIcon} />
                  )}
                </MotionPressable>
                <MotionPressable accessibilityLabel="Voir en plein écran" onPress={finish} style={styles.fullscreenButton} scaleTo={0.96}>
                  <Ionicons name="radio-outline" size={16} color="#FFFFFF" />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.fullscreenText}>Voir en plein écran</Text>
                </MotionPressable>
              </View>
            </View>

            <View style={[styles.flowActions, { right: responsive.gutter }]}>
              <MotionPressable accessibilityLabel="Aimer" disabled={!featuredTrack} onPress={() => featuredTrack && hapticPress(() => onOpenTrack(featuredTrack))} style={styles.actionButton} scaleTo={0.9}><Ionicons name="heart-outline" size={compact ? 21 : 23} color="#FFFFFF" /></MotionPressable>
              <Text style={styles.actionCount}>{featuredTrack ? compactCount(countOf(featuredTrack.likesCount ?? featuredTrack.likes)) : '0'}</Text>
              <MotionPressable accessibilityLabel="Commentaires" disabled={!featuredTrack} onPress={() => featuredTrack && hapticPress(() => onOpenTrack(featuredTrack))} style={styles.actionButton} scaleTo={0.9}><Ionicons name="chatbubble-outline" size={compact ? 20 : 22} color="#FFFFFF" /></MotionPressable>
              <Text style={styles.actionCount}>{featuredTrack ? compactCount(countOf(featuredTrack.commentsCount ?? featuredTrack.comments)) : '0'}</Text>
              <MotionPressable accessibilityLabel="Partager" disabled={!featuredTrack} onPress={() => featuredTrack && hapticPress(() => onOpenTrack(featuredTrack))} style={styles.actionButton} scaleTo={0.9}><Ionicons name="share-social-outline" size={compact ? 20 : 22} color="#FFFFFF" /></MotionPressable>
            </View>

            <MotionPressable accessibilityLabel="Glisser vers le haut pour ouvrir le Flow" onPress={finish} style={[styles.swipePill, { right: responsive.gutter + (compact ? 47 : 54), top: compact ? '29%' : '31%' }]} scaleTo={0.97}>
              <LinearGradient colors={['rgba(115,87,198,0.34)', 'rgba(74,158,170,0.12)', 'rgba(217,109,99,0.24)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFillObject} />
              <GlassOutline radius={25} opacity={0.25} />
              <View style={styles.chevrons}>
                <Ionicons name="chevron-up" size={14} color="#DCCEFF" />
                <Ionicons name="chevron-up" size={14} color="#A8DEE5" style={styles.chevronOverlap} />
                <Ionicons name="chevron-up" size={14} color="#F0AAA2" style={styles.chevronOverlap} />
              </View>
              <View style={styles.fingerTrack}>
                <Animated.View style={[styles.finger, { opacity: fingerOpacity, transform: [{ translateY: fingerTranslateY }] }]}><View style={styles.fingerDot} /></Animated.View>
              </View>
              <Text style={styles.swipeText}>GLISSE</Text>
            </MotionPressable>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 120, overflow: 'hidden', backgroundColor: '#09090B' },
  surface: { flex: 1, overflow: 'hidden', backgroundColor: '#09090B' },
  stage: { flex: 1, overflow: 'hidden' },
  header: { zIndex: 20, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 8, gap: 10 },
  brandRow: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', shadowColor: COLORS.violet, shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  brandPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(169,139,232,0.72)' },
  brandImage: { width: 25, height: 25 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: COLORS.paper, fontFamily: FONT_BLACK, fontSize: 18, lineHeight: 19, fontWeight: '900', letterSpacing: -0.4 },
  brandLine: { marginTop: 3, color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BOLD, fontSize: 9.5, lineHeight: 12, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  pulseSection: { width: '100%', paddingBottom: 12 },
  pulseCard: { flex: 1, overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000000', shadowOpacity: 0.34, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 7 },
  pulseHeader: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 9 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { minHeight: 24, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1 },
  badgeViolet: { backgroundColor: 'rgba(115,87,198,0.18)', borderColor: 'rgba(169,139,232,0.46)' },
  badgeCyan: { backgroundColor: 'rgba(74,158,170,0.14)', borderColor: 'rgba(114,187,197,0.4)' },
  badgeText: { fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 1.15 },
  punchline: { marginTop: 9, maxWidth: '96%', color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 31, lineHeight: 29, fontWeight: '900', letterSpacing: -1.7 },
  punchlineCompact: { fontSize: 27, lineHeight: 26, letterSpacing: -1.35 },
  ticker: { minHeight: 42, marginHorizontal: 14, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.045)' },
  tickerContent: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  tickerIcon: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74,158,170,0.17)', borderWidth: 1, borderColor: 'rgba(114,187,197,0.44)' },
  tickerLabel: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.05 },
  tickerMessage: { flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.78)', fontFamily: FONT_BLACK, fontSize: 9.5, fontWeight: '900' },
  tickerCount: { color: 'rgba(255,255,255,0.38)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', fontVariant: ['tabular-nums'] },
  tickerProgressClip: { position: 'absolute', bottom: 0, left: 0, height: 2.5, overflow: 'hidden', borderTopRightRadius: 3, borderBottomRightRadius: 3, shadowColor: COLORS.cyan, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2 },
  railWrap: { marginTop: 9, overflow: 'hidden' },
  railContent: { paddingLeft: 14, paddingRight: 48, paddingVertical: 3 },
  railGap: { width: 10 },
  leftFade: { position: 'absolute', zIndex: 5, left: 0, top: 0, bottom: 0, width: 18 },
  rightFade: { position: 'absolute', zIndex: 5, right: 0, top: 0, bottom: 0, width: 34 },
  railFrame: { overflow: 'visible' },
  railCard: { width: '100%', height: '100%', overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: '#17151B', padding: 13, shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  cardHeader: { minHeight: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardKickerRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, shadowColor: COLORS.coral, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  cardKicker: { fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.95 },
  postBody: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 5 },
  postAvatarRing: { width: 47, height: 47, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)' },
  postAvatar: { width: '100%', height: '100%' },
  postAvatarFallback: { width: 29, height: 29 },
  postCopy: { flex: 1, minWidth: 0 },
  postName: { color: 'rgba(255,255,255,0.96)', fontFamily: FONT_BLACK, fontSize: 13.5, fontWeight: '900', letterSpacing: -0.25 },
  postText: { marginTop: 4, color: 'rgba(255,255,255,0.52)', fontFamily: FONT_BOLD, fontSize: 9.5, lineHeight: 13, fontWeight: '700' },
  cardFooter: { minHeight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardCtaRow: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardCta: { flexShrink: 1, color: 'rgba(255,255,255,0.78)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  postCounts: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  postCountText: { color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900' },
  socialIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.26)', borderWidth: 1, borderColor: 'rgba(169,139,232,0.48)' },
  socialBadge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 9, paddingVertical: 5, color: 'rgba(255,255,255,0.66)', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
  socialTitle: { marginTop: 8, flex: 1, color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 16.5, lineHeight: 17.5, fontWeight: '900', letterSpacing: -0.55 },
  socialFooter: { minHeight: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatarWrap: { width: 25, height: 25, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#17151B', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.82)' },
  stackAvatar: { width: '100%', height: '100%' },
  stackAvatarFallback: { width: 15, height: 15 },
  socialHint: { color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BOLD, fontSize: 8, fontWeight: '700' },
  trackCardContent: { flex: 1, justifyContent: 'space-between' },
  trackBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(114,187,197,0.5)', backgroundColor: 'rgba(74,158,170,0.18)', paddingHorizontal: 8, paddingVertical: 5, color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.75, textTransform: 'uppercase' },
  trackCardTitle: { color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 15.5, lineHeight: 16.5, fontWeight: '900', letterSpacing: -0.4 },
  trackCardArtist: { marginTop: 3, color: 'rgba(255,255,255,0.62)', fontFamily: FONT_BOLD, fontSize: 9, fontWeight: '700' },
  trackMeta: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackMetaText: { color: 'rgba(255,255,255,0.68)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900' },
  shortcutCardContent: { flex: 1, justifyContent: 'space-between' },
  shortcutIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  shortcutTitle: { color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 13.5, fontWeight: '900' },
  shortcutSub: { marginTop: 3, color: 'rgba(255,255,255,0.48)', fontFamily: FONT_BOLD, fontSize: 8.5, fontWeight: '700' },
  studioIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,109,99,0.22)', borderWidth: 1, borderColor: 'rgba(240,170,162,0.46)' },
  studioTitle: { marginTop: 8, flex: 1, color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 16, lineHeight: 17.5, fontWeight: '900', letterSpacing: -0.45 },
  studioCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  studioCta: { color: COLORS.coralSoft, fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  flowPreview: { flex: 1, minHeight: 250, overflow: 'hidden', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: '#121014', shadowColor: '#000000', shadowOpacity: 0.38, shadowRadius: 26, shadowOffset: { width: 0, height: -10 }, elevation: 8 },
  flowTopOutline: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  previewBadge: { position: 'absolute', zIndex: 8, top: 13, alignSelf: 'center', minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 13, backgroundColor: 'rgba(12,10,14,0.54)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)' },
  previewDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.cyanSoft, shadowColor: COLORS.cyanSoft, shadowOpacity: 0.9, shadowRadius: 8, elevation: 3 },
  previewBadgeText: { color: 'rgba(255,255,255,0.9)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.85 },
  flowChips: { position: 'absolute', zIndex: 8, top: 53, flexDirection: 'row', gap: 7 },
  chip: { minHeight: 31, justifyContent: 'center', borderRadius: 16, paddingHorizontal: 12, backgroundColor: 'rgba(7,7,9,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  chipHot: { backgroundColor: 'rgba(217,109,99,0.18)', borderColor: 'rgba(240,170,162,0.48)' },
  chipText: { color: 'rgba(255,255,255,0.88)', fontFamily: FONT_BLACK, fontSize: 9, fontWeight: '900' },
  flowCopy: { position: 'absolute', zIndex: 10, bottom: 17 },
  flowKicker: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.25 },
  trackCopy: { minWidth: 0 },
  flowTitle: { marginTop: 6, color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 29, lineHeight: 28, fontWeight: '900', letterSpacing: -1.35, textShadowColor: 'rgba(0,0,0,0.42)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12 },
  flowTitleCompact: { fontSize: 25, lineHeight: 24, letterSpacing: -1.05 },
  flowArtist: { marginTop: 6, color: 'rgba(255,255,255,0.7)', fontFamily: FONT_BLACK, fontSize: 10.5, fontWeight: '900' },
  flowMeta: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  flowMetaText: { color: 'rgba(255,255,255,0.58)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.38)' },
  nextTrack: { maxWidth: 120, color: 'rgba(255,255,255,0.38)', fontFamily: FONT_BOLD, fontSize: 8, fontWeight: '700' },
  flowButtons: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  playButton: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', shadowColor: '#000000', shadowOpacity: 0.38, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  playPulse: { position: 'absolute', width: 55, height: 55, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  playIcon: { marginLeft: 2 },
  equalizer: { height: 19, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  eqBar: { width: 3, height: 18, borderRadius: 2, backgroundColor: COLORS.violet },
  fullscreenButton: { minWidth: 0, maxWidth: 190, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 16, backgroundColor: 'rgba(8,8,10,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  fullscreenText: { flexShrink: 1, color: '#FFFFFF', fontFamily: FONT_BLACK, fontSize: 10.5, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
  flowActions: { position: 'absolute', zIndex: 12, bottom: 18, alignItems: 'center', gap: 4 },
  actionButton: { width: 47, height: 47, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,7,9,0.43)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  actionCount: { color: 'rgba(255,255,255,0.74)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900' },
  swipePill: { position: 'absolute', zIndex: 13, width: 60, height: 154, overflow: 'hidden', alignItems: 'center', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(8,8,10,0.48)', paddingTop: 11, paddingBottom: 10 },
  chevrons: { alignItems: 'center' },
  chevronOverlap: { marginTop: -5 },
  fingerTrack: { flex: 1, width: 27, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  finger: { position: 'absolute', bottom: 4, width: 18, height: 39, borderRadius: 10, alignItems: 'center', paddingTop: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.88)', shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  fingerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#DCCEFF', shadowColor: COLORS.violetSoft, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  swipeText: { color: 'rgba(255,255,255,0.7)', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 },
});

export default HomeFlowPrelude;
