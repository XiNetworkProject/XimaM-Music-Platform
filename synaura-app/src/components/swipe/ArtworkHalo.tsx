import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Stop } from 'react-native-svg';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

/** Decorative orbital light, deliberately not presented as audio analysis. */
export function ArtworkHalo({ size, active }: { size: number; active: boolean }) {
  const { settings } = useMobileSettings();
  const animate = useEntryMotion(active && settings.dynamicBackground);
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) { phase.stopAnimation(); return; }
    const loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    phase.setValue(0); loop.start(); return () => loop.stop();
  }, [animate, phase]);
  if (!settings.dynamicBackground) return null;
  return <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: 'absolute', width: size + 54, height: size + 54, left: -27, top: -27, transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '332deg'] }) }] }}>
    <Svg width="100%" height="100%" viewBox="0 0 320 320">
      <Defs><LinearGradient id="halo" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#BCA6FF" stopOpacity="0" /><Stop offset="0.45" stopColor="#D9CDFF" stopOpacity=".75" /><Stop offset="1" stopColor="#7EDDEA" stopOpacity="0" /></LinearGradient></Defs>
      <Ellipse cx="160" cy="160" rx="157" ry="135" fill="none" stroke="url(#halo)" strokeWidth=".8" />
      <Ellipse cx="160" cy="160" rx="138" ry="157" fill="none" stroke="#BCA6FF" strokeOpacity=".1" strokeWidth=".6" />
      <Circle cx="305" cy="108" r="4" fill="#BCA6FF" opacity=".15" /><Circle cx="305" cy="108" r="1.5" fill="#ECE4FF" />
    </Svg>
  </Animated.View>;
}
