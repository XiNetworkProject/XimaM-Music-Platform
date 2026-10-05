import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';

// Scroll-linked transforms stay on the UI thread. They never commit a page or touch playback.
export const LivePageMotion = memo(function LivePageMotion({ children, offset, index, height, motion }: {
  children: React.ReactNode; offset: Animated.Value; index: number; height: number; motion: boolean;
}) {
  const inputRange = [(index - 1) * height, index * height, (index + 1) * height];
  return <Animated.View style={{ height, opacity: motion ? offset.interpolate({ inputRange, outputRange: [.3, 1, .3], extrapolate: 'clamp' }) : 1,
    transform: motion ? [
      { scale: offset.interpolate({ inputRange, outputRange: [.955, 1, .955], extrapolate: 'clamp' }) },
      { translateY: offset.interpolate({ inputRange, outputRange: [-24, 0, 24], extrapolate: 'clamp' }) },
    ] : [] }}>{children}</Animated.View>;
});

export function LiveCoverMotion({ children, size, active }: { children: React.ReactNode; size: number; active: boolean }) {
  const motion = useEntryMotion(active);
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion) { float.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(float, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [motion, float]);
  return <View style={{ width: size, height: size }}><Animated.View style={{ width: size, height: size, transform: [
    { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
    { scale: float.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) },
  ] }}>{children}</Animated.View></View>;
}
