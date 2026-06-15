import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumButton } from './PremiumButton';
import { colors, radius, spacing } from '@/theme/tokens';

export function EmptyState({
  icon = 'musical-notes-outline',
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}><Ionicons name={icon} size={24} color={colors.accent} /></View>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {actionLabel && onAction ? <View style={styles.action}><PremiumButton label={actionLabel} onPress={onAction} variant="secondary" /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  icon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(115,87,198,0.09)' },
  title: { marginTop: spacing.md, color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  text: { marginTop: spacing.sm, maxWidth: 260, color: colors.textSecondary, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  action: { marginTop: spacing.lg, minWidth: 190 },
});
