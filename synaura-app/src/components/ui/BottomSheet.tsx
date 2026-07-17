import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/motion/Motion';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

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
  const layout = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    dragY.setValue(0);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: settings.reducedMotion ? 0 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dragY, progress, settings.reducedMotion, visible]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 90 || gesture.vy > 1.1) {
        onClose();
        return;
      }
      Animated.spring(dragY, { toValue: 0, speed: 24, bounciness: 2, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, speed: 24, bounciness: 2, useNativeDriver: true }).start();
    },
  }), [dragY, onClose]);

  const hiddenTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [540, 0] });
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={keyboard && Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.66] }) }]} />
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View
          style={[
            styles.sheet,
            layout.isTablet && styles.sheetWide,
            {
              maxHeight,
              width: Math.min(layout.safeWidth, 640),
              paddingBottom: Math.max(insets.bottom, spacing.md),
              transform: [
                { translateX: (insets.left - insets.right) / 2 },
                { translateY: Animated.add(hiddenTranslate, dragY) },
              ],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleZone}><View style={styles.handle} /></View>
          {title ? (
            <View style={styles.header}>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.title}>{title}</Text>
                {subtitle ? <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <MotionPressable accessibilityLabel="Fermer" onPress={onClose} style={styles.close} scaleTo={0.9}>
                <Ionicons name="close" size={20} color={colors.text} />
              </MotionPressable>
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
  dim: { backgroundColor: colors.black },
  sheet: {
    alignSelf: 'center',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#151515',
    ...shadows.floating,
  },
  sheetWide: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handleZone: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 44, height: 4, borderRadius: radius.pill, backgroundColor: 'rgba(247,246,243,0.38)' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900' },
  subtitle: { marginTop: 4, color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  close: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
});
