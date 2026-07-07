import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, Pattern, Path } from 'react-native-svg';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { usePlayer } from '@/player/PlayerProvider';

type Variant = 'warm' | 'feed' | 'dark';

type Props = {
  children?: React.ReactNode;
  variant?: Variant;
  showGrid?: boolean;
  animated?: boolean;
};

const VARIANTS: Record<Variant, {
  base: string;
  paper: string;
  paperDark: string;
  coral: string;
  violet: string;
  cyan: string;
  gridLine: string;
  coralAlpha: number;
  violetAlpha: number;
  cyanAlpha: number;
}> = {
  warm: {
    base: '#F7F6F3',
    paper: '#FFFFFF',
    paperDark: '#EEECE8',
    coral: '#D96D63',
    violet: '#7357C6',
    cyan: '#4A9EAA',
    gridLine: '#D8D5D0',
    coralAlpha: 0.055,
    violetAlpha: 0.05,
    cyanAlpha: 0.035,
  },
  feed: {
    base: '#F7F6F3',
    paper: '#FFFFFF',
    paperDark: '#EEECE8',
    coral: '#D96D63',
    violet: '#7357C6',
    cyan: '#4A9EAA',
    gridLine: '#D8D5D0',
    coralAlpha: 0.025,
    violetAlpha: 0.025,
    cyanAlpha: 0.02,
  },
  dark: {
    base: '#0D0A0E',
    paper: '#171313',
    paperDark: '#0A070C',
    coral: '#D96D63',
    violet: '#7357C6',
    cyan: '#4A9EAA',
    gridLine: '#1F1A1C',
    coralAlpha: 0.16,
    violetAlpha: 0.18,
    cyanAlpha: 0.10,
  },
};

/**
 * Fond Synaura cale sur la version web (`SynauraWarmFeed`):
 * - couleur paper #F4EFE6
 * - 3 radial gradients diffus (corail / violet / cyan)
 * - 2 blobs lumineux (corail haut-gauche + violet haut-droit)
 * - grille fine 34px
 */
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

  useEffect(() => {
    if (!animated || settings.reducedMotion || !settings.dynamicBackground) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, drift, settings.dynamicBackground, settings.reducedMotion]);

  return (
    <View pointerEvents={children ? 'auto' : 'none'} style={[styles.root, !children && styles.backdrop, { backgroundColor: palette.base }]}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* haut-gauche : corail */}
          <RadialGradient id="g-coral" cx={0.08 * w} cy={0} r={0.62 * Math.max(w, h)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.coral} stopOpacity={palette.coralAlpha} />
            <Stop offset="0.55" stopColor={palette.coral} stopOpacity={0} />
          </RadialGradient>
          {/* haut-droit : violet */}
          <RadialGradient id="g-violet" cx={0.94 * w} cy={0.04 * h} r={0.66 * Math.max(w, h)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.violet} stopOpacity={palette.violetAlpha} />
            <Stop offset="0.5" stopColor={palette.violet} stopOpacity={0} />
          </RadialGradient>
          {/* bas : cyan */}
          <RadialGradient id="g-cyan" cx={0.6 * w} cy={1.0 * h} r={0.78 * Math.max(w, h)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.cyan} stopOpacity={palette.cyanAlpha} />
            <Stop offset="0.55" stopColor={palette.cyan} stopOpacity={0} />
          </RadialGradient>
          {/* blob lumineux corail haut-gauche */}
          <RadialGradient id="g-blob-coral" cx={-40} cy={150} r={220} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.coral} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.coral} stopOpacity={0} />
          </RadialGradient>
          {/* blob lumineux violet haut-droit */}
          <RadialGradient id="g-blob-violet" cx={w + 40} cy={120} r={240} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.violet} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.violet} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g-track" cx={0.48 * w} cy={0.52 * h} r={0.72 * Math.max(w, h)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={activeTone} stopOpacity={player.current && settings.dynamicBackground ? 0.1 : 0} />
            <Stop offset="0.62" stopColor={activeTone} stopOpacity={0} />
          </RadialGradient>
          {/* grille fine type papier */}
          {showGrid ? (
            <Pattern id="paperGrid" x={0} y={0} width={34} height={34} patternUnits="userSpaceOnUse">
              <Path d="M0 0 H34" stroke={palette.gridLine} strokeWidth={1} opacity={0.45} />
              <Path d="M0 0 V34" stroke={palette.gridLine} strokeWidth={1} opacity={0.45} />
            </Pattern>
          ) : null}
          <Pattern id="paperGrain" x={0} y={0} width={18} height={18} patternUnits="userSpaceOnUse">
            <Path d="M2 3h.7M12 8h.6M7 15h.5M16 2h.4" stroke={palette.gridLine} strokeWidth={1.2} opacity={0.42} />
          </Pattern>
        </Defs>

        <Rect x={0} y={0} width={w} height={h} fill="url(#g-coral)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-violet)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-cyan)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-track)" />
        {variant === 'dark' ? <Rect x={0} y={0} width={w} height={h} fill="url(#g-blob-violet)" /> : null}
        {showGrid ? <Rect x={0} y={0} width={w} height={h} fill="url(#paperGrid)" opacity={0.32} /> : null}
        <Rect x={0} y={0} width={w} height={h} fill="url(#paperGrain)" opacity={variant === 'dark' ? 0.12 : 0.08} />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.waveField,
          {
            opacity: settings.dynamicBackground ? drift.interpolate({ inputRange: [0, 1], outputRange: [0.025, 0.05] }) : 0,
            transform: [
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-24, 18] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [8, -12] }) },
            ],
          },
        ]}
      >
        <Svg width={w + 80} height={h} viewBox={`0 0 ${w + 80} ${h}`} preserveAspectRatio="none">
          <Path d={`M-30 ${h * 0.32} C ${w * 0.16} ${h * 0.24}, ${w * 0.26} ${h * 0.42}, ${w * 0.48} ${h * 0.34} S ${w * 0.82} ${h * 0.24}, ${w + 60} ${h * 0.38}`} fill="none" stroke={palette.violet} strokeWidth={1.2} opacity={0.22} />
          <Path d={`M-40 ${h * 0.7} C ${w * 0.2} ${h * 0.62}, ${w * 0.38} ${h * 0.82}, ${w * 0.62} ${h * 0.69} S ${w * 0.88} ${h * 0.64}, ${w + 70} ${h * 0.74}`} fill="none" stroke={palette.cyan} strokeWidth={1.1} opacity={0.18} />
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
