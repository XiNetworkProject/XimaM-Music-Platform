import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

export type IntroScene = 'synaura' | 'moments' | 'radar' | 'studio' | 'community';

const SCENES: Record<IntroScene, {
  accent: string;
  secondary: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  features: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }>;
}> = {
  synaura: {
    accent: '#7357C6',
    secondary: '#4A9EAA',
    icon: 'musical-notes',
    label: 'Synaura',
    features: [
      { icon: 'headset-outline', label: 'Écouter' },
      { icon: 'sparkles-outline', label: 'Créer' },
      { icon: 'people-outline', label: 'Relier' },
    ],
  },
  moments: {
    accent: '#4A9EAA',
    secondary: '#D96D63',
    icon: 'pulse',
    label: 'Moments',
    features: [
      { icon: 'chatbubble-outline', label: 'Commenter' },
      { icon: 'heart-outline', label: 'Réagir' },
      { icon: 'time-outline', label: 'Au bon instant' },
    ],
  },
  radar: {
    accent: '#D96D63',
    secondary: '#7357C6',
    icon: 'radio',
    label: 'Radar',
    features: [
      { icon: 'sparkles-outline', label: 'Émergents' },
      { icon: 'trending-up-outline', label: 'Prometteurs' },
      { icon: 'ear-outline', label: 'À découvrir' },
    ],
  },
  studio: {
    accent: '#7357C6',
    secondary: '#D96D63',
    icon: 'color-wand',
    label: 'Studio',
    features: [
      { icon: 'bulb-outline', label: 'Une idée' },
      { icon: 'options-outline', label: 'Ta direction' },
      { icon: 'musical-note-outline', label: 'Un morceau' },
    ],
  },
  community: {
    accent: '#4A9EAA',
    secondary: '#7357C6',
    icon: 'people',
    label: 'Communauté',
    features: [
      { icon: 'person-outline', label: 'Profils' },
      { icon: 'albums-outline', label: 'Discographies' },
      { icon: 'share-social-outline', label: 'Partages' },
    ],
  },
};

const WAVE_PATTERN = [0.34, 0.58, 0.82, 0.46, 0.94, 0.68, 0.42, 0.76, 1, 0.62, 0.86, 0.48, 0.72, 0.9, 0.54, 0.38, 0.66];

