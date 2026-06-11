import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSynauraCity } from '@/api/client';
import type { SynauraCityData } from '@/api/types';
import { MotionPressable } from '@/components/motion/Motion';
import { spacing } from '@/theme/tokens';

export function CityHomeBanner({ onOpen }: { onOpen: () => void }) {
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const flare = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    void getSynauraCity().then((next) => {
      if (active) setCity(next);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(pulse, {
      toValue: 1,
      duration: 2200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(flare, {
      toValue: 1,
      duration: 1600,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [flare]);

  return (
    <MotionPressable onPress={onOpen} style={styles.root}>
      <LinearGradient colors={['#080506', '#351225', '#3E2454', '#093D3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.signal,
          {
            opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.55, 0.2] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.2] }) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flare,
          {
            opacity: flare.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.22, 0.70, 0.22] }),
            transform: [
              { translateY: flare.interpolate({ inputRange: [0, 1], outputRange: [8, -8] }) },
              { scale: flare.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.14] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.meteor,
          {
            transform: [
              { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [120, -190] }) },
              { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [-22, 90] }) },
              { rotate: '-22deg' },
            ],
          },
        ]}
      />
      <View style={styles.shardOne} />
      <View style={styles.shardTwo} />
      <View style={styles.icon}>
        <Ionicons name="radio-outline" size={21} color="#7EF2ED" />
      </View>
      <View style={styles.copy}>
        <View style={styles.kickerRow}>
          <Text style={styles.kicker}>SYNAURA CITY</Text>
          {city?.pulse?.[0] ? <Text style={styles.pulse}>Pulse {city.pulse[0].pulse}%</Text> : null}
        </View>
        <Text style={styles.title}>{city?.cityMood?.title || 'Chaque jour, la ville explose de son.'}</Text>
        <Text numberOfLines={1} style={styles.caption}>Vitrine, Radar, battles, challenges et nouveaux talents.</Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="arrow-forward" size={16} color="#171313" />
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 138,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 29,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#FF4B7A',
    shadowOpacity: 0.26,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  signal: {
    position: 'absolute',
    right: -35,
    top: -55,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#7EF2ED',
  },
  flare: {
    position: 'absolute',
    left: -35,
    bottom: -58,
    width: 170,
    height: 120,
    borderRadius: 85,
    backgroundColor: 'rgba(255,159,28,0.36)',
  },
  meteor: {
    position: 'absolute',
    right: -28,
    top: 14,
    width: 145,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#7EF2ED',
    shadowColor: '#7EF2ED',
    shadowOpacity: 0.8,
    shadowRadius: 18,
  },
  shardOne: {
    position: 'absolute',
    right: 56,
    top: 28,
    width: 62,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,214,103,0.72)',
    transform: [{ rotate: '18deg' }],
  },
  shardTwo: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    width: 74,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,75,122,0.64)',
    transform: [{ rotate: '-18deg' }],
  },
  icon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  copy: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { color: '#7EF2ED', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  pulse: { overflow: 'hidden', borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 7, paddingVertical: 3, color: '#FFFAF2', fontSize: 8, fontWeight: '900' },
  title: { marginTop: 6, color: '#FFFAF2', fontSize: 19, lineHeight: 21, fontWeight: '900', letterSpacing: -0.4 },
  caption: { marginTop: 4, color: 'rgba(255,250,242,0.48)', fontSize: 10, fontWeight: '700' },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFAF2' },
});
