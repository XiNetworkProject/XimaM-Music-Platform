import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { completeWelcome } from '@/onboarding/welcomeState';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraIntroStage, type IntroScene } from '@/components/onboarding/SynauraIntroStage';

const SLIDES: Array<{
  eyebrow: string;
  title: string;
  text: string;
  promise: string;
  scene: IntroScene;
  accent: string;
}> = [
  {
    eyebrow: 'Bienvenue sur Synaura',
    title: 'La musique mérite mieux qu’un compteur.',
    text: 'Entre dans une plateforme où l’écoute, la création et les rencontres commencent toujours par le son.',
    promise: 'La musique reste au centre, à chaque écran.',
    scene: 'synaura',
    accent: '#7357C6',
  },
  {
    eyebrow: 'Synaura Moments',
    title: 'Vis vraiment chaque passage.',
    text: 'Parcours une waveform interactive, réagis sur un instant précis et retrouve les commentaires exactement là où ils ont été laissés.',
    promise: 'Un moment précis devient une conversation musicale.',
    scene: 'moments',
    accent: '#4A9EAA',
  },
  {
    eyebrow: 'Radar',
    title: 'Entends-les avant tout le monde.',
    text: 'Le Radar cherche les bons signaux au-delà de la popularité pour donner une vraie place aux créateurs émergents.',
    promise: 'Même un petit créateur peut trouver ses premiers vrais auditeurs.',
    scene: 'radar',
    accent: '#D96D63',
  },
  {
    eyebrow: 'Studio Synaura',
    title: 'Une idée peut devenir un morceau.',
    text: 'Décris une direction, affine le style, crée une variation ou prépare une publication sans quitter ton univers musical.',
    promise: 'Tes créations et tes projets restent réunis dans ton Studio.',
    scene: 'studio',
    accent: '#7357C6',
  },
  {
    eyebrow: 'Ton univers',
    title: 'Des profils faits pour être écoutés.',
    text: 'Présente toute ta discographie, partage l’histoire d’un son et construis un lien avec les personnes qui l’écoutent vraiment.',
    promise: 'Prêt à découvrir Synaura à ta façon.',
    scene: 'community',
    accent: '#4A9EAA',
  },
];

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const [step, setStep] = useState(0);
  const transition = useRef(new Animated.Value(1)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;
  const splitLayout = layout.isLandscape && layout.safeWidth >= 620;
  const visualHeight = Math.max(
    layout.isVeryShort ? 220 : 270,
    Math.min(layout.isTall ? 470 : 410, layout.usableHeight * 0.48, layout.safeWidth * 1.02),
  );

  const changeStep = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length || next === step) return;
    void Haptics.selectionAsync().catch(() => {});
    if (settings.reducedMotion) {
      setStep(next);
      return;
    }
    Animated.timing(transition, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.spring(transition, { toValue: 1, speed: 18, bounciness: 4, useNativeDriver: true }).start();
    });
  }, [settings.reducedMotion, step, transition]);

  const enter = async (target: 'Tabs' | 'Login' | 'Register') => {
    await completeWelcome();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (target === 'Tabs') {
      navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Swipe' } }] });
    } else {
      navigation.navigate(target);
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
    onPanResponderMove: (_, gesture) => gestureX.setValue(Math.max(-70, Math.min(70, gesture.dx * 0.32))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -54 && step < SLIDES.length - 1) changeStep(step + 1);
      else if (gesture.dx > 54 && step > 0) changeStep(step - 1);
      Animated.spring(gestureX, { toValue: 0, speed: 26, bounciness: 4, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(gestureX, { toValue: 0, speed: 26, bounciness: 4, useNativeDriver: true }).start(),
  }), [changeStep, gestureX, step]);

  const visual = (
    <View
      style={[
        styles.visualPane,
        splitLayout
          ? { width: '49%', paddingTop: layout.insets.top + 10, paddingBottom: Math.max(layout.insets.bottom, 10) }
          : { height: visualHeight, paddingTop: layout.insets.top + 10 },
      ]}
    >
      <View style={[styles.visualTop, { paddingLeft: layout.isTiny ? 12 : 18, paddingRight: layout.isTiny ? 12 : 18 }]}>
        <View style={styles.brandMark}>
          <View style={[styles.brandLine, { backgroundColor: slide.accent }]} />
          <Text style={styles.brandName}>Synaura</Text>
        </View>
        {!last ? (
          <Pressable accessibilityLabel="Passer la présentation" hitSlop={8} onPress={() => changeStep(SLIDES.length - 1)} style={styles.skipButton}>
            <Text style={styles.skipText}>Passer</Text>
          </Pressable>
        ) : null}
      </View>
      <Animated.View style={[styles.stageWrap, { opacity: transition, transform: [{ translateX: gestureX }] }]}>
        <SynauraIntroStage scene={slide.scene} compact={layout.isVeryShort || splitLayout} style={styles.stageFill} />
      </Animated.View>
    </View>
  );

  const copy = (
    <View
      style={[
        styles.copy,
        layout.contentFrame,
        {
          minHeight: splitLayout ? layout.usableHeight : Math.max(330, layout.usableHeight - visualHeight),
          paddingLeft: layout.pagePaddingLeft,
          paddingRight: layout.pagePaddingRight,
          paddingTop: splitLayout ? layout.insets.top + 24 : (layout.isShort ? 20 : 28),
          paddingBottom: Math.max(layout.insets.bottom, 12) + 18,
        },
      ]}
    >
      <Animated.View style={{ opacity: transition, transform: [{ translateX: gestureX }, { translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <View style={styles.eyebrowRow}>
          <View style={[styles.eyebrowLine, { backgroundColor: slide.accent }]} />
          <Text style={[styles.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
        </View>
        <Text maxFontSizeMultiplier={1.18} style={[styles.title, layout.isNarrow && styles.titleNarrow, layout.isVeryShort && styles.titleShort]}>{slide.title}</Text>
        <Text maxFontSizeMultiplier={1.25} style={styles.body}>{slide.text}</Text>
        <View style={styles.promiseRow}>
          <Ionicons name="checkmark-circle" size={17} color={slide.accent} />
          <Text style={styles.promise}>{slide.promise}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressIndex}>{String(step + 1).padStart(2, '0')}</Text>
          <View style={styles.progressTrack}>
            {SLIDES.map((_, index) => (
              <Pressable key={index} accessibilityLabel={`Présentation ${index + 1}`} hitSlop={6} onPress={() => changeStep(index)} style={styles.progressTouch}>
                <View style={[styles.progressSegment, index <= step && { backgroundColor: slide.accent }]} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.progressIndex}>{String(SLIDES.length).padStart(2, '0')}</Text>
        </View>

        {last ? (
          <View style={styles.authActions}>
            <Pressable onPress={() => void enter('Register')} style={styles.primaryButton}>
              <Ionicons name="person-add-outline" size={18} color="#F7F6F3" />
              <Text style={styles.primaryText}>Créer mon compte</Text>
              <Ionicons name="arrow-forward" size={17} color="#F7F6F3" />
            </Pressable>
            <Pressable onPress={() => void enter('Login')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>J’ai déjà un compte</Text>
            </Pressable>
            <Pressable onPress={() => void enter('Tabs')} style={styles.exploreButton}>
              <Text style={styles.exploreText}>Explorer sans compte</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.navigationRow}>
            {step > 0 ? (
              <Pressable accessibilityLabel="Étape précédente" onPress={() => changeStep(step - 1)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </Pressable>
            ) : <View style={styles.backButtonPlaceholder} />}
            <Pressable onPress={() => changeStep(step + 1)} style={styles.continueButton}>
              <Text style={styles.primaryText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={17} color="#F7F6F3" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View {...panResponder.panHandlers} style={styles.root}>
      <StatusBar style="light" />
      {splitLayout ? (
        <View style={styles.split}>
          {visual}
          <ScrollView style={styles.copyScroll} contentContainerStyle={styles.copyScrollContent} showsVerticalScrollIndicator={false}>
            {copy}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.portraitContent} showsVerticalScrollIndicator={false}>
          {visual}
          {copy}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  portraitContent: { flexGrow: 1 },
  visualPane: { overflow: 'hidden', backgroundColor: '#171313' },
  visualTop: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 3 },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandLine: { width: 4, height: 22, borderRadius: 2 },
  brandName: { color: '#F7F6F3', fontSize: 17, fontWeight: '900' },
  skipButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { color: 'rgba(247,246,243,0.62)', fontSize: 12, fontWeight: '800' },
  stageWrap: { flex: 1, marginTop: 4 },
  stageFill: { flex: 1, minHeight: 0 },
  copyScroll: { flex: 1, backgroundColor: colors.background },
  copyScrollContent: { flexGrow: 1 },
  copy: { flexGrow: 1, justifyContent: 'space-between', backgroundColor: colors.background },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowLine: { width: 22, height: 2, borderRadius: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900' },
  title: { marginTop: 11, color: colors.text, fontSize: 31, lineHeight: 36, fontWeight: '900' },
  titleNarrow: { fontSize: 27, lineHeight: 32 },
  titleShort: { fontSize: 25, lineHeight: 30 },
  body: { marginTop: 12, maxWidth: 500, color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  promiseRow: { marginTop: 16, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  promise: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  footer: { marginTop: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 },
  progressIndex: { width: 18, color: colors.textTertiary, fontSize: 9, fontWeight: '900' },
  progressTrack: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressTouch: { flex: 1, minHeight: 18, justifyContent: 'center' },
  progressSegment: { width: '100%', height: 3, borderRadius: 2, backgroundColor: 'rgba(17,17,17,0.12)' },
  navigationRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  backButton: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  backButtonPlaceholder: { width: 52, height: 52 },
  continueButton: { flex: 1, height: 54, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.black },
  primaryButton: { minHeight: 54, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16, backgroundColor: colors.black },
  primaryText: { flexShrink: 1, color: '#F7F6F3', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  authActions: { gap: 9 },
  secondaryButton: { minHeight: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  secondaryText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  exploreButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  exploreText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
});
