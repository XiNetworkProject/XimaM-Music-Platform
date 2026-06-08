import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animate = (pressed: boolean) => {
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
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: 440,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
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
