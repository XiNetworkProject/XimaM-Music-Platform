import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateWithAI: () => void;
  onPublishTrack: () => void;
  onPublishClip: () => void;
  onCreateVariation: () => void;
};

const SECONDARY_ITEMS = [
  {
    key: 'track',
    label: 'Publier un morceau',
    text: 'Partage un titre que tu as déjà créé.',
    icon: 'cloud-upload-outline' as const,
    tint: colors.gold,
  },
  {
    key: 'clip',
    label: 'Publier un Clip',
    text: 'Fais vivre un son avec une vidéo verticale.',
    icon: 'film-outline' as const,
    tint: colors.coral,
  },
  {
    key: 'variation',
    label: 'Créer une variation',
    text: 'Transforme un morceau Synaura autorisé.',
    icon: 'color-wand-outline' as const,
    tint: colors.cyan,
  },
] as const;

export function CreateMenuSheet({ visible, onClose, onCreateWithAI, onPublishTrack, onPublishClip, onCreateVariation }: Props) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [slide, visible]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });

  const press = (action: () => void) => {
    void Haptics.selectionAsync().catch(() => {});
    action();
  };

  const secondaryActions: Record<(typeof SECONDARY_ITEMS)[number]['key'], () => void> = {
    track: onPublishTrack,
    clip: onPublishClip,
    variation: onCreateVariation,
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,10,14,0.55)', opacity: slide }]}>
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
      >
        <View style={styles.handleArea}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Créer</Text>
            <Text style={styles.title}>Qu'est-ce qu'on fait ?</Text>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.list}>
          <Pressable
            accessibilityLabel="Créer avec l'IA"
            onPress={() => press(onCreateWithAI)}
            style={({ pressed }) => [styles.primaryRow, pressed && styles.rowPressed]}
          >
            <View style={[styles.primaryIcon, { backgroundColor: `${colors.violet}22` }]}>
              <Ionicons name="sparkles" size={24} color={colors.violet} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.primaryTitle}>Créer avec l'IA</Text>
              <Text style={styles.rowText}>Imagine un morceau à partir d'une idée.</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.violet} />
          </Pressable>

          <View style={styles.secondaryGrid}>
            {SECONDARY_ITEMS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityLabel={item.label}
                onPress={() => press(secondaryActions[item.key])}
                style={({ pressed }) => [styles.secondaryRow, pressed && styles.rowPressed]}
              >
                <View style={[styles.icon, { backgroundColor: `${item.tint}18` }]}>
                  <Ionicons name={item.icon} size={19} color={item.tint} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowText}>{item.text}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  kicker: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: `${colors.violet}0F`,
    borderWidth: 1,
    borderColor: `${colors.violet}30`,
  },
  primaryIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  primaryTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  secondaryGrid: { gap: 8 },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  rowText: { marginTop: 2, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
});

export default CreateMenuSheet;
