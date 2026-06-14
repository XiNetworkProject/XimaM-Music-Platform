import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const heights = [0.35, 0.72, 0.48, 0.92, 0.58, 0.78, 0.42, 0.88, 0.54, 0.68, 0.38, 0.8];

export function MobileWaveform({ active, dark = false, compact = false, style }: { active: boolean; dark?: boolean; compact?: boolean; style?: ViewStyle }) {
  const motion = useRef(new Animated.Value(0)).current;
  const { settings } = useMobileSettings();
  const bars = useMemo(() => compact ? heights.slice(0, 8) : heights, [compact]);

  useEffect(() => {
    if (!active || settings.reducedMotion) {
      motion.stopAnimation();
      Animated.timing(motion, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, motion, settings.reducedMotion]);

  return (
    <View style={[styles.row, { height: compact ? 14 : 20 }, style]}>
      {bars.map((height, index) => (
        <Animated.View
          key={`${height}-${index}`}
          style={[
            styles.bar,
            {
              backgroundColor: dark ? 'rgba(255,249,239,0.74)' : index % 3 === 0 ? colors.violet : index % 3 === 1 ? colors.pink : colors.cyan,
              height: `${Math.round(height * 100)}%`,
              transform: [{
                scaleY: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.58 + (index % 3) * 0.08, 0.86 + ((index + 1) % 4) * 0.1],
                }),
              }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { width: 3, minHeight: 3, borderRadius: 2 },
});
