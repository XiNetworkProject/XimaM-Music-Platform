import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeWelcome } from '@/onboarding/welcomeState';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { colors } from '@/theme/tokens';

const SLIDES = [
  {
    eyebrow: 'Bienvenue sur Synaura',
    title: 'La musique, avant les chiffres.',
    text: 'Decouvre des sons qui te ressemblent et donne une vraie chance aux createurs emergents.',
    icon: 'sparkles' as const,
    colors: ['#7357C6', '#4A9EAA'] as const,
  },
  {
    eyebrow: 'Synaura Moments',
    title: 'Chaque passage peut devenir un moment.',
    text: 'Explore la vraie waveform, reagis au bon instant et retrouve les commentaires ancres dans le son.',
    icon: 'pulse' as const,
    colors: ['#4A9EAA', '#D96D63'] as const,
  },
  {
    eyebrow: 'Radar',
    title: 'Entends-les avant tout le monde.',
    text: 'Le Radar met en avant les nouveaux morceaux prometteurs, meme quand leur audience commence a peine.',
    icon: 'radio' as const,
    colors: ['#D96D63', '#7357C6'] as const,
  },
  {
    eyebrow: 'Studio Synaura',
    title: 'Ecoute. Cree. Partage.',
    text: 'Publie tes morceaux, cree avec le Studio et transforme chaque ecoute en lien avec ton public.',
    icon: 'musical-notes' as const,
    colors: ['#7357C6', '#D96D63'] as const,
  },
] as const;

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { settings } = useMobileSettings();
  const [step, setStep] = useState(0);
  const transition = useRef(new Animated.Value(1)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const waves = useRef(Array.from({ length: 17 }, () => new Animated.Value(0))).current;
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

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

  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = transition.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#171313', '#211C1D', '#171313']} style={styles.visual}>
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
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
          <Animated.View style={[styles.orbitLarge, { transform: [{ rotate }] }]} />
          <Animated.View style={[styles.orbitSmall, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }] }]} />
          <Animated.View style={[styles.iconCore, { opacity: transition, transform: [{ scale: transition }] }]}>
            <LinearGradient colors={[...slide.colors]} style={StyleSheet.absoluteFill} />
            <Ionicons name={slide.icon} size={42} color="#FFFAF2" />
          </Animated.View>
        </View>

        <View style={styles.waveform}>
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

      <View style={[styles.content, { paddingBottom: insets.bottom + 18 }]}>
        <Animated.View style={{ opacity: transition, transform: [{ translateY }] }}>
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.text}</Text>
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
                <Text style={styles.primaryText}>Creer mon compte</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  visual: { flex: 1.12, minHeight: 390, overflow: 'hidden' },
  topBar: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 32, height: 32, borderRadius: 10 },
  brandName: { color: '#FFFAF2', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  skipButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
  skipText: { color: 'rgba(255,250,242,0.58)', fontSize: 12, fontWeight: '800' },
  visualCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbitLarge: { position: 'absolute', width: 248, height: 248, borderRadius: 124, borderWidth: 1, borderColor: 'rgba(255,250,242,0.12)', borderTopColor: '#7357C6' },
  orbitSmall: { position: 'absolute', width: 184, height: 184, borderRadius: 92, borderWidth: 1, borderColor: 'rgba(255,250,242,0.1)', borderBottomColor: '#4A9EAA' },
  iconCore: { width: 112, height: 112, borderRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.36, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 14 },
  waveform: { height: 74, marginHorizontal: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  waveBar: { flex: 1, height: 58, borderRadius: 3 },
  content: { flex: 0.88, paddingHorizontal: 24, paddingTop: 26, justifyContent: 'space-between' },
  eyebrow: { color: colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { marginTop: 8, color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: '900' },
  body: { marginTop: 10, color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  footer: { marginTop: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(17,17,17,0.14)' },
  progressDotActive: { width: 28, backgroundColor: colors.violet },
  authActions: { gap: 9 },
  primaryButton: { height: 54, borderRadius: 16, backgroundColor: colors.black, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  secondaryRow: { flexDirection: 'row', gap: 9 },
  secondaryButton: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderStrong },
  secondaryText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  exploreButton: { minWidth: 104, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exploreText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
});
