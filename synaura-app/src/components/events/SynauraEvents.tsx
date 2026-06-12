import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { CityEvent, CityPulseTrack, SynauraCityData } from '@/api/types';
import { colors, spacing } from '@/theme/tokens';

type Tone = 'violet' | 'coral' | 'cyan' | 'ink';

const tones: Record<Tone, { background: readonly [string, string]; accent: string; ink: string }> = {
  violet: { background: ['#EEE9FF', '#FFF8F4'], accent: colors.violet, ink: colors.text },
  coral: { background: ['#FFE5DD', '#FFF9F1'], accent: colors.coral, ink: colors.text },
  cyan: { background: ['#DDF8F5', '#FFF9F1'], accent: '#008D96', ink: colors.text },
  ink: { background: ['#231D1D', '#171313'], accent: '#FFB2A7', ink: colors.paper },
};

export function EventTicker({
  city,
  onPress,
  tone = 'violet',
  text,
}: {
  city?: SynauraCityData | null;
  onPress?: () => void;
  tone?: Tone;
  text?: string;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const content = text || makeTicker(city);
  const palette = tones[tone];

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.ticker}>
      <LinearGradient colors={palette.background} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tickerSignal,
          {
            backgroundColor: palette.accent,
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }],
          },
        ]}
      />
      <View style={[styles.tickerIcon, { backgroundColor: palette.accent }]}>
        <Ionicons name="pulse" size={15} color={colors.paper} />
      </View>
      <Text numberOfLines={2} style={[styles.tickerText, { color: palette.ink }]}>{content}</Text>
      {onPress ? <Ionicons name="arrow-forward" size={16} color={palette.ink} /> : null}
    </Pressable>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PulseBadge({ track, compact = false }: { track: Pick<CityPulseTrack, 'pulse' | 'pulseState'>; compact?: boolean }) {
  const tone = track.pulse >= 85 ? colors.coral : track.pulse >= 65 ? colors.violet : '#008D96';
  return (
    <View style={[styles.pulseBadge, compact && styles.pulseBadgeCompact, { backgroundColor: `${tone}18` }]}>
      <Ionicons name={track.pulse >= 85 ? 'flame' : 'pulse'} size={compact ? 11 : 13} color={tone} />
      <Text style={[styles.pulseBadgeText, compact && styles.pulseBadgeTextCompact, { color: tone }]}>{track.pulseState} · {track.pulse}%</Text>
    </View>
  );
}

export function PulseBar({ value, height = 6 }: { value: number; height?: number }) {
  return (
    <View style={[styles.pulseBar, { height, borderRadius: height / 2 }]}>
      <LinearGradient
        colors={[colors.cyan, colors.violet, colors.coral]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.pulseBarFill, { width: `${Math.max(3, Math.min(100, value))}%`, borderRadius: height / 2 }]}
      />
    </View>
  );
}

export function EventCard({
  event,
  onOpen,
  compact = false,
}: {
  event: CityEvent;
  onOpen: () => void;
  compact?: boolean;
}) {
  const tone = event.kind === 'battle' ? 'violet' : event.kind === 'challenge' ? 'coral' : event.kind === 'friday_drop' ? 'cyan' : 'ink';
  const palette = tones[tone];
  return (
    <Pressable onPress={onOpen} style={[styles.eventCard, compact && styles.eventCardCompact]}>
      <LinearGradient colors={palette.background} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.eventIcon, { backgroundColor: palette.accent }]}>
        <Ionicons name={event.kind === 'battle' ? 'flash' : event.kind === 'challenge' ? 'sparkles' : event.kind === 'friday_drop' ? 'musical-notes' : 'calendar'} size={17} color={colors.paper} />
      </View>
      <View style={styles.eventCopy}>
        <View style={styles.eventKickerRow}>
          <Text style={[styles.eventKicker, { color: palette.ink }]}>{event.isLive ? 'EN LIVE' : event.subtitle}</Text>
          {event.isLive ? <View style={[styles.liveDot, { backgroundColor: palette.accent }]} /> : null}
        </View>
        <Text numberOfLines={compact ? 1 : 2} style={[styles.eventTitle, { color: palette.ink }]}>{event.title}</Text>
        <Text numberOfLines={1} style={[styles.eventMeta, { color: palette.ink }]}>
          {event.kind === 'battle' ? `${event.totalVotes || 0} votes` : `${event.participationCount || 0} participations`}
          {event.challengeTag ? ` · ${event.challengeTag}` : ''}
        </Text>
      </View>
      <View style={[styles.eventArrow, { backgroundColor: palette.ink }]}>
        <Ionicons name="arrow-forward" size={14} color={tone === 'ink' ? colors.text : colors.paper} />
      </View>
    </Pressable>
  );
}

