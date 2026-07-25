import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { HomePost, Track } from '@/api/types';
import { MessageInboxButton } from '@/components/messaging/MessageInboxButton';
import { BreathingView, MotionPressable } from '@/components/motion/Motion';
import { NotificationBellButton } from '@/components/notifications/NotificationBellButton';
import { getTrackCoverImage } from '@/components/TrackCover';
import { fmtCount, trackArtistName } from '@/components/swipe/helpers';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import {
  HOME_BANNER_ROTATION_MS,
  HOME_PUNCHLINES,
  pickNextPunchlineIndex,
  resolveHomePreludeMetrics,
} from './homePreludeModel';

const brandSymbol = require('../../assets/synaura-symbol-2026.png');
const EMPTY_BOOLEAN_MAP: Record<string, boolean> = {};
const EMPTY_NUMBER_MAP: Record<string, number> = {};
const FONT_SEMIBOLD = 'Inter_600SemiBold';
const FONT_BOLD = 'Inter_700Bold';
const FONT_EXTRABOLD = 'Inter_800ExtraBold';
const FONT_BLACK = 'Inter_900Black';

type Props = {
  visible: boolean;
  loading?: boolean;
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
};

type ShortcutTarget = 'discover' | 'radar' | 'events';

type RailItem =
  | { id: string; kind: 'skeleton' }
  | { id: string; kind: 'post'; post: HomePost }
  | { id: string; kind: 'community' }
  | { id: string; kind: 'social'; avatars: string[] }
  | { id: string; kind: 'track'; track: Track; eyebrow: string }
  | { id: string; kind: 'music-fallback' }
  | {
    id: string;
    kind: 'shortcut';
    target: ShortcutTarget;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    accent: 'violet' | 'cyan' | 'orange';
  }
  | { id: string; kind: 'studio' };

function postPreview(post: HomePost) {
  if (post.text?.trim()) return post.text.trim();
  if (post.track?.title) return `partage « ${post.track.title} »`;
  if (post.imageUrl) return 'a partagé une nouvelle image';
  return 'vient de publier sur Synaura';
}

function trackLikes(track: Track) {
  return Number(track.likesCount ?? track.likes?.length ?? 0);
}

function trackComments(track: Track) {
  return Number(track.commentsCount ?? track.comments?.length ?? 0);
}

function Equalizer({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (!active || reducedMotion) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 520,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0,
        duration: 520,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, progress, reducedMotion]);

  const scales = [
    progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.42, 1, 0.58] }),
    progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.78, 0.35, 1] }),
    progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.52, 0.9, 0.38] }),
    progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.52, 0.74] }),
  ];

  return (
    <View accessibilityElementsHidden style={styles.equalizer}>
      {scales.map((scaleY, index) => (
        <Animated.View
          key={index}
          style={[styles.equalizerBar, { transform: [{ scaleY }] }]}
        />
      ))}
    </View>
  );
}

