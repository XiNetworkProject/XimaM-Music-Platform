import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

// Cover-derived colour, not a fabricated audio visualizer. Native-driver motion
// stops offscreen, when paused, in data saver and with reduced motion enabled.
export function LiveAtmosphere({ cover, active }: { cover?: string | null; active: boolean }) {
  const drift = useRef(new Animated.Value(0)).current;
  const { settings } = useMobileSettings();
  const animate = useEntryMotion(active && settings.dynamicBackground);
  useEffect(() => {
    if (!animate) { drift.stopAnimation(); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 10000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 10000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animate, drift]);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#06080E', overflow: 'hidden' }]}>
    {cover && settings.dynamicBackground ? <Animated.View style={[StyleSheet.absoluteFill, { opacity: .5, transform: [{ scale: 1.35 }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) }] }]}>
      <SynauraImage source={cover} blurRadius={48} style={StyleSheet.absoluteFill} />
    </Animated.View> : null}
    <LinearGradient colors={['rgba(6,8,14,.86)', 'rgba(6,8,14,.42)', 'rgba(6,8,14,.74)', '#06080E']} locations={[0, .34, .75, 1]} style={StyleSheet.absoluteFill} />
    {animate ? [0, 1, 2, 3, 4, 5].map(index => <Animated.View key={index} style={{ position: 'absolute', left: `${12 + index * 15}%`, top: `${22 + (index % 3) * 20}%`, width: index % 2 ? 3 : 2, height: index % 2 ? 3 : 2, borderRadius: 3, backgroundColor: '#DAD2FF', opacity: drift.interpolate({ inputRange: [0, .5, 1], outputRange: [.12, .6, .12] }), transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [16 + index * 3, -26 - index * 4] }) }] }} />) : null}
  </View>;
}
