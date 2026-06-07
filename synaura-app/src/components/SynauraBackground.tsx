import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, Pattern, Path } from 'react-native-svg';

type Variant = 'warm' | 'feed' | 'dark';

type Props = {
  children?: React.ReactNode;
  variant?: Variant;
  /** Affiche la grille fine (default true) */
  showGrid?: boolean;
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
    base: '#F4EFE6',
    paper: '#FFFAF2',
    paperDark: '#EFE8DD',
    coral: '#FF6F61',
    violet: '#7C5CFF',
    cyan: '#00C2CB',
    gridLine: '#DED4C7',
    coralAlpha: 0.22,
    violetAlpha: 0.20,
    cyanAlpha: 0.14,
  },
  feed: {
    base: '#F4EFE6',
    paper: '#FFFAF2',
    paperDark: '#EFE8DD',
    coral: '#FF6F61',
    violet: '#7C5CFF',
    cyan: '#00C2CB',
    gridLine: '#DED4C7',
    coralAlpha: 0.18,
    violetAlpha: 0.18,
    cyanAlpha: 0.12,
  },
  dark: {
    base: '#0D0A0E',
    paper: '#171313',
    paperDark: '#0A070C',
    coral: '#FF6F61',
    violet: '#7C5CFF',
    cyan: '#00C2CB',
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
export function SynauraBackground({ children, variant = 'warm', showGrid = true }: Props) {
  const palette = VARIANTS[variant];
  const { width, height } = useWindowDimensions();
  const w = Math.max(360, Math.round(width));
  const h = Math.max(640, Math.round(height));
  return (
    <View style={[styles.root, { backgroundColor: palette.base }]}>
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
          {/* grille fine type papier */}
          {showGrid ? (
            <Pattern id="paperGrid" x={0} y={0} width={34} height={34} patternUnits="userSpaceOnUse">
              <Path d="M0 0 H34" stroke={palette.gridLine} strokeWidth={1} opacity={0.45} />
              <Path d="M0 0 V34" stroke={palette.gridLine} strokeWidth={1} opacity={0.45} />
            </Pattern>
          ) : null}
        </Defs>

        <Rect x={0} y={0} width={w} height={h} fill="url(#g-coral)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-violet)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-cyan)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-blob-coral)" />
        <Rect x={0} y={0} width={w} height={h} fill="url(#g-blob-violet)" />
        {showGrid ? <Rect x={0} y={0} width={w} height={h} fill="url(#paperGrid)" opacity={0.32} /> : null}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
});
