import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { RARITY_COLOR, RARITY_LABEL, WHEEL_SEGMENTS, wheelArc, wheelLanding, type NativeBooster, type ReceivedBooster, type SpinOutcome } from './boosterModel';

export function BoosterCard({ booster }: { booster: NativeBooster }) {
  const tone = RARITY_COLOR[booster.rarity] || '#BDD3EC';
  return <LinearGradient colors={['#25304A', '#151927']} style={s.reward}><View style={[s.rewardGlyph, { backgroundColor: tone }]}><Ionicons name={booster.type === 'credits' ? 'sparkles' : booster.type === 'artist' ? 'person' : 'flash'} size={34} color="#1A1B2D" /></View><Text style={[s.rarity, { color: tone }]}>{RARITY_LABEL[booster.rarity] || booster.rarity}</Text><Text style={s.rewardTitle}>{booster.name}</Text><Text style={s.rewardDescription}>{booster.description}</Text>{booster.type !== 'credits' ? <Text style={s.rewardDescription}>Coefficient ×{booster.multiplier} · {booster.duration_hours} h</Text> : null}</LinearGradient>;
}
export function BoosterReveal({ onOpen, onBusy }: { onOpen: () => Promise<ReceivedBooster[]>; onBusy: (busy: boolean) => void }) {
  const p = useCollectionPalette(); const animate = useEntryMotion(); const rip = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<'ready' | 'loading' | 'result' | 'error'>('ready'); const [received, setReceived] = useState<ReceivedBooster[]>([]); const [error, setError] = useState('');
  const started = useRef(false); const alive = useRef(true); const reduce = useRef(!animate); reduce.current = !animate;
  useEffect(() => { alive.current = true; return () => { alive.current = false; rip.stopAnimation(); }; }, [rip]);
  const open = async () => {
    if (started.current) return;
    started.current = true; onBusy(true); setPhase('loading');
    try {
      const result = await onOpen(); if (!alive.current) return;
      Animated.timing(rip, { toValue: 1, duration: reduce.current ? 0 : 550, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start(() => { if (!alive.current) return; setReceived(result); setPhase('result'); onBusy(false); });
    } catch (reason) { if (!alive.current) return; setError(reason instanceof Error ? reason.message : 'Résultat incertain. Vérifie ton inventaire.'); setPhase('error'); onBusy(false); }
  };
  const openRef = useRef(open); openRef.current = open;
  const gesture = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !started.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => { if (!reduce.current) rip.setValue(Math.min(.5, Math.abs(g.dx) / 260)); },
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 85) void openRef.current(); else Animated.spring(rip, { toValue: 0, useNativeDriver: true, isInteraction: false }).start(); },
    onPanResponderTerminate: () => { if (!started.current) rip.setValue(0); },
  }), [rip]);
  if (phase === 'result') return <View style={{ gap: 16 }}><Text accessibilityLiveRegion="polite" style={[s.message, { color: p.text }]}>Dans ton inventaire. À toi de choisir quand les utiliser.</Text>{received.map(item => <BoosterCard key={item.inventory_id} booster={item.booster} />)}</View>;
  if (phase === 'error') return <Text accessibilityRole="alert" style={[s.message, { color: p.text }]}>{error}</Text>;
  return <View style={{ gap: 20, alignItems: 'center' }}>
    <View {...gesture.panHandlers} style={s.pack}>
      <LinearGradient colors={['#4A487B', '#242439', '#171F32']} style={s.packBody}><Ionicons name="flash" size={76} color="#E2DAFF" /><Text style={s.packLabel}>SYNAURA</Text></LinearGradient>
      <Animated.View pointerEvents="none" style={[s.seal, { transform: [{ translateX: rip.interpolate({ inputRange: [0, 1], outputRange: [0, 170] }) }, { translateY: rip.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }, { rotate: rip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '28deg'] }) }], opacity: rip.interpolate({ inputRange: [0, .6, 1], outputRange: [1, 1, 0] }) }]}><LinearGradient colors={['#837BBD', '#334C74']} style={s.sealInner}><Ionicons name="arrow-forward" size={25} color="#F1F3FF" /><Text style={s.rarity}>TIRE POUR OUVRIR</Text></LinearGradient></Animated.View>
      <View pointerEvents="none" style={s.tearLine} />
    </View>
    <EntryPressable accessibilityRole="button" accessibilityLabel="Ouvrir le booster" disabled={phase !== 'ready'} onPress={() => void open()} style={[s.button, { backgroundColor: p.text }]}>{phase === 'loading' ? <ActivityIndicator color={p.bg} /> : <Ionicons name="gift-outline" size={20} color={p.bg} />}<Text style={[s.buttonText, { color: p.bg }]}>{phase === 'loading' ? 'Ouverture…' : 'Déchirer le sachet'}</Text></EntryPressable>
    <Text style={[s.message, { color: p.muted }]}>Glisse sur le sachet ou utilise le bouton. La récompense est attribuée par Synaura, jamais par l’animation.</Text>
  </View>;
}
export function NativeRewardWheel({ onSpin, onBusy }: { onSpin: () => Promise<SpinOutcome>; onBusy: (busy: boolean) => void }) {
  const p = useCollectionPalette(); const layout = useResponsiveLayout(); const animate = useEntryMotion();
  const angle = useRef(new Animated.Value(0)).current; const lock = useRef(false); const alive = useRef(true); const reduced = useRef(!animate); reduced.current = !animate;
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'result' | 'error'>('ready'); const [result, setResult] = useState<SpinOutcome | null>(null); const [error, setError] = useState('');
  useEffect(() => { alive.current = true; return () => { alive.current = false; angle.stopAnimation(); }; }, [angle]);
  const spin = async () => {
    if (lock.current) return; lock.current = true; setPhase('spinning'); onBusy(true);
    try {
      const outcome = await onSpin(); if (!alive.current) return;
      Animated.timing(angle, { toValue: wheelLanding(outcome.index), duration: reduced.current ? 0 : 3600, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start(() => { if (!alive.current) return; setResult(outcome); setPhase('result'); onBusy(false); });
    } catch (reason) { if (!alive.current) return; setError(reason instanceof Error ? reason.message : 'Résultat incertain. Vérifie tes récompenses.'); setPhase('error'); onBusy(false); }
  };
  const size = Math.min(310, layout.safeWidth - 64);
  return <View style={{ gap: 20, alignItems: 'center' }}>
    <View style={{ width: size, height: size }}><Animated.View style={{ transform: [{ rotate: angle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}><Svg width={size} height={size} viewBox="0 0 300 300">{WHEEL_SEGMENTS.map((entry, index) => {
      const { start, end, middle } = wheelArc(index); const point = (value: number, radius: number) => { const radians = (value - 90) * Math.PI / 180; return { x: 150 + radius * Math.cos(radians), y: 150 + radius * Math.sin(radians) }; };
      const a = point(start, 145); const b = point(end, 145); const label = point(middle, 96);
      return <React.Fragment key={entry.key}><Path d={'M 150 150 L ' + a.x + ' ' + a.y + ' A 145 145 0 ' + (end - start > 180 ? '1' : '0') + ' 1 ' + b.x + ' ' + b.y + ' Z'} fill={entry.color} stroke="#10192B" strokeWidth={2} />{entry.weight >= 10 ? <SvgText x={label.x} y={label.y} fontSize={entry.kind === 'credits' ? 23 : 12} fontWeight="bold" fill="#FFFFFF" textAnchor="middle" alignmentBaseline="middle">{entry.label}</SvgText> : null}</React.Fragment>;
    })}<Circle cx={150} cy={150} r={30} fill="#10192B" /></Svg></Animated.View><View pointerEvents="none" style={s.pointer}><Ionicons name="caret-down" size={30} color="#F4E0BA" /></View><View pointerEvents="none" style={s.wheelCore}><Ionicons name="flash" size={24} color="#F4E0BA" /></View></View>
    {phase === 'ready' || phase === 'spinning' ? <EntryPressable accessibilityRole="button" disabled={phase !== 'ready'} onPress={() => void spin()} style={[s.button, { backgroundColor: p.text }]}>{phase === 'spinning' ? <ActivityIndicator color={p.bg} /> : null}<Text style={[s.buttonText, { color: p.bg }]}>{phase === 'spinning' ? 'La roue tourne…' : 'À toi de tourner'}</Text></EntryPressable> : null}
    {result ? <><Text accessibilityLiveRegion="polite" style={[s.result, { color: p.text }]}>{result.reward.label}</Text>{result.rewardPayload?.booster ? <BoosterCard booster={result.rewardPayload.booster} /> : null}</> : null}
    {error ? <Text accessibilityRole="alert" style={[s.message, { color: p.text }]}>{error}</Text> : null}
    <View style={{ alignSelf: 'stretch', gap: 9 }}>{WHEEL_SEGMENTS.map(entry => <View key={entry.key} style={s.odds}><View style={[s.dot, { backgroundColor: entry.color }]} /><Text style={{ flex: 1, color: p.muted, fontSize: 12 }}>{entry.label}{entry.kind === 'credits' ? ' crédits IA' : ''}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{entry.weight} %</Text></View>)}</View>
  </View>;
}
const s = StyleSheet.create({
  reward: { width: '100%', borderRadius: 26, padding: 26, alignItems: 'center', gap: 16 },
  rewardGlyph: { width: 76, height: 76, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, rarity: { color: '#D6D3EF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, rewardTitle: { color: '#F4F5FE', fontSize: 24, fontWeight: '800', textAlign: 'center' }, rewardDescription: { color: '#C5CDE1', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  message: { fontSize: 13, lineHeight: 21, textAlign: 'center' }, result: { fontSize: 25, fontWeight: '800', textAlign: 'center' }, button: { minHeight: 54, paddingHorizontal: 24, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, buttonText: { fontSize: 15, fontWeight: '700' },
  pack: { width: '90%', maxWidth: 245, height: 305, marginTop: 18 }, packBody: { position: 'absolute', left: 0, right: 0, top: 62, bottom: 0, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, alignItems: 'center', justifyContent: 'center', gap: 30 }, packLabel: { color: '#A8BAD8', fontSize: 12, letterSpacing: 5 }, seal: { position: 'absolute', top: 0, left: 0, right: 0, height: 64, zIndex: 2 }, sealInner: { flex: 1, borderTopLeftRadius: 23, borderTopRightRadius: 23, alignItems: 'center', justifyContent: 'center', gap: 5 }, tearLine: { position: 'absolute', left: 0, right: 0, top: 62, height: 2, backgroundColor: '#C4BBF2', opacity: .8 },
  pointer: { position: 'absolute', left: '50%', marginLeft: -15, top: -12 }, wheelCore: { position: 'absolute', left: '50%', top: '50%', marginLeft: -14, marginTop: -14 }, odds: { flexDirection: 'row', alignItems: 'center', gap: 9 }, dot: { width: 10, height: 10, borderRadius: 5 },
});
