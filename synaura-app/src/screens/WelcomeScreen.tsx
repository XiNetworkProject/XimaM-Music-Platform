import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeWelcome } from '@/onboarding/welcomeState';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

const SLIDES = [
  {
    eyebrow: 'Bienvenue sur Synaura',
    title: 'La musique, avant les chiffres.',
    text: 'Découvre des sons qui te ressemblent et donne une vraie chance aux créateurs émergents.',
    icon: 'sparkles' as const,
    colors: ['#7357C6', '#4A9EAA'] as const,
  },
  {
    eyebrow: 'Synaura Moments',
    title: 'Chaque passage peut devenir un moment.',
    text: 'Explore la vraie waveform, réagis au bon instant et retrouve les commentaires ancrés dans le son.',
    icon: 'pulse' as const,
    colors: ['#4A9EAA', '#D96D63'] as const,
  },
  {
    eyebrow: 'Radar',
    title: 'Entends-les avant tout le monde.',
    text: 'Le Radar met en avant les nouveaux morceaux prometteurs, même quand leur audience commence à peine.',
    icon: 'radio' as const,
    colors: ['#D96D63', '#7357C6'] as const,
  },
  {
    eyebrow: 'Studio Synaura',
    title: 'Écoute. Crée. Partage.',
    text: 'Publie tes morceaux, crée avec le Studio et transforme chaque écoute en lien avec ton public.',
    icon: 'musical-notes' as const,
    colors: ['#7357C6', '#D96D63'] as const,
  },
] as const;

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const [step, setStep] = useState(0);
  const transition = useRef(new Animated.Value(1)).current;
  const gestureX = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const waves = useRef(Array.from({ length: 17 }, () => new Animated.Value(0))).current;
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;
  const visualHeight = Math.max(220, Math.min(390, layout.usableHeight * (layout.isShort ? 0.47 : 0.54)));
  const orbitLargeSize = Math.max(168, Math.min(236, layout.availableContentWidth * 0.72, visualHeight * 0.6));
  const orbitSmallSize = orbitLargeSize * 0.74;
  const iconSize = Math.max(84, Math.min(112, orbitLargeSize * 0.48));

  useEffect(() => {
    if (settings.reducedMotion) {
      orbit.setValue(0);
      waves.forEach((value) => value.setValue(0.56));
      return;
    }
    const orbitLoop = Animated.loop(Animated.timing(orbit, {
      toValue: 1,
      duration: 14000,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    const waveLoop = Animated.loop(Animated.stagger(45, waves.map((value, index) => Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 720 + (index % 4) * 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 720 + (index % 3) * 100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]))));
    orbitLoop.start();
    waveLoop.start();
    return () => {
      orbitLoop.stop();
      waveLoop.stop();
    };
  }, [orbit, settings.reducedMotion, waves]);

  const changeStep = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    void Haptics.selectionAsync().catch(() => {});
    if (settings.reducedMotion) {
      setStep(next);
      return;
    }
    Animated.timing(transition, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.spring(transition, { toValue: 1, speed: 18, bounciness: 5, useNativeDriver: true }).start();
    });
  };

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
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderMove: (_, gesture) => gestureX.setValue(Math.max(-70, Math.min(70, gesture.dx * 0.35))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -52 && step < SLIDES.length - 1) changeStep(step + 1);
      else if (gesture.dx > 52 && step > 0) changeStep(step - 1);
      Animated.spring(gestureX, { toValue: 0, speed: 26, bounciness: 5, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(gestureX, { toValue: 0, speed: 26, bounciness: 5, useNativeDriver: true }).start(),
  }), [gestureX, step]);

  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = transition.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View {...panResponder.panHandlers} style={styles.root}>
      <LinearGradient colors={['#171313', '#211C1D', '#171313']} style={[styles.visual, { minHeight: visualHeight, flex: layout.isShort ? 0.8 : 1.12 }]}>
        <View style={[styles.topBar, layout.contentFrame, { paddingLeft: layout.pagePaddingLeft, paddingRight: layout.pagePaddingRight, paddingTop: insets.top + 12 }]}>
          <View style={styles.brand}>
            <Image source={require('../assets/synaura-symbol-2026.png')} style={styles.logo} />
            <Text style={styles.brandName}>SYNAURA</Text>
          </View>
          {!last ? (
            <Pressable accessibilityLabel="Passer la presentation" onPress={() => changeStep(SLIDES.length - 1)} style={styles.skipButton}>
              <Text style={styles.skipText}>Passer</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.visualCenter}>
          <Animated.View style={[styles.orbitLarge, { width: orbitLargeSize, height: orbitLargeSize, borderRadius: orbitLargeSize * 0.15, transform: [{ rotate }] }]} />
          <Animated.View style={[styles.orbitSmall, { width: orbitSmallSize, height: orbitSmallSize, borderRadius: orbitSmallSize * 0.16, transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }] }]} />
          <Animated.View style={[styles.iconCore, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.2, opacity: transition, transform: [{ translateX: gestureX }, { scale: transition }] }]}>
            <LinearGradient colors={[...slide.colors]} style={StyleSheet.absoluteFill} />
            <Ionicons name={slide.icon} size={42} color="#FFFAF2" />
          </Animated.View>
        </View>

        <View style={[styles.waveform, { height: layout.isShort ? 52 : 74, marginHorizontal: layout.gutter, marginBottom: layout.isShort ? 10 : 20 }]}>
          {waves.map((value, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  backgroundColor: index % 3 === 0 ? slide.colors[0] : index % 3 === 1 ? slide.colors[1] : '#FFFAF2',
                  transform: [{ scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] }) }],
                  opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0.92] }),
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.contentScroll, { flex: layout.isShort ? 1.2 : 0.88 }]}
        contentContainerStyle={[
          styles.content,
          layout.contentFrame,
          {
            minHeight: layout.isShort ? 300 : undefined,
            paddingLeft: layout.pagePaddingLeft,
            paddingRight: layout.pagePaddingRight,
            paddingTop: layout.isShort ? 18 : 26,
            paddingBottom: insets.bottom + 18,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: transition, transform: [{ translateX: gestureX }, { translateY }] }}>
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <Text maxFontSizeMultiplier={1.2} style={[styles.title, layout.isNarrow && styles.titleNarrow]}>{slide.title}</Text>
          <Text maxFontSizeMultiplier={1.25} style={styles.body}>{slide.text}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.progressRow}>
            {SLIDES.map((_, index) => (
              <Pressable key={index} accessibilityLabel={`Presentation ${index + 1}`} onPress={() => changeStep(index)}>
                <View style={[styles.progressDot, index === step && styles.progressDotActive]} />
              </Pressable>
            ))}
          </View>

          {last ? (
            <View style={styles.authActions}>
              <Pressable onPress={() => void enter('Register')} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Créer mon compte</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFFAF2" />
              </Pressable>
              <View style={styles.secondaryRow}>
                <Pressable onPress={() => void enter('Login')} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Se connecter</Text>
                </Pressable>
                <Pressable onPress={() => void enter('Tabs')} style={styles.exploreButton}>
                  <Text style={styles.exploreText}>Explorer</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => changeStep(step + 1)} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFAF2" />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  visual: { overflow: 'hidden' },
  topBar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 32, height: 32, borderRadius: 10 },
  brandName: { color: '#FFFAF2', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  skipButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
  skipText: { color: 'rgba(255,250,242,0.58)', fontSize: 12, fontWeight: '800' },
  visualCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbitLarge: { position: 'absolute', width: 236, height: 236, borderRadius: 36, borderWidth: 1, borderColor: 'rgba(255,250,242,0.12)', borderTopColor: '#7357C6' },
  orbitSmall: { position: 'absolute', width: 174, height: 174, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,250,242,0.1)', borderBottomColor: '#4A9EAA' },
  iconCore: { width: 112, height: 112, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 13 }, elevation: 12 },
  waveform: { height: 74, marginHorizontal: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  waveBar: { flex: 1, height: 58, borderRadius: 3 },
  contentScroll: { backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'space-between' },
  eyebrow: { color: colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { marginTop: 8, color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: '900' },
  titleNarrow: { fontSize: 25, lineHeight: 30 },
  body: { marginTop: 10, color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  footer: { marginTop: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(17,17,17,0.14)' },
  progressDotActive: { width: 28, backgroundColor: colors.violet },
  authActions: { gap: 9 },
  primaryButton: { height: 54, borderRadius: 9, backgroundColor: colors.black, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  secondaryRow: { flexDirection: 'row', gap: 9 },
  secondaryButton: { flex: 1, height: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderStrong },
  secondaryText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  exploreButton: { minWidth: 104, height: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  exploreText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
});
