import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SoundRoom } from '@/components/mobile/SoundRoom';
import { CollectionReveal, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export type CreationActions = { onCreateWithAI: () => void; onPublishTrack: () => void; onPublishClip: () => void; onCreatePost: () => void; onCreateVariation: () => void };
export function CreationLaunchpad(props: CreationActions) {
  const p = useCollectionPalette();
  const layout = useResponsiveLayout();
  const choices = [
    { title: 'Un morceau', detail: 'Importer ton audio', icon: 'cloud-upload-outline' as const, action: props.onPublishTrack },
    { title: 'Un clip', detail: 'Partager ta vidéo', icon: 'film-outline' as const, action: props.onPublishClip },
    { title: 'Un post', detail: 'Texte, image ou son', icon: 'create-outline' as const, action: props.onCreatePost },
    { title: 'Une variation', detail: 'Réinventer un son', icon: 'repeat-outline' as const, action: props.onCreateVariation },
  ];
  return <View style={{ gap: 14 }}>
    <CollectionReveal><EntryPressable accessibilityRole="button" accessibilityLabel="Ouvrir le Studio IA" onPress={props.onCreateWithAI} style={s.hero}>
      <SoundRoom quiet><View style={s.heroContent}><View style={s.heroTop}><Text style={s.kicker}>STUDIO IA</Text><Ionicons name="sparkles-outline" size={25} color="#B9DFFF" /></View><Text style={s.title}>Tu l’imagines.{'\n'}Tu le crées.</Text><View style={s.heroBottom}><Text style={s.heroAction}>Composer un morceau</Text><Ionicons name="arrow-forward" size={22} color="#DDEEFF" /></View></View></SoundRoom>
    </EntryPressable></CollectionReveal>
    <View style={s.grid}>{choices.map(choice => <EntryPressable key={choice.title} accessibilityRole="button" onPress={choice.action} style={[s.choice, { width: layout.isNarrow || layout.hasLargeText ? '100%' : '48%', backgroundColor: p.surface }]}>
      <Ionicons name={choice.icon} size={25} color={p.blue} /><View style={{ flex: 1, minWidth: 0 }}><Text style={[s.choiceTitle, { color: p.text }]}>{choice.title}</Text><Text style={[s.choiceDetail, { color: p.muted }]}>{choice.detail}</Text></View>
    </EntryPressable>)}</View>
  </View>;
}
const s = StyleSheet.create({
  hero: { borderRadius: 25, overflow: 'hidden' }, heroContent: { padding: 22, minHeight: 218, justifyContent: 'space-between', gap: 20 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, kicker: { color: '#B9DFFF', fontSize: 10, letterSpacing: 2, fontWeight: '800' }, title: { fontSize: 29, lineHeight: 34, fontWeight: '800', color: '#F5F7FC' }, heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroAction: { color: '#DDEEFF', fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, choice: { minHeight: 116, borderRadius: 20, padding: 17, gap: 13 }, choiceTitle: { fontSize: 15, fontWeight: '700' }, choiceDetail: { fontSize: 11, lineHeight: 17, marginTop: 5 },
});
