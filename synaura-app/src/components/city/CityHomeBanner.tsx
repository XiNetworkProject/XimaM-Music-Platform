import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSynauraCity } from '@/api/client';
import type { SynauraCityData } from '@/api/types';
import { EventTicker, PulseBadge, PulseBar } from '@/components/events/SynauraEvents';
import { colors, spacing } from '@/theme/tokens';

export function CityHomeBanner({ onOpen }: { onOpen: () => void }) {
  const [city, setCity] = useState<SynauraCityData | null>(null);

  useEffect(() => {
    let active = true;
    void getSynauraCity().then((next) => active && setCity(next)).catch(() => {});
    return () => { active = false; };
  }, []);

  const top = city?.pulse?.[0];
  const event = city?.events?.find((item) => item.isLive) || city?.events?.[0];

  return (
    <View style={styles.wrap}>
      <EventTicker city={city} onPress={onOpen} />
      <Pressable onPress={onOpen} style={styles.card}>
        <LinearGradient colors={['#FFE3DB', '#F0EBFF', '#DDF8F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.icon}><Ionicons name="sparkles" size={18} color={colors.paper} /></View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{event?.kind === 'battle' ? 'BATTLE IA EN COURS' : 'EVENTS EN DIRECT'}</Text>
          <Text numberOfLines={2} style={styles.title}>{event?.title || 'Découvre ce qui bouge maintenant.'}</Text>
          <Text numberOfLines={1} style={styles.caption}>{event?.description || 'Pulse, nouveaux talents, challenges et récompenses.'}</Text>
          {top ? <View style={styles.pulse}><PulseBadge track={top} compact /><PulseBar value={top.pulse} height={4} /></View> : null}
        </View>
        <View style={styles.arrow}><Ionicons name="arrow-forward" size={15} color={colors.paper} /></View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 9 },
  card: { minHeight: 148, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: 27, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  copy: { flex: 1, minWidth: 0 },
  kicker: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 5, color: colors.text, fontSize: 19, lineHeight: 21, fontWeight: '900' },
  caption: { marginTop: 4, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  pulse: { marginTop: 10, gap: 6 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
});
