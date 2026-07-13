import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MotionPressable } from '@/components/motion/Motion';
import { colors, radius, spacing } from '@/theme/tokens';

export type SelectionSheetOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  badge?: string;
  disabled?: boolean;
};

export function SelectionSheet<T extends string>({
  visible,
  title,
  subtitle,
  value,
  options,
  onChange,
  onClose,
  onDisabledPress,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: T;
  options: SelectionSheetOption<T>[];
  onChange: (value: T) => void;
  onClose: () => void;
  onDisabledPress?: (value: T) => void;
}) {
  return (
    <BottomSheet visible={visible} title={title} subtitle={subtitle} onClose={onClose} maxHeight="84%">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <MotionPressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: option.disabled }}
              onPress={() => {
                if (option.disabled) {
                  onDisabledPress?.(option.value);
                  return;
                }
                onChange(option.value);
                onClose();
              }}
              style={[styles.option, selected && styles.optionSelected, option.disabled && styles.optionDisabled]}
              scaleTo={0.99}
            >
              <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                <Ionicons name={option.icon || 'options-outline'} size={18} color={selected ? colors.white : colors.text} />
              </View>
              <View style={styles.optionCopy}>
                <View style={styles.optionTitleRow}>
                  <Text maxFontSizeMultiplier={1.2} style={styles.optionTitle}>{option.label}</Text>
                  {option.badge ? <Text style={styles.badge}>{option.badge}</Text> : null}
                </View>
                {option.description ? <Text maxFontSizeMultiplier={1.2} style={styles.optionDescription}>{option.description}</Text> : null}
              </View>
              {option.disabled ? (
                <Ionicons name="lock-closed" size={16} color={colors.textTertiary} />
              ) : (
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
                </View>
              )}
            </MotionPressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2, padding: spacing.md, paddingBottom: spacing.xl },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: { backgroundColor: colors.violetSoft, borderColor: 'rgba(115,87,198,0.18)' },
  optionDisabled: { opacity: 0.55 },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  optionIconSelected: { backgroundColor: colors.violet },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  optionTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  optionDescription: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  badge: { color: colors.violet, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong },
  radioSelected: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet, borderColor: colors.violet },
});
