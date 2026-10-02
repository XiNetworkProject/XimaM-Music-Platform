import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { completeWelcome } from '@/onboarding/welcomeState';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntryAtmosphere, useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { SynauraIntroStage, type IntroScene } from '@/components/entry/EntryStage';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { entry } from '@/theme/entry';

const SLIDES: { label: string; title: string; accent: string; text: string; scene: IntroScene }[] = [
  { label: 'BIENVENUE DANS SYNAURA', title: 'Plus qu’écouter.', accent: 'Ressentir.', text: 'Des sons, des artistes, des rencontres. Un univers qui commence avec toi.', scene: 'synaura' },
  { label: 'LIVE & MOMENTS', title: 'Le bon son.', accent: 'Au bon moment.', text: 'Swipe, découvre. Laisse une réaction exactement au passage qui te touche.', scene: 'moments' },
  { label: 'STUDIO IA', title: 'Une idée en tête ?', accent: 'Fais-la entendre.', text: 'Décris ton univers. Crée ton morceau, puis partage-le quand tu es prêt.', scene: 'studio' },
  { label: 'TA COMMUNAUTÉ', title: 'Même fréquence.', accent: 'Nouvelles rencontres.', text: 'Suis les artistes que tu aimes. Partage tes trouvailles, parle musique.', scene: 'community' },
];

export function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const animate = useEntryMotion();
  const pager = useRef<FlatList>(null);
  const [step, setStep] = useState(0);
  const [entering, setEntering] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;
  const splitLayout = layout.isLandscape && layout.safeWidth >= 600;
  const pageHeight = Math.max(340, layout.height - layout.insets.top - layout.insets.bottom - 205);
  useEffect(() => { pager.current?.scrollToOffset({ offset: stepRef.current * layout.width, animated: false }); }, [layout.width]);
  const go = (index: number) => { setStep(index); pager.current?.scrollToOffset({ offset: index * layout.width, animated: animate }); };
  const enter = async (target: 'Tabs' | 'Login' | 'Register') => {
    if (entering) return;
    setEntering(true);
    // Local storage must never prevent someone entering the app.
    await completeWelcome().catch(() => {});
    if (target === 'Tabs') navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Swipe' } }] });
    else navigation.navigate(target);
    setEntering(false);
  };
  return <EntryAtmosphere interactive>
    <StatusBar style="light" />
    <View style={[styles.header, { paddingTop: layout.insets.top + 10, paddingHorizontal: layout.gutter }]}>
      <SynauraMark size={30} wordmark />
      <Pressable accessibilityRole="button" onPress={() => void enter('Login')} style={styles.signIn}><Text style={styles.signInText}>Connexion</Text></Pressable>
    </View>
    <FlatList ref={pager} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false}
      data={SLIDES} keyExtractor={slide => slide.scene} extraData={`${step}:${layout.width}:${layout.height}`}
      onMomentumScrollEnd={event => setStep(Math.max(0, Math.min(SLIDES.length - 1, Math.round(event.nativeEvent.contentOffset.x / layout.width))))}
      getItemLayout={(_, index) => ({ length: layout.width, offset: layout.width * index, index })}
      renderItem={({ item, index }) => <ScrollView style={{ width: layout.width }} contentContainerStyle={[styles.page, { minHeight: pageHeight }, splitLayout && styles.split]} showsVerticalScrollIndicator={false}>
        <View style={[styles.visual, splitLayout ? { width: '46%', height: Math.max(220, pageHeight) } : { height: Math.max(190, Math.min(340, pageHeight * .58)) }]}>
          {index === step ? <SynauraIntroStage scene={item.scene} compact={layout.isShort} showBrand={false} /> : null}
        </View>
        <View style={[styles.copy, splitLayout && { width: '52%' }]}>
          <Text style={styles.eyebrow}>{item.label}</Text>
          <Text accessibilityRole="header" style={[styles.title, layout.isNarrow && { fontSize: 30, lineHeight: 36 }]}>{item.title}{'\n'}<Text style={styles.accent}>{item.accent}</Text></Text>
          <Text style={styles.description}>{item.text}</Text>
        </View>
      </ScrollView>} />
    <View style={[styles.footer, { paddingBottom: Math.max(12, layout.insets.bottom), paddingHorizontal: Math.max(24, layout.gutter) }]}>
      <View style={styles.dots}>{SLIDES.map((slide, index) => <Pressable key={slide.scene} accessibilityRole="button" accessibilityLabel={`Présentation ${index + 1} sur ${SLIDES.length}`} accessibilityState={{ selected: step === index }} onPress={() => go(index)} style={styles.dotTarget}><View style={[styles.dot, step === index && styles.activeDot]} /></Pressable>)}</View>
      <Pressable accessibilityRole="button" disabled={entering} onPress={() => step === SLIDES.length - 1 ? void enter('Register') : go(step + 1)} style={({ pressed }) => [styles.primary, pressed && { opacity: .8, transform: [{ scale: .985 }] }]}>
        <LinearGradient colors={['#8067EC', '#536EE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.primaryText}>{step === SLIDES.length - 1 ? 'Créer mon compte' : 'Découvrir Synaura'}</Text><Ionicons name="arrow-forward" size={19} color={entry.text} />
      </Pressable>
      <Pressable accessibilityRole="button" disabled={entering} onPress={() => void enter('Tabs')} style={styles.explore}><Text style={styles.exploreText}>Explorer sans compte</Text><Ionicons name="chevron-forward" size={13} color={entry.muted} /></Pressable>
    </View>
  </EntryAtmosphere>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  signIn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, signInText: { color: entry.muted, fontSize: 13, fontWeight: '600' },
  page: { flexGrow: 1, justifyContent: 'center', paddingBottom: 12 }, split: { flexDirection: 'row', alignItems: 'center' },
  visual: { width: '100%', maxWidth: 480, alignSelf: 'center' }, copy: { paddingHorizontal: 27, maxWidth: 560, alignSelf: 'center', width: '100%' },
  eyebrow: { color: entry.muted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 18 },
  title: { color: entry.text, fontFamily: 'Inter_800ExtraBold', fontSize: 36, lineHeight: 43 }, accent: { color: entry.violet },
  description: { color: entry.muted, fontSize: 14, lineHeight: 22, marginTop: 18, maxWidth: 390 },
  footer: { width: '100%', maxWidth: 560, alignSelf: 'center' }, dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 7 }, dotTarget: { minWidth: 34, height: 32, alignItems: 'center', justifyContent: 'center' }, dot: { width: 5, height: 5, borderRadius: 4, backgroundColor: '#46506B' }, activeDot: { width: 22, backgroundColor: entry.violet },
  primary: { overflow: 'hidden', borderRadius: 18, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12 }, primaryText: { color: entry.text, fontSize: 15, fontWeight: '700' },
  explore: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, exploreText: { color: entry.muted, fontSize: 12 },
});
