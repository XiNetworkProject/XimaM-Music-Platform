import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Track } from '@/api/types';
import type { SpotlightArtist } from './feedTypes';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

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
};

type Props = {
  artist: SpotlightArtist;
  track: Track;
  height: number;
  topPad: number;
  bottomPad: number;
  isActive: boolean;
  isPlaying: boolean;
  isFollowing: boolean;
  followLoading?: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
  onOpenArtist: () => void;
};

function ArtistAura({ variant }: { variant: 'primary' | 'secondary' }) {
  const primary = variant === 'primary';
  const suffix = primary ? 'ArtistPrimary' : 'ArtistSecondary';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`artistViolet${suffix}`} cx={primary ? '16' : '56'} cy={primary ? '12' : '42'} rx="76" ry="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.48 : 0.25} />
          <Stop offset="0.4" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.16 : 0.075} />
          <Stop offset="0.82" stopColor={SIGNAL.violet} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`artistCoral${suffix}`} cx={primary ? '94' : '74'} cy={primary ? '18' : '68'} rx="70" ry="62" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.35 : 0.2} />
          <Stop offset="0.4" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.115 : 0.06} />
          <Stop offset="0.84" stopColor={SIGNAL.coral} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`artistCyan${suffix}`} cx={primary ? '48' : '10'} cy={primary ? '72' : '36'} rx="62" ry="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.22 : 0.15} />
          <Stop offset="0.44" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.07 : 0.04} />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#artistViolet${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#artistCoral${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#artistCyan${suffix})`} />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

