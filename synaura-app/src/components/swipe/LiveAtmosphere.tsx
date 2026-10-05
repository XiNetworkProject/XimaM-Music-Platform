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
  const flights = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const { settings } = useMobileSettings();
  const animate = useEntryMotion(active && settings.dynamicBackground);
  useEffect(() => {
    if (!animate) { drift.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animate, drift]);
  useEffect(() => {
    if (!animate) return;
    const loops = flights.map((value, index) => {
      value.setValue(0);
      return Animated.loop(Animated.timing(value, { toValue: 1, duration: 4800 + index * 1700, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    });
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [animate, flights]);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#06080E', overflow: 'hidden' }]}>
    {cover && settings.dynamicBackground ? <Animated.View style={[StyleSheet.absoluteFill, { opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [.5, .7] }), transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.3, 1.4] }) }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-16, 16] }) }] }]}>
      <SynauraImage source={cover} blurRadius={48} style={StyleSheet.absoluteFill} />
    </Animated.View> : null}
    <LinearGradient colors={['rgba(6,8,14,.86)', 'rgba(6,8,14,.42)', 'rgba(6,8,14,.74)', '#06080E']} locations={[0, .34, .75, 1]} style={StyleSheet.absoluteFill} />
    {animate ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => {
      const flight = flights[index % 3];
      return <Animated.View key={index} style={{ position: 'absolute', left: `${8 + index * 10.5}%`, top: `${38 + (index % 4) * 13}%`, width: index % 2 ? 3 : 2, height: index % 2 ? 3 : 2, borderRadius: 3, backgroundColor: index % 2 ? '#DAD2FF' : '#ACDFFF', opacity: flight.interpolate({ inputRange: [0, .15, .72, 1], outputRange: [0, .65, .4, 0] }), transform: [{ translateY: flight.interpolate({ inputRange: [0, 1], outputRange: [40, -160 - index * 11] }) }, { translateX: flight.interpolate({ inputRange: [0, .5, 1], outputRange: [0, index % 2 ? 12 : -12, 0] }) }] }} />;
    }) : null}
  </View>;
}
