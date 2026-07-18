import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

export type IntroScene = 'synaura' | 'moments' | 'radar' | 'studio' | 'community';

type SceneConfig = {
  accent: string;
  secondary: string;
  index: string;
  label: string;
  promise: string;
};

const SCENES: Record<IntroScene, SceneConfig> = {
  synaura: {
    accent: '#7357C6',
    secondary: '#4A9EAA',
    index: '01',
    label: 'Aura Flow',
    promise: 'Écouter · créer · partager',
  },
  moments: {
    accent: '#4A9EAA',
    secondary: '#D96D63',
    index: '02',
    label: 'Synaura Moments',
    promise: 'Chaque instant peut compter',
  },
  radar: {
    accent: '#D96D63',
    secondary: '#7357C6',
    index: '03',
    label: 'Radar',
    promise: 'Les nouvelles voix remontent',
  },
  studio: {
    accent: '#7357C6',
    secondary: '#D96D63',
    index: '04',
    label: 'Studio',
    promise: 'Une idée devient un morceau',
  },
  community: {
    accent: '#4A9EAA',
    secondary: '#7357C6',
    index: '05',
    label: 'Profil musical',
    promise: 'Sons · Clips · Posts',
  },
};

const WAVE_PATTERN = [0.28, 0.48, 0.72, 0.44, 0.88, 0.62, 0.36, 0.78, 1, 0.58, 0.84, 0.42, 0.68, 0.92, 0.54, 0.34, 0.64, 0.8, 0.46, 0.7, 0.38, 0.56, 0.32];

export function SynauraIntroStage({ scene, compact = false, showBrand = true, style }: { scene: IntroScene; compact?: boolean; showBrand?: boolean; style?: StyleProp<ViewStyle> }) {
  const { settings } = useMobileSettings();
  const phase = useRef(new Animated.Value(0)).current;
  const config = SCENES[scene];

  useEffect(() => {
    if (settings.reducedMotion) {
      phase.setValue(0.45);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [phase, settings.reducedMotion]);

  const wave = useMemo(() => WAVE_PATTERN.map((height, index) => (
    <Animated.View
      key={`${scene}-${index}`}
      style={[
        styles.waveBar,
        {
          height: `${Math.round(height * 100)}%`,
          backgroundColor: index < 12 ? config.accent : index % 3 === 0 ? config.secondary : '#F7F6F3',
          opacity: index < 12 ? 0.94 : 0.4,
          transform: [{
            scaleY: phase.interpolate({
              inputRange: [0, 1],
              outputRange: [Math.max(0.58, height), Math.min(1.08, 0.72 + (index % 6) * 0.07)],
            }),
          }],
        },
      ]}
    />
  )), [config.accent, config.secondary, phase, scene]);

  const floatY = phase.interpolate({ inputRange: [0, 1], outputRange: [3, -4] });
  const breathe = phase.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.015] });

  return (
    <View style={[styles.stage, compact && styles.stageCompact, style]} accessible={false}>
      <LinearGradient colors={['#151313', '#111414', '#0B0B0B']} locations={[0, 0.56, 1]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={[`${config.accent}38`, `${config.secondary}16`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.topLine, compact && styles.topLineCompact]}>
        {showBrand ? (
          <View style={styles.brandLockup}>
            <Image source={require('../../assets/synaura-symbol-2026.png')} style={styles.brandSymbol} />
            <Text style={styles.brandName}>Synaura</Text>
          </View>
        ) : <View />}
        <View style={styles.sceneMeta}>
          <View style={[styles.sceneDot, { backgroundColor: config.accent }]} />
          <Text style={styles.sceneName}>{config.label}</Text>
          <Text style={styles.sceneIndex}>{config.index}</Text>
        </View>
      </View>

      <Animated.View style={[styles.preview, compact && styles.previewCompact, { transform: [{ translateY: floatY }, { scale: breathe }] }]}>
        <ScenePreview scene={scene} config={config} wave={wave} compact={compact} />
      </Animated.View>

      <View style={[styles.footerLine, compact && styles.footerLineCompact]}>
        <Text numberOfLines={1} style={styles.promise}>{config.promise}</Text>
        <View style={styles.signalTicks}>
          {[0, 1, 2, 3].map((tick) => <View key={tick} style={[styles.signalTick, tick === 0 && { backgroundColor: config.accent }]} />)}
        </View>
      </View>
    </View>
  );
}

