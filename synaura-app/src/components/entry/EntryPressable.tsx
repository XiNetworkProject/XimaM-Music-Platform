import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useEntryMotion } from './EntryAtmosphere';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A short tactile response; no loop and no animation when motion is reduced. */
export function EntryPressable({ children, style, onPressIn, onPressOut, scaleTo = .96, ...props }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const motion = useEntryMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (!motion) { scale.stopAnimation(); scale.setValue(1); } return () => scale.stopAnimation(); }, [motion, scale]);
  const press = (down: boolean) => {
    if (!motion) return;
    Animated.spring(scale, { toValue: down ? scaleTo : 1, speed: down ? 40 : 24, bounciness: down ? 0 : 6, useNativeDriver: true, isInteraction: false }).start();
  };
  return <AnimatedPressable {...props} onPressIn={event => { press(true); onPressIn?.(event); }} onPressOut={event => { press(false); onPressOut?.(event); }} style={[style, props.disabled && { opacity: .45 }, { transform: [{ scale }] }]}>{children}</AnimatedPressable>;
}
