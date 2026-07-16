import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Reveal } from '@/components/motion/Motion';
import { colors, radius, spacing } from '@/theme/tokens';

export function DisclosureSection({
  title,
  summary,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const toggle = () => {
    void Haptics.selectionAsync().catch(() => {});
    onToggle();
  };

  return (
    <View style={[styles.section, open && styles.sectionOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Fermer' : 'Ouvrir'} ${title}`}
        onPress={toggle}
        style={styles.header}
      >
        <View style={[styles.icon, open && styles.iconOpen]}>
          <Ionicons name={icon} size={17} color={open ? colors.white : colors.text} />
        </View>
        <View style={styles.copy}>
          <Text maxFontSizeMultiplier={1.2} style={styles.title}>{title}</Text>
          {summary ? <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.summary}>{summary}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
      </Pressable>
      {open ? (
        <Reveal distance={4} duration={180} style={styles.body}>
          {children}
        </Reveal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  sectionOpen: { backgroundColor: colors.surface },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  iconOpen: { backgroundColor: colors.black },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  summary: { marginTop: 3, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  body: {
    gap: spacing.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
