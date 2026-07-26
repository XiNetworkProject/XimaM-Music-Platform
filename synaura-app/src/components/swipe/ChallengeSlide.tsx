import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { FeedChallenge } from './feedTypes';
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
  orange: '#F4A261',
};

type Props = {
  challenge: FeedChallenge;
  height: number;
  topPad: number;
  bottomPad: number;
  isActive: boolean;
  onOpen: () => void;
  isMusicChallenge?: boolean;
};

function ChallengeAura({ variant }: { variant: 'primary' | 'secondary' }) {
  const primary = variant === 'primary';
  const suffix = primary ? 'ChallengePrimary' : 'ChallengeSecondary';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`challengeCoral${suffix}`} cx={primary ? '94' : '52'} cy={primary ? '8' : '48'} rx="74" ry="66" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.48 : 0.24} />
          <Stop offset="0.4" stopColor={SIGNAL.coral} stopOpacity={primary ? 0.16 : 0.075} />
          <Stop offset="0.82" stopColor={SIGNAL.coral} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`challengeViolet${suffix}`} cx={primary ? '8' : '28'} cy={primary ? '20' : '72'} rx="72" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.4 : 0.2} />
          <Stop offset="0.4" stopColor={SIGNAL.violet} stopOpacity={primary ? 0.13 : 0.06} />
          <Stop offset="0.84" stopColor={SIGNAL.violet} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={`challengeCyan${suffix}`} cx={primary ? '48' : '10'} cy={primary ? '82' : '34'} rx="60" ry="54" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.2 : 0.14} />
          <Stop offset="0.46" stopColor={SIGNAL.cyan} stopOpacity={primary ? 0.06 : 0.04} />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#challengeCoral${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#challengeViolet${suffix})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#challengeCyan${suffix})`} />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

