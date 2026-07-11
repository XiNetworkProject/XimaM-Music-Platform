import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MotionPressableProps = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  lift?: number;
};

export function MotionPressable({
  children,
  style,
  scaleTo = 0.965,
  lift = 1,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: MotionPressableProps) {
  const { settings } = useMobileSettings();
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animate = (pressed: boolean) => {
    if (settings.reducedMotion) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? scaleTo : 1,
        speed: pressed ? 36 : 24,
        bounciness: pressed ? 0 : 7,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: pressed ? lift : 0,
        speed: 30,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        animate(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(false);
        onPressOut?.(event);
      }}
      style={[
        style,
        disabled && { opacity: 0.45 },
        { transform: [{ translateY }, { scale }] },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Reveal({
  children,
  delay = 0,
  distance = 12,
  fromX = 0,
  scaleFrom = 1,
  duration = 440,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  fromX?: number;
  scaleFrom?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { settings } = useMobileSettings();
  const progress = useRef(new Animated.Value(settings.reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (settings.reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, duration, progress, settings.reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [fromX, 0],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [scaleFrom, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function BreathingView({
  children,
  active = true,
  scaleTo = 1.018,
  duration = 2600,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  scaleTo?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { settings } = useMobileSettings();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || settings.reducedMotion) {
      progress.stopAnimation();
      Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [active, duration, progress, settings.reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{
            scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }),
          }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
