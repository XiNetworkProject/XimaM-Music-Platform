import React, { useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useMobileSettings, type MobileSettings } from '@/settings/MobileSettingsProvider';
import { entry } from '@/theme/entry';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useSheetDrag } from './useSheetDrag';

const OPTIONS: { key: 'dynamicBackground' | 'coverVideos' | 'reducedMotion'; icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { key: 'dynamicBackground', icon: 'color-palette-outline', title: 'L’ambiance du morceau', text: 'Couleurs de la pochette, lumière et particules.' },
  { key: 'coverVideos', icon: 'aperture-outline', title: 'Pochettes animées', text: 'Quand l’artiste en a ajouté une.' },
  { key: 'reducedMotion', icon: 'leaf-outline', title: 'Version calme', text: 'Garde les couleurs, limite les mouvements.' },
];
export function LiveAmbienceSheet({ visible, onClose, onSearch }: { visible: boolean; onClose: () => void; onSearch: () => void }) {
  const layout = useResponsiveLayout();
  const { settings, updateSettings } = useMobileSettings();
  const [error, setError] = useState('');
  const drag = useSheetDrag(visible, onClose);
  const update = async (key: keyof MobileSettings, value: boolean) => {
    setError('');
    try { await updateSettings({ [key]: value }); } catch { setError('Appliqué pour cette session, mais non enregistré sur ce téléphone.'); }
  };
  return <Modal visible={visible} transparent statusBarTranslucent animationType={settings.reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable accessibilityLabel="Fermer les réglages Live" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View accessibilityViewIsModal style={[styles.sheet, { marginLeft: layout.overlayLeftInset, marginRight: layout.overlayRightInset, maxHeight: layout.height - layout.insets.top - 20, paddingBottom: Math.max(16, layout.insets.bottom), transform: drag.transform }]}>
        <View {...drag.panHandlers} style={{ height: 34 }}><View style={styles.grip} /></View><View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>À TON RYTHME</Text><Text accessibilityRole="header" style={styles.title}>Ton Live, ton ambiance.</Text></View><EntryPressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.close}><Ionicons name="close" color={entry.text} size={22} /></EntryPressable></View>
        <ScrollView contentContainerStyle={styles.content}>
          {OPTIONS.map(option => <View key={option.key} style={styles.option}><View style={styles.optionIcon}><Ionicons name={option.icon} size={23} color={entry.violet} /></View><View style={{ flex: 1 }}><Text style={styles.label}>{option.title}</Text><Text style={styles.description}>{option.text}</Text></View><Switch accessibilityLabel={option.title} value={settings[option.key]} onValueChange={value => void update(option.key, value)} trackColor={{ false: '#353B50', true: '#7060AC' }} thumbColor={settings[option.key] ? '#E6DBFF' : '#BDC2D6'} /></View>)}
          {settings.dataSaver ? <Text style={styles.description}>L’économiseur de données suspend les animations.</Text> : null}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.description}>{error}</Text> : null}
          <EntryPressable accessibilityRole="button" onPress={() => { onClose(); onSearch(); }} style={styles.search}><Ionicons name="search-outline" color={entry.text} size={21} /><Text style={styles.label}>Rechercher un son, un artiste</Text><Ionicons name="arrow-forward" color={entry.muted} size={17} /></EntryPressable>
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,3,8,.45)' }, sheet: { backgroundColor: '#111521', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }, grip: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#4A4D63', alignSelf: 'center', marginTop: 12, marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 16 }, eyebrow: { color: entry.violet, fontSize: 9, letterSpacing: 1.8, marginBottom: 8 }, title: { color: entry.text, fontSize: 23, lineHeight: 29, fontFamily: 'Inter_600SemiBold' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: 22, paddingBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 17 }, optionIcon: { width: 38, height: 42, justifyContent: 'center' }, label: { color: entry.text, fontSize: 14, fontWeight: '600', flexShrink: 1 }, description: { color: entry.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, search: { marginTop: 16, borderRadius: 18, padding: 16, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1D2234' },
});
