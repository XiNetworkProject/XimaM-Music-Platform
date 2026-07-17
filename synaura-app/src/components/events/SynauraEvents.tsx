import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { CityEvent, CityPulseTrack, CityVoteSession, SynauraCityData } from '@/api/types';
import { colors, spacing } from '@/theme/tokens';
import { TrackCover } from '@/components/TrackCover';

type Tone = 'violet' | 'coral' | 'cyan' | 'ink';
const LIGHT_INK = '#111111';

const tones: Record<Tone, { background: readonly [string, string]; accent: string; ink: string }> = {
  violet: { background: ['#EEE9FF', '#FFF8F4'], accent: colors.violet, ink: LIGHT_INK },
  coral: { background: ['#FFE5DD', '#FFF9F1'], accent: colors.coral, ink: LIGHT_INK },
  cyan: { background: ['#DDF8F5', '#FFF9F1'], accent: '#008D96', ink: LIGHT_INK },
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

function countdownLabel(target?: string) {
  const delta = Math.max(0, new Date(target || 0).getTime() - Date.now());
  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  const seconds = Math.floor((delta % 60_000) / 1_000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function VoteCountdownBanner({
  current,
  next,
  onOpen,
  onNotify,
}: {
  current?: CityVoteSession | null;
  next?: CityVoteSession | null;
  onOpen: () => void;
  onNotify?: () => void;
}) {
  const session = current || next;
  const [remaining, setRemaining] = useState(() => countdownLabel(current?.endsAt || next?.startsAt));

  useEffect(() => {
    const timer = setInterval(() => setRemaining(countdownLabel(current?.endsAt || next?.startsAt)), 1000);
    return () => clearInterval(timer);
  }, [current?.endsAt, next?.startsAt]);

  if (!session) return null;
  return (
    <View style={styles.countdown}>
      {session.tracks?.[0] ? <TrackCover track={session.tracks[0]} style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient colors={['rgba(23,19,19,0.50)', 'rgba(23,19,19,0.78)', 'rgba(23,19,19,0.97)']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.countdownTop}>
        <View style={styles.countdownLogo}><Ionicons name={current ? 'flash' : 'time'} size={18} color={colors.white} /></View>
        <View style={styles.countdownCopy}><Text style={styles.countdownKicker}>{current ? 'VOTE EN COURS' : 'PROCHAIN VOTE DANS'}</Text><Text style={styles.countdownTitle}>{session.title}</Text></View>
        <View style={styles.countdownLive}><View style={styles.countdownLiveDot} /><Text style={styles.countdownLiveText}>{current ? 'LIVE' : 'À VENIR'}</Text></View>
      </View>
      <Text style={styles.countdownTime}>{remaining}</Text>
      <Text style={styles.countdownText}>{current ? 'Écoute les deux sons, puis donne la lumière à ton favori.' : 'Découvre déjà les artistes sélectionnés pour le prochain duel.'}</Text>
      <BattleDuel event={session} compact />
      <View style={styles.countdownParticipants}>
        <View style={styles.countdownCovers}>
          {(session.tracks || []).slice(0, 3).map((track, index) => <TrackCover key={track._id} track={track} style={[styles.countdownCover, index > 0 && styles.countdownCoverOverlap]} />)}
        </View>
        <Text style={styles.countdownParticipantsText}>{session.participants?.length || session.tracks?.length || 0} participants · {session.totalVotes || 0} votes</Text>
      </View>
      <View style={styles.countdownActions}>
        <Pressable onPress={onOpen} style={styles.countdownPrimary}><Ionicons name={current ? 'flash' : 'headset'} size={15} color={colors.white} /><Text style={styles.countdownPrimaryText}>{current ? 'Ouvrir le vote' : 'Voir les participants'}</Text></Pressable>
        {!current && onNotify ? <Pressable onPress={onNotify} style={styles.countdownNotify}><Ionicons name="notifications-outline" size={16} color={colors.paper} /></Pressable> : null}
      </View>
    </View>
  );
}

export function BattleDuel({ event, compact = false }: { event: CityEvent; compact?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const tracks = (event.tracks || []).slice(0, 2);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  if (tracks.length < 2) return null;
  return (
    <View style={[styles.duel, compact && styles.duelCompact]}>
      {tracks.map((track, index) => {
        const winner = event.winnerTrackId === track._id;
        return (
          <Animated.View
            key={track._id}
            style={[
              styles.duelCard,
              compact && styles.duelCardCompact,
              {
                transform: [
                  { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, index === 0 ? 4 : -4] }) },
                  { rotate: index === 0 ? '-4deg' : '4deg' },
                  { scale: winner ? 1.04 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.01] }) },
                ],
              },
            ]}
          >
            <TrackCover track={track} active={winner} style={styles.duelCover} />
            <View style={styles.duelLabel}><Text numberOfLines={1} style={styles.duelTitle}>{track.title}</Text></View>
            {winner ? <View style={styles.duelWinner}><Ionicons name="trophy" size={12} color={colors.text} /></View> : null}
          </Animated.View>
        );
      })}
      <Animated.View style={[styles.duelVs, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }]}>
        <Ionicons name={event.isEnded ? 'trophy' : 'flash'} size={compact ? 15 : 19} color={colors.paper} />
        {!compact ? <Text style={styles.duelVsText}>VS</Text> : null}
      </Animated.View>
    </View>
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
        <Ionicons name="arrow-forward" size={14} color={tone === 'ink' ? colors.black : colors.paper} />
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
  ticker: { minHeight: 58, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 2, borderTopColor: colors.coral, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong, paddingVertical: 9 },
  tickerSignal: { display: 'none' },
  tickerIcon: { width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tickerText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '900' },
  countdown: { minHeight: 220, overflow: 'hidden', justifyContent: 'flex-end', gap: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, padding: 14 },
  countdownTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  countdownLogo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  countdownCopy: { flex: 1, minWidth: 0 },
  countdownKicker: { color: '#FFB2A7', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  countdownTitle: { marginTop: 3, color: colors.paper, fontSize: 15, fontWeight: '900' },
  countdownLive: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, backgroundColor: 'rgba(255,250,242,0.13)', paddingHorizontal: 8, paddingVertical: 6 },
  countdownLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },
  countdownLiveText: { color: colors.paper, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  countdownCovers: { flexDirection: 'row', alignItems: 'center' },
  countdownCover: { width: 43, height: 43, borderRadius: 8, borderWidth: 2, borderColor: colors.paper },
  countdownCoverOverlap: { marginLeft: -12 },
  countdownTime: { color: colors.paper, fontSize: 29, fontWeight: '900', fontVariant: ['tabular-nums'] },
  countdownText: { maxWidth: 310, color: 'rgba(255,250,242,0.68)', fontSize: 11, lineHeight: 16, fontWeight: '800' },
  countdownParticipants: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countdownParticipantsText: { flex: 1, color: 'rgba(255,250,242,0.66)', fontSize: 9, fontWeight: '900' },
  countdownActions: { marginTop: 2, flexDirection: 'row', gap: 8 },
  countdownPrimary: { minHeight: 42, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: colors.violet, paddingHorizontal: 13 },
  countdownPrimaryText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  countdownNotify: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.12)' },
  duel: { minHeight: 180, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  duelCompact: { minHeight: 105, gap: 5, paddingVertical: 2 },
  duelCard: { width: '42%', aspectRatio: 0.88, overflow: 'hidden', borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.26)', backgroundColor: colors.surfaceStrong },
  duelCardCompact: { maxWidth: 105, borderRadius: 12 },
  duelCover: { width: '100%', height: '100%' },
  duelLabel: { position: 'absolute', left: 5, right: 5, bottom: 5, borderRadius: 12, backgroundColor: 'rgba(23,19,19,0.82)', paddingHorizontal: 7, paddingVertical: 6 },
  duelTitle: { color: colors.paper, fontSize: 8, fontWeight: '900' },
  duelWinner: { position: 'absolute', right: 7, top: 7, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD667' },
  duelVs: { position: 'absolute', left: '50%', zIndex: 2, width: 48, height: 48, marginLeft: -24, borderRadius: 24, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet, elevation: 8 },
  duelVsText: { marginTop: -2, color: colors.paper, fontSize: 7, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: spacing.md },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { marginTop: 3, color: colors.text, fontSize: 21, fontWeight: '900' },
  sectionSubtitle: { marginTop: 3, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  sectionAction: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 17, backgroundColor: colors.surfaceMuted, paddingHorizontal: 11 },
  sectionActionText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  pulseBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 6 },
  pulseBadgeCompact: { borderRadius: 11, paddingHorizontal: 6, paddingVertical: 4 },
  pulseBadgeText: { fontSize: 9, fontWeight: '900' },
  pulseBadgeTextCompact: { fontSize: 8 },
  pulseBar: { overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  pulseBarFill: { height: '100%' },
  eventCard: { minHeight: 120, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 },
  eventCardCompact: { minHeight: 116 },
  eventIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
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
  choice: { gap: 0, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  choiceRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 8 },
  choiceRowActive: { backgroundColor: 'rgba(124,92,255,0.12)', borderWidth: 1, borderColor: 'rgba(124,92,255,0.24)' },
  choiceRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  choiceRadioActive: { borderColor: colors.violet, backgroundColor: colors.violet },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  choiceMeta: { marginTop: 3, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  creatorLevel: { minHeight: 98, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12 },
  creatorLevelIcon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.1)' },
  creatorLevelCopy: { flex: 1, minWidth: 0, gap: 4 },
  creatorLevelKicker: { color: '#C8B8FF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  creatorLevelTitle: { color: colors.paper, fontSize: 16, fontWeight: '900' },
  creatorLevelMeta: { color: 'rgba(255,250,242,0.46)', fontSize: 8, fontWeight: '700' },
  creatorLevelBar: { height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(255,250,242,0.1)' },
  creatorLevelBarFill: { height: '100%' },
});
