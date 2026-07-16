import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { HomePost, Track } from '@/api/types';
import { MotionPressable } from '@/components/motion/Motion';
import { getTrackCoverImage } from '@/components/TrackCover';
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
  const firstCover = getTrackCoverImage(firstTrack);
  const isCurrentTrack = Boolean(featuredTrack && currentTrack?._id === featuredTrack._id);
  const isResume = Boolean(isCurrentTrack && currentTrack?.audioUrl);
  const availableHeight = Math.max(320, responsive.height - Math.max(0, bottomPad));
  const flowPeekHeight = Math.max(responsive.isVeryShort ? 30 : 40, Math.round(availableHeight * 0.08));
  const homeHeight = Math.max(280, availableHeight - flowPeekHeight);

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
  const homeOpacity = progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.35, 0], extrapolate: 'clamp' });
  const homeTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -54] });
  const homeScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.overlay, { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }]}
    >
      <View style={[styles.surface, { paddingBottom: bottomPad }]}>
        <Animated.View
          style={[
            styles.home,
            responsive.contentFrame,
            {
              height: homeHeight,
              opacity: homeOpacity,
              paddingHorizontal: responsive.gutter,
              paddingTop: topPad + (responsive.isPhoneLandscape ? 4 : 8),
              paddingBottom: responsive.isShort ? 7 : 12,
              transform: [{ translateY: homeTranslateY }, { scale: homeScale }],
            },
          ]}
        >
          <View style={[styles.brandRow, responsive.isPhoneLandscape && styles.brandRowLandscape]}>
            <View style={[styles.logo, responsive.isPhoneLandscape && styles.logoLandscape]}>
              <Ionicons name="pulse" size={responsive.isPhoneLandscape ? 18 : 20} color="#111111" />
            </View>
            <View>
              <Text style={styles.brand}>Synaura</Text>
              {!responsive.isVeryShort ? <Text style={styles.brandLine}>Ton monde musical</Text> : null}
            </View>
          </View>

          <View style={styles.hero}>
            <LinearGradient colors={['#76505A', '#282127', '#0D0D0D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            {featuredCover ? (
              <Image source={{ uri: featuredCover }} resizeMode="cover" blurRadius={18} style={styles.heroCover} />
            ) : (
              <Image source={brandSymbol} resizeMode="contain" style={styles.heroSymbol} />
            )}
            <LinearGradient colors={['rgba(13,13,13,0.08)', 'rgba(13,13,13,0.2)', 'rgba(13,13,13,0.94)']} locations={[0, 0.43, 1]} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={['rgba(13,13,13,0.38)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />

            <View style={[styles.heroBottom, responsive.isPhoneLandscape && styles.heroBottomLandscape]}>
              <Text style={styles.kicker}>{isResume ? "REPRENDRE L'ÉCOUTE" : 'CHOISI POUR TOI'}</Text>
              <MotionPressable accessibilityLabel="Ouvrir le morceau" disabled={!featuredTrack} onPress={() => featuredTrack && onOpenTrack(featuredTrack)} style={styles.trackCopy} scaleTo={0.99}>
                <Text maxFontSizeMultiplier={1.15} numberOfLines={2} adjustsFontSizeToFit style={[styles.heroTitle, responsive.compactControls && styles.heroTitleCompact]}>{featuredTrack?.title || 'Ton Flow se prépare'}</Text>
                <Text numberOfLines={1} style={styles.heroArtist}>{featuredTrack ? artistName(featuredTrack) : 'Synaura prépare ta sélection'}</Text>
              </MotionPressable>

              <View style={styles.heroActions}>
                <MotionPressable accessibilityLabel="Écouter" disabled={!featuredTrack} onPress={() => featuredTrack && onPlayTrack(featuredTrack)} style={[styles.listenButton, !featuredTrack && styles.disabledButton]} scaleTo={0.94}>
                  <Ionicons name={isCurrentTrack && currentPlaying ? 'pause' : 'play'} size={17} color="#111111" />
                  <Text style={styles.listenText}>Écouter</Text>
                </MotionPressable>
                <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={styles.flowButton} scaleTo={0.96}>
                  <Ionicons name="pulse" size={17} color="#FFFFFF" />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.flowText}>Entrer dans le Flow</Text>
                </MotionPressable>
              </View>
            </View>
          </View>

          <View style={[styles.shortcutRow, responsive.isShort && styles.shortcutRowCompact]}>
            <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={styles.shortcut} scaleTo={0.97}>
              <Ionicons name="pulse" size={20} color="#4A9EAA" />
              <View style={styles.shortcutCopy}>
                <Text style={styles.shortcutTitle}>Flow</Text>
                {!responsive.isVeryShort ? <Text numberOfLines={1} style={styles.shortcutSub}>Découvrir maintenant</Text> : null}
              </View>
            </MotionPressable>
            <MotionPressable accessibilityLabel="Ouvrir le Studio" onPress={onStudio} style={styles.shortcut} scaleTo={0.97}>
              <Ionicons name="sparkles-outline" size={20} color="#D96D63" />
              <View style={styles.shortcutCopy}>
                <Text style={styles.shortcutTitle}>Studio</Text>
                {!responsive.isVeryShort ? <Text numberOfLines={1} style={styles.shortcutSub}>Créer un morceau</Text> : null}
              </View>
            </MotionPressable>
          </View>
        </Animated.View>

        <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={[styles.flowPeek, { height: flowPeekHeight }]} scaleTo={1}>
          <LinearGradient colors={['#211A2E', '#142326', '#090909']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          {firstCover ? <Image source={{ uri: firstCover }} resizeMode="cover" blurRadius={20} style={styles.flowPeekCover} /> : null}
          <LinearGradient colors={['rgba(13,13,13,0.28)', '#090909']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.peekHandle} />
        </MotionPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 40, overflow: 'hidden', backgroundColor: '#0D0D0D' },
  surface: { flex: 1, backgroundColor: '#0D0D0D' },
  home: { width: '100%', alignSelf: 'center', backgroundColor: '#0D0D0D' },
  brandRow: { height: 40, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandRowLandscape: { height: 34, marginBottom: 8 },
  logo: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  logoLandscape: { width: 34, height: 34 },
  brand: { color: '#F7F6F3', fontSize: 18, lineHeight: 20, fontWeight: '900' },
  brandLine: { marginTop: 2, color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700' },
  hero: { flex: 1, minHeight: 156, overflow: 'hidden', borderRadius: 8, justifyContent: 'flex-end', backgroundColor: '#161417', shadowColor: '#000000', shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 7 },
  heroCover: { ...StyleSheet.absoluteFillObject, width: '116%', height: '116%', left: '-8%', top: '-8%', opacity: 0.54, transform: [{ scale: 1.05 }] },
  heroSymbol: { position: 'absolute', alignSelf: 'center', top: '27%', width: 150, height: 150, opacity: 0.08 },
  heroBottom: { zIndex: 3, padding: 18, gap: 7 },
  heroBottomLandscape: { width: '72%', padding: 14, gap: 4 },
  kicker: { color: '#F1CEC1', fontSize: 9, fontWeight: '900' },
  trackCopy: { minWidth: 0 },
  heroTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 32, fontWeight: '900' },
  heroTitleCompact: { fontSize: 24, lineHeight: 26 },
  heroArtist: { marginTop: 4, color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '700' },
  heroActions: { marginTop: 3, flexDirection: 'row', gap: 8 },
  listenButton: { height: 40, minWidth: 102, borderRadius: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#F7F6F3' },
  listenText: { color: '#111111', fontSize: 12, fontWeight: '900' },
  flowButton: { height: 40, minWidth: 0, maxWidth: 180, borderRadius: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  flowText: { flexShrink: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
  shortcutRow: { minHeight: 70, marginTop: 12, flexDirection: 'row', gap: 10 },
  shortcutRowCompact: { minHeight: 54, marginTop: 8 },
  shortcut: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#19191B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  shortcutCopy: { flex: 1, minWidth: 0 },
  shortcutTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  shortcutSub: { marginTop: 3, color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '600' },
  flowPeek: { width: '100%', minHeight: 30, overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: '#111111' },
  flowPeekCover: { ...StyleSheet.absoluteFillObject, width: '140%', height: '140%', left: '-20%', top: '-20%', opacity: 0.26 },
  peekHandle: { position: 'absolute', top: 7, alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
});

export default HomeFlowPrelude;
