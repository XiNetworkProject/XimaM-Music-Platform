import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';

export const mobile = {
  bg: '#070A10', surface: '#111722', raised: '#192230', text: '#F5F7FC',
  muted: '#A8B3C5', faint: '#8592A8', blue: '#93CAFF', violet: '#BEAAFF',
  line: 'rgba(193,217,255,.12)',
};

/** A native, touch-responsive light installation. Decorative, not an audio analyser. */
export function SoundRoom({ children, active = true, quiet = false }: {
  children?: React.ReactNode; active?: boolean; quiet?: boolean;
}) {
  const motion = useEntryMotion(active);
  const phase = useRef(new Animated.Value(0)).current;
  const touch = useRef(new Animated.ValueXY()).current;
  useEffect(() => {
    if (!motion) { phase.setValue(.5); touch.setValue({ x: 0, y: 0 }); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 9500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 9500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [motion, phase, touch]);
  return <View style={s.root}
    onTouchMove={motion ? event => touch.setValue({ x: Math.max(-14, Math.min(14, (event.nativeEvent.pageX - 190) / 15)), y: Math.max(-9, Math.min(9, (event.nativeEvent.pageY - 400) / 35)) }) : undefined}
    onTouchEnd={motion ? () => Animated.spring(touch, { toValue: { x: 0, y: 0 }, speed: 8, bounciness: 0, useNativeDriver: true, isInteraction: false }).start() : undefined}>
    <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[s.room, { opacity: quiet ? .3 : 1, transform: [{ translateX: touch.x }, { translateY: touch.y }, { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 440 900" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="room-glow"><Stop stopColor="#4640DB" stopOpacity=".7" /><Stop offset=".43" stopColor="#293597" stopOpacity=".28" /><Stop offset="1" stopColor={mobile.bg} stopOpacity="0" /></RadialGradient>
          <RadialGradient id="room-core"><Stop stopColor="#E4F9FF" stopOpacity=".85" /><Stop offset=".14" stopColor="#9FDBFF" stopOpacity=".4" /><Stop offset=".6" stopColor="#7492FF" stopOpacity=".07" /><Stop offset="1" stopColor="#5970DB" stopOpacity="0" /></RadialGradient>
          <LinearGradient id="room-rim" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#77CFFF" stopOpacity=".08" /><Stop offset=".35" stopColor="#C2F3FF" /><Stop offset=".58" stopColor="#747AF6" stopOpacity=".35" /><Stop offset=".82" stopColor="#BFA2FF" /><Stop offset="1" stopColor="#9472FF" stopOpacity=".08" /></LinearGradient>
          <LinearGradient id="room-beam"><Stop stopColor="#8897FF" stopOpacity="0" /><Stop offset=".5" stopColor="#C1E5FF" stopOpacity=".8" /><Stop offset="1" stopColor="#9D79FF" stopOpacity="0" /></LinearGradient>
          <LinearGradient id="room-floor" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#849DFF" stopOpacity=".28" /><Stop offset="1" stopColor="#6C7DC8" stopOpacity="0" /></LinearGradient>
        </Defs>
        <Ellipse cx="220" cy="345" rx="290" ry="360" fill="url(#room-glow)" />
        <Ellipse cx="220" cy="405" rx="215" ry="130" fill="url(#room-core)" />
        {[0, 1, 2, 3, 4].map(i => <Ellipse key={i} cx="220" cy="320" rx={135 + i * 16} ry={205 + i * 16} fill="none" stroke="url(#room-rim)" strokeWidth={i === 0 ? 1.6 : .65} opacity={1 - i * .18} transform={`rotate(${-24 + i * 10} 220 320)`} />)}
        <Path d="M219 60 C138 197 326 283 220 531" stroke="url(#room-rim)" strokeWidth="2" fill="none" />
        <Path d="M219 60 C150 198 309 290 220 531" stroke="url(#room-rim)" strokeWidth=".6" fill="none" />
        <Rect x="25" y="402" width="390" height="1" fill="url(#room-beam)" />
        {[-400, -190, 0, 190, 400].map(x => <Path key={x} d={`M220 531 L${220 + x} 860`} stroke="url(#room-floor)" strokeWidth=".6" />)}
        {[0, 1, 2, 3].map(i => <Ellipse key={i} cx="220" cy={575 + i * 54} rx={40 + i * 75} ry={9 + i * 8} fill="none" stroke="url(#room-floor)" strokeWidth=".6" />)}
      </Svg>
    </Animated.View>
    {children}
  </View>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: mobile.bg }, room: { ...StyleSheet.absoluteFillObject, left: -18, right: -18, top: -18, bottom: -18 } });
