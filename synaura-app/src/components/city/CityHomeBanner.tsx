import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getSynauraCity } from '@/api/client';
import type { SynauraCityData } from '@/api/types';
import { PulseBar } from '@/components/events/SynauraEvents';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, radius, shadows } from '@/theme/tokens';

export function CityHomeBanner({ onOpen }: { onOpen: () => void }) {
  const [city, setCity] = useState<SynauraCityData | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getSynauraCity().then((next) => {
      if (active) setCity(next);
    }).catch(() => {});
    return () => { active = false; };
  }, []));

  const event = city?.currentVoteSession
    || city?.events?.find((item) => item.isLive)
    || city?.nextVoteSession
    || city?.events?.find((item) => item.status === 'scheduled')
    || city?.events?.[0]
    || null;
  const top = city?.pulse?.[0] || null;
  const live = Boolean(event?.isLive);
  const totalVotes = Number(event?.totalVotes || 0);
  const eventMeta = event?.kind === 'battle'
    ? totalVotes > 0 ? `${totalVotes} vote${totalVotes > 1 ? 's' : ''} enregistré${totalVotes > 1 ? 's' : ''}` : 'Le vote attend sa première voix'
    : event?.status === 'scheduled' ? 'Prochain rendez-vous Synaura' : 'Challenges, Pulse et nouveaux talents';

  return (
    <Reveal distance={7}>
      <MotionPressable accessibilityLabel="Ouvrir Synaura Events" onPress={onOpen} style={styles.card} scaleTo={0.985}>
        <LinearGradient
          colors={['#151413', '#2A2524', '#31575A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="flash" size={13} color="#F5C5B8" />
            <Text style={styles.brandText}>Synaura Events</Text>
          </View>
          <View style={styles.status}>
            <View style={[styles.statusDot, !live && styles.statusDotScheduled]} />
            <Text style={styles.statusText}>{live ? 'En direct' : 'À venir'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text numberOfLines={2} style={styles.title}>{event?.title || 'La scène Synaura en mouvement'}</Text>
          <Text numberOfLines={2} style={styles.description}>{event?.description || 'Votes, battles et rendez-vous pour faire émerger de nouveaux sons.'}</Text>
          <Text numberOfLines={1} style={styles.meta}>{eventMeta}</Text>
        </View>

        {top ? (
          <View style={styles.pulseRow}>
            <View style={styles.pulseCopy}>
              <Text style={styles.pulseLabel}>Pulse du moment</Text>
              <Text numberOfLines={1} style={styles.pulseTitle}>{top.title}</Text>
            </View>
            <View style={styles.pulseBar}><PulseBar value={top.pulse} height={5} /></View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Voir les Events et voter</Text>
          <View style={styles.arrow}><Ionicons name="arrow-forward" size={15} color={colors.text} /></View>
        </View>
      </MotionPressable>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 218, overflow: 'hidden', borderRadius: radius.lg, padding: 15, ...shadows.floating },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 9, paddingVertical: 6 },
  brandText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  statusDotScheduled: { backgroundColor: colors.cyan },
  statusText: { color: 'rgba(255,255,255,0.68)', fontSize: 9, fontWeight: '800' },
  body: { marginTop: 17 },
  title: { maxWidth: 540, color: '#FFFFFF', fontSize: 23, lineHeight: 27, fontWeight: '900' },
  description: { maxWidth: 560, marginTop: 5, color: 'rgba(255,255,255,0.64)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  meta: { marginTop: 8, color: '#F5C5B8', fontSize: 9, fontWeight: '900' },
  pulseRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulseCopy: { flex: 1, minWidth: 0 },
  pulseLabel: { color: 'rgba(255,255,255,0.43)', fontSize: 7, fontWeight: '900', textTransform: 'uppercase' },
  pulseTitle: { marginTop: 2, color: 'rgba(255,255,255,0.84)', fontSize: 10, fontWeight: '800' },
  pulseBar: { width: 82 },
  footer: { marginTop: 14, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)', paddingTop: 11 },
  footerText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  arrow: { width: 31, height: 31, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});
