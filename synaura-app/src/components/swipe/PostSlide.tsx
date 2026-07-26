import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { HomePost, Track } from '@/api/types';
import { togglePostLike } from '@/api/client';
import { MotionPressable } from '@/components/motion/Motion';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';
import { PostShareSheet } from '@/components/social/PostShareSheet';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraImage } from '@/components/ui/SynauraImage';

const FONT_BLACK = Platform.select({ android: 'sans-serif-black', ios: 'System', default: 'System' });
const FONT_BOLD = Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' });

const SIGNAL = {
  black: '#09090B',
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
  post: HomePost;
  active: boolean;
  playing: boolean;
  height: number;
  topPad: number;
  bottomPad: number;
  onOpenPost: () => void;
  onOpenProfile: () => void;
  onOpenTrack: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  onLikeChange?: (liked: boolean) => void;
};

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return String(Math.max(0, value));
}

function PostAura({ variant }: { variant: 'primary' | 'secondary' }) {
  const primary = variant === 'primary';
  const suffix = primary ? 'PostPrimary' : 'PostSecondary';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`postCoral${suffix}`} cx={primary ? '94' : '58'} cy={primary ? '8' : '40'} rx="74" ry="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.44 : 0.22} />
          <Stop offset="0.4" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.15 : 0.07} />
          <Stop offset="0.82" stopColor={SIGNAL.coral} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`postViolet${suffix}`} cx={primary ? '6' : '32'} cy={primary ? '16' : '58'} rx="72" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.38 : 0.2} />
          <Stop offset="0.4" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.12 : 0.06} />
          <Stop offset="0.84" stopColor={SIGNAL.violet} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`postCyan${suffix}`} cx={primary ? '52' : '14'} cy={primary ? '70' : '28'} rx="62" ry="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.2 : 0.14} />
          <Stop offset="0.44" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.065 : 0.04} />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#postCoral${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#postViolet${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#postCyan${suffix})`} />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