export function ArtistSpotlightSlide({
  artist,
  track,
  height,
  topPad,
  bottomPad,
  isActive,
  isPlaying,
  isFollowing,
  followLoading,
  onPress,
  onToggleFollow,
  onOpenArtist,
}: Props) {
  const { settings } = useMobileSettings();
  const reveal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;
  const portraitBreath = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(reveal, { toValue: isActive ? 1 : 0, speed: 16, bounciness: isActive ? 5 : 0, useNativeDriver: true }).start();
  }, [isActive, reveal]);

  useEffect(() => {
    if (!isActive || settings.reducedMotion) {
      auraOne.stopAnimation();
      auraTwo.stopAnimation();
      portraitBreath.stopAnimation();
      pulse.stopAnimation();
      auraOne.setValue(0.5);
      auraTwo.setValue(0.5);
      portraitBreath.setValue(0);
      pulse.setValue(0);
      return;
    }
    const first = Animated.loop(Animated.sequence([
      Animated.timing(auraOne, { toValue: 1, duration: 6_900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6_900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const second = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8_600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8_600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(portraitBreath, { toValue: 1, duration: 3_300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(portraitBreath, { toValue: 0, duration: 3_300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1_700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1_700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    first.start(); second.start(); breathe.start(); pulseLoop.start();
    return () => { first.stop(); second.stop(); breathe.stop(); pulseLoop.stop(); };
  }, [auraOne, auraTwo, isActive, portraitBreath, pulse, settings.reducedMotion]);

  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.16] }) },
    ],
  };
  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.67] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [18, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1.03] }) },
    ],
  };

  return (
    <View style={[styles.root, { height, paddingTop: topPad + 78, paddingBottom: bottomPad + 18 }]}>
      <LinearGradient colors={['#0C0B10', '#111015', SIGNAL.black]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><ArtistAura variant="primary" /></Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><ArtistAura variant="secondary" /></Animated.View>
      <View pointerEvents="none" style={styles.topEdge}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>

      <Animated.View style={[styles.scene, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <View style={styles.kickerBadge}><View style={[styles.signalDot, isPlaying && styles.signalDotActive]} /><Text style={styles.kicker}>ARTISTE DU FLOW</Text></View>

        <Pressable accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Écouter'} onPress={onPress}>
          <Animated.View style={[styles.avatarShell, { transform: [{ scale: portraitBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}>
            {artist.avatar ? <Image source={{ uri: artist.avatar }} style={styles.avatarImage} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{artist.name.slice(0, 1).toUpperCase()}</Text></View>}
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.32)']} style={StyleSheet.absoluteFillObject} />
            <GlassOutline radius={99} opacity={0.32} />
            <Animated.View pointerEvents="none" style={[styles.playRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.58] }) }] }]} />
            <View style={styles.playBadge}><GlassOutline radius={99} opacity={0.34} /><Ionicons name={isPlaying ? 'pause' : 'play'} size={23} color={SIGNAL.paper} style={!isPlaying ? { marginLeft: 2 } : null} /></View>
          </Animated.View>
        </Pressable>

        <View style={styles.nameRow}><Text style={styles.name}>{artist.name}</Text>{artist.isVerified ? <Ionicons name="checkmark-circle" size={19} color={SIGNAL.cyanSoft} /> : null}</View>
        {track.genre?.[0] ? <Text style={styles.artistStyle}>{track.genre[0]}</Text> : null}
        {artist.bio ? <Text numberOfLines={3} style={styles.bio}>{artist.bio}</Text> : null}
        <View style={styles.featuredPill}><Ionicons name="musical-notes-outline" size={13} color="#A8DEE5" /><Text numberOfLines={1} style={styles.featured}>EN VEDETTE · {track.title}</Text></View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <LinearGradient colors={['rgba(18,16,23,0.84)', 'rgba(9,9,11,0.7)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <GlassOutline radius={22} opacity={0.23} />
        <View style={styles.footerAccent} />
        <View style={styles.footerCopy}><Text numberOfLines={1} style={styles.footerName}>{artist.name}</Text><Text numberOfLines={1} style={styles.footerHandle}>@{artist.username || 'synaura'}</Text></View>
        <Pressable accessibilityLabel={isFollowing ? 'Déjà suivi' : 'Suivre'} disabled={!artist.username || followLoading} onPress={onToggleFollow} style={[styles.followButton, isFollowing && styles.followButtonDone]}><Text style={[styles.followText, isFollowing && styles.followTextDone]}>{followLoading ? '...' : isFollowing ? 'Suivi' : 'Suivre'}</Text></Pressable>
        <Pressable accessibilityLabel="Découvrir son univers" onPress={onOpenArtist} style={styles.discoverButton}><Text style={styles.discoverText}>Découvrir</Text><Ionicons name="arrow-forward" size={14} color={SIGNAL.paper} /></Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', position: 'relative', overflow: 'hidden', paddingHorizontal: 16, justifyContent: 'space-between', backgroundColor: SIGNAL.black },
  topEdge: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.92 },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kickerBadge: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(169,139,232,0.44)', backgroundColor: 'rgba(115,87,198,0.18)', paddingHorizontal: 11 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.38)' },
  signalDotActive: { backgroundColor: SIGNAL.cyanSoft, shadowColor: SIGNAL.cyanSoft, shadowOpacity: 0.9, shadowRadius: 7, elevation: 3 },
  kicker: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 1.05 },
  avatarShell: { marginTop: 20, width: 184, height: 184, borderRadius: 92, overflow: 'visible', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)', shadowColor: SIGNAL.violet, shadowOpacity: 0.32, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 9 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 92 },
  avatarFallback: { width: '100%', height: '100%', borderRadius: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.44)' },
  avatarLetter: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 50, fontWeight: '900' },
  playRing: { position: 'absolute', left: 55, top: 55, width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderColor: 'rgba(255,255,255,0.62)' },
  playBadge: { position: 'absolute', right: 12, bottom: 12, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  nameRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 27, lineHeight: 29, fontWeight: '900', letterSpacing: 0 },
  artistStyle: { marginTop: 5, color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 9, fontWeight: '900', letterSpacing: 1.15, textTransform: 'uppercase' },
  bio: { marginTop: 10, maxWidth: 300, textAlign: 'center', color: 'rgba(255,255,255,0.64)', fontFamily: FONT_BOLD, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  featuredPill: { marginTop: 13, maxWidth: 292, minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(114,187,197,0.3)', backgroundColor: 'rgba(74,158,170,0.12)', paddingHorizontal: 11 },
  featured: { flexShrink: 1, color: 'rgba(255,255,255,0.66)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.55 },
  footer: { minHeight: 76, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(9,9,11,0.66)', padding: 12, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  footerAccent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 2.5, borderRadius: 2, backgroundColor: SIGNAL.violetSoft },
  footerCopy: { flex: 1, minWidth: 0 },
  footerName: { color: '#FFF', fontFamily: FONT_BLACK, fontSize: 13, fontWeight: '900' },
  footerHandle: { marginTop: 2, color: 'rgba(255,255,255,0.5)', fontFamily: FONT_BOLD, fontSize: 9.5, fontWeight: '700' },
  followButton: { minHeight: 38, justifyContent: 'center', borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.075)', paddingHorizontal: 13 },
  followButtonDone: { backgroundColor: 'rgba(115,87,198,0.42)', borderColor: 'rgba(169,139,232,0.5)' },
  followText: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 10, fontWeight: '900' },
  followTextDone: { color: '#DCCEFF' },
  discoverButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 13 },
  discoverText: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 10, fontWeight: '900' },
});

export default ArtistSpotlightSlide;
