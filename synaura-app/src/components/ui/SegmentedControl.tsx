import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

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
  const layout = useResponsiveLayout();
  const effectiveCompact = compact || layout.isNarrow;
  const scrollable = (!layout.isTablet && options.length > 4)
    || (layout.isNarrow && options.length > 3)
    || (layout.hasVeryLargeText && options.length > 2);
  const segments = options.map((option) => {
    const active = option.value === value;
    return (
      <Segment
        key={option.value}
        label={option.label}
        icon={option.icon}
        active={active}
        dark={dark}
        compact={effectiveCompact}
        hideIcon={layout.isNarrow && options.length > 3}
        dense={!scrollable && (options.length > 4 || (layout.isNarrow && options.length > 3))}
        scrollable={scrollable}
        onPress={() => {
          if (active) return;
          void Haptics.selectionAsync().catch(() => {});
          onChange(option.value);
        }}
      />
    );
  });

  return (
    <View style={[styles.root, !scrollable && (options.length > 4 || layout.isNarrow) && styles.rootDense, scrollable && styles.rootScrollable, dark && styles.rootDark, effectiveCompact && styles.rootCompact, style]}>
      {scrollable ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {segments}
        </ScrollView>
      ) : segments}
    </View>
  );
}

function Segment({ label, icon, active, dark, compact, hideIcon, dense, scrollable, onPress }: { label: string; icon?: React.ComponentProps<typeof Ionicons>['name']; active: boolean; dark: boolean; compact: boolean; hideIcon: boolean; dense: boolean; scrollable: boolean; onPress: () => void }) {
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
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.pressable, scrollable && styles.pressableScrollable]}>
      <Animated.View style={[styles.segment, compact && styles.segmentCompact, dense && styles.segmentDense, active && styles.segmentActive, dark && active && styles.segmentActiveDark, { transform: [{ scale }] }]}>
        {icon && !hideIcon ? <Ionicons name={icon} size={compact ? 14 : 15} color={active ? activeForeground : inactiveForeground} /> : null}
        <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.label, compact && styles.labelCompact, dense && styles.labelDense, { color: active ? activeForeground : inactiveForeground }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.md, padding: 4, backgroundColor: 'rgba(17,17,17,0.055)', borderWidth: 1, borderColor: colors.border },
  rootDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' },
  rootCompact: { minHeight: 40 },
  rootDense: { gap: 2, padding: 3 },
  rootScrollable: { padding: 0, overflow: 'hidden' },
  scrollContent: { minWidth: '100%', alignItems: 'center', gap: 3, padding: 3 },
  pressable: { flex: 1, minWidth: 0 },
  pressableScrollable: { flex: 0, minWidth: 88 },
  segment: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.sm, paddingHorizontal: 7 },
  segmentCompact: { minHeight: 30 },
  segmentDense: { gap: 2, paddingHorizontal: 3 },
  segmentActive: { backgroundColor: colors.black },
  segmentActiveDark: { backgroundColor: colors.white },
  label: { maxWidth: '100%', fontSize: 11, fontWeight: '900' },
  labelCompact: { fontSize: 10 },
  labelDense: { fontSize: 9 },
});
