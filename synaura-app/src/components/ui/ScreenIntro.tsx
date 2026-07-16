import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, spacing, typography } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

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
  const layout = useResponsiveLayout();
  const foreground = dark ? colors.white : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.62)' : colors.textSecondary;
  return (
    <Reveal distance={8} duration={380} style={[styles.root, layout.isNarrow && styles.rootNarrow]}>
      <View style={styles.copy}>
        {eyebrow ? <View style={styles.eyebrowRow}><View style={[styles.signal, { backgroundColor: dark ? colors.cyan : colors.violet }]} /><Text style={[styles.eyebrow, { color: muted }]}>{eyebrow}</Text></View> : null}
        <Text maxFontSizeMultiplier={1.2} style={[styles.title, layout.isNarrow && styles.titleNarrow, { color: foreground }]}>{title}</Text>
        {description ? <Text maxFontSizeMultiplier={1.25} style={[styles.description, { color: muted }]}>{description}</Text> : null}
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
  rootNarrow: { gap: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  eyebrowRow: { marginBottom: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  signal: { width: 22, height: 2 },
  eyebrow: { fontSize: 10, lineHeight: 13, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: typography.display, lineHeight: 39, fontWeight: '900' },
  titleNarrow: { fontSize: 29, lineHeight: 34 },
  description: { marginTop: 8, maxWidth: 560, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  actionDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' },
});