function ScenePreview({ scene, config, wave, compact }: { scene: IntroScene; config: SceneConfig; wave: React.ReactNode[]; compact: boolean }) {
  if (scene === 'moments') {
    return (
      <View style={styles.momentPanel}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewKicker}>WAVEFORM INTERACTIVE</Text>
          <Ionicons name="pulse" size={16} color={config.accent} />
        </View>
        <Text style={[styles.previewTitle, compact && styles.previewTitleCompact]}>Le son devient un moment.</Text>
        <View style={[styles.largeWave, compact && styles.largeWaveCompact]}>{wave}</View>
        <View style={[styles.playhead, { backgroundColor: config.accent }]} />
        <View style={[styles.momentPin, styles.momentPinLeft, { backgroundColor: config.secondary }]}><Ionicons name="heart" size={10} color="#FFFFFF" /></View>
        <View style={[styles.momentPin, styles.momentPinRight, { backgroundColor: config.accent }]}><Ionicons name="chatbubble" size={9} color="#FFFFFF" /></View>
      </View>
    );
  }

  if (scene === 'radar') {
    return (
      <View style={styles.radarPanel}>
        <View style={[styles.radarRing, styles.radarRingOuter, { borderColor: `${config.accent}42` }]} />
        <View style={[styles.radarRing, styles.radarRingMiddle, { borderColor: `${config.secondary}66` }]} />
        <View style={[styles.radarSweep, { backgroundColor: config.accent }]} />
        <View style={[styles.radarCore, { backgroundColor: config.accent }]}>
          <Ionicons name="radio" size={compact ? 25 : 31} color="#FFFFFF" />
        </View>
        <View style={styles.radarCopy}>
          <Text style={styles.previewKicker}>SIGNAL RADAR</Text>
          <Text style={[styles.previewTitle, compact && styles.previewTitleCompact]}>Entends-les avant tout le monde.</Text>
        </View>
      </View>
    );
  }

  if (scene === 'studio') {
    return (
      <View style={styles.studioPanel}>
        <View style={styles.studioModes}>
          <View style={styles.studioModeActive}><Text style={styles.studioModeActiveText}>Simple</Text></View>
          <Text style={styles.studioModeText}>Avancé</Text>
          <Text style={styles.studioModeText}>Sons</Text>
        </View>
        <View style={[styles.studioPrompt, compact && styles.studioPromptCompact]}>
          <Text numberOfLines={2} style={styles.studioPlaceholder}>Décris le morceau que tu imagines...</Text>
          <View style={[styles.studioAction, { backgroundColor: config.accent }]}><Ionicons name="arrow-up" size={15} color="#FFFFFF" /></View>
        </View>
        <View style={[styles.studioFooter, compact && styles.studioFooterCompact]}>
          <View style={styles.studioChip}><Ionicons name="musical-note-outline" size={12} color="#F7F6F3" /><Text style={styles.studioChipText}>Style</Text></View>
          <View style={styles.studioChip}><Ionicons name="mic-outline" size={12} color="#F7F6F3" /><Text style={styles.studioChipText}>Voix</Text></View>
          <View style={styles.studioChip}><Ionicons name="sparkles-outline" size={12} color="#F7F6F3" /><Text style={styles.studioChipText}>Créer</Text></View>
        </View>
      </View>
    );
  }

  if (scene === 'community') {
    return (
      <View style={styles.profilePanel}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileAvatar, compact && styles.profileAvatarCompact]}><Image source={require('../../assets/synaura-symbol-2026.png')} style={styles.profileAvatarImage} /></View>
          <View style={styles.profileCopy}>
            <Text style={styles.previewKicker}>TON ESPACE</Text>
            <Text style={[styles.previewTitle, compact && styles.previewTitleCompact]}>Toute ta musique, au même endroit.</Text>
          </View>
        </View>
        <View style={[styles.profileTabs, compact && styles.profileTabsCompact]}>
          {['Sons', 'Clips', 'Posts'].map((tab, index) => <Text key={tab} style={[styles.profileTab, index === 0 && { color: config.accent }]}>{tab}</Text>)}
        </View>
        <View style={[styles.profileMediaRow, compact && styles.profileMediaRowCompact]}>
          {[config.accent, config.secondary, '#D96D63'].map((color, index) => (
            <View key={color} style={[styles.profileMedia, { backgroundColor: `${color}${index === 0 ? 'A8' : '72'}` }]}>
              <Ionicons name={index === 1 ? 'film-outline' : 'musical-note-outline'} size={17} color="#FFFFFF" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flowPanel, compact && styles.flowPanelCompact]}>
      <View style={[styles.coverGhost, compact && styles.coverGhostCompact, styles.coverGhostLeft, { backgroundColor: `${config.secondary}60` }]} />
      <View style={[styles.coverGhost, compact && styles.coverGhostCompact, styles.coverGhostRight, { backgroundColor: `${config.accent}78` }]} />
      <View style={[styles.heroCover, compact && styles.heroCoverCompact]}>
        <Image source={require('../../assets/synaura-symbol-2026.png')} style={styles.heroSymbol} />
      </View>
      <View style={styles.flowCopy}>
        <Text style={styles.previewKicker}>TON FLOW EST PRÊT</Text>
        <Text style={[styles.previewTitle, compact && styles.previewTitleCompact]}>Ton monde musical commence ici.</Text>
        <View style={styles.miniWave}>{wave.slice(0, 14)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { minHeight: 330, overflow: 'hidden', backgroundColor: '#101010' },
  stageCompact: { minHeight: 0 },
  topLine: { minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  topLineCompact: { minHeight: 42, paddingHorizontal: 14 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandSymbol: { width: 28, height: 28, borderRadius: 6 },
  brandName: { color: '#F7F6F3', fontSize: 14, fontWeight: '900' },
  sceneMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sceneDot: { width: 6, height: 6, borderRadius: 3 },
  sceneName: { color: 'rgba(247,246,243,0.66)', fontSize: 9, fontWeight: '800' },
  sceneIndex: { color: 'rgba(247,246,243,0.34)', fontSize: 8, fontWeight: '900' },
  preview: { flex: 1, minHeight: 224, marginHorizontal: 18, marginVertical: 5 },
  previewCompact: { minHeight: 150, marginHorizontal: 14, marginVertical: 2 },
  footerLine: { minHeight: 44, marginHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(247,246,243,0.14)' },
  footerLineCompact: { minHeight: 34, marginHorizontal: 14 },
  promise: { flex: 1, color: 'rgba(247,246,243,0.62)', fontSize: 9, fontWeight: '800' },
  signalTicks: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signalTick: { width: 12, height: 2, backgroundColor: 'rgba(247,246,243,0.22)' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewKicker: { color: 'rgba(247,246,243,0.54)', fontSize: 8, fontWeight: '900' },
  previewTitle: { marginTop: 6, maxWidth: 280, color: '#F7F6F3', fontSize: 22, lineHeight: 26, fontWeight: '900' },
  previewTitleCompact: { fontSize: 17, lineHeight: 21 },
  flowPanel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  flowPanelCompact: { gap: 11 },
  coverGhost: { position: 'absolute', width: 104, height: 136, borderRadius: 8, opacity: 0.5 },
  coverGhostCompact: { width: 76, height: 100 },
  coverGhostLeft: { left: '8%', transform: [{ rotate: '-8deg' }] },
  coverGhostRight: { left: '24%', transform: [{ rotate: '7deg' }] },
  heroCover: { width: 132, height: 160, zIndex: 2, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(247,246,243,0.18)', backgroundColor: '#050505' },
  heroCoverCompact: { width: 94, height: 116 },
  heroSymbol: { width: '100%', height: '100%', resizeMode: 'cover' },
  flowCopy: { flex: 1, minWidth: 0, maxWidth: 220 },
  miniWave: { height: 30, marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden' },
  waveBar: { flex: 1, minWidth: 2, borderRadius: 1 },
  momentPanel: { flex: 1, paddingHorizontal: 6, justifyContent: 'center' },
  largeWave: { height: 74, marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 3 },
  largeWaveCompact: { height: 52, marginTop: 14 },
  playhead: { position: 'absolute', left: '49%', top: '45%', width: 2, height: '44%', borderRadius: 1 },
  momentPin: { position: 'absolute', width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#111313' },
  momentPinLeft: { left: '24%', bottom: '18%' },
  momentPinRight: { right: '22%', bottom: '29%' },
  radarPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  radarRing: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  radarRingOuter: { width: 230, height: 230 },
  radarRingMiddle: { width: 154, height: 154 },
  radarSweep: { position: 'absolute', left: '50%', top: '12%', width: 1, height: '38%', transformOrigin: 'bottom' },
  radarCore: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 7, borderColor: 'rgba(13,13,13,0.7)' },
  radarCopy: { position: 'absolute', left: 6, bottom: 8, maxWidth: '70%' },
  studioPanel: { flex: 1, justifyContent: 'center' },
  studioModes: { alignSelf: 'center', minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(247,246,243,0.15)', borderRadius: 8, padding: 3 },
  studioModeActive: { minHeight: 26, justifyContent: 'center', borderRadius: 6, paddingHorizontal: 12, backgroundColor: 'rgba(247,246,243,0.13)' },
  studioModeActiveText: { color: '#F7F6F3', fontSize: 9, fontWeight: '900' },
  studioModeText: { paddingHorizontal: 8, color: 'rgba(247,246,243,0.52)', fontSize: 9, fontWeight: '800' },
  studioPrompt: { minHeight: 82, marginTop: 15, flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderWidth: 1, borderColor: 'rgba(247,246,243,0.13)', borderRadius: 8, padding: 13, backgroundColor: 'rgba(247,246,243,0.045)' },
  studioPromptCompact: { minHeight: 56, marginTop: 7, padding: 9 },
  studioPlaceholder: { flex: 1, alignSelf: 'flex-start', color: 'rgba(247,246,243,0.5)', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  studioAction: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  studioFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  studioFooterCompact: { marginTop: 6 },
  studioChip: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(247,246,243,0.13)', borderRadius: 7, paddingHorizontal: 9 },
  studioChipText: { color: 'rgba(247,246,243,0.7)', fontSize: 8, fontWeight: '800' },
  profilePanel: { flex: 1, justifyContent: 'center' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  profileAvatar: { width: 62, height: 62, overflow: 'hidden', borderRadius: 31, borderWidth: 2, borderColor: 'rgba(247,246,243,0.24)', backgroundColor: '#050505' },
  profileAvatarCompact: { width: 46, height: 46, borderRadius: 23 },
  profileAvatarImage: { width: '100%', height: '100%' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileTabs: { minHeight: 38, marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(247,246,243,0.14)' },
  profileTabsCompact: { minHeight: 28, marginTop: 8 },
  profileTab: { color: 'rgba(247,246,243,0.44)', fontSize: 9, fontWeight: '900' },
  profileMediaRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  profileMediaRowCompact: { marginTop: 7 },
  profileMedia: { flex: 1, aspectRatio: 1.25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(247,246,243,0.13)' },
});
