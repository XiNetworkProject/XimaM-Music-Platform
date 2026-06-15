import React, { useEffect, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  keyboard = false,
  maxHeight = '88%',
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  keyboard?: boolean;
  maxHeight?: `${number}%` | number;
}) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: visible ? 1 : 0, duration: 210, useNativeDriver: true }).start();
  }, [progress, visible]);
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={keyboard && Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: progress }]} />
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.sheet, { maxHeight, paddingBottom: Math.max(insets.bottom, spacing.md), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.title}>{title}</Text>
                {subtitle ? <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.close}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(17,17,17,0.38)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    ...shadows.floating,
  },
  handle: { width: 40, height: 4, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.borderStrong },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.05)' },
});
