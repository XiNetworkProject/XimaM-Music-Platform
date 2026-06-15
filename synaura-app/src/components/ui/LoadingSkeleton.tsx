import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export function LoadingSkeleton({ rows = 4, style }: { rows?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.38)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.38, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: rows }).map((_, index) => (
        <Animated.View key={index} style={[styles.row, { opacity }]}>
          <View style={styles.cover} />
          <View style={styles.copy}><View style={styles.lineWide} /><View style={styles.lineShort} /></View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.sm },
  cover: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: '#E8E6E2' },
  copy: { flex: 1, gap: spacing.sm },
  lineWide: { width: '72%', height: 11, borderRadius: 6, backgroundColor: '#E8E6E2' },
  lineShort: { width: '42%', height: 9, borderRadius: 5, backgroundColor: '#EFEDE9' },
});
