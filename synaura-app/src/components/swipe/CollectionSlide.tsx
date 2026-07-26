import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { FeedCollection } from './feedTypes';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const FONT_BLACK = Platform.select({ android: 'sans-serif-black', ios: 'System', default: 'System' });
const FONT_BOLD = Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' });

const SIGNAL = {
  black: '#09090B',
  paper: '#F7F6F3',
  violet: '#7357C6',
  cyan: '#4A9EAA',
  cyanSoft: '#72BBC5',
  coral: '#D96D63',
};

type Props = {
  collection: FeedCollection;
  height: number;
  topPad: number;
  bottomPad: number;
  launching: boolean;
  onLaunch: () => void;
  onViewSelection: () => void;
};

function CollectionAura({ colors }: { colors: [string, string] }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id="collectionAuraOne" cx="6" cy="8" rx="76" ry="68" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors[0]} stopOpacity="0.52" />
          <Stop offset="0.4" stopColor={colors[0]} stopOpacity="0.17" />
          <Stop offset="0.82" stopColor={colors[0]} stopOpacity="0.012" />
          <Stop offset="1" stopColor={colors[0]} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="collectionAuraTwo" cx="96" cy="24" rx="72" ry="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors[1]} stopOpacity="0.44" />
          <Stop offset="0.4" stopColor={colors[1]} stopOpacity="0.14" />
          <Stop offset="0.84" stopColor={colors[1]} stopOpacity="0.01" />
          <Stop offset="1" stopColor={colors[1]} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="collectionAuraThree" cx="48" cy="90" rx="62" ry="54" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SIGNAL.coral} stopOpacity="0.18" />
          <Stop offset="0.5" stopColor={SIGNAL.coral} stopOpacity="0.04" />
          <Stop offset="1" stopColor={SIGNAL.coral} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#collectionAuraOne)" />
      <Rect x="0" y="0" width="100" height="100" fill="url(#collectionAuraTwo)" />
      <Rect x="0" y="0" width="100" height="100" fill="url(#collectionAuraThree)" />
    </Svg>
  );
}

function GlassOutline({ radius, opacity = 0.22 }: { radius: number; opacity?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: 1, borderColor: `rgba(255,255,255,${opacity})` }]} />;
}

