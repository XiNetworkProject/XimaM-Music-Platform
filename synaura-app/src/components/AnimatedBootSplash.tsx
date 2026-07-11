import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { SynauraBackground } from '@/components/SynauraBackground';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const symbol = require('../assets/synaura-symbol-2026.png');

export function AnimatedBootSplash() {
  const { settings } = useMobileSettings();
  const [visible, setVisible] = useState(true);
  const entrance = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    if (settings.reducedMotion) {
      entrance.setValue(1);
      const timer = setTimeout(() => setVisible(false), 260);
      return () => clearTimeout(timer);
    }
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const barLoops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 70),
          Animated.timing(bar, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.35,
            duration: 340,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((4 - index) * 45),
        ]),
      ),
    );

    breatheLoop.start();
    barLoops.forEach((animation) => animation.start());
    Animated.sequence([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(exit, {
        toValue: 1,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => {
      breatheLoop.stop();
      barLoops.forEach((animation) => animation.stop());
    };
  }, [bars, breathe, entrance, exit, settings.reducedMotion]);

  if (!visible) return null;

  const opacity = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const translateY = exit.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const scale = Animated.multiply(
    entrance.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }),
  );
  const rotate = entrance.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] });

  return (
    <Animated.View pointerEvents="auto" style={[styles.overlay, { opacity, transform: [{ translateY }] }]}>
      <SynauraBackground variant="feed">
        <View style={styles.content}>
          <Animated.View style={[styles.symbolShell, { opacity: entrance, transform: [{ scale }, { rotate }] }]}>
            <Image source={symbol} style={styles.symbol} />
          </Animated.View>
          <Animated.View style={[styles.wordmark, { opacity: entrance }]}>
            <Text style={styles.title}>Synaura</Text>
            <Text style={styles.subtitle}>ECOUTE  ·  CREE  ·  REMIX</Text>
          </Animated.View>
          <View style={styles.wave} accessibilityLabel="Chargement de Synaura">
            {bars.map((bar, index) => (
              <Animated.View key={index} style={[styles.waveBar, { transform: [{ scaleY: bar }] }]} />
            ))}
          </View>
        </View>
      </SynauraBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 34,
  },
  symbolShell: {
    width: 148,
    height: 148,
  },
  symbol: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  wordmark: {
    marginTop: 18,
    alignItems: 'center',
  },
  title: {
    color: '#171313',
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 7,
    color: 'rgba(23,19,19,0.38)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  wave: {
    marginTop: 20,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  waveBar: {
    width: 4,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#171313',
  },
});
