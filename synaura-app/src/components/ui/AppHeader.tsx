import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, spacing } from '@/theme/tokens';

type HeaderAction = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

export function AppHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  action,
  flush = false,
  dark = false,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  action?: HeaderAction;
  flush?: boolean;
  dark?: boolean;
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const foreground = dark ? colors.white : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.58)' : colors.textTertiary;
  const buttonStyle = [styles.iconButton, dark && styles.iconButtonDark];

  const press = (callback: () => void) => {
    void Haptics.selectionAsync().catch(() => {});
    callback();
  };

  return (
    <Reveal distance={6} duration={300} style={[styles.root, flush && styles.flush, compact && styles.compact, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {onBack ? (
          <MotionPressable accessibilityLabel="Retour" onPress={() => press(onBack)} style={buttonStyle} scaleTo={0.9}>
            <Ionicons name="chevron-back" size={21} color={foreground} />
          </MotionPressable>
        ) : null}
        <View style={styles.copy}>
          {eyebrow ? <Text numberOfLines={1} style={[styles.eyebrow, { color: dark ? colors.cyan : colors.violet }]}>{eyebrow}</Text> : null}
          <Text numberOfLines={1} style={[styles.title, compact && styles.titleCompact, { color: foreground }]}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <MotionPressable accessibilityLabel={action.label} onPress={() => press(action.onPress)} style={buttonStyle} scaleTo={0.9}>
            <Ionicons name={action.icon} size={19} color={foreground} />
          </MotionPressable>
        ) : null}
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  flush: { paddingHorizontal: 0 },
  compact: { paddingBottom: spacing.sm },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { marginBottom: 2, fontSize: 9, lineHeight: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 23, lineHeight: 28, fontWeight: '900' },
  titleCompact: { fontSize: 19, lineHeight: 23 },
  subtitle: { marginTop: 2, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconButtonDark: { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)' },
});
