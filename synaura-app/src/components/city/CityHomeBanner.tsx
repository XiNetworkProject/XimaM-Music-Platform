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

  return (
    <MotionPressable onPress={onOpen} style={styles.root}>
      <LinearGradient colors={['#171313', '#30213A', '#15383A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
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
      <View style={styles.icon}>
        <Ionicons name="radio-outline" size={21} color="#7EF2ED" />
      </View>
      <View style={styles.copy}>
        <View style={styles.kickerRow}>
          <Text style={styles.kicker}>SYNAURA CITY</Text>
          {city?.pulse?.[0] ? <Text style={styles.pulse}>Pulse {city.pulse[0].pulse}%</Text> : null}
        </View>
        <Text style={styles.title}>{city?.cityMood?.title || 'Chaque jour, la ville change de son.'}</Text>
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
    minHeight: 122,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 25,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#171313',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
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
  icon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  copy: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { color: '#7EF2ED', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  pulse: { overflow: 'hidden', borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 7, paddingVertical: 3, color: '#FFFAF2', fontSize: 8, fontWeight: '900' },
  title: { marginTop: 6, color: '#FFFAF2', fontSize: 17, lineHeight: 20, fontWeight: '900' },
  caption: { marginTop: 4, color: 'rgba(255,250,242,0.48)', fontSize: 10, fontWeight: '700' },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFAF2' },
});
