import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, AccessibilityInfo, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { entry } from '@/theme/entry';

export function useEntryMotion(enabled = true) {
  const { settings } = useMobileSettings();
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(navigation?.isFocused() ?? true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [systemReduced, setSystemReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setSystemReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const focus = navigation?.addListener('focus', () => setFocused(true));
    const blur = navigation?.addListener('blur', () => setFocused(false));
    return () => { alive = false; motion.remove(); app.remove(); focus?.(); blur?.(); };
  }, [navigation]);
  return enabled && focused && foreground && !systemReduced && !settings.reducedMotion && !settings.dataSaver;
}

export function EntryAtmosphere({ children, active = true, tone = entry.violet, interactive = false }: { children?: React.ReactNode; active?: boolean; tone?: string; interactive?: boolean }) {
  const animate = useEntryMotion(active);
  const viewport = useWindowDimensions();
  const touch = useRef(new Animated.ValueXY()).current;
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) { phase.setValue(.35); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [animate, phase]);
  return <View style={styles.root}
    onTouchMove={interactive && animate ? event => touch.setValue({ x: (event.nativeEvent.pageX / viewport.width - .5) * 36, y: (event.nativeEvent.pageY / viewport.height - .5) * 24 }) : undefined}
    onTouchEnd={interactive && animate ? () => Animated.spring(touch, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 8, bounciness: 2, isInteraction: false }).start() : undefined}>
    <Animated.View pointerEvents="none" style={[styles.aura, { transform: [
      { translateX: Animated.add(touch.x, phase.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] })) },
      { translateY: Animated.add(touch.y, phase.interpolate({ inputRange: [0, 1], outputRange: [-14, 20] })) },
    ] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 500 900" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="entry-violet"><Stop offset="0" stopColor={tone} stopOpacity=".23" /><Stop offset="1" stopColor={tone} stopOpacity="0" /></RadialGradient>
          <RadialGradient id="entry-blue"><Stop offset="0" stopColor={entry.blue} stopOpacity=".26" /><Stop offset="1" stopColor={entry.blue} stopOpacity="0" /></RadialGradient>
        </Defs>
        <Ellipse cx="400" cy="240" rx="330" ry="390" fill="url(#entry-violet)" />
        <Ellipse cx="30" cy="470" rx="300" ry="370" fill="url(#entry-blue)" />
      </Svg>
    </Animated.View>{children}
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: entry.background }, aura: { ...StyleSheet.absoluteFillObject, top: -40, bottom: -40, left: -40, right: -40 } });
