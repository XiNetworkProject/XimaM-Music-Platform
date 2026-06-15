import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';

type HeaderAction = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

export function AppHeader({
  title,
  subtitle,
  onBack,
  action,
  flush = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: HeaderAction;
  flush?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, flush && styles.flush, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable accessibilityLabel="Retour" onPress={onBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={21} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <Pressable accessibilityLabel={action.label} onPress={action.onPress} style={styles.iconButton}>
            <Ionicons name={action.icon} size={19} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  flush: { paddingHorizontal: 0 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: 2, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
