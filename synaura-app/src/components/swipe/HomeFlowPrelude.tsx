import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { HomePost, Track } from '@/api/types';
import { MotionPressable } from '@/components/motion/Motion';
import { getTrackCoverImage, TrackCover } from '@/components/TrackCover';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const brandSymbol = require('../../assets/synaura-symbol-2026.png');

type Props = {
  visible: boolean;
  tracks: Track[];
  posts: HomePost[];
  currentTrack?: Track | null;
  currentPlaying?: boolean;
  userName?: string | null;
  topPad: number;
  bottomPad: number;
  onEnterFlow: () => void;
  onPlayTrack: (track: Track) => void;
  onOpenTrack: (track: Track) => void;
  onOpenPost: (post: HomePost) => void;
  onSearch: () => void;
  onNotifications: () => void;
  onDiscover: () => void;
  onRadar: () => void;
  onStudio: () => void;
  onEvents: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

export function HomeFlowPrelude(props: Props) {
  const {
    visible,
    tracks,
    currentTrack,
    currentPlaying,
    topPad,
    bottomPad,
    onEnterFlow,
    onPlayTrack,
    onOpenTrack,
    onSearch,
    onNotifications,
    onStudio,
  } = props;
  const responsive = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const finishingRef = useRef(false);
  const firstTrack = tracks.find((track) => Boolean(track.audioUrl)) || null;
  const featuredTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const featuredCover = getTrackCoverImage(featuredTrack);
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isResume = Boolean(isCurrentTrack && currentTrack?.audioUrl);
  const artworkSize = responsive.isPhoneLandscape
    ? clamp(responsive.usableHeight * 0.3, 82, 118)
    : clamp(Math.min(responsive.safeWidth * 0.43, responsive.usableHeight * 0.28), 112, responsive.isTablet ? 280 : 188);

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
  }, [progress, visible]);

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
      progress.setValue(clamp(-gesture.dy / Math.max(1, responsive.height), 0, 1));
    },
    onPanResponderRelease: (_, gesture) => {
      if (progressValue.current > 0.055 || gesture.vy < -0.3) finish();
      else reset();
    },
    onPanResponderTerminate: reset,
  }), [finish, progress, reset, responsive.height]);

  if (!visible) return null;

  const screenTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -responsive.height] });
  const screenOpacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.98, 0.72], extrapolate: 'clamp' });
  const sceneOpacity = progress.interpolate({ inputRange: [0, 0.58, 1], outputRange: [1, 0.55, 0], extrapolate: 'clamp' });
  const sceneTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -48] });
  const sceneScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
  const portraitArtworkPosition = {
    width: artworkSize,
    height: artworkSize,
    left: '50%' as const,
    top: responsive.isVeryShort ? 48 : responsive.isShort ? 54 : 62,
    transform: [{ translateX: -artworkSize / 2 }],
  };
  const landscapeArtworkPosition = {
    width: artworkSize,
    height: artworkSize,
    right: 18,
    top: '50%' as const,
    transform: [{ translateY: -artworkSize / 2 }],
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.overlay, { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }]}
    >
      <Animated.View style={[styles.scene, { opacity: sceneOpacity, transform: [{ translateY: sceneTranslateY }, { scale: sceneScale }] }]}>
        <LinearGradient colors={['#151318', '#0D0D0D', '#090909']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFillObject} />
        <View
          style={[
            styles.shell,
            responsive.contentFrame,
            {
              paddingTop: topPad + (responsive.isPhoneLandscape ? 4 : 8),
              paddingBottom: Math.max(7, bottomPad + (responsive.isPhoneLandscape ? 3 : 7)),
              paddingHorizontal: responsive.gutter,
              gap: responsive.isShort ? 8 : 11,
            },
          ]}
        >
          <View style={[styles.header, responsive.isPhoneLandscape && styles.headerLandscape]}>
            <View style={styles.brand}>
              <View style={styles.brandMark}><Ionicons name="pulse" size={21} color="#111111" /></View>
              <View><Text style={styles.brandName}>Synaura</Text><Text style={styles.brandSubtitle}>Ton monde musical</Text></View>
            </View>
            <View style={styles.topActions}>
              <MotionPressable accessibilityLabel="Rechercher" onPress={onSearch} style={styles.topButton} scaleTo={0.9}><Ionicons name="search" size={18} color="#F7F6F3" /></MotionPressable>
              <MotionPressable accessibilityLabel="Notifications" onPress={onNotifications} style={styles.topButton} scaleTo={0.9}><Ionicons name="notifications-outline" size={18} color="#F7F6F3" /></MotionPressable>
            </View>
          </View>

          <View style={styles.hero}>
            <LinearGradient colors={['#76505A', '#272126', '#0D0D0D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            {featuredCover ? <Image source={{ uri: featuredCover }} resizeMode="cover" blurRadius={22} style={styles.heroBackdrop} /> : null}
            <LinearGradient
              colors={['rgba(11,10,10,0.34)', 'rgba(11,10,10,0.48)', 'rgba(11,10,10,0.92)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            {responsive.isPhoneLandscape ? (
              <LinearGradient colors={['rgba(11,10,10,0.94)', 'rgba(11,10,10,0.46)', 'rgba(11,10,10,0.22)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />
            ) : null}

            <View style={styles.kickerRow}>
              <View style={styles.kickerDot} />
              <Text style={styles.kicker}>{isResume ? "REPRENDRE L'ÉCOUTE" : 'CHOISI POUR TOI'}</Text>
            </View>

            {featuredTrack && featuredCover ? (
              <MotionPressable
                accessibilityLabel={`Ouvrir ${featuredTrack.title}`}
                onPress={() => onOpenTrack(featuredTrack)}
                style={[styles.artwork, responsive.isPhoneLandscape ? landscapeArtworkPosition : portraitArtworkPosition]}
                scaleTo={0.97}
              >
                <TrackCover track={featuredTrack} active={false} style={styles.artworkImage} />
              </MotionPressable>
            ) : (
              <View style={[styles.artwork, styles.fallbackArtwork, responsive.isPhoneLandscape ? landscapeArtworkPosition : portraitArtworkPosition]}>
                <Image source={brandSymbol} resizeMode="contain" style={styles.fallbackSymbol} />
              </View>
            )}

            <View
              style={[
                styles.heroCopy,
                responsive.isPhoneLandscape && styles.heroCopyLandscape,
                !responsive.isPhoneLandscape && { paddingTop: artworkSize + (responsive.isShort ? 62 : 74) },
              ]}
            >
              <MotionPressable accessibilityLabel="Ouvrir le morceau" disabled={!featuredTrack} onPress={() => featuredTrack && onOpenTrack(featuredTrack)} style={styles.trackCopy} scaleTo={0.99}>
                <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.heroTitle, responsive.compactControls && styles.heroTitleCompact]}>{featuredTrack?.title || 'Ton Flow se prépare'}</Text>
                <Text numberOfLines={1} style={styles.heroArtist}>{featuredTrack ? artistName(featuredTrack) : 'De nouveaux sons arrivent sur Synaura'}</Text>
              </MotionPressable>

              <View style={styles.heroActions}>
                <MotionPressable accessibilityLabel="Écouter" disabled={!featuredTrack} onPress={() => featuredTrack && onPlayTrack(featuredTrack)} style={[styles.listenButton, !featuredTrack && styles.disabledButton]} scaleTo={0.94}>
                  <Ionicons name={isCurrentTrack && currentPlaying ? 'pause' : 'play'} size={17} color="#111111" />
                  <Text style={styles.listenText}>Écouter</Text>
                </MotionPressable>
                <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={styles.enterButton} scaleTo={0.96}>
                  <Ionicons name="pulse" size={17} color="#FFFFFF" />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.enterText}>Entrer dans le Flow</Text>
                </MotionPressable>
              </View>
            </View>
          </View>

          <View style={[styles.shortcutRow, responsive.isPhoneLandscape && styles.shortcutRowLandscape]}>
            <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={styles.shortcut} scaleTo={0.97}>
              <Ionicons name="pulse" size={20} color="#4A9EAA" />
              <View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>Flow</Text><Text numberOfLines={1} style={styles.shortcutSub}>Découvrir maintenant</Text></View>
            </MotionPressable>
            <MotionPressable accessibilityLabel="Ouvrir le Studio" onPress={onStudio} style={styles.shortcut} scaleTo={0.97}>
              <Ionicons name="sparkles-outline" size={20} color="#D96D63" />
              <View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>Studio</Text><Text numberOfLines={1} style={styles.shortcutSub}>Créer un morceau</Text></View>
            </MotionPressable>
          </View>

          {!responsive.isShort && !responsive.isPhoneLandscape ? (
            <MotionPressable accessibilityLabel="Glisser vers le Flow" onPress={finish} style={styles.swipeHint} scaleTo={0.97}>
              <Text style={styles.swipeHintText}>GLISSE VERS LE FLOW</Text>
              <Ionicons name="arrow-up" size={14} color="rgba(255,255,255,0.42)" />
            </MotionPressable>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 40, overflow: 'hidden', backgroundColor: '#0D0D0D' },
  scene: { flex: 1, backgroundColor: '#0D0D0D' },
  shell: { flex: 1, width: '100%', alignSelf: 'center' },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLandscape: { height: 42 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  brandName: { color: '#F7F6F3', fontSize: 15, lineHeight: 17, fontWeight: '900' },
  brandSubtitle: { marginTop: 1, color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700' },
  topActions: { flexDirection: 'row', gap: 7 },
  topButton: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hero: { flex: 1, minHeight: 218, overflow: 'hidden', borderRadius: 8, backgroundColor: '#151214', shadowColor: '#1E1619', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 7 },
  heroBackdrop: { ...StyleSheet.absoluteFillObject, width: '124%', height: '124%', left: '-12%', top: '-12%', opacity: 0.58, transform: [{ scale: 1.08 }] },
  kickerRow: { position: 'absolute', zIndex: 4, left: 16, top: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  kickerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D96D63' },
  kicker: { color: '#F1CEC1', fontSize: 9, fontWeight: '900' },
  artwork: { position: 'absolute', zIndex: 3, overflow: 'hidden', borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', shadowColor: '#000000', shadowOpacity: 0.42, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  artworkImage: { width: '100%', height: '100%' },
  fallbackArtwork: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' },
  fallbackSymbol: { width: '58%', height: '58%', opacity: 0.65 },
  heroCopy: { flex: 1, zIndex: 5, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 16 },
  heroCopyLandscape: { width: '68%', paddingTop: 50, paddingRight: 8, paddingBottom: 13 },
  trackCopy: { minWidth: 0 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 31, fontWeight: '900' },
  heroTitleCompact: { fontSize: 23, lineHeight: 25 },
  heroArtist: { marginTop: 5, color: 'rgba(255,255,255,0.64)', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  heroActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  listenButton: { height: 40, minWidth: 102, borderRadius: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#F7F6F3' },
  listenText: { color: '#111111', fontSize: 12, fontWeight: '900' },
  enterButton: { height: 40, minWidth: 0, maxWidth: 178, borderRadius: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  enterText: { flexShrink: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
  shortcutRow: { minHeight: 66, flexDirection: 'row', gap: 9 },
  shortcutRowLandscape: { minHeight: 54 },
  shortcut: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 13, backgroundColor: '#19191A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  shortcutCopy: { flex: 1, minWidth: 0 },
  shortcutTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  shortcutSub: { marginTop: 3, color: 'rgba(255,255,255,0.48)', fontSize: 9, fontWeight: '600' },
  swipeHint: { height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  swipeHintText: { color: 'rgba(255,255,255,0.42)', fontSize: 8, fontWeight: '900' },
});

export default HomeFlowPrelude;
