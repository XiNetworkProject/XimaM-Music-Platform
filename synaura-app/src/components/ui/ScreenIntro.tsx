import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, spacing, typography } from '@/theme/tokens';

export function ScreenIntro({
  eyebrow,
  title,
  description,
  action,
  trailing,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void };
  trailing?: React.ReactNode;
  dark?: boolean;
}) {
  const foreground = dark ? colors.white : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.62)' : colors.textSecondary;
  return (
    <Reveal distance={8} duration={380} style={styles.root}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: dark ? colors.cyan : colors.violet }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: foreground }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: muted }]}>{description}</Text> : null}
      </View>
      {trailing || (action ? (
        <MotionPressable accessibilityLabel={action.label} onPress={action.onPress} style={[styles.action, dark && styles.actionDark]} scaleTo={0.92}>
          <Ionicons name={action.icon} size={19} color={foreground} />
        </MotionPressable>
      ) : null)}
    </Reveal>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { marginBottom: 5, fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: typography.display, lineHeight: 35, fontWeight: '900' },
  description: { marginTop: 6, maxWidth: 560, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  action: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' },
});
