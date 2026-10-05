import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { completeWelcome } from '@/onboarding/welcomeState';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntryMotionScope, useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { mobile, SoundRoom } from '@/components/mobile/SoundRoom';

const SLIDES = [
  { name: 'L’univers', title: 'Le son nous\nrapproche.', text: 'Écoute. Crée. Rencontre.\nTout commence par une vibration.', icon: 'radio-outline' },
  { name: 'Écouter', title: 'Le prochain son.\nLe prochain frisson.', text: 'Un swipe, un nouvel univers. Réagis au passage qui te touche.', icon: 'musical-notes-outline' },
  { name: 'Créer', title: 'Tes idées ont\nun son.', text: 'Crée avec l’IA ou partage tes morceaux et tes clips. À ta façon.', icon: 'sparkles-outline' },
  { name: 'Se retrouver', title: 'Les bonnes personnes.\nLa même fréquence.', text: 'Découvre les artistes. Discute, partage et crée des liens.', icon: 'people-outline' },
] as const;

export function WelcomeScreen() { return <EntryMotionScope><Welcome /></EntryMotionScope>; }
function Welcome() {
  const navigation = useNavigation<any>();
  const layout = useResponsiveLayout();
  const motion = useEntryMotion();
  const pager = useRef<FlatList>(null);
  const x = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  const [entering, setEntering] = useState(false);
  const stepRef = useRef(step); stepRef.current = step;
  useEffect(() => { x.setValue(stepRef.current * layout.width); pager.current?.scrollToOffset({ offset: stepRef.current * layout.width, animated: false }); }, [layout.width, x]);
  const go = (index: number) => { setStep(index); pager.current?.scrollToOffset({ offset: index * layout.width, animated: motion }); };
  const enter = async (target: 'Tabs' | 'Login' | 'Register') => {
    if (entering) return;
    setEntering(true);
    await completeWelcome().catch(() => {});
    if (target === 'Tabs') navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Swipe' } }] });
    else navigation.navigate(target);
    setEntering(false);
  };
  const compact = layout.isShort || layout.isLandscape;
  const splitLayout = layout.isLandscape && layout.safeWidth >= 600;
  return <SoundRoom>
    <StatusBar style="light" />
    <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(7,10,16,.3)', mobile.bg]} locations={[0, .48, 1]} style={StyleSheet.absoluteFill} />
    <View style={[s.header, { paddingTop: layout.insets.top + 8, paddingHorizontal: layout.gutter + 6 }]}>
      <SynauraMark wordmark size={29} />
      <EntryPressable accessibilityRole="button" onPress={() => void enter('Login')} disabled={entering} style={s.signIn}><Text style={s.signInText}>Connexion</Text><Ionicons name="arrow-up-outline" size={16} color={mobile.text} style={{ transform: [{ rotate: '45deg' }] }} /></EntryPressable>
    </View>
    <Animated.FlatList ref={pager} data={SLIDES} horizontal pagingEnabled bounces={false} keyExtractor={item => item.name} showsHorizontalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: layout.width, offset: layout.width * index, index })}
      extraData={step + ':' + layout.width + ':' + layout.height}
      scrollEventThrottle={16} onScroll={motion ? Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true }) : undefined}
      onMomentumScrollEnd={event => setStep(Math.max(0, Math.min(3, Math.round(event.nativeEvent.contentOffset.x / layout.width))))}
      renderItem={({ item, index }) => <ScrollView style={{ width: layout.width }} contentContainerStyle={[s.page, { paddingHorizontal: layout.gutter + 10, minHeight: Math.max(splitLayout ? 190 : 260, layout.height - layout.insets.top - layout.insets.bottom - 254) }, splitLayout && { flexDirection: 'row', alignItems: 'center', gap: 28 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.scene, { minHeight: compact ? 90 : 230 }, splitLayout && { width: '36%', flex: 0 }, motion && { opacity: x.interpolate({ inputRange: [(index - 1) * layout.width, index * layout.width, (index + 1) * layout.width], outputRange: [.15, 1, .15], extrapolate: 'clamp' }), transform: [{ translateX: x.interpolate({ inputRange: [(index - 1) * layout.width, index * layout.width, (index + 1) * layout.width], outputRange: [-55, 0, 55], extrapolate: 'clamp' }) }] }]}>
          {index === 0 ? <SynauraMark size={compact ? 70 : 108} color="#DCF3FF" /> : <View style={s.symbol}><Ionicons name={item.icon} size={compact ? 37 : 54} color="#DBEDFF" /></View>}
          {!compact ? <Text style={s.sceneCaption}>MUSIQUE · CRÉATION · RENCONTRES</Text> : null}
        </Animated.View>
        <View style={[s.copy, splitLayout && { width: '58%' }]}>
          <Text style={s.eyebrow}>0{index + 1} / {item.name.toUpperCase()}</Text>
          <Text accessibilityRole="header" style={[s.title, compact && { fontSize: 32, lineHeight: 38 }]}>{item.title}</Text>
          <Text style={s.description}>{item.text}</Text>
        </View>
      </ScrollView>} />
    <View style={[s.footer, { paddingHorizontal: layout.gutter + 10, paddingBottom: Math.max(layout.insets.bottom, 8) }]}>
      <View style={s.steps}>{SLIDES.map((item, index) => <EntryPressable key={item.name} accessibilityRole="tab" accessibilityLabel={item.name} accessibilityState={{ selected: index === step }} onPress={() => go(index)} style={s.step}><View style={[s.line, index === step && s.lineActive]} /></EntryPressable>)}<Text style={s.pageNumber}>0{step + 1} / 04</Text></View>
      <View style={s.buttons}>
        {step > 0 ? <EntryPressable accessibilityRole="button" accessibilityLabel="Présentation précédente" onPress={() => go(step - 1)} style={s.back}><Ionicons name="arrow-back" size={20} color={mobile.text} /></EntryPressable> : null}
        <EntryPressable accessibilityRole="button" disabled={entering} onPress={() => step === 3 ? void enter('Register') : go(step + 1)} style={s.primary}><Text style={s.primaryText}>{step === 3 ? 'Créer mon compte' : step === 0 ? 'Entrer dans l’univers' : 'Continuer'}</Text><Ionicons name="arrow-forward" size={20} color={mobile.bg} /></EntryPressable>
      </View>
      <EntryPressable accessibilityRole="button" disabled={entering} onPress={() => void enter('Tabs')} style={s.guest}><Text style={s.guestText}>Explorer sans compte</Text></EntryPressable>
    </View>
  </SoundRoom>;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }, signIn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, signInText: { color: mobile.text, fontSize: 13 },
  page: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 8 }, scene: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 }, sceneCaption: { color: '#B0BFDA', fontSize: 8, letterSpacing: 2.5 }, symbol: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 38, backgroundColor: 'rgba(134,167,235,.08)' },
  copy: { width: '100%', maxWidth: 560, alignSelf: 'center' }, eyebrow: { color: mobile.blue, fontSize: 10, letterSpacing: 1.8, marginBottom: 17 }, title: { color: mobile.text, fontFamily: 'Inter_600SemiBold', fontSize: 41, lineHeight: 47 }, description: { color: mobile.muted, fontSize: 15, lineHeight: 23, marginTop: 17, maxWidth: 400 },
  footer: { width: '100%', maxWidth: 610, alignSelf: 'center' }, steps: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, step: { flex: 1, minHeight: 44, justifyContent: 'center' }, line: { height: 2, backgroundColor: '#283144' }, lineActive: { backgroundColor: mobile.blue }, pageNumber: { color: mobile.faint, marginLeft: 16, fontSize: 10 }, buttons: { flexDirection: 'row', gap: 10 }, primary: { flex: 1, minHeight: 56, borderRadius: 18, backgroundColor: '#E6F1FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 21, gap: 10 }, primaryText: { color: mobile.bg, fontSize: 14, fontWeight: '700', flexShrink: 1 }, back: { width: 54, minHeight: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: mobile.surface, borderRadius: 18 }, guest: { minHeight: 46, alignItems: 'center', justifyContent: 'center' }, guestText: { color: mobile.muted, fontSize: 12 },
});
