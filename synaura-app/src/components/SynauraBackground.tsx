import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { usePlayer } from '@/player/PlayerProvider';

type Variant = 'warm' | 'feed' | 'dark';

type Props = {
  children?: React.ReactNode;
  variant?: Variant;
  showGrid?: boolean;
  animated?: boolean;
};

const VARIANTS = {
  warm: {
    base: '#F7F6F3',
    line: '#C9C5BF',
    coralOpacity: 0.055,
    violetOpacity: 0.05,
    cyanOpacity: 0.035,
    trackOpacity: 0.032,
  },
  feed: {
    base: '#F7F6F3',
    line: '#D2CEC8',
    coralOpacity: 0.025,
    violetOpacity: 0.026,
    cyanOpacity: 0.02,
    trackOpacity: 0.022,
  },
  dark: {
    base: '#111111',
    line: '#3B3835',
    coralOpacity: 0.095,
    violetOpacity: 0.11,
    cyanOpacity: 0.075,
    trackOpacity: 0.07,
  },
} as const;

export function SynauraBackground({ children, variant = 'warm', showGrid = false, animated = true }: Props) {
  const palette = VARIANTS[variant];
  const { width, height } = useWindowDimensions();
  const { settings } = useMobileSettings();
  const player = usePlayer();
  const drift = useRef(new Animated.Value(0)).current;
  const w = Math.max(360, Math.round(width));
  const h = Math.max(640, Math.round(height));
  const activeTones = ['#7357C6', '#4A9EAA', '#D96D63', '#C99B48', '#C85D82'];
  const activeKey = player.current?._id || player.current?.title || '';
  const activeTone = activeTones[Array.from(activeKey).reduce((sum, char) => sum + char.charCodeAt(0), 0) % activeTones.length];
  const dynamic = Boolean(player.current && settings.dynamicBackground);

  useEffect(() => {
    if (!animated || settings.reducedMotion || !settings.dynamicBackground) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, drift, settings.dynamicBackground, settings.reducedMotion]);

  return (
    <View pointerEvents={children ? 'auto' : 'none'} style={[styles.root, !children && styles.backdrop, { backgroundColor: palette.base }]}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="synaura-top" x1="0" y1="0" x2={w} y2={h * 0.72} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#D96D63" stopOpacity={palette.coralOpacity} />
            <Stop offset="0.46" stopColor={palette.base} stopOpacity={0} />
            <Stop offset="1" stopColor="#7357C6" stopOpacity={palette.violetOpacity} />
          </LinearGradient>
          <LinearGradient id="synaura-bottom" x1={w} y1={h} x2={w * 0.18} y2={h * 0.36} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#4A9EAA" stopOpacity={palette.cyanOpacity} />
            <Stop offset="0.78" stopColor={palette.base} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="synaura-track" x1="0" y1={h * 0.55} x2={w} y2={h * 0.48} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.base} stopOpacity={0} />
            <Stop offset="0.5" stopColor={activeTone} stopOpacity={dynamic ? palette.trackOpacity : 0} />
            <Stop offset="1" stopColor={palette.base} stopOpacity={0} />
          </LinearGradient>
          {showGrid ? (
            <Pattern id="synaura-grid" x={0} y={0} width={36} height={36} patternUnits="userSpaceOnUse">
              <Path d="M0 0 H36 M0 0 V36" stroke={palette.line} strokeWidth={0.7} opacity={0.32} />
            </Pattern>
          ) : null}
          <Pattern id="synaura-grain" x={0} y={0} width={22} height={22} patternUnits="userSpaceOnUse">
            <Path d="M3 4h.7M14 9h.6M8 18h.5M19 3h.4" stroke={palette.line} strokeWidth={1} opacity={0.25} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill="url(#synaura-top)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#synaura-bottom)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#synaura-track)" />
        {showGrid ? <Rect x={0} y={0} width={w} height={h} fill="url(#synaura-grid)" /> : null}
        <Rect x={0} y={0} width={w} height={h} fill="url(#synaura-grain)" opacity={variant === 'dark' ? 0.13 : 0.08} />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.waveField,
          {
            opacity: settings.dynamicBackground ? drift.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.42] }) : 0.16,
            transform: [
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 14] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [7, -8] }) },
            ],
          },
        ]}
      >
        <Svg width={w + 64} height={h} viewBox={`0 0 ${w + 64} ${h}`} preserveAspectRatio="none">
          <Path d={`M-32 ${h * 0.29} C ${w * 0.2} ${h * 0.25}, ${w * 0.34} ${h * 0.37}, ${w * 0.55} ${h * 0.31} S ${w * 0.84} ${h * 0.24}, ${w + 48} ${h * 0.35}`} fill="none" stroke="#7357C6" strokeWidth={1} opacity={variant === 'dark' ? 0.2 : 0.1} />
          <Path d={`M-24 ${h * 0.72} C ${w * 0.17} ${h * 0.65}, ${w * 0.42} ${h * 0.79}, ${w * 0.64} ${h * 0.69} S ${w * 0.88} ${h * 0.65}, ${w + 42} ${h * 0.75}`} fill="none" stroke="#4A9EAA" strokeWidth={1} opacity={variant === 'dark' ? 0.18 : 0.09} />
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  waveField: { ...StyleSheet.absoluteFillObject },
});