export function ChallengeSlide({ challenge, height, topPad, bottomPad, isActive, onOpen, isMusicChallenge = false }: Props) {
  const { settings } = useMobileSettings();
  const pulse = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const auraOne = useRef(new Animated.Value(0)).current;
  const auraTwo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(reveal, { toValue: isActive ? 1 : 0, speed: 16, bounciness: isActive ? 5 : 0, useNativeDriver: true }).start();
  }, [isActive, reveal]);

  useEffect(() => {
    if (!isActive || settings.reducedMotion) {
      pulse.stopAnimation();
      auraOne.stopAnimation();
      auraTwo.stopAnimation();
      pulse.setValue(0);
      auraOne.setValue(0.5);
      auraTwo.setValue(0.5);
      return;
    }
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const first = Animated.loop(Animated.sequence([
      Animated.timing(auraOne, { toValue: 1, duration: 6_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraOne, { toValue: 0, duration: 6_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const second = Animated.loop(Animated.sequence([
      Animated.timing(auraTwo, { toValue: 1, duration: 8_400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(auraTwo, { toValue: 0, duration: 8_400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    pulseLoop.start(); first.start(); second.start();
    return () => { pulseLoop.stop(); first.stop(); second.stop(); };
  }, [auraOne, auraTwo, isActive, pulse, settings.reducedMotion]);

  const auraOneStyle = {
    opacity: auraOne.interpolate({ inputRange: [0, 1], outputRange: [0.52, 0.9] }),
    transform: [
      { translateX: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
      { translateY: auraOne.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] }) },
      { scale: auraOne.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.16] }) },
    ],
  };
  const auraTwoStyle = {
    opacity: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.66] }),
    transform: [
      { translateX: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [20, -16] }) },
      { translateY: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [18, -14] }) },
      { scale: auraTwo.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1.03] }) },
    ],
  };

  return (
    <View style={[styles.root, { height, paddingTop: topPad + 78, paddingBottom: bottomPad + 18 }]}> 
      <LinearGradient colors={['#0C0B10', '#111015', SIGNAL.black]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraOneStyle]}><ChallengeAura variant="primary" /></Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, auraTwoStyle]}><ChallengeAura variant="secondary" /></Animated.View>
      <View pointerEvents="none" style={styles.topEdge}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>

      <Animated.View style={[styles.card, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }, { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) }] }]}> 
        <LinearGradient colors={['rgba(24,19,25,0.86)', 'rgba(10,10,13,0.72)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <GlassOutline radius={28} opacity={0.24} />
        <View style={styles.cardAccent} />
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Animated.View pointerEvents="none" style={[styles.iconPulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.62] }) }] }]} />
            <LinearGradient colors={[SIGNAL.coral, SIGNAL.violet]} style={styles.icon}><Ionicons name="trophy" size={24} color={SIGNAL.paper} /></LinearGradient>
          </View>
          <View style={styles.challengeBadge}><View style={styles.signalDot} /><Text style={styles.challengeBadgeText}>{isMusicChallenge ? 'DÉFI MUSICAL' : 'DÉFI PULSE'}</Text></View>
        </View>
        <Text style={styles.kicker}>À TOI DE JOUER</Text>
        <Text numberOfLines={3} style={styles.title}>{challenge.title}</Text>
        {challenge.description ? <Text numberOfLines={4} style={styles.text}>{challenge.description}</Text> : null}
        <View style={styles.stats}>
          <View style={styles.stat}><Ionicons name="musical-notes-outline" size={12} color="#A8DEE5" /><Text style={styles.statText}>{challenge.tracksCount} inscrits</Text></View>
          {typeof challenge.totalVotes === 'number' ? <View style={styles.stat}><Ionicons name="heart-outline" size={12} color="#FFD0CB" /><Text style={styles.statText}>{challenge.totalVotes} votes</Text></View> : null}
          {typeof challenge.participationCount === 'number' ? <View style={styles.stat}><Ionicons name="people-outline" size={12} color="#DCCEFF" /><Text style={styles.statText}>{challenge.participationCount} participants</Text></View> : null}
        </View>
        <Pressable accessibilityLabel="Voir le défi" onPress={onOpen} style={styles.button}><Text style={styles.buttonText}>Voir le défi</Text><Ionicons name="arrow-forward" size={16} color="#171313" /></Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', position: 'relative', overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: SIGNAL.black },
  topEdge: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.94 },
  card: { overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.23)', backgroundColor: 'rgba(9,9,11,0.68)', padding: 21, shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  cardAccent: { position: 'absolute', left: 0, top: 22, bottom: 22, width: 2.5, borderRadius: 2, backgroundColor: SIGNAL.coralSoft },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  iconWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  iconPulse: { position: 'absolute', width: 54, height: 54, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.62)' },
  icon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: SIGNAL.coral, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  challengeBadge: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(169,139,232,0.42)', backgroundColor: 'rgba(115,87,198,0.16)', paddingHorizontal: 10 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SIGNAL.cyanSoft, shadowColor: SIGNAL.cyanSoft, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },
  challengeBadgeText: { color: '#DCCEFF', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  kicker: { marginTop: 19, color: SIGNAL.coralSoft, fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.25 },
  title: { marginTop: 7, color: '#FFF', fontFamily: FONT_BLACK, fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: -1 },
  text: { marginTop: 11, color: 'rgba(255,255,255,0.64)', fontFamily: FONT_BOLD, fontSize: 12.5, lineHeight: 19, fontWeight: '700' },
  stats: { marginTop: 17, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  stat: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.17)', backgroundColor: 'rgba(255,255,255,0.055)', paddingHorizontal: 10 },
  statText: { color: 'rgba(255,255,255,0.68)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900' },
  button: { marginTop: 20, alignSelf: 'flex-start', height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, borderRadius: 23, backgroundColor: SIGNAL.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', shadowColor: '#000', shadowOpacity: 0.26, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  buttonText: { color: '#171313', fontFamily: FONT_BLACK, fontSize: 12, fontWeight: '900' },
});

export default ChallengeSlide;
