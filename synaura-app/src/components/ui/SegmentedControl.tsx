import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '@/theme/tokens';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  dark = false,
  compact = false,
  style,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  dark?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.root, dark && styles.rootDark, compact && styles.rootCompact, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Segment
            key={option.value}
            label={option.label}
            icon={option.icon}
            active={active}
            dark={dark}
            compact={compact}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync().catch(() => {});
              onChange(option.value);
            }}
          />
        );
      })}
    </View>
  );
}

function Segment({ label, icon, active, dark, compact, onPress }: { label: string; icon?: React.ComponentProps<typeof Ionicons>['name']; active: boolean; dark: boolean; compact: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, speed: 32, bounciness: 0, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 26, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [active, scale]);
  const activeForeground = dark ? colors.text : colors.white;
  const inactiveForeground = dark ? 'rgba(255,255,255,0.62)' : colors.textSecondary;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.pressable}>
      <Animated.View style={[styles.segment, compact && styles.segmentCompact, active && styles.segmentActive, dark && active && styles.segmentActiveDark, { transform: [{ scale }] }]}>
        {icon ? <Ionicons name={icon} size={compact ? 14 : 15} color={active ? activeForeground : inactiveForeground} /> : null}
        <Text numberOfLines={1} style={[styles.label, compact && styles.labelCompact, { color: active ? activeForeground : inactiveForeground }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, padding: 4, backgroundColor: 'rgba(17,17,17,0.055)', borderWidth: 1, borderColor: colors.border },
  rootDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' },
  rootCompact: { minHeight: 40 },
  pressable: { flex: 1, minWidth: 0 },
  segment: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.sm, paddingHorizontal: 7 },
  segmentCompact: { minHeight: 30 },
  segmentActive: { backgroundColor: colors.black },
  segmentActiveDark: { backgroundColor: colors.white },
  label: { maxWidth: '100%', fontSize: 11, fontWeight: '900' },
  labelCompact: { fontSize: 10 },
});
