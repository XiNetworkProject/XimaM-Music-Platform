import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { callClock, callTitle, type VoiceCall } from './callModel';

type Props = {
  current: VoiceCall | null; incoming: VoiceCall | null; userId: string; phase: string; busy: boolean; expanded: boolean;
  muted: boolean; output: string; outputs: string[]; connectedAt: number | null; connectedIds: string[]; speakers: string[];
  error: string; onDismissError: () => void; onExpand: () => void; onMinimize: () => void;
  onAccept: () => void; onDecline: () => void; onEnd: () => void; onMute: () => void; onOutput: (value: string) => void;
};
const OUTPUTS: Record<string, string> = { speaker: 'Haut-parleur', earpiece: 'Écouteur', headset: 'Casque', bluetooth: 'Bluetooth' };
const PHASES: Record<string, string> = { permission: 'Autorise ton micro', connecting: 'Connexion…', waiting: 'En attente de réponse…', connected: 'En ligne', reconnecting: 'Reconnexion…' };
export function NativeCallOverlay(props: Props) {
  const layout = useResponsiveLayout();
  const { settings: { reducedMotion } } = useMobileSettings();
  const [now, setNow] = useState(Date.now());
  const [routesOpen, setRoutesOpen] = useState(false);
  useEffect(() => {
    if (!props.connectedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [props.connectedAt]);
  const title = callTitle(props.current || props.incoming, props.userId);
  const elapsed = props.connectedAt ? callClock((now - props.connectedAt) / 1000) : null;
  const status = props.phase === 'connected' && elapsed ? elapsed : PHASES[props.phase] || 'Appel vocal';
  const modal = props.expanded && Boolean(props.current || props.busy);
  return <>
    {props.error && !modal ? <View accessibilityLiveRegion="polite" style={[s.notice, { top: layout.insets.top + 12 }]}><Text style={s.noticeText}>{props.error}</Text><Icon icon="close" label="Fermer le message d’appel" onPress={props.onDismissError} /></View> : null}
    {props.incoming ? <View accessibilityViewIsModal style={[s.incoming, { top: layout.insets.top + 10, maxWidth: 520 }]}>
      <View style={s.incomingIdentity}><View style={s.smallAvatar}><Ionicons name="call" color="#BFC9FF" size={24} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.incomingName}>{title}</Text><Text style={s.muted}>Appel vocal entrant</Text></View></View>
      <View style={s.incomingActions}><EntryPressable accessibilityRole="button" onPress={props.onDecline} style={[s.answer, { backgroundColor: '#48202E' }]}><Ionicons name="close" color="#FFD9E0" size={22} /><Text style={s.answerLabel}>Refuser</Text></EntryPressable><EntryPressable accessibilityRole="button" onPress={props.onAccept} style={[s.answer, { backgroundColor: '#ABD9CB' }]}><Ionicons name="call" color="#102B27" size={22} /><Text style={[s.answerLabel, { color: '#102B27' }]}>Répondre</Text></EntryPressable></View>
    </View> : null}
    {props.current && !props.expanded ? <EntryPressable accessibilityRole="button" accessibilityLabel="Revenir à l’appel en cours" onPress={props.onExpand} style={[s.pill, { top: layout.insets.top + 8 }]}><View style={s.dot} /><Text numberOfLines={1} style={s.pillText}>{title} · {status}</Text><Ionicons name={props.muted ? 'mic-off' : 'call'} size={19} color="#B3DEC9" /></EntryPressable> : null}
    <Modal visible={modal} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={props.onMinimize} statusBarTranslucent={false}>
      <View style={[s.screen, { paddingTop: layout.insets.top, paddingBottom: Math.max(layout.insets.bottom, 16) }]}>
        <LinearGradient pointerEvents="none" colors={['#161A33', '#090D17', '#091914']} locations={[0, .6, 1]} style={StyleSheet.absoluteFill} />
        <View style={[s.header, layout.pageContent]}><Icon icon="chevron-down" label={props.current ? 'Réduire l’appel' : 'Annuler l’appel'} onPress={props.onMinimize} /><Text style={s.kicker}>SYNAURA · VOIX</Text><View style={{ width: 48 }} /></View>
        <ScrollView contentContainerStyle={[s.people, layout.pageContent]} showsVerticalScrollIndicator={false}>
          <View style={[s.orbit, { width: layout.compactControls ? 110 : 150, height: layout.compactControls ? 110 : 150 }]}><Ionicons name={props.current?.group ? 'people-outline' : 'call-outline'} size={52} color="#C5CDFF" /></View>
          <Text accessibilityRole="header" style={s.title}>{title}</Text>
          <Text accessibilityLiveRegion="polite" style={s.status}>{status}</Text>
          <View style={s.roster}>{props.current?.members.filter(person => person.state === 'joined' || person.state === 'invited').map(person => <View key={person.id} style={s.person}>
            <View style={[s.avatar, props.speakers.includes(person.id) && s.speaking]}><Text style={s.initial}>{person.name.slice(0, 1).toUpperCase()}</Text></View>
            <Text numberOfLines={1} style={s.personName}>{person.id === props.userId ? 'Toi' : person.name}</Text>
            <Text style={s.personState}>{props.connectedIds.includes(person.id) ? person.id === props.userId && props.muted ? 'Micro coupé' : 'En ligne' : person.state === 'invited' ? 'Invité' : 'Connexion…'}</Text>
          </View>)}</View>
          {props.error ? <Text accessibilityRole="alert" style={s.error}>{props.error}</Text> : null}
          {routesOpen && props.current ? <View style={s.routes}>{props.outputs.map(value => <EntryPressable key={value} accessibilityRole="button" accessibilityState={{ selected: props.output === value }} onPress={() => { props.onOutput(value); setRoutesOpen(false); }} style={s.route}><Ionicons name={value === 'speaker' ? 'volume-high-outline' : value === 'bluetooth' ? 'bluetooth-outline' : 'headset-outline'} size={22} color="#BFC9FF" /><Text style={s.routeLabel}>{OUTPUTS[value] || value}</Text>{props.output === value ? <Ionicons name="checkmark" size={20} color="#B3DEC9" /> : null}</EntryPressable>)}</View> : null}
        </ScrollView>
        <View style={[s.controls, layout.pageContent]}>
          <Control icon={props.muted ? 'mic-off' : 'mic-outline'} label={props.muted ? 'Activer le micro' : 'Couper le micro'} caption={props.muted ? 'Micro coupé' : 'Micro'} active={props.muted} disabled={!props.current || props.busy} onPress={props.onMute} />
          <Control icon={props.output === 'speaker' ? 'volume-high' : props.output === 'bluetooth' ? 'bluetooth' : 'ear-outline'} label="Choisir la sortie audio" caption={OUTPUTS[props.output] || 'Audio'} active={props.output === 'speaker'} disabled={!props.current || props.busy} onPress={() => setRoutesOpen(value => !value)} />
          <Control icon="call" label="Raccrocher" caption="Quitter" danger onPress={props.onEnd} />
        </View>
        <Text style={s.footnote}>La musique reste en pause.</Text>
      </View>
    </Modal>
  </>;
}
function Icon({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <EntryPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.icon}><Ionicons name={icon} size={24} color="#F2F4FF" /></EntryPressable>;
}
function Control({ icon, label, caption, active, disabled, danger, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; caption: string; active?: boolean; disabled?: boolean; danger?: boolean; onPress: () => void }) {
  return <EntryPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={onPress} style={[s.control, disabled && { opacity: .4 }]}><View style={[s.controlCircle, active && { backgroundColor: '#C5CDFF' }, danger && { backgroundColor: '#EC6C81' }]}><Ionicons name={icon} size={27} color={active || danger ? '#11172A' : '#EEF2FF'} style={danger ? { transform: [{ rotate: '135deg' }] } : undefined} /></View><Text style={s.controlCaption}>{caption}</Text></EntryPressable>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090D17' }, header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, icon: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }, kicker: { color: '#A6B0CC', fontSize: 11, letterSpacing: 2 },
  people: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 16 },
  orbit: { borderRadius: 90, backgroundColor: '#242D50', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 31, fontWeight: '700', color: '#F4F6FF', textAlign: 'center' }, status: { color: '#B3DEC9', fontSize: 16, fontVariant: ['tabular-nums'] },
  roster: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 22, marginTop: 14 }, person: { width: 96, alignItems: 'center', gap: 6 }, avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#242D43' }, speaking: { backgroundColor: '#365A53', borderWidth: 2, borderColor: '#9DE3C9' }, initial: { color: '#F4F6FF', fontSize: 24 }, personName: { color: '#EEF2FF', fontSize: 14 }, personState: { color: '#ADB9CB', fontSize: 11 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', gap: 12, paddingVertical: 15 }, control: { flex: 1, alignItems: 'center', gap: 9 }, controlCircle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#263049' }, controlCaption: { color: '#CDD5E7', fontSize: 12, textAlign: 'center' }, footnote: { textAlign: 'center', color: '#9EAEC4', fontSize: 12, padding: 12 },
  routes: { alignSelf: 'stretch', borderRadius: 22, backgroundColor: '#1B2437', padding: 12 }, route: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 10 }, routeLabel: { flex: 1, color: '#EEF2FF', fontSize: 15 }, error: { color: '#FFBDCC', textAlign: 'center', padding: 12 },
  incoming: { position: 'absolute', left: 12, right: 12, alignSelf: 'center', zIndex: 1000, elevation: 30, backgroundColor: '#182136', borderRadius: 26, padding: 18, gap: 16 }, incomingIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 }, smallAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2B3456', alignItems: 'center', justifyContent: 'center' }, incomingName: { color: '#F4F6FF', fontSize: 19, fontWeight: '700' }, muted: { color: '#ADB9CB', fontSize: 13, marginTop: 4 }, incomingActions: { flexDirection: 'row', gap: 12 }, answer: { flex: 1, minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, answerLabel: { fontSize: 14, fontWeight: '700', color: '#FFD9E0' },
  pill: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', zIndex: 1000, elevation: 30, borderRadius: 25, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1F3934' }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9DE3C9' }, pillText: { color: '#E8FFF5', fontSize: 14, flexShrink: 1 },
  notice: { position: 'absolute', left: 14, right: 14, zIndex: 1001, elevation: 31, flexDirection: 'row', alignItems: 'center', backgroundColor: '#382335', borderRadius: 22, paddingLeft: 16 }, noticeText: { color: '#FFE3EB', flex: 1, fontSize: 14 },
});
