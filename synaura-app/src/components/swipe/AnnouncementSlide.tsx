import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { FeedAnnouncement } from './feedTypes';
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
  announcement: FeedAnnouncement;
  height: number;
  topPad: number;
  bottomPad: number;
  onOpen: () => void;
};

function AnnouncementAura() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="announcementCyan" cx="8" cy="10" rx="76" ry="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.cyan} stopOpacity="0.48" />
          <Stop offset="0.4" stopColor={SIGNAL.cyan} stopOpacity="0.16" />
          <Stop offset="0.82" stopColor={SIGNAL.cyan} stopOpacity="0.012" />
          <Stop offset="1" stopColor={SIGNAL.cyan} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="announcementViolet" cx="96" cy="20" rx="72" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.violet} stopOpacity="0.38" />
          <Stop offset="0.4" stopColor={SIGNAL.violet} stopOpacity="0.12" />
          <Stop offset="0.84" stopColor={SIGNAL.violet} stopOpacity="0.01" />
          <Stop offset="1" stopColor={SIGNAL.violet} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="announcementCoral" cx="54" cy="88" rx="62" ry="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity="0.18" />
          <Stop offset="0.46" stopColor={SIGNAL.coral} stopOpacity="0.055" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#announcementCyan)" />
      <Rect x="0" y="0" width="100" height="100" fill="url(#announcementViolet)" />
      <Rect x="0" y="0" width="100" height="100" fill="url(#announcementCoral)" />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

export function AnnouncementSlide({ announcement, height, topPad, bottomPad, onOpen }: Props) {
  const { settings } = useMobileSettings();
  const aura = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (settings.reducedMotion) {
      aura.setValue(0.5);
      pulse.setValue(0);
      return;
    }
    const auraLoop = Animated.loop(Animated.sequence([
      Animated.timing(aura, { toValue: 1, duration: 7_200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aura, { toValue: 0, duration: 7_200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1_700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1_700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    auraLoop.start(); pulseLoop.start();
    return () => { auraLoop.stop(); pulseLoop.stop(); };
  }, [aura, pulse, settings.reducedMotion]);

  return (
    <View style={[styles.root, { height, paddingTop: topPad + 78, paddingBottom: bottomPad + 18 }]}> 
      <LinearGradient colors={['#0C0B10', '#111015', SIGNAL.black]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: aura.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0.94] }), transform: [{ translateX: aura.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) }, { translateY: aura.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] }) }, { scale: aura.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.16] }) }] }]}><AnnouncementAura /></Animated.View>
      <View pointerEvents="none" style={styles.topEdge}><LinearGradient colors={[SIGNAL.violet, SIGNAL.cyan, SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>

      <View style={styles.card}>
        <LinearGradient colors={['rgba(18,18,23,0.86)', 'rgba(9,9,11,0.72)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <GlassOutline radius={28} opacity={0.24} />
        <View style={styles.cardAccent} />
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Animated.View pointerEvents="none" style={[styles.iconPulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.62] }) }] }]} />
            <LinearGradient colors={[SIGNAL.cyan, SIGNAL.violet]} style={styles.icon}><Ionicons name="megaphone" size={23} color={SIGNAL.paper} /></LinearGradient>
          </View>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>ACTU DU FLOW</Text></View>
        </View>
        <Text style={styles.kicker}>À NE PAS RATER</Text>
        <Text numberOfLines={3} style={styles.title}>{announcement.title}</Text>
        {announcement.description ? <Text numberOfLines={5} style={styles.text}>{announcement.description}</Text> : null}
        <View style={styles.countPill}><Ionicons name="musical-notes-outline" size={13} color="#A8DEE5" /><Text style={styles.count}>{announcement.tracksCount} morceau{announcement.tracksCount > 1 ? 'x' : ''} à découvrir</Text></View>
        <Pressable accessibilityLabel="Découvrir" onPress={onOpen} style={styles.button}><Text style={styles.buttonText}>Découvrir</Text><Ionicons name="arrow-forward" size={16} color="#171313" /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', position: 'relative', overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: SIGNAL.black },
  topEdge: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.94 },
  card: { overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.23)', backgroundColor: 'rgba(9,9,11,0.68)', padding: 21, shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  cardAccent: { position: 'absolute', left: 0, top: 22, bottom: 22, width: 2.5, borderRadius: 2, backgroundColor: SIGNAL.cyanSoft },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  iconWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  iconPulse: { position: 'absolute', width: 54, height: 54, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.62)' },
  icon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: SIGNAL.cyan, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  liveBadge: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(114,187,197,0.42)', backgroundColor: 'rgba(74,158,170,0.16)', paddingHorizontal: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SIGNAL.coralSoft, shadowColor: SIGNAL.coralSoft, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },
  liveBadgeText: { color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  kicker: { marginTop: 19, color: '#A8DEE5', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.25 },
  title: { marginTop: 7, color: '#FFF', fontFamily: FONT_BLACK, fontSize: 28, lineHeight: 31, fontWeight: '900', letterSpacing: -0.95 },
  text: { marginTop: 11, color: 'rgba(255,255,255,0.64)', fontFamily: FONT_BOLD, fontSize: 12.5, lineHeight: 19, fontWeight: '700' },
  countPill: { marginTop: 16, alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(114,187,197,0.3)', backgroundColor: 'rgba(74,158,170,0.12)', paddingHorizontal: 11 },
  count: { color: 'rgba(255,255,255,0.68)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.45 },
  button: { marginTop: 20, alignSelf: 'flex-start', height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, borderRadius: 23, backgroundColor: SIGNAL.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', shadowColor: '#000', shadowOpacity: 0.26, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  buttonText: { color: '#171313', fontFamily: FONT_BLACK, fontSize: 12, fontWeight: '900' },
});

export default AnnouncementSlide;
