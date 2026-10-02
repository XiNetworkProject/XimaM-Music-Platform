import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';

type Props = {
  visible: boolean;
  burstKey: number;
};

export function HeartBurst({ visible, burstKey }: Props) {
  const motion = useEntryMotion();
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(motion ? 0.4 : 1);
    opacity.setValue(0);
    translate.setValue(0);
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: motion ? 1.15 : 1, useNativeDriver: true, friction: 5, tension: 110, isInteraction: false }),
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true, isInteraction: false }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 380, delay: 220, useNativeDriver: true, isInteraction: false }),
        Animated.timing(translate, { toValue: motion ? -36 : 0, duration: 460, delay: 220, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [burstKey, visible, scale, opacity, translate, motion]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.center}>
        <Animated.View
          style={{
            transform: [{ scale }, { translateY: translate }],
            opacity,
            shadowColor: '#AC82EC',
            shadowOpacity: 0.45,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Ionicons name="heart" size={100} color="#E1C9FF" />
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
