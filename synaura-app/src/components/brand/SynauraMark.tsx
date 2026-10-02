import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { MARK_ORBIT, MARK_S, MARK_VIEWBOX } from '@/brand/mark';
import { entry } from '@/theme/entry';

export function SynauraMark({ size = 36, color = entry.text, wordmark = false }: { size?: number; color?: string; wordmark?: boolean }) {
  return <View style={styles.lockup} accessible accessibilityLabel="Synaura">
    <Svg width={size} height={size} viewBox={MARK_VIEWBOX} accessible={false}>
      <Path d={MARK_ORBIT} stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d={MARK_S} stroke={color} strokeWidth={3.3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={85} cy={20} r={2.8} fill={color} />
    </Svg>
    {wordmark ? <Text allowFontScaling={false} style={[styles.name, { color }]}>SYNAURA</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ lockup: { flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { fontFamily: 'Inter_800ExtraBold', fontSize: 19, letterSpacing: 1.2 } });
