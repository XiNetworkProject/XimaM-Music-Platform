import React from 'react';
import { StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

export function SoftCard({ children, style, elevated = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; elevated?: boolean }) {
  return <View style={[styles.root, elevated && shadows.soft, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
});
