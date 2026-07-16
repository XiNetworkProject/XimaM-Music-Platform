import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, spacing } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type HeaderAction = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  badge?: number;
};

export function AppHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  action,
  actions,
  flush = false,
  dark = false,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  action?: HeaderAction;
  actions?: HeaderAction[];
  flush?: boolean;
  dark?: boolean;
  compact?: boolean;
}) {
  const layout = useResponsiveLayout();
  const foreground = dark ? colors.white : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.58)' : colors.textTertiary;
  const buttonStyle = [styles.iconButton, dark && styles.iconButtonDark];

  const press = (callback: () => void) => {
    void Haptics.selectionAsync().catch(() => {});
    callback();
  };

  return (
    <Reveal
      distance={6}
      duration={300}
      style={[
        styles.root,
        !flush && layout.contentFrame,
        flush && styles.flush,
        compact && styles.compact,
        {
          paddingLeft: flush ? 0 : layout.pagePaddingLeft,
          paddingRight: flush ? 0 : layout.pagePaddingRight,
          paddingTop: layout.insets.top + spacing.sm,
        },
      ]}
    >
      <View style={[styles.row, layout.isNarrow && styles.rowNarrow]}>
        {onBack ? (
          <MotionPressable accessibilityLabel="Retour" onPress={() => press(onBack)} style={buttonStyle} scaleTo={0.9}>
            <Ionicons name="chevron-back" size={21} color={foreground} />
          </MotionPressable>
        ) : null}
        <View style={styles.copy}>
          {eyebrow ? (
            <View style={styles.eyebrowRow}>
              <View style={[styles.eyebrowSignal, { backgroundColor: dark ? colors.cyan : colors.violet }]} />
              <Text numberOfLines={1} style={[styles.eyebrow, { color: muted }]}>{eyebrow}</Text>
            </View>
          ) : null}
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.title, layout.isNarrow && styles.titleNarrow, compact && styles.titleCompact, { color: foreground }]}>{title}</Text>
          {subtitle ? <Text maxFontSizeMultiplier={1.2} numberOfLines={layout.isNarrow ? 2 : 1} style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}
        </View>
        {action || actions?.length ? (
          <View style={styles.actions}>
            {(actions?.length ? actions : action ? [action] : []).map((item) => (
              <MotionPressable key={item.label} accessibilityLabel={item.label} onPress={() => press(item.onPress)} style={buttonStyle} scaleTo={0.9}>
                <Ionicons name={item.icon} size={19} color={foreground} />
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                  </View>
                ) : null}
              </MotionPressable>
            ))}
          </View>
        ) : null}
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  flush: { paddingHorizontal: 0 },
  compact: { paddingBottom: spacing.sm },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowNarrow: { gap: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  eyebrowRow: { marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowSignal: { width: 18, height: 2 },
  eyebrow: { flexShrink: 1, fontSize: 9, lineHeight: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 27, lineHeight: 31, fontWeight: '900' },
  titleNarrow: { fontSize: 24, lineHeight: 28 },
  titleCompact: { fontSize: 21, lineHeight: 25 },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.56)',
  },
  iconButtonDark: { borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.07)' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.background },
  badgeText: { color: colors.paper, fontSize: 8, lineHeight: 10, fontWeight: '900' },
});
