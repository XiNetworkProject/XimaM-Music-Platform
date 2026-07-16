import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { HomePost, Track } from '@/api/types';
import { MotionPressable } from '@/components/motion/Motion';
import { TrackCover } from '@/components/TrackCover';
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
  const firstTrack = tracks[0] || null;
  const resumeTrack = currentTrack?.audioUrl ? currentTrack : firstTrack;
  const firstName = String(userName || '').trim().split(/\s+/)[0] || '';
  const displayTracks = useMemo(() => tracks.filter((track) => track.audioUrl).slice(0, 5), [tracks]);
  const displayPosts = useMemo(() => posts.filter((post) => post.text || post.track || post.imageUrl).slice(0, 2), [posts]);
  const showTracks = !responsive.isVeryShort && !responsive.isPhoneLandscape;
  const showPosts = !responsive.isShort && !responsive.isPhoneLandscape;
  const showResume = !responsive.isVeryShort && !responsive.isPhoneLandscape;
  const transitionDistance = Math.max(180, responsive.height * 0.42);
  const previewHeight = responsive.isPhoneLandscape ? 118 : responsive.isShort ? 150 : Math.min(250, responsive.height * 0.27);
  const previewTop = Math.min(responsive.height - previewHeight - bottomPad, Math.max(330, responsive.height * 0.66));
  const initialScaleX = Math.max(0.72, (responsive.width - responsive.gutter * 2) / responsive.width);
  const initialScaleY = Math.max(0.16, previewHeight / responsive.height);
  const initialTranslateY = previewTop + previewHeight / 2 - responsive.height / 2;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    if (visible) {
      progress.stopAnimation();
      progress.setValue(0);
      progressValue.current = 0;
    }
  }, [progress, visible]);

  const finish = () => {
    if (settings.reducedMotion) {
      progress.setValue(1);
      onEnterFlow();
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onEnterFlow();
    });
  };

  const reset = () => {
    Animated.spring(progress, {
      toValue: 0,
      speed: 24,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      progress.setValue(clamp(-gesture.dy / transitionDistance, 0, 1));
    },
    onPanResponderRelease: (_, gesture) => {
      if (progressValue.current > 0.34 || gesture.vy < -0.55) finish();
      else reset();
    },
    onPanResponderTerminate: reset,
  }), [transitionDistance]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const quickActions = [
    { label: 'Découvrir', icon: 'compass-outline' as const, tone: colors.violet, action: onDiscover },
    { label: 'Radar', icon: 'radio-outline' as const, tone: colors.cyan, action: onRadar },
    { label: 'Studio', icon: 'sparkles-outline' as const, tone: colors.coral, action: onStudio },
    { label: 'Events', icon: 'calendar-outline' as const, tone: colors.black, action: onEvents },
  ];

  const contentOpacity = progress.interpolate({ inputRange: [0, 0.58, 0.82], outputRange: [1, 0.55, 0], extrapolate: 'clamp' });
  const warmOpacity = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0.25, 0], extrapolate: 'clamp' });
  const previewOpacity = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' });
  const previewCopyOpacity = progress.interpolate({ inputRange: [0, 0.42, 0.66], outputRange: [1, 0.45, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.overlay} {...panResponder.panHandlers}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: warmOpacity }]}>
        <LinearGradient colors={['#FBFAF7', '#F4EFEA', '#EDE9E3']} locations={[0, 0.62, 1]} style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={['rgba(217,109,99,0.17)', 'rgba(217,109,99,0.02)', 'transparent']} locations={[0, 0.5, 1]} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.8 }} style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={['transparent', 'rgba(74,158,170,0.12)']} start={{ x: 0.8, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <Animated.View
        style={[
          styles.homeContent,
          responsive.contentFrame,
          {
            paddingTop: topPad + 8,
            paddingHorizontal: responsive.gutter,
            opacity: contentOpacity,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }],
          },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Ionicons name="pulse" size={21} color={colors.paper} /></View>
            <View><Text style={styles.brandName}>Synaura</Text><Text style={styles.brandSubtitle}>Ton monde musical</Text></View>
          </View>
          <View style={styles.topActions}>
            <MotionPressable accessibilityLabel="Rechercher" onPress={onSearch} style={styles.topButton} scaleTo={0.9}><Ionicons name="search" size={18} color={colors.black} /></MotionPressable>
            <MotionPressable accessibilityLabel="Notifications" onPress={onNotifications} style={styles.topButton} scaleTo={0.9}><Ionicons name="notifications-outline" size={18} color={colors.black} /></MotionPressable>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>POUR TOI, MAINTENANT</Text>
          <Text maxFontSizeMultiplier={1.15} numberOfLines={1} adjustsFontSizeToFit style={[styles.greetingTitle, responsive.compactControls && styles.greetingTitleCompact]}>{greeting()}{firstName ? ` ${firstName}` : ''}.</Text>
          {!responsive.isPhoneLandscape ? <Text style={styles.greetingText}>Retrouve l’essentiel, puis glisse dans ton Flow.</Text> : null}
        </View>

        <View style={[styles.quickGrid, responsive.isTiny && styles.quickGridTiny]}>
          {quickActions.map((action) => (
            <MotionPressable key={action.label} accessibilityLabel={action.label} onPress={action.action} style={[styles.quickAction, responsive.isTiny && styles.quickActionTiny]} scaleTo={0.94}>
              <Ionicons name={action.icon} size={17} color={action.tone} />
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
              <Ionicons name={currentPlaying && currentTrack?._id === resumeTrack._id ? 'pause' : 'play'} size={18} color={colors.paper} />
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
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.48)']} style={StyleSheet.absoluteFillObject} />
                    <Ionicons name="play" size={13} color="#FFFFFF" style={styles.miniPlay} />
                  </View>
                  <Text numberOfLines={1} style={styles.miniTitle}>{track.title}</Text>
                </MotionPressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {showPosts && displayPosts.length ? (
          <View style={styles.secondarySection}>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Dans la communauté</Text><Text style={styles.sectionNote}>Autour des sons</Text></View>
            <View style={styles.postRow}>
              {displayPosts.map((post) => (
                <MotionPressable key={post.id} accessibilityLabel="Ouvrir la publication" onPress={() => onOpenPost(post)} style={styles.postPreview} scaleTo={0.97}>
                  <View style={styles.postAvatar}>
                    {post.avatar?.startsWith('http') ? <TrackCover source={post.avatar} style={styles.postAvatarImage} /> : <Text style={styles.postAvatarText}>{(post.author || 'S').slice(0, 1).toUpperCase()}</Text>}
                  </View>
                  <View style={styles.postCopy}><Text numberOfLines={1} style={styles.postAuthor}>{post.author}</Text><Text numberOfLines={2} style={styles.postText}>{post.text || (post.track ? `À propos de ${post.track.title}` : 'Publication Synaura')}</Text></View>
                  {post.track ? <TrackCover track={post.track} active={false} style={styles.postTrackCover} /> : null}
                </MotionPressable>
              ))}
            </View>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.preview,
          {
            opacity: previewOpacity,
            transform: [
              { scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [initialScaleX, 1] }) },
              { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [initialScaleY, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [initialTranslateY, 0] }) },
            ],
          },
        ]}
      >
        {firstTrack ? <TrackCover track={firstTrack} active={false} style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#7357C6', '#171313']} style={StyleSheet.absoluteFillObject} />}
        <LinearGradient colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.88)']} locations={[0.28, 1]} style={StyleSheet.absoluteFillObject} />
        <Animated.View style={[styles.previewCopy, { opacity: previewCopyOpacity }]}>
          <Text style={styles.previewBadge}>TON FLOW EST PRÊT</Text>
          <Text numberOfLines={1} style={styles.previewTitle}>{firstTrack?.title || 'Le Flow arrive'}</Text>
          <Text numberOfLines={1} style={styles.previewArtist}>{firstTrack ? artistName(firstTrack) : 'Synaura prépare ta sélection'}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.hintWrap, { bottom: bottomPad + 8, opacity: contentOpacity }]}>
        <MotionPressable accessibilityLabel="Ouvrir le Flow" onPress={finish} style={styles.hint} scaleTo={0.94}>
          <Text style={styles.hintText}>GLISSE VERS LE FLOW</Text>
          <Ionicons name="arrow-up" size={15} color="#FFFFFF" />
        </MotionPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 40, overflow: 'hidden', backgroundColor: 'transparent' },
  homeContent: { position: 'absolute', top: 0, bottom: 0, alignSelf: 'center' },
  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  brandName: { color: colors.black, fontSize: 14, fontWeight: '900' },
  brandSubtitle: { marginTop: 1, color: 'rgba(17,17,17,0.46)', fontSize: 9, fontWeight: '700' },
  topActions: { flexDirection: 'row', gap: 7 },
  topButton: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(17,17,17,0.07)' },
  greeting: { marginTop: 12 },
  eyebrow: { color: colors.violet, fontSize: 9, fontWeight: '900' },
  greetingTitle: { marginTop: 7, color: colors.black, fontSize: 29, lineHeight: 32, fontWeight: '900' },
  greetingTitleCompact: { fontSize: 24, lineHeight: 27 },
  greetingText: { marginTop: 5, color: 'rgba(17,17,17,0.50)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  quickGrid: { marginTop: 13, flexDirection: 'row', gap: 6 },
  quickGridTiny: { flexWrap: 'wrap' },
  quickAction: { flex: 1, minWidth: 0, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)' },
  quickActionTiny: { flexBasis: '46%' },
  quickLabel: { color: colors.black, fontSize: 9, fontWeight: '900' },
  resumeCard: { marginTop: 13, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.80)', borderWidth: 1, borderColor: 'rgba(17,17,17,0.07)' },
  resumeCoverWrap: { width: 52, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(17,17,17,0.06)' },
  resumeCover: { width: '100%', height: '100%' },
  resumeCopy: { flex: 1, minWidth: 0 },
  resumeKicker: { color: colors.cyan, fontSize: 8, fontWeight: '900' },
  resumeTitle: { marginTop: 4, color: colors.black, fontSize: 13, fontWeight: '900' },
  resumeArtist: { marginTop: 2, color: 'rgba(17,17,17,0.44)', fontSize: 9, fontWeight: '700' },
  resumePlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  secondarySection: { marginTop: 13 },
  sectionHead: { marginBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.black, fontSize: 12, fontWeight: '900' },
  sectionNote: { color: 'rgba(17,17,17,0.36)', fontSize: 8, fontWeight: '700' },
  trackRail: { gap: 8, paddingRight: 4 },
  miniTrack: { width: 58 },
  miniCoverWrap: { width: 58, height: 58, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(17,17,17,0.06)' },
  miniCover: { width: '100%', height: '100%' },
  miniPlay: { position: 'absolute', right: 6, bottom: 6 },
  miniTitle: { marginTop: 4, color: colors.black, fontSize: 8, fontWeight: '900' },
  postRow: { flexDirection: 'row', gap: 7 },
  postPreview: { flex: 1, minWidth: 0, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 8, padding: 7, backgroundColor: 'rgba(255,255,255,0.70)', borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)' },
  postAvatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  postAvatarImage: { width: '100%', height: '100%' },
  postAvatarText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  postCopy: { flex: 1, minWidth: 0 },
  postAuthor: { color: colors.black, fontSize: 9, fontWeight: '900' },
  postText: { marginTop: 2, color: 'rgba(17,17,17,0.48)', fontSize: 8, lineHeight: 11, fontWeight: '700' },
  postTrackCover: { width: 34, height: 34, borderRadius: 8 },
  preview: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 24, backgroundColor: '#171313' },
  previewCopy: { position: 'absolute', left: 24, right: 70, bottom: 44 },
  previewBadge: { alignSelf: 'flex-start', borderRadius: 5, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, color: '#FFFFFF', backgroundColor: colors.violet, fontSize: 8, fontWeight: '900' },
  previewTitle: { marginTop: 8, color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  previewArtist: { marginTop: 3, color: 'rgba(255,255,255,0.62)', fontSize: 10, fontWeight: '800' },
  hintWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 45 },
  hint: { alignItems: 'center', gap: 2 },
  hintText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
});

export default HomeFlowPrelude;
