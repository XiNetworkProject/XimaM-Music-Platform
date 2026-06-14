import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/tokens';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

export function MobileAnimatedLogo({
  playing = false,
  loading = false,
  size = 46,
  style,
}: {
  playing?: boolean;
  loading?: boolean;
  size?: number;
  style?: ViewStyle;
}) {
  const motion = useRef(new Animated.Value(0)).current;
  const { settings } = useMobileSettings();

  useEffect(() => {
    if (settings.reducedMotion || (!playing && !loading)) {
      motion.stopAnimation();
      Animated.timing(motion, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: loading ? 780 : 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: loading ? 780 : 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [loading, motion, playing, settings.reducedMotion]);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.signal,
          {
            borderRadius: size / 2,
            opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0, 0.34] }),
            transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.28] }) }],
          },
        ]}
      >
        <LinearGradient colors={[colors.coral, colors.pink, colors.violet, colors.cyan]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={[
          styles.logoFrame,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.32),
            transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, playing ? 1.035 : 1.015] }) }],
          },
        ]}
      >
        <Image source={require('../../assets/synaura-symbol-2026.png')} resizeMode="contain" style={{ width: size * 0.84, height: size * 0.84 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  signal: { position: 'absolute', inset: 0, overflow: 'hidden' },
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
});
