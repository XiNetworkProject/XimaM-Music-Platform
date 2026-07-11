import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, radius } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateWithAI: () => void;
  onPublishTrack: () => void;
  onPublishClip: () => void;
  onCreateVariation: () => void;
};

const SECONDARY_ITEMS = [
  { key: 'track', label: 'Publier un morceau', text: 'Partage un titre que tu as déjà créé.', icon: 'cloud-upload-outline' as const, tint: colors.gold },
  { key: 'clip', label: 'Publier un Clip', text: 'Fais vivre un son avec une vidéo verticale.', icon: 'film-outline' as const, tint: colors.coral },
  { key: 'variation', label: 'Créer une variation', text: 'Transforme un morceau Synaura autorisé.', icon: 'color-wand-outline' as const, tint: colors.cyan },
] as const;

export function CreateMenuSheet({ visible, onClose, onCreateWithAI, onPublishTrack, onPublishClip, onCreateVariation }: Props) {
  const press = (action: () => void) => {
    void Haptics.selectionAsync().catch(() => {});
    action();
  };
  const actions = { track: onPublishTrack, clip: onPublishClip, variation: onCreateVariation };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Créer" subtitle="Choisis le meilleur point de départ pour ton idée." maxHeight="86%">
      <View style={styles.list}>
        <Reveal distance={7}>
          <MotionPressable accessibilityLabel="Créer avec l'IA" onPress={() => press(onCreateWithAI)} style={styles.primaryRow} scaleTo={0.98}>
            <View style={styles.primaryIcon}><Ionicons name="sparkles" size={23} color={colors.white} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.primaryTitle}>Créer avec l'IA</Text>
              <Text style={styles.primaryText}>Pars d’une idée, d’une ambiance ou d’un morceau.</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </MotionPressable>
        </Reveal>

        {SECONDARY_ITEMS.map((item, index) => (
          <Reveal key={item.key} delay={55 + index * 40} distance={6}>
            <MotionPressable accessibilityLabel={item.label} onPress={() => press(actions[item.key])} style={styles.secondaryRow} scaleTo={0.985}>
              <View style={[styles.icon, { backgroundColor: `${item.tint}18` }]}><Ionicons name={item.icon} size={20} color={item.tint} /></View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.label}</Text>
                <Text style={styles.rowText}>{item.text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
            </MotionPressable>
          </Reveal>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  primaryRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: radius.lg, padding: 14, backgroundColor: colors.black },
  primaryIcon: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  primaryTitle: { color: colors.white, fontSize: 16, fontWeight: '900' },
  primaryText: { marginTop: 3, color: 'rgba(255,255,255,0.58)', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  secondaryRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.md, padding: 10, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: colors.border },
  icon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  rowText: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
});

export default CreateMenuSheet;
