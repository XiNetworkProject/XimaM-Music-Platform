import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionPressable } from '@/components/motion/Motion';
import { colors, radius, spacing } from '@/theme/tokens';

export function PremiumButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}) {
  const foreground = variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.text;
  return (
    <MotionPressable
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.root, styles[variant]]}
      scaleTo={0.97}
    >
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={17} color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.black },
  secondary: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  danger: { backgroundColor: 'rgba(217,45,32,0.08)' },
  label: { fontSize: 13, fontWeight: '900' },
});
