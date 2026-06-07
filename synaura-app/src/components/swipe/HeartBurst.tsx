import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  burstKey: number;
};

export function HeartBurst({ visible, burstKey }: Props) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.4);
    opacity.setValue(0);
    translate.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, friction: 5, tension: 110 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 380, delay: 220, useNativeDriver: true }),
        Animated.timing(translate, { toValue: -36, duration: 460, delay: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    });
  }, [burstKey, visible, scale, opacity, translate]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.center}>
        <Animated.View
          style={{
            transform: [{ scale }, { translateY: translate }],
            opacity,
            shadowColor: '#FF4B7A',
            shadowOpacity: 0.45,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Ionicons name="heart" size={120} color="#FF4B7A" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
