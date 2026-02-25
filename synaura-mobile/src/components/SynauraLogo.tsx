import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Version statique (sans animations/filters) pour compat RN.
const SYNAURA_SYMBOL_SVG = `
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Synaura symbol">
  <defs>
    <linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#D946EF"/>
    </linearGradient>
  </defs>

  <path
    d="M60 72C60 36 180 36 180 72C180 108 60 108 60 144C60 180 180 180 180 144"
    fill="none"
    stroke="url(#aurora)"
    stroke-width="28"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <circle cx="120" cy="120" r="100" fill="none" stroke="url(#aurora)" stroke-width="1" opacity="0.3" />
  <circle cx="60" cy="72" r="4" fill="#22D3EE" />
  <circle cx="180" cy="144" r="4" fill="#D946EF" />
  <circle cx="120" cy="120" r="90" fill="none" stroke="url(#aurora)" stroke-width="0.5" opacity="0.2" />
</svg>
`;

// Logotype (fichier: public/synaura_logotype.svg)
const SYNAURA_LOGOTYPE_SVG = `
<svg viewBox="0 0 1000 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Synaura logotype">
  <defs>
    <linearGradient id="aurora2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22D3EE"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#D946EF"/>
    </linearGradient>
  </defs>
  <g transform="translate(24,28) scale(0.9)">
    <path d="M60 72C60 36 180 36 180 72C180 108 60 108 60 144C60 180 180 180 180 144"
          fill="none" stroke="url(#aurora2)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="210" y="150"
        font-family="Sora, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        font-weight="800" font-size="120" fill="#F8FAFC" letter-spacing="1">
    Synaura
  </text>
</svg>
`;

export function SynauraSymbol({ size = 48 }: { size?: number }) {
  return <SvgXml xml={SYNAURA_SYMBOL_SVG} width={size} height={size} />;
}

export function SynauraLogotype({
  height = 28,
  width,
}: {
  height?: number;
  width?: number;
}) {
  const computedWidth = width ?? Math.round(height * (1000 / 240));
  return <SvgXml xml={SYNAURA_LOGOTYPE_SVG} width={computedWidth} height={height} />;
}

export function SynauraWordmark({
  symbolSize = 24,
  textSize = 22,
  color = '#F8FAFC',
  containerStyle,
  textStyle,
}: {
  symbolSize?: number;
  textSize?: number;
  color?: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, containerStyle]}>
      <SynauraSymbol size={symbolSize} />
      <Text
        style={[
          {
            color,
            fontWeight: '800',
            fontSize: textSize,
            letterSpacing: 0.5,
          },
          textStyle,
        ]}
      >
        Synaura
      </Text>
    </View>
  );
}