export function SynauraIntroStage({ scene, compact = false, style }: { scene: IntroScene; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const { settings } = useMobileSettings();
  const phase = useRef(new Animated.Value(0)).current;
  const sceneConfig = SCENES[scene];

  useEffect(() => {
    if (settings.reducedMotion) {
      phase.setValue(0.45);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(phase, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [phase, settings.reducedMotion]);

  const waveBars = useMemo(() => WAVE_PATTERN.map((height, index) => (
    <Animated.View
      key={`${scene}-${index}`}
      style={[
        styles.waveBar,
        {
          height: `${Math.round(height * 100)}%`,
          backgroundColor: index <= 8 ? sceneConfig.accent : index % 2 ? sceneConfig.secondary : '#F7F6F3',
          opacity: index <= 8 ? 0.96 : 0.48,
          transform: [{
            scaleY: phase.interpolate({
              inputRange: [0, 1],
              outputRange: [Math.max(0.52, height), Math.min(1.12, 0.78 + (index % 5) * 0.08)],
            }),
          }],
        },
      ]}
    />
  )), [phase, scene, sceneConfig.accent, sceneConfig.secondary]);

  const floatY = phase.interpolate({ inputRange: [0, 1], outputRange: [4, -5] });
  const pulse = phase.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });

  return (
    <View style={[styles.stage, compact && styles.stageCompact, style]} accessible={false}>
      <View style={[styles.accentRail, { backgroundColor: sceneConfig.accent }]} />
      <View style={[styles.secondaryRail, { backgroundColor: sceneConfig.secondary }]} />

      <View style={styles.gridLines}>
        {[0, 1, 2, 3, 4].map((line) => <View key={line} style={styles.gridLine} />)}
      </View>

      <Animated.View style={[styles.signalFrame, compact && styles.signalFrameCompact, { transform: [{ translateY: floatY }] }]}>
        <View style={styles.frameHeader}>
          <View style={[styles.signalPip, { backgroundColor: sceneConfig.accent }]} />
          <Text style={styles.frameKicker}>SIGNAL SYNAURA</Text>
          <Text style={styles.frameIndex}>0{Object.keys(SCENES).indexOf(scene) + 1}</Text>
        </View>
        <View style={styles.frameBody}>
          <Animated.View style={[styles.core, compact && styles.coreCompact, { backgroundColor: sceneConfig.accent, transform: [{ scale: pulse }] }]}>
            {scene === 'synaura' ? (
              <Image source={require('../../assets/synaura-symbol-2026.png')} style={styles.symbol} />
            ) : (
              <Ionicons name={sceneConfig.icon} size={compact ? 30 : 38} color="#FFFFFF" />
            )}
          </Animated.View>
          <View style={styles.frameCopy}>
            <Text style={styles.frameTitle}>{sceneConfig.label}</Text>
            <View style={styles.miniSignal}>{waveBars.slice(0, 9)}</View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.sceneLabel}>
        <View style={[styles.sceneDot, { backgroundColor: sceneConfig.secondary }]} />
        <Text style={styles.sceneLabelText}>{sceneConfig.label}</Text>
      </View>

      <View style={[styles.featureRow, compact && styles.featureRowCompact]}>
        {sceneConfig.features.map((feature) => (
          <View key={feature.label} style={styles.feature}>
            <Ionicons name={feature.icon} size={13} color="#F7F6F3" />
            <Text numberOfLines={1} style={styles.featureText}>{feature.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.wave, compact && styles.waveCompact]}>{waveBars}</View>
      {scene === 'moments' ? (
        <>
          <View style={[styles.momentMarker, styles.momentMarkerOne, { backgroundColor: sceneConfig.secondary }]}><Ionicons name="heart" size={10} color="#FFFFFF" /></View>
          <View style={[styles.momentMarker, styles.momentMarkerTwo, { backgroundColor: sceneConfig.accent }]}><Ionicons name="chatbubble" size={9} color="#FFFFFF" /></View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { minHeight: 330, overflow: 'hidden', backgroundColor: '#171313' },
  stageCompact: { minHeight: 0 },
  accentRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  secondaryRail: { position: 'absolute', right: 0, top: '18%', width: 3, height: '52%', opacity: 0.9 },
  gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-evenly', opacity: 0.07 },
  gridLine: { height: 1, backgroundColor: '#F7F6F3' },
  signalFrame: { position: 'absolute', left: '12%', right: '12%', top: '14%', minHeight: 154, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(247,246,243,0.25)', paddingVertical: 10 },
  signalFrameCompact: { top: '10%', minHeight: 126, paddingVertical: 7 },
  frameHeader: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 7 },
  signalPip: { width: 6, height: 6, borderRadius: 3 },
  frameKicker: { flex: 1, color: 'rgba(247,246,243,0.58)', fontSize: 8, fontWeight: '900' },
  frameIndex: { color: 'rgba(247,246,243,0.38)', fontSize: 8, fontWeight: '900' },
  frameBody: { flex: 1, minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 14 },
  core: { width: 88, height: 88, overflow: 'hidden', borderRadius: 6, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  coreCompact: { width: 70, height: 70, borderRadius: 5 },
  symbol: { width: '100%', height: '100%' },
  frameCopy: { flex: 1, minWidth: 0 },
  frameTitle: { color: '#F7F6F3', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  miniSignal: { height: 36, marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden' },
  sceneLabel: { position: 'absolute', left: 18, top: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  sceneDot: { width: 7, height: 7, borderRadius: 4 },
  sceneLabelText: { color: '#F7F6F3', fontSize: 11, fontWeight: '900' },
  featureRow: { position: 'absolute', left: 18, right: 18, bottom: 79, minHeight: 38, flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(247,246,243,0.14)' },
  featureRowCompact: { bottom: 55, minHeight: 30 },
  feature: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  featureText: { flexShrink: 1, color: 'rgba(247,246,243,0.78)', fontSize: 8, fontWeight: '800' },
  wave: { position: 'absolute', left: 18, right: 18, bottom: 18, height: 42, flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveCompact: { bottom: 12, height: 38 },
  waveBar: { flex: 1, minHeight: 5, borderRadius: 2 },
  momentMarker: { position: 'absolute', width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#171313' },
  momentMarkerOne: { left: '30%', bottom: 42 },
  momentMarkerTwo: { right: '24%', bottom: 55 },
});