export const PostSlide = memo(function PostSlide(props: Props) {
  const { post, active, playing, height, topPad, bottomPad, onOpenPost, onOpenProfile, onOpenTrack, onPlayTrack, onLikeChange } = props;
  const responsive = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [liking, setLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const visual = post.imageUrl || post.track?.coverUrl || null;
  const initial = (post.author || post.handle || 'S').slice(0, 1).toUpperCase();

  const reveal = useRef(new Animated.Value(active ? 1 : 0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;
  const cardBreath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLiked(post.isLiked);
    setLikesCount(post.likesCount);
  }, [post.id, post.isLiked, post.likesCount]);

  useEffect(() => {
    Animated.spring(reveal, { toValue: active ? 1 : 0, speed: 16, bounciness: active ? 5 : 0, useNativeDriver: true }).start();
  }, [active, reveal]);

  useEffect(() => {
    if (!active || settings.reducedMotion) {
      auraOne.stopAnimation();
      auraTwo.stopAnimation();
      cardBreath.stopAnimation();
      auraOne.setValue(0.5);
      auraTwo.setValue(0.5);
      cardBreath.setValue(0);
      return;
    }
    const first = Animated.loop(Animated.sequence([
      Animated.timing(auraOne, { toValue: 1, duration: 6_900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6_900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const second = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8_500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8_500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const breath = Animated.loop(Animated.sequence([
      Animated.timing(cardBreath, { toValue: 1, duration: 3_100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(cardBreath, { toValue: 0, duration: 3_100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    first.start();
    second.start();
    breath.start();
    return () => { first.stop(); second.stop(); breath.stop(); };
  }, [active, auraOne, auraTwo, cardBreath, settings.reducedMotion]);

  const toggleLike = async () => {
    if (liking) return;
    const next = !liked;
    setLiked(next);
    setLikesCount((current) => Math.max(0, current + (next ? 1 : -1)));
    setLiking(true);
    try {
      const result = await togglePostLike(post.id);
      if (typeof result?.liked === 'boolean') setLiked(result.liked);
      if (Number.isFinite(Number(result?.likesCount))) setLikesCount(Number(result.likesCount));
      onLikeChange?.(typeof result?.liked === 'boolean' ? result.liked : next);
    } catch {
      setLiked(!next);
      setLikesCount((current) => Math.max(0, current + (next ? -1 : 1)));
    } finally {
      setLiking(false);
    }
  };

  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.88] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.16] }) },
    ],
  };
  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.68] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [18, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1.03] }) },
    ],
  };
  const panelScale = cardBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.006] });

  return (
    <View style={[styles.page, { height }]}> 
      {visual ? <SynauraImage source={{ uri: visual }} lowPriority={!active} transition={0} style={styles.backdropImage} /> : <LinearGradient colors={['#2A203D', '#171313', SIGNAL.black]} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFillObject} />}
      <LinearGradient colors={['rgba(9,9,11,0.28)', 'rgba(9,9,11,0.54)', 'rgba(9,9,11,0.96)']} locations={[0, 0.54, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><PostAura variant="primary" /></Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><PostAura variant="secondary" /></Animated.View>
      <View pointerEvents="none" style={styles.topEdge}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>

      <Animated.View style={[styles.content, responsive.contentFrame, { paddingTop: topPad + (responsive.isPhoneLandscape ? 54 : responsive.compactControls ? 78 : 96), paddingBottom: bottomPad + (responsive.isPhoneLandscape ? 7 : responsive.compactControls ? 14 : 22), paddingHorizontal: responsive.gutter, opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}> 
        <Animated.View style={[styles.glassPanel, responsive.isVeryShort && styles.glassPanelShort, { transform: [{ scale: panelScale }] }]}> 
          <LinearGradient colors={['rgba(20,18,25,0.82)', 'rgba(11,10,14,0.68)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <GlassOutline radius={26} opacity={0.23} />
          <View style={styles.panelAccent} />

          <View style={styles.authorRow}>
            <Pressable accessibilityLabel="Ouvrir le profil" onPress={onOpenProfile} style={[styles.avatar, responsive.isVeryShort && styles.avatarCompact]}>
              {post.avatar?.startsWith('http') ? <SynauraImage source={{ uri: post.avatar }} lowPriority={!active} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.avatarText}>{initial}</Text>}
              <GlassOutline radius={99} opacity={0.48} />
            </Pressable>
            <Pressable accessibilityLabel="Ouvrir le profil" onPress={onOpenProfile} style={styles.authorCopy}>
              <Text numberOfLines={1} style={styles.author}>{post.author}</Text>
              <Text numberOfLines={1} style={styles.authorMeta}>{post.handle}{post.time ? ` · ${post.time}` : ''}</Text>
            </Pressable>
            <View style={styles.flowLabel}><View style={styles.flowDot} /><Text style={styles.flowLabelText}>POST DU FLOW</Text></View>
          </View>

          <View style={[styles.body, responsive.isVeryShort && styles.bodyCompact]}>
            {post.text ? <Pressable accessibilityLabel="Ouvrir la publication" onPress={onOpenPost}><Text numberOfLines={responsive.isVeryShort ? 2 : responsive.isShort ? 4 : 6} style={[styles.postText, responsive.compactControls && styles.postTextCompact]}>{post.text}</Text></Pressable> : null}

            {post.imageUrl && !(responsive.isVeryShort && post.track) ? (
              <Pressable accessibilityLabel="Ouvrir la publication" onPress={onOpenPost} style={[styles.postImageWrap, responsive.isShort && styles.postImageWrapShort, responsive.isVeryShort && styles.postImageWrapVeryShort]}>
                <SynauraImage source={{ uri: post.imageUrl }} lowPriority={!active} style={styles.postImage} />
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)']} style={StyleSheet.absoluteFillObject} />
                <GlassOutline radius={20} opacity={0.24} />
              </Pressable>
            ) : null}

            {post.track ? (
              <View style={styles.trackCardFrame}>
                <PostAttachedTrackCard track={post.track} playing={playing} compact={responsive.compactControls} onPlay={() => onPlayTrack(post.track!)} onOpen={() => onOpenTrack(post.track!)} />
                <GlassOutline radius={18} opacity={0.2} />
              </View>
            ) : null}
          </View>

          <View style={[styles.actions, responsive.isVeryShort && styles.actionsCompact]}>
            <MotionPressable accessibilityLabel={liked ? "Retirer le j'aime" : "J'aime"} disabled={liking} onPress={() => void toggleLike()} style={[styles.action, liked && styles.actionLiked]} scaleTo={0.92}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FFD0CB' : 'rgba(255,255,255,0.82)'} /><Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likesCount ? formatCount(likesCount) : "J'aime"}</Text></MotionPressable>
            <MotionPressable accessibilityLabel="Commenter" onPress={onOpenPost} style={styles.action} scaleTo={0.92}><Ionicons name="chatbubble-ellipses-outline" size={18} color="rgba(255,255,255,0.82)" /><Text style={styles.actionText}>{post.commentsCount ? formatCount(post.commentsCount) : 'Commenter'}</Text></MotionPressable>
            <MotionPressable accessibilityLabel="Partager" onPress={() => setShareOpen(true)} style={styles.iconAction} scaleTo={0.9}><Ionicons name="share-social-outline" size={18} color="rgba(255,255,255,0.84)" /></MotionPressable>
          </View>
        </Animated.View>
      </Animated.View>

      <PostShareSheet visible={shareOpen} post={post} onClose={() => setShareOpen(false)} />
    </View>
  );
});

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: SIGNAL.black },
  backdropImage: { ...StyleSheet.absoluteFillObject, transform: [{ scale: 1.08 }], opacity: 0.5 },
  topEdge: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.92 },
  content: { flex: 1, width: '100%', alignSelf: 'center', justifyContent: 'center' },
  glassPanel: { width: '100%', maxHeight: '90%', overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(9,9,11,0.62)', padding: 17, shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 11 }, elevation: 8 },
  glassPanelShort: { padding: 13, maxHeight: '94%' },
  panelAccent: { position: 'absolute', top: 20, bottom: 20, left: 0, width: 2.5, borderRadius: 2, backgroundColor: SIGNAL.coralSoft },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: SIGNAL.violet, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.62)', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  avatarCompact: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 15, fontWeight: '900' },
  authorCopy: { flex: 1, minWidth: 0 },
  author: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  authorMeta: { marginTop: 3, color: 'rgba(255,255,255,0.5)', fontFamily: FONT_BOLD, fontSize: 10, fontWeight: '700' },
  flowLabel: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(114,187,197,0.34)', backgroundColor: 'rgba(74,158,170,0.14)', paddingHorizontal: 9 },
  flowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SIGNAL.cyanSoft, shadowColor: SIGNAL.cyanSoft, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },
  flowLabelText: { color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.75 },
  body: { marginTop: 22 },
  bodyCompact: { marginTop: 11 },
  postText: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 27, lineHeight: 31, fontWeight: '900', letterSpacing: -0.85, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
  postTextCompact: { fontSize: 21, lineHeight: 25, letterSpacing: -0.55 },
  postImageWrap: { marginTop: 17, height: 220, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' },
  postImageWrapShort: { height: 130 },
  postImageWrapVeryShort: { height: 76, marginTop: 10 },
  postImage: { width: '100%', height: '100%' },
  trackCardFrame: { marginTop: 15, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  actions: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsCompact: { marginTop: 9 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 22, paddingHorizontal: 15, backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  actionLiked: { backgroundColor: 'rgba(217,109,99,0.22)', borderColor: 'rgba(240,170,162,0.5)' },
  actionText: { color: 'rgba(255,255,255,0.78)', fontFamily: FONT_BLACK, fontSize: 10, fontWeight: '900' },
  actionTextLiked: { color: '#FFD0CB' },
  iconAction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.075)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
});

export default PostSlide;
