import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionPressable } from '@/components/motion/Motion';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

const DEFAULT_PLACEHOLDER = 'Rechercher sur Synaura';

export function SynauraSearchField({
  value,
  onChangeText,
  onSubmit,
  onPress,
  onClear,
  placeholder = DEFAULT_PLACEHOLDER,
  scope = 'Sons, artistes, playlists et clubs',
  autoFocus = false,
  loading = false,
}: {
  value?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  onPress?: () => void;
  onClear?: () => void;
  placeholder?: string;
  scope?: string;
  autoFocus?: boolean;
  loading?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  if (onPress) {
    return (
      <MotionPressable accessibilityRole="button" accessibilityLabel={placeholder} onPress={onPress} style={styles.launcher} scaleTo={0.985}>
        <View style={styles.icon}><Ionicons name="search" size={19} color={colors.cyan} /></View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.launcherTitle}>{placeholder}</Text>
          <Text numberOfLines={1} style={styles.scope}>{scope}</Text>
        </View>
        <View style={styles.open}><Ionicons name="arrow-forward" size={16} color={colors.warmWhite} /></View>
      </MotionPressable>
    );
  }

  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <View style={styles.icon}><Ionicons name="search" size={19} color={focused ? colors.cyan : colors.textSecondary} /></View>
      <TextInput
        autoFocus={autoFocus}
        value={value || ''}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        selectionColor={colors.cyan}
        style={styles.input}
      />
      {loading ? <ActivityIndicator size="small" color={colors.cyan} /> : value ? (
        <Pressable accessibilityLabel="Effacer la recherche" hitSlop={8} onPress={onClear} style={styles.clear}>
          <Ionicons name="close" size={17} color={colors.textSecondary} />
        </Pressable>
      ) : <View style={styles.signal}><View style={styles.signalDot} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  launcher: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, borderLeftWidth: 3, borderLeftColor: colors.cyan, backgroundColor: colors.surfaceStrong, paddingHorizontal: spacing.md, ...shadows.soft },
  field: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, borderLeftWidth: 3, borderLeftColor: colors.violet, backgroundColor: colors.surfaceStrong, paddingHorizontal: spacing.sm },
  fieldFocused: { borderColor: 'rgba(74,158,170,0.64)', borderLeftColor: colors.cyan, backgroundColor: colors.elevatedSurface },
  icon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyanSoft },
  copy: { flex: 1, minWidth: 0 },
  launcherTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  scope: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  open: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingVertical: 0, color: colors.text, fontSize: 14, fontWeight: '800' },
  clear: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  signal: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  signalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cyan },
});
