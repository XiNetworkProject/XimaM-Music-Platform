import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionPressable } from '@/components/motion/Motion';
import { colors, spacing } from '@/theme/tokens';

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon = 'arrow-forward',
  onAction,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onAction?: () => void;
  dark?: boolean;
}) {
  const foreground = dark ? colors.white : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.58)' : colors.textSecondary;
  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <MotionPressable accessibilityLabel={actionLabel || title} onPress={onAction} style={styles.action} scaleTo={0.94}>
          {actionLabel ? <Text style={[styles.actionLabel, { color: foreground }]}>{actionLabel}</Text> : null}
          <Ionicons name={actionIcon} size={16} color={foreground} />
        </MotionPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 10 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 21, lineHeight: 26, fontWeight: '900' },
  subtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  action: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6 },
  actionLabel: { fontSize: 12, fontWeight: '800' },
});