export function CollectionSlide({ collection, height, topPad, bottomPad, launching, onLaunch, onViewSelection }: Props) {
  const { settings } = useMobileSettings();
  const colorsPair: [string, string] = collection.themeColors && collection.themeColors.length >= 2
    ? [collection.themeColors[0], collection.themeColors[1]]
    : [SIGNAL.violet, SIGNAL.cyan];
  const aura = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (settings.reducedMotion) {
      aura.setValue(0.5);
      cover.setValue(0);
      return;
    }
    const auraLoop = Animated.loop(Animated.sequence([
      Animated.timing(aura, { toValue: 1, duration: 7_400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(aura, { toValue: 0, duration: 7_400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const coverLoop = Animated.loop(Animated.sequence([
      Animated.timing(cover, { toValue: 1, duration: 3_200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(cover, { toValue: 0, duration: 3_200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    auraLoop.start(); coverLoop.start();
    return () => { auraLoop.stop(); coverLoop.stop(); };
  }, [aura, cover, settings.reducedMotion]);

  return (
    <View style={[styles.root, { height, paddingTop: topPad + 78, paddingBottom: bottomPad + 18 }]}> 
      <LinearGradient colors={['#0C0B10', '#111015', SIGNAL.black]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: aura.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0.94] }), transform: [{ translateX: aura.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) }, { translateY: aura.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] }) }, { scale: aura.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.16] }) }] }]}><CollectionAura colors={colorsPair} /></Animated.View>
      <View pointerEvents="none" style={styles.topEdge}><LinearGradient colors={[colorsPair[0], colorsPair[1], SIGNAL.coral]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFillObject} /></View>

      <View style={styles.center}>
        <View style={styles.badge}><View style={[styles.badgeDot, { backgroundColor: colorsPair[1] }]} /><Text style={styles.badgeText}>{(collection.badge || 'Collection du Flow').toUpperCase()}</Text></View>
        <Animated.View style={[styles.coverShell, { transform: [{ translateY: cover.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) }, { scale: cover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) }] }]}> 
          <LinearGradient colors={[`${colorsPair[0]}55`, `${colorsPair[1]}22`]} style={styles.coverGlow} />
          <Image source={{ uri: collection.coverUrl || collection.bannerUrl || undefined }} style={styles.cover} />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.24)']} style={StyleSheet.absoluteFillObject} />
          <GlassOutline radius={24} opacity={0.3} />
        </Animated.View>
        <Text numberOfLines={2} style={styles.title}>{collection.title}</Text>
        {collection.subtitle ? <Text numberOfLines={3} style={styles.subtitle}>{collection.subtitle}</Text> : null}
        <View style={styles.countPill}><Ionicons name="musical-notes-outline" size={13} color="#A8DEE5" /><Text style={styles.count}>{collection.trackCount} morceau{collection.trackCount > 1 ? 'x' : ''}</Text></View>
      </View>

      <View style={styles.footer}>
        <LinearGradient colors={['rgba(18,16,23,0.84)', 'rgba(9,9,11,0.7)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
        <GlassOutline radius={22} opacity={0.23} />
        <View style={[styles.footerAccent, { backgroundColor: colorsPair[1] }]} />
        <Pressable accessibilityLabel="Lancer la collection" disabled={launching} onPress={onLaunch} style={styles.primaryButton}>{launching ? <ActivityIndicator color="#171313" /> : <Ionicons name="play" size={17} color="#171313" style={{ marginLeft: 2 }} />}<Text style={styles.primaryText}>Lancer</Text></Pressable>
        <Pressable accessibilityLabel="Voir la sélection" onPress={onViewSelection} style={styles.secondaryButton}><Text style={styles.secondaryText}>Voir la sélection</Text><Ionicons name="arrow-forward" size={14} color={SIGNAL.paper} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', position: 'relative', overflow: 'hidden', paddingHorizontal: 16, justifyContent: 'space-between', backgroundColor: SIGNAL.black },
  topEdge: { position: 'absolute', zIndex: 7, top: 0, left: 0, right: 0, height: 2.5, opacity: 0.94 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(9,9,11,0.48)', paddingHorizontal: 11 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, shadowColor: '#72BBC5', shadowOpacity: 0.8, shadowRadius: 6, elevation: 2 },
  badgeText: { color: 'rgba(255,255,255,0.84)', fontFamily: FONT_BLACK, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  coverShell: { marginTop: 18, width: 198, height: 198, overflow: 'visible', borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)', shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  coverGlow: { position: 'absolute', left: -18, top: -18, right: -18, bottom: -18, borderRadius: 36, opacity: 0.5 },
  cover: { width: '100%', height: '100%', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  title: { marginTop: 19, maxWidth: 310, textAlign: 'center', color: '#FFF', fontFamily: FONT_BLACK, fontSize: 26, lineHeight: 28, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 9, maxWidth: 292, textAlign: 'center', color: 'rgba(255,255,255,0.64)', fontFamily: FONT_BOLD, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  countPill: { marginTop: 13, minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(114,187,197,0.3)', backgroundColor: 'rgba(74,158,170,0.12)', paddingHorizontal: 11 },
  count: { color: 'rgba(255,255,255,0.68)', fontFamily: FONT_BLACK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.55, textTransform: 'uppercase' },
  footer: { minHeight: 72, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 9, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(9,9,11,0.66)', padding: 11, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  footerAccent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 2.5, borderRadius: 2 },
  primaryButton: { minWidth: 105, height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: SIGNAL.paper, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  primaryText: { color: '#171313', fontFamily: FONT_BLACK, fontSize: 11, fontWeight: '900' },
  secondaryButton: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.075)', paddingHorizontal: 14 },
  secondaryText: { color: SIGNAL.paper, fontFamily: FONT_BLACK, fontSize: 10.5, fontWeight: '900' },
});

export default CollectionSlide;
