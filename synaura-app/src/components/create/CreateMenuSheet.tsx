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
  onImportSound: () => void;
  onPublishClip: () => void;
};

export function CreateMenuSheet({ visible, onClose, onCreateWithAI, onImportSound, onPublishClip }: Props) {
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
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.violet}18` }]}>
              <Ionicons name="sparkles" size={20} color={colors.violet} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Créer avec l'IA</Text>
              <Text style={styles.rowText}>Génère un son, des paroles ou un remix</Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color={colors.text} />
          </Pressable>

          <Pressable
            accessibilityLabel="Importer un son"
            onPress={() => press(onImportSound)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.cyan}18` }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.cyan} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Importer un son</Text>
              <Text style={styles.rowText}>Publie un titre depuis ton appareil</Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color={colors.text} />
          </Pressable>

          <Pressable
            accessibilityLabel="Publier un clip"
            onPress={() => press(onPublishClip)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.icon, { backgroundColor: `${colors.coral}18` }]}>
              <Ionicons name="film-outline" size={20} color={colors.coral} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Publier un clip</Text>
              <Text style={styles.rowText}>Video verticale liee a un morceau</Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color={colors.text} />
          </Pressable>

          <View style={[styles.row, styles.rowDisabled]}>
            <View style={[styles.icon, { backgroundColor: `${colors.coral}18` }]}>
              <Ionicons name="create-outline" size={20} color={colors.coral} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Publier un post</Text>
              <Text style={styles.rowText}>Bientôt disponible</Text>
            </View>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Bientôt</Text>
            </View>
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
  row: {
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
  rowDisabled: { opacity: 0.55 },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  rowText: { marginTop: 2, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  soonBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.08)' },
  soonBadgeText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
});

export default CreateMenuSheet;
