import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { useEntryMotion } from './EntryAtmosphere';
import { entry } from '@/theme/entry';

export type IntroScene = 'synaura' | 'moments' | 'radar' | 'studio' | 'community';
const wave = Array.from({ length: 34 }, (_, i) => 10 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .4)) * 40);

/** Native illustration: no video, WebView or fabricated social activity. */
export function SynauraIntroStage({ scene, compact = false, showBrand = true, style }: { scene: IntroScene; compact?: boolean; showBrand?: boolean; style?: StyleProp<ViewStyle> }) {
  const animate = useEntryMotion();
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) { phase.setValue(.5); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [animate, phase]);
  const accent = scene === 'moments' || scene === 'community' ? entry.cyan : entry.violet;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.root, compact && { minHeight: 190 }, style]}>
    <Animated.View style={[styles.field, { transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [.95, 1.03] }) }, { rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '7deg'] }) }] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 360">
        <Defs>
          <RadialGradient id="core"><Stop offset="0" stopColor={accent} stopOpacity=".32" /><Stop offset=".55" stopColor={entry.blue} stopOpacity=".12" /><Stop offset="1" stopColor={entry.blue} stopOpacity="0" /></RadialGradient>
          <LinearGradient id="orbit" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={entry.cyan} stopOpacity=".15" /><Stop offset=".4" stopColor={accent} /><Stop offset=".65" stopColor="#FFFFFF" /><Stop offset="1" stopColor={entry.blue} stopOpacity=".15" /></LinearGradient>
        </Defs>
        <Circle cx="180" cy="180" r="176" fill="url(#core)" />
        {Array.from({ length: 13 }, (_, i) => <Ellipse key={i} cx="180" cy="180" rx={110 + i * 2.5} ry={40 + i * 6} rotation={-35 + i * 6} origin="180,180" fill="none" stroke="url(#orbit)" strokeWidth={i === 8 ? 1.4 : .7} opacity={.25 + i * .045} />)}
        {Array.from({ length: 12 }, (_, i) => <Circle key={i} cx={25 + ((i * 79) % 310)} cy={24 + ((i * 97) % 312)} r={i % 3 === 0 ? 1.8 : 1} fill={accent} opacity={.3 + (i % 4) * .16} />)}
        <Path d="M32 279 Q180 344 331 86" stroke={accent} strokeWidth=".4" opacity=".3" fill="none" />
      </Svg>
    </Animated.View>
    {scene === 'synaura' || scene === 'radar' ? <View style={styles.center}><SynauraMark size={compact ? 85 : 112} />{showBrand ? <Text style={styles.wordmark}>SYNAURA</Text> : null}</View> : (
      <Animated.View style={[styles.demo, { transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [5, -5] }) }, { rotate: '-4deg' }] }]}>
        <View style={styles.demoHeader}><Ionicons name={scene === 'studio' ? 'sparkles-outline' : scene === 'community' ? 'people-outline' : 'radio-outline'} size={18} color={accent} /><Text style={styles.demoLabel}>{scene === 'studio' ? 'TON IDÉE, EN MUSIQUE' : scene === 'community' ? 'LA MUSIQUE NOUS RELIE' : 'UN INSTANT. UNE ÉMOTION.'}</Text></View>
        {scene === 'studio' ? <><Text style={styles.prompt}>Un son pour les nuits{'\n'}qui n’en finissent pas.</Text><View style={styles.chips}><Text style={styles.chip}>Dream pop</Text><Text style={styles.chip}>Nocturne</Text></View></> : null}
        <View style={styles.wave}>{wave.map((height, i) => <View key={i} style={{ width: 3, height: scene === 'studio' ? height * .55 : height, borderRadius: 3, backgroundColor: i < 17 ? accent : '#495571' }} />)}</View>
        {scene === 'moments' ? <View style={styles.comment}><Text style={styles.timestamp}>0:42</Text><Text style={styles.commentText}>Ce passage… ✨</Text></View> : null}
        {scene === 'community' ? <View style={styles.people}>{(['headset-outline', 'musical-note-outline', 'mic-outline'] as const).map((icon, i) => <View key={icon} style={[styles.person, { backgroundColor: ['#38345B', '#244551', '#313C65'][i] }]}><Ionicons name={icon} size={23} color={entry.text} /></View>)}</View> : null}
      </Animated.View>
    )}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center' }, field: { ...StyleSheet.absoluteFillObject }, center: { alignItems: 'center', gap: 16 },
  wordmark: { fontFamily: 'Inter_800ExtraBold', letterSpacing: 4, color: entry.text, fontSize: 16 },
  demo: { width: '78%', maxWidth: 310, borderRadius: 26, backgroundColor: 'rgba(15,20,37,0.94)', padding: 22, borderWidth: 1, borderColor: entry.line },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, demoLabel: { flex: 1, color: entry.muted, fontSize: 8, letterSpacing: 1.2, fontWeight: '700' },
  prompt: { color: entry.text, fontSize: 21, lineHeight: 28, fontWeight: '600', marginTop: 22 }, chips: { flexDirection: 'row', gap: 8, marginTop: 14 }, chip: { color: entry.violet, fontSize: 10, padding: 7, backgroundColor: '#26233F', borderRadius: 8 },
  wave: { height: 72, flexDirection: 'row', gap: 3, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 15 }, comment: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 7 }, timestamp: { color: entry.cyan, fontSize: 13, fontWeight: '700' }, commentText: { color: entry.text, fontSize: 13 },
  people: { flexDirection: 'row', justifyContent: 'center', paddingTop: 8 }, person: { width: 54, height: 54, borderRadius: 27, marginHorizontal: -3, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#111522' },
});