export function HomeFlowPrelude(props: Props) {
  const {
    visible,
    loading = false,
    tracks,
    posts,
    currentTrack,
    currentPlaying,
    userName,
    topPad,
    bottomPad,
    likedMap = EMPTY_BOOLEAN_MAP,
    likesMap = EMPTY_NUMBER_MAP,
    commentsMap = EMPTY_NUMBER_MAP,
    onEnterFlow,
    onPlayTrack,
    onOpenTrack,
    onToggleLike,
    onOpenComments,
    onShareTrack,
    onOpenPost,
    onSearch,
    onNotifications,
    onDiscover,
    onRadar,
    onStudio,
    onEvents,
  } = props;
  const responsive = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const phraseIndexRef = useRef(-1);
  const wasVisibleRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const entrance = useRef(new Animated.Value(settings.reducedMotion ? 1 : 0)).current;
  const bannerEntrance = useRef(new Animated.Value(1)).current;
  const bannerProgress = useRef(new Animated.Value(0)).current;
  const auroraA = useRef(new Animated.Value(0)).current;
  const auroraB = useRef(new Animated.Value(0)).current;
  const guideMotion = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0.38)).current;
  const finishingRef = useRef(false);
  const lastRailIndexRef = useRef(0);

  const metrics = resolveHomePreludeMetrics({
    width: responsive.safeWidth,
    height: responsive.height,
    topInset: topPad,
    bottomPad,
    isPhoneLandscape: responsive.isPhoneLandscape,
    isVeryShort: responsive.isVeryShort,
  });
  const maxContentWidth = responsive.isPhoneLandscape
    ? responsive.safeWidth
    : responsive.isTablet
      ? 920
      : 520;
  const homeGutter = responsive.isPhoneLandscape ? 16 : responsive.isTablet ? 24 : 16;
  const framedSide = Math.max(
    homeGutter,
    (responsive.safeWidth - Math.min(responsive.safeWidth, maxContentWidth)) / 2 + homeGutter,
  );
  const safeLeft = responsive.insets.left + framedSide;
  const safeRight = responsive.insets.right + framedSide;

  const playableTracks = useMemo(
    () => tracks.filter((track) => Boolean(track?._id && track.audioUrl)),
    [tracks],
  );
  const firstTrack = playableTracks[0] || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const featuredCover = getTrackCoverImage(featuredTrack);
  const nextTrack = playableTracks.find((track) => track._id !== featuredTrack?._id) || null;
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isPlayingFeatured = Boolean(isCurrentTrack && currentPlaying);
  const greetingName = userName?.trim().split(/\s+/)[0] || null;
  const latestPost = posts[0] || null;
  const featuredLikes = featuredTrack
    ? likesMap[featuredTrack._id] ?? trackLikes(featuredTrack)
    : 0;
  const featuredComments = featuredTrack
    ? commentsMap[featuredTrack._id] ?? trackComments(featuredTrack)
    : 0;
  const featuredLiked = featuredTrack
    ? likedMap[featuredTrack._id] ?? Boolean(featuredTrack.isLiked)
    : false;

  const refreshPhrase = useCallback(() => {
    const next = pickNextPunchlineIndex(phraseIndexRef.current, Math.random());
    phraseIndexRef.current = next;
    setPhraseIndex(next);
  }, []);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) refreshPhrase();
    wasVisibleRef.current = visible;
  }, [refreshPhrase, visible]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const trulyReopened = (previousState === 'background' || previousState === 'inactive')
        && nextState === 'active';
      previousState = nextState;
      if (visible && trulyReopened) refreshPhrase();
    });
    return () => subscription.remove();
  }, [refreshPhrase, visible]);

  const bannerItems = useMemo(() => {
    return [
      latestPost
        ? `${latestPost.author || latestPost.handle || 'La communauté'} vient de publier`
        : 'La communauté se réveille doucement',
      featuredTrack
        ? `Fais partie des premiers sur « ${featuredTrack.title} »`
        : 'Ton prochain son est en approche',
      'Quelqu’un pourrait t’avoir suivi récemment 👀',
      'Le Radar pense avoir trouvé ta prochaine boucle',
      'Pas de drama, juste des sons à découvrir',
      'Ton algorithme a bossé pendant ton absence',
    ];
  }, [featuredTrack, latestPost]);

  useEffect(() => {
    setBannerIndex((current) => current % Math.max(1, bannerItems.length));
  }, [bannerItems.length]);

  useEffect(() => {
    if (!visible || !bannerItems.length) return;
    bannerEntrance.stopAnimation();
    bannerProgress.stopAnimation();
    bannerEntrance.setValue(settings.reducedMotion ? 1 : 0);
    bannerProgress.setValue(settings.reducedMotion ? 1 : 0);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let entranceAnimation: Animated.CompositeAnimation | undefined;
    let progressAnimation: Animated.CompositeAnimation | undefined;

    if (settings.reducedMotion) {
      timer = setTimeout(() => {
        setBannerIndex((current) => (current + 1) % bannerItems.length);
      }, HOME_BANNER_ROTATION_MS);
    } else {
      entranceAnimation = Animated.timing(bannerEntrance, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      progressAnimation = Animated.timing(bannerProgress, {
        toValue: 1,
        duration: HOME_BANNER_ROTATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      entranceAnimation.start();
      progressAnimation.start(({ finished }) => {
        if (finished) setBannerIndex((current) => (current + 1) % bannerItems.length);
      });
    }

    return () => {
      if (timer) clearTimeout(timer);
      entranceAnimation?.stop();
      progressAnimation?.stop();
    };
  }, [
    bannerEntrance,
    bannerIndex,
    bannerItems.length,
    bannerProgress,
    settings.reducedMotion,
    visible,
  ]);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    if (!visible) return;
    finishingRef.current = false;
    progress.stopAnimation();
    progress.setValue(0);
    progressValue.current = 0;
    entrance.stopAnimation();
    entrance.setValue(settings.reducedMotion ? 1 : 0);
    if (!settings.reducedMotion) {
      Animated.timing(entrance, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [entrance, progress, settings.reducedMotion, visible]);

  useEffect(() => {
    auroraA.stopAnimation();
    auroraB.stopAnimation();
    guideMotion.stopAnimation();
    skeletonPulse.stopAnimation();
    if (!visible || settings.reducedMotion) {
      auroraA.setValue(0);
      auroraB.setValue(0);
      guideMotion.setValue(0);
      skeletonPulse.setValue(0.5);
      return;
    }
    const auroraALoop = Animated.loop(Animated.sequence([
      Animated.timing(auroraA, {
        toValue: 1,
        duration: 7_200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(auroraA, {
        toValue: 0,
        duration: 7_200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    const auroraBLoop = Animated.loop(Animated.sequence([
      Animated.timing(auroraB, {
        toValue: 1,
        duration: 8_400,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(auroraB, {
        toValue: 0,
        duration: 8_400,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    const guideLoop = Animated.loop(Animated.sequence([
      Animated.timing(guideMotion, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(guideMotion, {
        toValue: 0,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]));
    const skeletonLoop = Animated.loop(Animated.sequence([
      Animated.timing(skeletonPulse, { toValue: 0.76, duration: 720, useNativeDriver: true }),
      Animated.timing(skeletonPulse, { toValue: 0.38, duration: 720, useNativeDriver: true }),
    ]));
    auroraALoop.start();
    auroraBLoop.start();
    guideLoop.start();
    if (loading && !playableTracks.length && !posts.length) skeletonLoop.start();
    return () => {
      auroraALoop.stop();
      auroraBLoop.stop();
      guideLoop.stop();
      skeletonLoop.stop();
    };
  }, [
    auroraA,
    auroraB,
    guideMotion,
    loading,
    playableTracks.length,
    posts.length,
    settings.reducedMotion,
    skeletonPulse,
    visible,
  ]);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (settings.reducedMotion) {
      progress.setValue(1);
      onEnterFlow();
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onEnterFlow();
      else finishingRef.current = false;
    });
  }, [onEnterFlow, progress, settings.reducedMotion]);

  const reset = useCallback(() => {
    if (finishingRef.current) return;
    Animated.spring(progress, {
      toValue: 0,
      speed: 28,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2
    ),
    onPanResponderMove: (_, gesture) => {
      progress.setValue(Math.min(1, Math.max(0, -gesture.dy / Math.max(1, metrics.availableHeight))));
    },
    onPanResponderRelease: (_, gesture) => {
      if (progressValue.current > 0.055 || gesture.vy < -0.3) finish();
      else reset();
    },
    onPanResponderTerminate: reset,
  }), [finish, metrics.availableHeight, progress, reset]);

  const avatarCandidates = useMemo(() => {
    const values = [
      ...posts.map((post) => post.avatar),
      ...playableTracks.map((track) => track.artist?.avatar || ''),
    ].filter(Boolean);
    return Array.from(new Set(values)).slice(0, 3);
  }, [playableTracks, posts]);

  const railItems = useMemo<RailItem[]>(() => {
    if (loading && !playableTracks.length && !posts.length) {
      return [
        { id: 'skeleton-1', kind: 'skeleton' },
        { id: 'skeleton-2', kind: 'skeleton' },
        {
          id: 'shortcut-radar',
          kind: 'shortcut',
          target: 'radar',
          icon: 'radio-outline',
          title: 'Radar',
          subtitle: 'Les signaux qui montent',
          accent: 'violet',
        },
      ];
    }

    const items: RailItem[] = latestPost
      ? [{ id: `post-${latestPost.id}`, kind: 'post', post: latestPost }]
      : [{ id: 'community-fallback', kind: 'community' }];
    items.push({ id: 'social', kind: 'social', avatars: avatarCandidates });

    const discoveryTracks = playableTracks
      .filter((track) => track._id !== featuredTrack?._id)
      .slice(0, 3);
    const tracksForRail = discoveryTracks.length
      ? discoveryTracks
      : featuredTrack
        ? [featuredTrack]
        : [];
    tracksForRail.forEach((track, index) => {
      items.push({
        id: `track-${track._id}`,
        kind: 'track',
        track,
        eyebrow: index === 0 ? 'Fais partie des premiers' : index === 1 ? 'Ça monte' : 'Pour toi',
      });
    });
    if (!tracksForRail.length) items.push({ id: 'music-fallback', kind: 'music-fallback' });

    posts.slice(1, 2).forEach((post) => {
      items.push({ id: `post-${post.id}`, kind: 'post', post });
    });
    items.push(
      {
        id: 'shortcut-discover',
        kind: 'shortcut',
        target: 'discover',
        icon: 'compass-outline',
        title: 'Découvrir',
        subtitle: 'Explorer sans attendre',
        accent: 'cyan',
      },
      {
        id: 'shortcut-radar',
        kind: 'shortcut',
        target: 'radar',
        icon: 'radio-outline',
        title: 'Radar',
        subtitle: 'Repérer les prochains',
        accent: 'violet',
      },
      {
        id: 'shortcut-events',
        kind: 'shortcut',
        target: 'events',
        icon: 'calendar-outline',
        title: 'Événements',
        subtitle: 'Voir ce qui arrive',
        accent: 'orange',
      },
      { id: 'studio', kind: 'studio' },
    );
    return items;
  }, [
    avatarCandidates,
    featuredTrack,
    latestPost,
    loading,
    playableTracks,
    posts,
  ]);

  const openShortcut = useCallback((target: ShortcutTarget) => {
    Haptics.selectionAsync().catch(() => {});
    if (target === 'discover') onDiscover();
    else if (target === 'radar') onRadar();
    else onEvents();
  }, [onDiscover, onEvents, onRadar]);

  const onRailMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const interval = metrics.railCardWidth + metrics.railGap;
    const index = Math.max(0, Math.round(event.nativeEvent.contentOffset.x / interval));
    if (index === lastRailIndexRef.current) return;
    lastRailIndexRef.current = index;
    Haptics.selectionAsync().catch(() => {});
  }, [metrics.railCardWidth, metrics.railGap]);

  const renderRailItem = useCallback(({ item }: { item: RailItem }) => {
    const cardStyle = [
      styles.railCard,
      metrics.compactTop && styles.railCardCompact,
      { width: metrics.railCardWidth },
    ];
    if (item.kind === 'skeleton') {
      return (
        <Animated.View style={[cardStyle, styles.skeletonCard, { opacity: skeletonPulse }]}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLineShort} />
        </Animated.View>
      );
    }
    if (item.kind === 'post') {
      return (
        <MotionPressable
          accessibilityLabel={`Ouvrir la publication de ${item.post.author}`}
          onPress={() => onOpenPost(item.post)}
          style={cardStyle}
          scaleTo={0.97}
        >
          <LinearGradient
            colors={['rgba(217,109,99,0.24)', 'rgba(20,17,23,0.96)', 'rgba(244,162,97,0.13)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {!metrics.compactTop ? (
            <View style={styles.railTopLine}>
              <View style={styles.railEyebrowRow}>
                <View style={[styles.signalDot, styles.signalDotCoral]} />
                <Text style={[styles.railEyebrow, styles.coralText]}>ÇA BOUGE MAINTENANT</Text>
              </View>
              <Ionicons name="trending-up" size={15} color="#F4A261" />
            </View>
          ) : null}
          <View style={[styles.postIdentity, metrics.compactTop && styles.postIdentityCompact]}>
            <View style={[styles.avatar, metrics.compactTop && styles.avatarCompact]}>
              {item.post.avatar ? (
                <SynauraImage source={item.post.avatar} style={StyleSheet.absoluteFillObject} />
              ) : (
                <SynauraImage source={brandSymbol} contentFit="contain" style={styles.avatarFallback} />
              )}
            </View>
            <View style={styles.postCopy}>
              <Text numberOfLines={1} style={styles.railTitle}>{item.post.author || item.post.handle}</Text>
              <Text
                numberOfLines={metrics.compactTop ? 1 : 2}
                style={[styles.railBody, metrics.compactTop && styles.railBodyCompact]}
              >
                {postPreview(item.post)}
              </Text>
            </View>
          </View>
        </MotionPressable>
      );
    }
    if (item.kind === 'community') {
      return (
        <MotionPressable
          accessibilityLabel="Découvrir la communauté"
          onPress={onDiscover}
          style={cardStyle}
          scaleTo={0.97}
        >
          <LinearGradient
            colors={['rgba(217,109,99,0.28)', 'rgba(28,19,27,0.98)', 'rgba(244,162,97,0.12)']}
            style={StyleSheet.absoluteFillObject}
          />
          {metrics.compactTop ? (
            <View style={styles.compactRailRow}>
              <View style={[styles.shortcutIconOrange, styles.shortcutIconCompact]}>
                <Ionicons name="people-outline" size={17} color="#FFD2A8" />
              </View>
              <View style={styles.compactRailCopy}>
                <Text numberOfLines={1} style={styles.compactRailTitle}>La communauté s'éveille</Text>
                <Text numberOfLines={1} style={styles.railBodyCompact}>Découvre les nouvelles voix Synaura.</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.railTopLine}>
                <View style={styles.railEyebrowRow}>
                  <View style={[styles.signalDot, styles.signalDotCoral]} />
                  <Text style={[styles.railEyebrow, styles.coralText]}>COMMUNAUTÉ</Text>
                </View>
                <Ionicons name="people-outline" size={16} color="#F4A261" />
              </View>
              <Text numberOfLines={2} style={styles.communityTitle}>Les prochaines publications arrivent ici.</Text>
              <Text numberOfLines={2} style={styles.railBody}>Explore les artistes et retrouve les nouvelles voix Synaura.</Text>
            </>
          )}
        </MotionPressable>
      );
    }
    if (item.kind === 'social') {
      const avatars = item.avatars.length ? item.avatars : [];
      return (
        <MotionPressable
          accessibilityLabel="Ouvrir ton réseau"
          onPress={onDiscover}
          style={cardStyle}
          scaleTo={0.97}
        >
          <LinearGradient
            colors={['rgba(115,87,198,0.38)', 'rgba(25,20,33,0.98)', 'rgba(74,158,170,0.12)']}
            style={StyleSheet.absoluteFillObject}
          />
          {metrics.compactTop ? (
            <View style={styles.compactRailRow}>
              <View style={[styles.shortcutIconViolet, styles.shortcutIconCompact]}>
                <Ionicons name="person-add-outline" size={17} color="#DCCEFF" />
              </View>
              <View style={styles.compactRailCopy}>
                <Text numberOfLines={1} style={styles.compactRailTitle}>Ton réseau a bougé</Text>
                <View style={[styles.avatarStack, styles.avatarStackCompact]}>
                  {(avatars.length ? avatars : [null]).map((avatar, index) => (
                    <View
                      key={`${avatar || 'brand'}-${index}`}
                      style={[
                        styles.stackAvatar,
                        styles.stackAvatarCompact,
                        index > 0 && styles.stackAvatarOverlap,
                      ]}
                    >
                      <SynauraImage
                        source={avatar || brandSymbol}
                        contentFit={avatar ? 'cover' : 'contain'}
                        style={avatar ? StyleSheet.absoluteFillObject : styles.stackAvatarFallback}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.railTopLine}>
                <View style={styles.shortcutIconViolet}>
                  <Ionicons name="person-add-outline" size={17} color="#DCCEFF" />
                </View>
                <Text style={styles.socialBadge}>SOCIAL</Text>
              </View>
              <Text numberOfLines={2} style={styles.communityTitle}>Ton réseau a peut-être bougé récemment.</Text>
              <View style={styles.avatarStack}>
                {(avatars.length ? avatars : [null]).map((avatar, index) => (
                  <View key={`${avatar || 'brand'}-${index}`} style={[styles.stackAvatar, index > 0 && styles.stackAvatarOverlap]}>
                    <SynauraImage
                      source={avatar || brandSymbol}
                      contentFit={avatar ? 'cover' : 'contain'}
                      style={avatar ? StyleSheet.absoluteFillObject : styles.stackAvatarFallback}
                    />
                  </View>
                ))}
                <Text numberOfLines={1} style={styles.networkCopy}>Ouvre ton réseau</Text>
              </View>
            </>
          )}
        </MotionPressable>
      );
    }
    if (item.kind === 'track') {
      const cover = getTrackCoverImage(item.track);
      return (
        <MotionPressable
          accessibilityLabel={`Ouvrir ${item.track.title}`}
          onPress={() => onOpenTrack(item.track)}
          style={cardStyle}
          scaleTo={0.97}
        >
          {cover ? <SynauraImage source={cover} style={StyleSheet.absoluteFillObject} lowPriority /> : null}
          <LinearGradient
            colors={['rgba(7,7,9,0.08)', 'rgba(7,7,9,0.48)', 'rgba(7,7,9,0.96)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(7,7,9,0.58)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          {!metrics.compactTop ? <Text numberOfLines={1} style={styles.trackBadge}>{item.eyebrow}</Text> : null}
          <View style={styles.trackRailBottom}>
            <Text numberOfLines={metrics.compactTop ? 1 : 2} style={styles.trackRailTitle}>{item.track.title}</Text>
            <Text numberOfLines={1} style={styles.trackRailArtist}>{trackArtistName(item.track)}</Text>
            {!metrics.compactTop ? (
              <View style={styles.trackRailStat}>
                <Ionicons name="headset-outline" size={12} color="rgba(255,255,255,0.74)" />
                <Text style={styles.trackRailStatText}>{fmtCount(Number(item.track.plays || 0))} écoutes</Text>
              </View>
            ) : null}
          </View>
        </MotionPressable>
      );
    }
    if (item.kind === 'music-fallback') {
      return (
        <MotionPressable
          accessibilityLabel="Découvrir de nouveaux morceaux"
          onPress={onDiscover}
          style={cardStyle}
          scaleTo={0.97}
        >
          <LinearGradient
            colors={['rgba(74,158,170,0.32)', 'rgba(16,28,30,0.98)', 'rgba(115,87,198,0.16)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[metrics.compactTop && styles.compactRailRow]}>
            <View style={[styles.musicFallbackIcon, metrics.compactTop && styles.shortcutIconCompact]}>
              <Ionicons name="musical-notes-outline" size={22} color="#A8DEE5" />
            </View>
            {metrics.compactTop ? (
              <View style={styles.compactRailCopy}>
                <Text numberOfLines={1} style={styles.compactRailTitle}>Ton prochain son se prépare</Text>
                <Text numberOfLines={1} style={styles.railBodyCompact}>Le Flow affine ta sélection.</Text>
              </View>
            ) : null}
          </View>
          {!metrics.compactTop ? (
            <>
              <Text numberOfLines={2} style={styles.communityTitle}>Ton prochain son se prépare.</Text>
              <Text numberOfLines={2} style={styles.railBody}>Le Flow apparaîtra dès que la sélection sera prête.</Text>
            </>
          ) : null}
        </MotionPressable>
      );
    }
    if (item.kind === 'shortcut') {
      const accentStyle = item.accent === 'violet'
        ? styles.shortcutViolet
        : item.accent === 'cyan'
          ? styles.shortcutCyan
          : styles.shortcutOrange;
      const iconStyle = item.accent === 'violet'
        ? styles.shortcutIconViolet
        : item.accent === 'cyan'
          ? styles.shortcutIconCyan
          : styles.shortcutIconOrange;
      const iconColor = item.accent === 'violet' ? '#DCCEFF' : item.accent === 'cyan' ? '#A8DEE5' : '#FFD2A8';
      return (
        <MotionPressable
          accessibilityLabel={`Ouvrir ${item.title}`}
          onPress={() => openShortcut(item.target)}
          style={[cardStyle, accentStyle, metrics.compactTop && styles.compactHorizontalCard]}
          scaleTo={0.97}
        >
          <View style={[iconStyle, metrics.compactTop && styles.shortcutIconCompact]}>
            <Ionicons name={item.icon} size={20} color={iconColor} />
          </View>
          <View style={metrics.compactTop && styles.compactRailCopy}>
            <Text style={[styles.shortcutTitle, metrics.compactTop && styles.compactRailTitle]}>{item.title}</Text>
            <Text numberOfLines={metrics.compactTop ? 1 : 2} style={styles.shortcutSubtitle}>{item.subtitle}</Text>
          </View>
        </MotionPressable>
      );
    }
    return (
      <MotionPressable
        accessibilityLabel="Ouvrir le Studio"
        onPress={onStudio}
        style={[cardStyle, metrics.compactTop && styles.compactHorizontalCard]}
        scaleTo={0.97}
      >
        <LinearGradient
          colors={['rgba(217,109,99,0.38)', 'rgba(115,87,198,0.28)', 'rgba(24,18,28,0.98)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.studioIcon, metrics.compactTop && styles.shortcutIconCompact]}>
          <Ionicons name="sparkles-outline" size={21} color="#FFD8D3" />
        </View>
        <Text
          numberOfLines={metrics.compactTop ? 1 : 2}
          style={[styles.studioTitle, metrics.compactTop && styles.studioTitleCompact]}
        >
          Ton prochain banger attend juste une idée.
        </Text>
        {!metrics.compactTop ? (
          <View style={styles.studioLink}>
            <Text style={styles.studioLinkText}>Ouvrir le Studio</Text>
            <Ionicons name="chevron-forward" size={13} color="#F0AAA2" />
          </View>
        ) : null}
      </MotionPressable>
    );
  }, [
    metrics.compactTop,
    metrics.railCardWidth,
    onDiscover,
    onOpenPost,
    onOpenTrack,
    onStudio,
    openShortcut,
    skeletonPulse,
  ]);

  if (!visible) return null;

  const banner = bannerItems[bannerIndex % Math.max(1, bannerItems.length)] || '';
  const screenTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -metrics.availableHeight],
  });
  const screenOpacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [1, 0.98, 0.72],
    extrapolate: 'clamp',
  });
  const contentOpacity = Animated.multiply(
    entrance,
    progress.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [1, 0.35, 0],
      extrapolate: 'clamp',
    }),
  );
  const contentTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const exitScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });
  const bannerTranslateY = bannerEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [7, 0],
  });
  const guideTranslateY = guideMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -3],
  });
  const fingerTranslateY = guideMotion.interpolate({
    inputRange: [0, 1],
    outputRange: responsive.isVeryShort ? [12, -12] : [24, -24],
  });
  const fingerOpacity = guideMotion.interpolate({
    inputRange: [0, 0.16, 0.78, 1],
    outputRange: [0, 1, 1, 0],
  });
  const auroraATranslateX = auroraA.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 28],
  });
  const auroraATranslateY = auroraA.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 18],
  });
  const auroraBTranslateX = auroraB.interpolate({
    inputRange: [0, 1],
    outputRange: [30, -24],
  });
  const auroraBTranslateY = auroraB.interpolate({
    inputRange: [0, 1],
    outputRange: [8, -20],
  });
  const punchlineSize = Math.min(32, Math.max(24, responsive.safeWidth * 0.075));

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.overlay,
        {
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }],
        },
      ]}
    >
      <StatusBar style="light" backgroundColor="#08080B" />
      <View style={[styles.surface, { paddingBottom: bottomPad }]}>
        <Animated.View
          style={[
            styles.stage,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }, { scale: exitScale }],
            },
          ]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <Animated.View
              style={[
                styles.auroraFieldA,
                { transform: [{ translateX: auroraATranslateX }, { translateY: auroraATranslateY }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(115,87,198,0.16)', 'rgba(217,109,99,0.045)', 'rgba(9,9,11,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.auroraFieldB,
                { transform: [{ translateX: auroraBTranslateX }, { translateY: auroraBTranslateY }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(74,158,170,0.12)', 'rgba(244,162,97,0.035)', 'rgba(9,9,11,0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>

          <View style={[styles.header, { height: metrics.headerHeight, paddingTop: topPad }]}>
            <View
              style={[
                styles.headerInner,
                {
                  maxWidth: maxContentWidth,
                  paddingLeft: safeLeft,
                  paddingRight: safeRight,
                },
              ]}
            >
              <MotionPressable
                accessibilityLabel="Ouvrir le Flow"
                onPress={finish}
                style={styles.brandButton}
                scaleTo={0.97}
              >
                <View style={styles.logo}>
                  <SynauraImage source={brandSymbol} contentFit="contain" style={styles.logoImage} />
                </View>
                <View style={styles.brandCopy}>
                  <Text style={styles.brand}>Synaura</Text>
                  <Text numberOfLines={1} style={styles.greeting}>
                    {greetingName ? `Salut ${greetingName}, regarde ce que t'as raté` : 'Écoute, crée, partage'}
                  </Text>
                </View>
              </MotionPressable>

              <View style={styles.headerActions}>
                <MotionPressable
                  accessibilityLabel="Rechercher"
                  onPress={onSearch}
                  style={styles.headerAction}
                  scaleTo={0.9}
                >
                  <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.78)" />
                </MotionPressable>
                <MessageInboxButton dark size={40} />
                <NotificationBellButton dark size={40} onPress={onNotifications} />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.pulseOuter,
              {
                height: metrics.pulseHeight,
                paddingLeft: safeLeft,
                paddingRight: safeRight,
              },
            ]}
          >
            <View style={[styles.pulsePanel, responsive.isPhoneLandscape && styles.pulsePanelLandscape]}>
              <LinearGradient
                colors={['rgba(18,17,24,0.98)', 'rgba(10,10,13,0.97)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[styles.pulseLead, responsive.isPhoneLandscape && styles.pulseLeadLandscape]}>
                <View style={[styles.pulseIntro, metrics.compactTop && styles.pulseIntroCompact]}>
                  <View style={styles.badgeRow}>
                    <View style={styles.absenceBadge}>
                      <Text style={styles.absenceBadgeText}>PENDANT TON ABSENCE</Text>
                    </View>
                    <View style={styles.swipeBadge}>
                      <Text style={styles.swipeBadgeText}>SWIPE LES CARTES</Text>
                    </View>
                  </View>
                  <Text
                    maxFontSizeMultiplier={1.12}
                    numberOfLines={responsive.isPhoneLandscape ? 2 : 3}
                    adjustsFontSizeToFit={responsive.isPhoneLandscape}
                    minimumFontScale={0.82}
                    style={[
                      styles.punchline,
                      responsive.isTiny && styles.punchlineTiny,
                      responsive.isPhoneLandscape && styles.punchlineLandscape,
                      !responsive.isPhoneLandscape && {
                        fontSize: punchlineSize,
                        lineHeight: punchlineSize * 0.94,
                      },
                    ]}
                  >
                    {HOME_PUNCHLINES[phraseIndex]}
                  </Text>
                  {responsive.isTablet && !metrics.compactTop && !responsive.hasVeryLargeText ? (
                    <Text numberOfLines={1} style={styles.punchCopy}>
                      Nouveaux posts, sons à tester, petits signaux sociaux et accès rapides : pioche ce qui te donne envie.
                    </Text>
                  ) : null}
                </View>

                {!responsive.isVeryShort ? (
                  <View style={[styles.banner, metrics.compactTop && styles.bannerCompact]}>
                    <Animated.View
                      style={[
                        styles.bannerMessage,
                        { opacity: bannerEntrance, transform: [{ translateY: bannerTranslateY }] },
                      ]}
                    >
                      <View style={styles.bannerIcon}>
                        <Ionicons name="flash-outline" size={13} color="#A8DEE5" />
                      </View>
                      {responsive.isTablet && !responsive.isPhoneLandscape ? (
                        <Text style={styles.bannerLabel}>EN CE MOMENT</Text>
                      ) : null}
                      <Text numberOfLines={1} style={styles.bannerText}>{banner}</Text>
                      <Text style={styles.bannerCount}>
                        {String(bannerIndex + 1).padStart(2, '0')} / {String(bannerItems.length).padStart(2, '0')}
                      </Text>
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.bannerProgress,
                        {
                          width: bannerProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>

              <FlatList
                horizontal
                data={railItems}
                keyExtractor={(item) => item.id}
                renderItem={renderRailItem}
                style={[styles.rail, responsive.isPhoneLandscape && styles.railLandscape]}
                contentContainerStyle={[
                  styles.railContent,
                   {
                     gap: metrics.railGap,
                     paddingLeft: 16,
                     paddingRight: 16,
                   },
                ]}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={metrics.railCardWidth + metrics.railGap}
                snapToAlignment="start"
                disableIntervalMomentum
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews
                onMomentumScrollEnd={onRailMomentumEnd}
                getItemLayout={(_, index) => ({
                  index,
                  length: metrics.railCardWidth + metrics.railGap,
                  offset: (metrics.railCardWidth + metrics.railGap) * index,
                })}
              />
            </View>
          </View>

          <View style={styles.flowPreview}>
            <BreathingView
              active={visible}
              scaleTo={1.055}
              duration={6_500}
              style={styles.previewMedia}
            >
              {featuredCover ? (
                <SynauraImage source={featuredCover} style={StyleSheet.absoluteFillObject} />
              ) : (
                <View style={styles.previewFallback}>
                  <LinearGradient
                    colors={['#2A1830', '#102B2D', '#20131A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <SynauraImage source={brandSymbol} contentFit="contain" style={styles.previewFallbackLogo} />
                </View>
              )}
            </BreathingView>
            <LinearGradient
              colors={['rgba(7,7,9,0.22)', 'rgba(7,7,9,0.12)', 'rgba(7,7,9,0.86)', 'rgba(7,7,9,0.99)']}
              locations={[0, 0.28, 0.76, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={['rgba(7,7,9,0.68)', 'transparent', 'rgba(7,7,9,0.2)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />

            {responsive.isPhoneLandscape ? (
              <View
                style={[
                  styles.landscapePreviewContent,
                  {
                    paddingLeft: responsive.insets.left + 12,
                    paddingRight: responsive.insets.right + 12,
                  },
                ]}
              >
                <MotionPressable
                  accessibilityLabel={isPlayingFeatured ? 'Mettre en pause' : 'Écouter'}
                  disabled={!featuredTrack}
                  onPress={() => featuredTrack && onPlayTrack(featuredTrack)}
                  style={styles.landscapePlayButton}
                  scaleTo={0.9}
                >
                  {isPlayingFeatured ? (
                    <Equalizer active reducedMotion={settings.reducedMotion} />
                  ) : (
                    <Ionicons name="play" size={19} color="#111111" style={styles.playIcon} />
                  )}
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel="Ouvrir le morceau dans le Flow"
                  disabled={!featuredTrack}
                  onPress={() => featuredTrack && onOpenTrack(featuredTrack)}
                  style={styles.landscapeTrackCopy}
                  scaleTo={0.99}
                >
                  <Text numberOfLines={1} style={styles.landscapeKicker}>
                    POUR TOI · {isCurrentTrack ? 'REPRENDRE' : 'PREMIER SON'}
                  </Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.landscapeTrackTitle}>
                    {featuredTrack?.title || (loading ? 'Ton Flow se prépare' : 'Prêt pour une nouvelle écoute')}
                  </Text>
                  <Text numberOfLines={1} style={styles.landscapeTrackArtist}>
                    {featuredTrack ? trackArtistName(featuredTrack) : 'Synaura affine ta sélection'}
                  </Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel="Glisser vers le haut pour ouvrir le Flow"
                  onPress={finish}
                  style={styles.landscapeGuide}
                  scaleTo={0.94}
                >
                  <Animated.View style={{ transform: [{ translateY: guideTranslateY }] }}>
                    <Ionicons name="chevron-up" size={15} color="#DCCEFF" />
                  </Animated.View>
                  <Text style={styles.landscapeGuideText}>GLISSE</Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel="Voir le Flow en plein écran"
                  onPress={() => featuredTrack ? onOpenTrack(featuredTrack) : finish()}
                  style={styles.landscapeIconAction}
                  scaleTo={0.9}
                >
                  <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel={featuredLiked ? "Retirer des j'aime" : 'Aimer'}
                  disabled={!featuredTrack}
                  onPress={() => featuredTrack && onToggleLike(featuredTrack)}
                  style={[styles.landscapeLabeledAction, featuredLiked && styles.flowActionLiked]}
                  scaleTo={0.88}
                >
                  <Ionicons
                    name={featuredLiked ? 'heart' : 'heart-outline'}
                    size={17}
                    color={featuredLiked ? '#FFD5CF' : '#FFFFFF'}
                  />
                  <Text style={styles.landscapeActionCount}>{fmtCount(featuredLikes)}</Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel="Ouvrir les commentaires"
                  disabled={!featuredTrack}
                  onPress={() => featuredTrack && onOpenComments(featuredTrack)}
                  style={styles.landscapeLabeledAction}
                  scaleTo={0.88}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.landscapeActionCount}>{fmtCount(featuredComments)}</Text>
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel="Partager le morceau"
                  disabled={!featuredTrack}
                  onPress={() => featuredTrack && onShareTrack(featuredTrack)}
                  style={styles.landscapeIconAction}
                  scaleTo={0.88}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                </MotionPressable>
              </View>
            ) : (
              <>
            <MotionPressable
              accessibilityLabel="Ouvrir le Flow"
              onPress={finish}
              style={[
                styles.flowPreviewBadge,
                responsive.isVeryShort && styles.flowPreviewBadgeVeryShort,
                responsive.isVeryShort
                  ? { right: safeRight + metrics.actionSize + 8 }
                  : null,
              ]}
              scaleTo={0.95}
            >
              <View style={styles.flowPreviewSignal} />
              <Text
                style={[
                  styles.flowPreviewBadgeText,
                  responsive.isVeryShort && styles.flowPreviewBadgeTextVeryShort,
                ]}
              >
                APERÇU DU FLOW
              </Text>
            </MotionPressable>

            <View
              style={[
                styles.previewBadges,
                responsive.isVeryShort && styles.previewBadgesVeryShort,
                { left: safeLeft },
              ]}
            >
              <MotionPressable accessibilityLabel="Découvrir ta sélection" onPress={onDiscover} style={styles.previewBadge} scaleTo={0.94}>
                <Text style={styles.previewBadgeText}>Pour toi</Text>
              </MotionPressable>
              <MotionPressable accessibilityLabel="Ouvrir le Radar" onPress={onRadar} style={styles.previewBadgeRadar} scaleTo={0.94}>
                <Text style={styles.previewBadgeRadarText}>Ça monte</Text>
              </MotionPressable>
            </View>

            <MotionPressable
              accessibilityLabel="Glisser vers le haut pour ouvrir le Flow"
              onPress={finish}
              style={[
                styles.swipeGuide,
                responsive.isVeryShort && styles.swipeGuideVeryShort,
                {
                  top: responsive.isVeryShort
                    ? 42
                    : Math.max(8, (metrics.previewHeight - 144) / 2),
                },
              ]}
              scaleTo={0.94}
            >
              <Animated.View style={[styles.swipeChevrons, { transform: [{ translateY: guideTranslateY }] }]}>
                <Ionicons name="chevron-up" size={responsive.isVeryShort ? 10 : 13} color="#DCCEFF" />
                <Ionicons name="chevron-up" size={responsive.isVeryShort ? 10 : 13} color="#A8DEE5" />
                <Ionicons name="chevron-up" size={responsive.isVeryShort ? 10 : 13} color="#F0AAA2" />
              </Animated.View>
              <View style={[styles.swipeFingerTrack, responsive.isVeryShort && styles.swipeFingerTrackVeryShort]}>
                <Animated.View
                  style={[
                    styles.swipeFinger,
                    responsive.isVeryShort && styles.swipeFingerVeryShort,
                    {
                      opacity: fingerOpacity,
                      transform: [{ translateY: fingerTranslateY }],
                    },
                  ]}
                >
                  <View style={styles.swipeFingerDot} />
                </Animated.View>
              </View>
              <Text style={[styles.swipeGuideText, responsive.isVeryShort && styles.swipeGuideTextVeryShort]}>
                GLISSE
              </Text>
            </MotionPressable>

            <View
              style={[
                styles.previewCopy,
                {
                  left: safeLeft,
                  right: responsive.isVeryShort
                    ? safeRight + metrics.actionSize + 49
                    : safeRight + metrics.actionSize + 16,
                },
                responsive.isVeryShort && styles.previewCopyCompact,
              ]}
            >
              <Text style={styles.previewKicker}>
                {isCurrentTrack ? 'REPRENDRE MAINTENANT' : 'PREMIER SON DE TON FLOW'}
              </Text>
              <MotionPressable
                accessibilityLabel="Ouvrir le morceau dans le Flow"
                disabled={!featuredTrack}
                onPress={() => featuredTrack && onOpenTrack(featuredTrack)}
                style={styles.previewTrackCopy}
                scaleTo={0.99}
              >
                <Text
                  maxFontSizeMultiplier={1.12}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[
                    styles.previewTitle,
                    responsive.isTiny && styles.previewTitleTiny,
                    responsive.isPhoneLandscape && styles.previewTitleLandscape,
                  ]}
                >
                  {featuredTrack?.title || (loading ? 'Ton Flow se prépare' : 'Prêt pour une nouvelle écoute')}
                </Text>
                <Text numberOfLines={1} style={styles.previewArtist}>
                  {featuredTrack ? trackArtistName(featuredTrack) : 'Synaura affine ta sélection'}
                </Text>
              </MotionPressable>

              {featuredTrack && !responsive.isVeryShort ? (
                <View style={styles.previewMeta}>
                  <Text style={styles.previewMetaText}>{fmtCount(Number(featuredTrack.plays || 0))} écoutes</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.previewMetaText}>{fmtCount(featuredLikes)} j'aime</Text>
                  {nextTrack && !responsive.isShort ? (
                    <>
                      <View style={styles.metaDot} />
                      <Text numberOfLines={1} style={styles.nextTrack}>Ensuite : {nextTrack.title}</Text>
                    </>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.previewButtons}>
                <MotionPressable
                  accessibilityLabel={isPlayingFeatured ? 'Mettre en pause' : 'Écouter'}
                  disabled={!featuredTrack}
                  onPress={() => featuredTrack && onPlayTrack(featuredTrack)}
                  style={[styles.playButton, { width: 48, height: 48, borderRadius: 24 }]}
                  scaleTo={0.9}
                >
                  {isPlayingFeatured ? (
                    <Equalizer active reducedMotion={settings.reducedMotion} />
                  ) : (
                    <Ionicons name="play" size={21} color="#111111" style={styles.playIcon} />
                  )}
                </MotionPressable>
                <MotionPressable
                  accessibilityLabel="Voir le Flow en plein écran"
                  onPress={() => featuredTrack ? onOpenTrack(featuredTrack) : finish()}
                  style={[styles.fullScreenButton, { height: metrics.actionSize }]}
                  scaleTo={0.95}
                >
                  <Ionicons name="radio-outline" size={17} color="#FFFFFF" />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.fullScreenText}>Voir en plein écran</Text>
                </MotionPressable>
              </View>
            </View>

            <View style={[styles.flowActions, { right: safeRight }]}>
              <MotionPressable
                accessibilityLabel={featuredLiked ? "Retirer des j'aime" : 'Aimer'}
                disabled={!featuredTrack}
                onPress={() => featuredTrack && onToggleLike(featuredTrack)}
                style={[styles.flowAction, { width: metrics.actionSize, height: metrics.actionSize }, featuredLiked && styles.flowActionLiked]}
                scaleTo={0.88}
              >
                <Ionicons
                  name={featuredLiked ? 'heart' : 'heart-outline'}
                  size={19}
                  color={featuredLiked ? '#FFD5CF' : '#FFFFFF'}
                />
              </MotionPressable>
              <Text style={styles.flowActionCount}>{fmtCount(featuredLikes)}</Text>
              <MotionPressable
                accessibilityLabel="Ouvrir les commentaires"
                disabled={!featuredTrack}
                onPress={() => featuredTrack && onOpenComments(featuredTrack)}
                style={[styles.flowAction, { width: metrics.actionSize, height: metrics.actionSize }]}
                scaleTo={0.88}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              </MotionPressable>
              <Text style={styles.flowActionCount}>{fmtCount(featuredComments)}</Text>
              <MotionPressable
                accessibilityLabel="Partager le morceau"
                disabled={!featuredTrack}
                onPress={() => featuredTrack && onShareTrack(featuredTrack)}
                style={[styles.flowAction, { width: metrics.actionSize, height: metrics.actionSize }]}
                scaleTo={0.88}
              >
                <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
              </MotionPressable>
            </View>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    overflow: 'hidden',
    backgroundColor: '#09090B',
  },
  surface: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#09090B',
  },
  auroraFieldA: {
    position: 'absolute',
    left: -80,
    top: -105,
    width: '125%',
    height: 330,
    opacity: 0.72,
  },
  auroraFieldB: {
    position: 'absolute',
    right: -95,
    top: 20,
    width: '120%',
    height: 340,
    opacity: 0.58,
  },
  header: {
    zIndex: 10,
    width: '100%',
    justifyContent: 'center',
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.44)',
    shadowColor: '#7357C6',
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  logoCompact: {
    width: 36,
    height: 36,
  },
  logoImage: {
    width: 25,
    height: 25,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    color: '#F7F6F3',
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  greeting: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  headerActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerActionCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  pulseOuter: {
    zIndex: 5,
    width: '100%',
    paddingBottom: 12,
  },
  pulsePanel: {
    flex: 1,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: '#101014',
    shadowColor: '#000000',
    shadowOpacity: 0.34,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
  },
  pulsePanelLandscape: {
    flexDirection: 'row',
  },
  pulseLead: {
    flexShrink: 0,
  },
  pulseLeadLandscape: {
    width: '42%',
    justifyContent: 'center',
  },
  pulseIntro: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  pulseIntroCompact: {
    paddingTop: 10,
    paddingBottom: 7,
  },
  badgeRow: {
    minHeight: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  absenceBadge: {
    minHeight: 20,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(169,139,232,0.38)',
    backgroundColor: 'rgba(115,87,198,0.2)',
    paddingHorizontal: 10,
  },
  absenceBadgeText: {
    color: '#DCCEFF',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  swipeBadge: {
    minHeight: 20,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(114,187,197,0.32)',
    backgroundColor: 'rgba(74,158,170,0.16)',
    paddingHorizontal: 10,
  },
  swipeBadgeText: {
    color: '#A8DEE5',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  punchline: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 27.5,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  punchlineTiny: {
    fontSize: 24,
    lineHeight: 22.6,
  },
  punchlineLandscape: {
    marginTop: 7,
    fontSize: 18,
    lineHeight: 18,
    fontFamily: FONT_BLACK,
  },
  punchCopy: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.43)',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    fontFamily: FONT_SEMIBOLD,
  },
  banner: {
    flexShrink: 0,
    height: 42,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  bannerCompact: {
    height: 38,
    marginBottom: 7,
  },
  bannerMessage: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  bannerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,158,170,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(114,187,197,0.3)',
  },
  bannerLabel: {
    flexShrink: 0,
    color: '#DCCEFF',
    fontSize: 7,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  bannerText: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: FONT_BLACK,
  },
  bannerCount: {
    flexShrink: 0,
    color: 'rgba(255,255,255,0.34)',
    fontSize: 8,
    fontFamily: FONT_BLACK,
  },
  bannerProgress: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#7357C6',
  },
  rail: {
    flex: 1,
    minHeight: 0,
  },
  railLandscape: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  railContent: {
    alignItems: 'stretch',
    paddingBottom: 12,
  },
  railCard: {
    height: '100%',
    minHeight: 68,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: '#18171D',
    padding: 14,
  },
  railCardCompact: {
    padding: 11,
  },
  skeletonCard: {
    justifyContent: 'center',
    backgroundColor: '#1A1920',
  },
  skeletonBadge: {
    position: 'absolute',
    top: 11,
    left: 11,
    width: 70,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  skeletonAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skeletonLineWide: {
    width: '70%',
    height: 9,
    marginTop: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  skeletonLineShort: {
    width: '44%',
    height: 7,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  railTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  railEyebrowRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  signalDotCoral: {
    backgroundColor: '#D96D63',
    shadowColor: '#D96D63',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  railEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  coralText: {
    color: '#F0AAA2',
  },
  postIdentity: {
    flex: 1,
    minHeight: 0,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  postIdentityCompact: {
    marginTop: 0,
    gap: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(217,109,99,0.42)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 24,
    height: 24,
  },
  postCopy: {
    flex: 1,
    minWidth: 0,
  },
  railTitle: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  railBody: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    fontFamily: FONT_SEMIBOLD,
  },
  railBodyCompact: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '600',
    fontFamily: FONT_SEMIBOLD,
  },
  compactRailRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactRailCopy: {
    flex: 1,
    minWidth: 0,
  },
  compactRailTitle: {
    marginTop: 0,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  postStats: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    marginRight: 5,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: FONT_EXTRABOLD,
  },
  communityTitle: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  socialBadge: {
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 7,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  avatarStack: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackCompact: {
    marginTop: 2,
  },
  stackAvatar: {
    width: 29,
    height: 29,
    overflow: 'hidden',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#17151B',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stackAvatarCompact: {
    width: 21,
    height: 21,
    borderRadius: 11,
  },
  stackAvatarOverlap: {
    marginLeft: -8,
  },
  stackAvatarFallback: {
    width: 18,
    height: 18,
  },
  networkCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  trackBadge: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    overflow: 'hidden',
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(114,187,197,0.34)',
    backgroundColor: 'rgba(74,158,170,0.24)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    color: '#A8DEE5',
    fontSize: 7,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  trackRailBottom: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-end',
  },
  trackRailTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  trackRailArtist: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  trackRailStat: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackRailStatText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: FONT_EXTRABOLD,
  },
  musicFallbackIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,158,170,0.18)',
  },
  shortcutViolet: {
    justifyContent: 'space-between',
    borderColor: 'rgba(169,139,232,0.34)',
    backgroundColor: 'rgba(115,87,198,0.2)',
  },
  shortcutCyan: {
    justifyContent: 'space-between',
    borderColor: 'rgba(114,187,197,0.34)',
    backgroundColor: 'rgba(74,158,170,0.2)',
  },
  shortcutOrange: {
    justifyContent: 'space-between',
    borderColor: 'rgba(244,162,97,0.34)',
    backgroundColor: 'rgba(244,162,97,0.16)',
  },
  shortcutIconViolet: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(115,87,198,0.26)',
  },
  shortcutIconCyan: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,158,170,0.24)',
  },
  shortcutIconOrange: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,162,97,0.2)',
  },
  shortcutIconCompact: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  compactHorizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  shortcutTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  shortcutSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.46)',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '600',
    fontFamily: FONT_SEMIBOLD,
  },
  studioIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  studioTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  studioTitleCompact: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
    fontSize: 12,
    lineHeight: 15,
  },
  studioLink: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  studioLinkText: {
    color: '#F0AAA2',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  flowPreview: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#131116',
    shadowColor: '#000000',
    shadowOpacity: 0.42,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: -12 },
    elevation: 10,
  },
  previewMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFallbackLogo: {
    width: 150,
    height: 150,
    opacity: 0.18,
  },
  landscapePreviewContent: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  landscapePlayButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F3',
  },
  landscapeTrackCopy: {
    flex: 1,
    minWidth: 120,
  },
  landscapeKicker: {
    color: '#DCCEFF',
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  landscapeTrackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  landscapeTrackArtist: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  landscapeGuide: {
    height: 40,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 9,
  },
  landscapeGuideText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 7,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  landscapeIconAction: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  landscapeLabeledAction: {
    minWidth: 50,
    height: 42,
    flexShrink: 0,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 7,
  },
  landscapeActionCount: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  flowPreviewBadge: {
    position: 'absolute',
    top: 12,
    zIndex: 5,
    alignSelf: 'center',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 138,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.34)',
    paddingHorizontal: 12,
  },
  flowPreviewBadgeVeryShort: {
    alignSelf: 'auto',
    minWidth: 108,
    gap: 6,
    paddingHorizontal: 8,
  },
  flowPreviewSignal: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#72BBC5',
    shadowColor: '#72BBC5',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  flowPreviewBadgeText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 9,
    fontFamily: FONT_BLACK,
  },
  flowPreviewBadgeTextVeryShort: {
    fontSize: 8,
  },
  previewBadges: {
    position: 'absolute',
    top: 56,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewBadgesVeryShort: {
    top: 12,
  },
  previewBadge: {
    minHeight: 27,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.34)',
    paddingHorizontal: 12,
  },
  previewBadgeText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  previewBadgeRadar: {
    minHeight: 27,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217,109,99,0.38)',
    backgroundColor: 'rgba(217,109,99,0.2)',
    paddingHorizontal: 12,
  },
  previewBadgeRadarText: {
    color: '#FFD4CE',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  swipeGuide: {
    position: 'absolute',
    zIndex: 4,
    right: 61,
    width: 60,
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 10,
  },
  swipeGuideVeryShort: {
    right: 61,
    width: 46,
    height: 76,
    gap: 1,
    borderRadius: 18,
    paddingVertical: 4,
  },
  swipeChevrons: {
    alignItems: 'center',
    marginBottom: -4,
  },
  swipeFingerTrack: {
    width: 28,
    height: 54,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeFingerTrackVeryShort: {
    width: 22,
    height: 26,
  },
  swipeFinger: {
    width: 18,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  swipeFingerVeryShort: {
    width: 14,
    height: 22,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  swipeFingerDot: {
    width: 5,
    height: 5,
    marginTop: 5,
    borderRadius: 3,
    backgroundColor: '#DCCEFF',
  },
  swipeGuideText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  swipeGuideTextVeryShort: {
    fontSize: 7,
  },
  previewCopy: {
    position: 'absolute',
    zIndex: 3,
    bottom: 16,
  },
  previewCopyCompact: {
    bottom: 7,
  },
  previewKicker: {
    color: '#DCCEFF',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  previewTrackCopy: {
    minWidth: 0,
    marginTop: 3,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 26.4,
    lineHeight: 25.5,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 4 },
  },
  previewTitleTiny: {
    fontSize: 24,
    lineHeight: 24,
  },
  previewTitleLandscape: {
    fontSize: 23,
    lineHeight: 24,
  },
  previewArtist: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  previewMeta: {
    minWidth: 0,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewMetaText: {
    flexShrink: 0,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  nextTrack: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.34)',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: FONT_BOLD,
  },
  previewButtons: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  playButton: {
    flexShrink: 0,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F3',
    shadowColor: '#000000',
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  playIcon: {
    marginLeft: 2,
  },
  fullScreenButton: {
    flexShrink: 1,
    width: 170,
    maxWidth: 172,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 11,
  },
  fullScreenText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
  equalizer: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  equalizerBar: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: '#7357C6',
  },
  flowActions: {
    position: 'absolute',
    zIndex: 4,
    bottom: 16,
    alignItems: 'center',
  },
  flowAction: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  flowActionLiked: {
    borderColor: 'rgba(217,109,99,0.52)',
    backgroundColor: 'rgba(217,109,99,0.34)',
  },
  flowActionCount: {
    minHeight: 14,
    marginTop: 2,
    marginBottom: 4,
    color: 'rgba(255,255,255,0.64)',
    fontSize: 8,
    lineHeight: 12,
    fontWeight: '900',
    fontFamily: FONT_BLACK,
  },
});

export default HomeFlowPrelude;
