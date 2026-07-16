import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { HomePost, Track } from '@/api/types';
import { MotionPressable } from '@/components/motion/Motion';
import { getTrackCoverImage, TrackCover } from '@/components/TrackCover';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';

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

function greeting() {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 18 ? 'Bonsoir' : 'Bonjour';
}

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
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
  const responsive = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const progress = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(0);
  const finishingRef = useRef(false);
  const firstTrack = tracks[0] || null;
  const firstCover = getTrackCoverImage(firstTrack);
  const resumeTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const firstName = String(userName || '').trim().split(/\s+/)[0] || '';
  const displayTracks = useMemo(() => tracks.filter((track) => track.audioUrl).slice(0, 5), [tracks]);
  const displayPosts = useMemo(() => posts.filter((post) => post.text || post.track || post.imageUrl).slice(0, 2), [posts]);
  const showResume = !responsive.isVeryShort && !responsive.isPhoneLandscape;
  const showTracks = !responsive.isShort && !responsive.isPhoneLandscape;
  const showPosts = responsive.height >= 900 && !responsive.isPhoneLandscape;

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
      duration: 280,
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

  const quickActions = [
    { label: 'Découvrir', icon: 'compass-outline' as const, tone: '#A995E8', action: onDiscover },
    { label: 'Radar', icon: 'radio-outline' as const, tone: '#74C7CF', action: onRadar },
    { label: 'Studio', icon: 'sparkles-outline' as const, tone: '#F09A91', action: onStudio },
    { label: 'Events', icon: 'calendar-outline' as const, tone: '#F7F6F3', action: onEvents },
  ];
  const screenTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -responsive.height] });
  const screenOpacity = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0.96, 0.48], extrapolate: 'clamp' });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.overlay, { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }]}
    >
      <LinearGradient colors={['#121212', '#0D0D0D', '#090909']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={['rgba(115,87,198,0.18)', 'rgba(74,158,170,0.04)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.72 }} style={StyleSheet.absoluteFillObject} />

      <View style={[styles.surface, { paddingBottom: bottomPad }]}>
        <View
          style={[
            styles.homeContent,
            responsive.contentFrame,
            {
              paddingTop: topPad + 7,
              paddingHorizontal: responsive.gutter,
            },
          ]}
        >
          <View style={styles.topBar}>
            <View style={styles.brand}>
              <View style={styles.brandMark}><Ionicons name="pulse" size={21} color="#111111" /></View>
              <View><Text style={styles.brandName}>Synaura</Text><Text style={styles.brandSubtitle}>Ton monde musical</Text></View>
            </View>
            <View style={styles.topActions}>
              <MotionPressable accessibilityLabel="Rechercher" onPress={onSearch} style={styles.topButton} scaleTo={0.9}><Ionicons name="search" size={18} color="#F7F6F3" /></MotionPressable>
              <MotionPressable accessibilityLabel="Notifications" onPress={onNotifications} style={styles.topButton} scaleTo={0.9}><Ionicons name="notifications-outline" size={18} color="#F7F6F3" /></MotionPressable>
            </View>
          </View>

          <View style={[styles.greeting, responsive.isPhoneLandscape && styles.greetingLandscape]}>
            <Text style={styles.eyebrow}>POUR TOI, MAINTENANT</Text>
            <Text maxFontSizeMultiplier={1.15} numberOfLines={1} adjustsFontSizeToFit style={[styles.greetingTitle, responsive.compactControls && styles.greetingTitleCompact]}>{greeting()}{firstName ? ` ${firstName}` : ''}.</Text>
            {!responsive.isPhoneLandscape ? <Text style={styles.greetingText}>Tes raccourcis, tes sons, puis ton Flow.</Text> : null}
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <MotionPressable key={action.label} accessibilityLabel={action.label} onPress={action.action} style={styles.quickAction} scaleTo={0.94}>
                <Ionicons name={action.icon} size={16} color={action.tone} />
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.quickLabel}>{action.label}</Text>
              </MotionPressable>
            ))}
          </View>

          {resumeTrack && showResume ? (
            <View style={styles.resumeCard}>
              <MotionPressable accessibilityLabel="Ouvrir le morceau" onPress={() => onOpenTrack(resumeTrack)} style={styles.resumeCoverWrap} scaleTo={0.96}>
                <TrackCover track={resumeTrack} active={false} style={styles.resumeCover} />
              </MotionPressable>
              <MotionPressable accessibilityLabel="Ouvrir le morceau" onPress={() => onOpenTrack(resumeTrack)} style={styles.resumeCopy} scaleTo={0.98}>
                <Text style={styles.resumeKicker}>{currentTrack?.audioUrl ? "REPRENDRE L'ÉCOUTE" : 'À DÉCOUVRIR MAINTENANT'}</Text>
                <Text numberOfLines={1} style={styles.resumeTitle}>{resumeTrack.title}</Text>
                <Text numberOfLines={1} style={styles.resumeArtist}>{artistName(resumeTrack)}</Text>
              </MotionPressable>
              <MotionPressable accessibilityLabel={currentPlaying ? 'Pause' : 'Lecture'} onPress={() => onPlayTrack(resumeTrack)} style={styles.resumePlay} scaleTo={0.9}>
                <Ionicons name={currentPlaying && currentTrack?._id === resumeTrack._id ? 'pause' : 'play'} size={18} color="#111111" />
              </MotionPressable>
            </View>
          ) : null}

          {showTracks && displayTracks.length ? (
            <View style={styles.secondarySection}>
              <View style={styles.sectionHead}><Text style={styles.sectionTitle}>À écouter maintenant</Text><Text style={styles.sectionNote}>Du moment</Text></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
                {displayTracks.map((track) => (
                  <MotionPressable key={track._id} accessibilityLabel={`Écouter ${track.title}`} onPress={() => onOpenTrack(track)} style={styles.miniTrack} scaleTo={0.95}>
                    <View style={styles.miniCoverWrap}>
                      <TrackCover track={track} active={false} style={styles.miniCover} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />
                      <Ionicons name="play" size={12} color="#FFFFFF" style={styles.miniPlay} />
                    </View>
                    <Text numberOfLines={1} style={styles.miniTitle}>{track.title}</Text>
                  </MotionPressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {showPosts && displayPosts.length ? (
            <View style={styles.postRow}>
              {displayPosts.map((post) => (
                <MotionPressable key={post.id} accessibilityLabel="Ouvrir la publication" onPress={() => onOpenPost(post)} style={styles.postPreview} scaleTo={0.97}>
                  <View style={styles.postAvatar}>
                    {post.avatar?.startsWith('http') ? <TrackCover source={post.avatar} style={styles.postAvatarImage} /> : <Text style={styles.postAvatarText}>{(post.author || 'S').slice(0, 1).toUpperCase()}</Text>}
                  </View>
                  <View style={styles.postCopy}><Text numberOfLines={1} style={styles.postAuthor}>{post.author}</Text><Text numberOfLines={1} style={styles.postText}>{post.text || (post.track ? `À propos de ${post.track.title}` : 'Publication Synaura')}</Text></View>
                  {post.track ? <TrackCover track={post.track} active={false} style={styles.postTrackCover} /> : null}
                </MotionPressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.flowStage}>
          <LinearGradient colors={['#211A2E', '#142326', '#171313', '#090909']} locations={[0, 0.35, 0.66, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          {firstCover ? <Image source={{ uri: firstCover }} resizeMode="cover" blurRadius={14} style={styles.flowBackdrop} /> : null}
          <LinearGradient colors={['#090909', 'rgba(9,9,9,0.56)', 'rgba(9,9,9,0.08)', 'rgba(9,9,9,0.8)']} locations={[0, 0.19, 0.54, 1]} style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(9,9,9,0.58)', 'transparent', 'rgba(9,9,9,0.22)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} />

          <View style={[styles.flowContent, { paddingHorizontal: responsive.gutter }]}>
            <MotionPressable accessibilityLabel="Ouvrir le premier son du Flow" disabled={!firstTrack} onPress={() => firstTrack && onOpenTrack(firstTrack)} style={styles.flowIdentity} scaleTo={0.98}>
              <View style={[styles.flowCoverWrap, responsive.isShort && styles.flowCoverWrapCompact]}>
                {firstTrack ? <TrackCover track={firstTrack} active={false} style={styles.flowCover} /> : <Ionicons name="musical-notes" size={24} color="rgba(255,255,255,0.45)" />}
              </View>
              <View style={styles.flowCopy}>
                <Text style={styles.flowBadge}>TON FLOW</Text>
                <Text numberOfLines={1} style={[styles.flowTitle, responsive.isNarrow && styles.flowTitleNarrow]}>{firstTrack?.title || 'Le Flow arrive'}</Text>
                <Text numberOfLines={1} style={styles.flowArtist}>{firstTrack ? artistName(firstTrack) : 'Synaura prépare ta sélection'}</Text>
              </View>
            </MotionPressable>
            <MotionPressable accessibilityLabel="Entrer dans le Flow" onPress={finish} style={styles.flowButton} scaleTo={0.9}>
              <Ionicons name="arrow-up" size={21} color="#111111" />
            </MotionPressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 40, overflow: 'hidden', backgroundColor: '#090909' },
  surface: { flex: 1 },
  homeContent: { width: '100%', alignSelf: 'center', flexShrink: 0, paddingBottom: 10 },
  topBar: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  brandName: { color: '#F7F6F3', fontSize: 14, fontWeight: '900' },
  brandSubtitle: { marginTop: 1, color: 'rgba(255,255,255,0.46)', fontSize: 9, fontWeight: '700' },
  topActions: { flexDirection: 'row', gap: 7 },
  topButton: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  greeting: { marginTop: 11 },
  greetingLandscape: { marginTop: 5 },
  eyebrow: { color: '#A995E8', fontSize: 9, fontWeight: '900' },
  greetingTitle: { marginTop: 5, color: '#F7F6F3', fontSize: 28, lineHeight: 31, fontWeight: '900' },
  greetingTitleCompact: { fontSize: 23, lineHeight: 26 },
  greetingText: { marginTop: 4, color: 'rgba(255,255,255,0.52)', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  quickGrid: { marginTop: 11, flexDirection: 'row', gap: 6 },
  quickAction: { flex: 1, minWidth: 0, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickLabel: { color: '#F7F6F3', fontSize: 8, fontWeight: '900' },
  resumeCard: { marginTop: 11, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 8, padding: 7, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  resumeCoverWrap: { width: 50, height: 50, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  resumeCover: { width: '100%', height: '100%' },
  resumeCopy: { flex: 1, minWidth: 0 },
  resumeKicker: { color: '#74C7CF', fontSize: 8, fontWeight: '900' },
  resumeTitle: { marginTop: 3, color: '#F7F6F3', fontSize: 13, fontWeight: '900' },
  resumeArtist: { marginTop: 2, color: 'rgba(255,255,255,0.46)', fontSize: 9, fontWeight: '700' },
  resumePlay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3' },
  secondarySection: { marginTop: 10 },
  sectionHead: { marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#F7F6F3', fontSize: 12, fontWeight: '900' },
  sectionNote: { color: 'rgba(255,255,255,0.38)', fontSize: 8, fontWeight: '700' },
  trackRail: { gap: 8, paddingRight: 4 },
  miniTrack: { width: 56 },
  miniCoverWrap: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
  miniCover: { width: '100%', height: '100%' },
  miniPlay: { position: 'absolute', right: 6, bottom: 6 },
  miniTitle: { marginTop: 3, color: '#F7F6F3', fontSize: 8, fontWeight: '900' },
  postRow: { marginTop: 9, flexDirection: 'row', gap: 7 },
  postPreview: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  postAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  postAvatarImage: { width: '100%', height: '100%' },
  postAvatarText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  postCopy: { flex: 1, minWidth: 0 },
  postAuthor: { color: '#F7F6F3', fontSize: 9, fontWeight: '900' },
  postText: { marginTop: 2, color: 'rgba(255,255,255,0.48)', fontSize: 8, lineHeight: 11, fontWeight: '700' },
  postTrackCover: { width: 32, height: 32, borderRadius: 8 },
  flowStage: { flex: 1, minHeight: 168, overflow: 'hidden', backgroundColor: '#111111', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  flowBackdrop: { ...StyleSheet.absoluteFillObject, width: '112%', height: '112%', left: '-6%', top: '-6%', opacity: 0.62, transform: [{ scale: 1.06 }] },
  flowContent: { position: 'absolute', left: 0, right: 0, bottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  flowIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  flowCoverWrap: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  flowCoverWrapCompact: { width: 58, height: 58 },
  flowCover: { width: '100%', height: '100%' },
  flowCopy: { flex: 1, minWidth: 0 },
  flowBadge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, color: '#FFFFFF', backgroundColor: colors.violet, fontSize: 8, fontWeight: '900' },
  flowTitle: { marginTop: 7, color: '#FFFFFF', fontSize: 21, lineHeight: 25, fontWeight: '900' },
  flowTitleNarrow: { fontSize: 18, lineHeight: 22 },
  flowArtist: { marginTop: 2, color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' },
  flowButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3', borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 8 },
});

export default HomeFlowPrelude;