export function EventsRail({
  city,
  onOpen,
  title = 'Events en cours',
}: {
  city: SynauraCityData | null;
  onOpen: () => void;
  title?: string;
}) {
  if (!city?.events?.length) return null;
  return (
    <View style={styles.railSection}>
      <SectionHeader eyebrow="SYNAURA LIVE" title={title} subtitle="Battles, défis et drops à rejoindre." action="Tout voir" onAction={onOpen} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {city.events.slice(0, 4).map((event) => <View key={event.id} style={styles.railCard}><EventCard event={event} onOpen={onOpen} compact /></View>)}
      </ScrollView>
    </View>
  );
}

export function EventChoice({
  events,
  selectedId,
  onSelect,
}: {
  events: CityEvent[];
  selectedId: string | null;
  onSelect: (eventId: string | null) => void;
}) {
  const eligible = useMemo(() => events.filter((event) => event.kind !== 'battle' && !event.isEnded).slice(0, 4), [events]);
  if (!eligible.length) return null;
  return (
    <View style={styles.choice}>
      <SectionHeader eyebrow="PLUS DE VISIBILITÉ" title="Publier dans un event" subtitle="Ton son peut rejoindre un challenge ou le Friday Drop." />
      <Pressable onPress={() => onSelect(null)} style={[styles.choiceRow, selectedId === null && styles.choiceRowActive]}>
        <View style={[styles.choiceRadio, selectedId === null && styles.choiceRadioActive]}>{selectedId === null ? <Ionicons name="checkmark" size={13} color={colors.paper} /> : null}</View>
        <View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Publier normalement</Text><Text style={styles.choiceMeta}>Visible dans le catalogue Synaura</Text></View>
      </Pressable>
      {eligible.map((event) => {
        const selected = selectedId === event.id;
        return (
          <Pressable key={event.id} onPress={() => onSelect(event.id)} style={[styles.choiceRow, selected && styles.choiceRowActive]}>
            <View style={[styles.choiceRadio, selected && styles.choiceRadioActive]}>{selected ? <Ionicons name="checkmark" size={13} color={colors.paper} /> : null}</View>
            <View style={styles.choiceCopy}><Text numberOfLines={1} style={styles.choiceTitle}>{event.title}</Text><Text numberOfLines={1} style={styles.choiceMeta}>{event.reward?.title || event.subtitle}</Text></View>
            <Ionicons name="sparkles" size={15} color={event.accent || colors.violet} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function CreatorLevelCard({
  tracks,
  plays,
  likes = 0,
  events = 0,
  onOpen,
}: {
  tracks: number;
  plays: number;
  likes?: number;
  events?: number;
  onOpen?: () => void;
}) {
  const xp = Math.max(0, tracks * 120 + Math.round(plays / 5) + likes * 4 + events * 180);
  const levels = [
    { name: 'Nouveau créateur', min: 0, next: 500 },
    { name: 'Créateur actif', min: 500, next: 1500 },
    { name: 'Talent montant', min: 1500, next: 4000 },
    { name: 'Artiste Pulse', min: 4000, next: 9000 },
    { name: 'Icône Synaura', min: 9000, next: 12000 },
  ];
  const foundIndex = levels.findIndex((level) => xp < level.next);
  const index = foundIndex === -1 ? levels.length - 1 : foundIndex;
  const level = levels[index];
  const progress = Math.min(100, Math.max(4, (xp - level.min) / Math.max(1, level.next - level.min) * 100));
  return (
    <Pressable disabled={!onOpen} onPress={onOpen} style={styles.creatorLevel}>
      <LinearGradient colors={['#201A1B', '#392A31']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.creatorLevelIcon}><Ionicons name="analytics" size={18} color={colors.paper} /></View>
      <View style={styles.creatorLevelCopy}>
        <Text style={styles.creatorLevelKicker}>NIVEAU {Math.min(5, index + 1)} · CARTE ARTISTE</Text>
        <Text style={styles.creatorLevelTitle}>{level.name}</Text>
        <Text style={styles.creatorLevelMeta}>{tracks} sons · {plays} plays · {Math.max(0, level.next - xp)} XP avant le prochain niveau</Text>
        <View style={styles.creatorLevelBar}><LinearGradient colors={[colors.cyan, colors.violet, colors.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.creatorLevelBarFill, { width: `${progress}%` }]} /></View>
      </View>
      {onOpen ? <Ionicons name="arrow-forward" size={15} color={colors.paper} /> : null}
    </Pressable>
  );
}

function makeTicker(city?: SynauraCityData | null) {
  if (!city) return 'Synaura Pulse · les sons qui montent maintenant · nouveaux talents · battles ouvertes';
  const hot = city.pulse.filter((track) => track.pulse >= 78).length;
  const battles = city.events.filter((event) => event.kind === 'battle' && !event.isEnded).length;
  return `Synaura Pulse est en live · ${hot} son${hot > 1 ? 's' : ''} en feu · ${battles} battle${battles > 1 ? 's' : ''} ouverte${battles > 1 ? 's' : ''} · ${city.spotlightArtists.length} nouveaux talents`;
}

const styles = StyleSheet.create({
  ticker: { minHeight: 64, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 22, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  tickerSignal: { position: 'absolute', right: -30, top: -55, width: 150, height: 150, borderRadius: 75 },
  tickerIcon: { width: 37, height: 37, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tickerText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: spacing.md },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { marginTop: 3, color: colors.text, fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  sectionAction: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 17, backgroundColor: 'rgba(23,19,19,0.06)', paddingHorizontal: 11 },
  sectionActionText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  pulseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 6 },
  pulseBadgeCompact: { borderRadius: 11, paddingHorizontal: 6, paddingVertical: 4 },
  pulseBadgeText: { fontSize: 9, fontWeight: '900' },
  pulseBadgeTextCompact: { fontSize: 8 },
  pulseBar: { overflow: 'hidden', backgroundColor: 'rgba(23,19,19,0.08)' },
  pulseBarFill: { height: '100%' },
  eventCard: { minHeight: 132, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 25, borderWidth: 1, borderColor: colors.border, padding: 14 },
  eventCardCompact: { minHeight: 116 },
  eventIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eventCopy: { flex: 1, minWidth: 0 },
  eventKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventKicker: { opacity: 0.58, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  eventTitle: { marginTop: 5, fontSize: 15, lineHeight: 18, fontWeight: '900' },
  eventMeta: { marginTop: 5, opacity: 0.48, fontSize: 9, fontWeight: '800' },
  eventArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  railSection: { marginTop: spacing.xl },
  rail: { gap: 10, paddingRight: spacing.md },
  railCard: { width: 270 },
  choice: { gap: 9, borderRadius: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,250,242,0.82)', padding: 14 },
  choiceRow: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: 'rgba(23,19,19,0.045)', paddingHorizontal: 11, paddingVertical: 8 },
  choiceRowActive: { backgroundColor: 'rgba(124,92,255,0.12)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.24)' },
  choiceRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  choiceRadioActive: { borderColor: colors.violet, backgroundColor: colors.violet },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  choiceMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  creatorLevel: { minHeight: 106, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 25, padding: 13 },
  creatorLevelIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.1)' },
  creatorLevelCopy: { flex: 1, minWidth: 0, gap: 4 },
  creatorLevelKicker: { color: '#C8B8FF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  creatorLevelTitle: { color: colors.paper, fontSize: 16, fontWeight: '900' },
  creatorLevelMeta: { color: 'rgba(255,250,242,0.46)', fontSize: 8, fontWeight: '700' },
  creatorLevelBar: { height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(255,250,242,0.1)' },
  creatorLevelBarFill: { height: '100%' },
});
