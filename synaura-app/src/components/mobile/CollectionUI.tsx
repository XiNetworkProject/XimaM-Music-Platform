import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from '@/api/types';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { EntryMotionScope, useEntryMotion } from '@/components/entry/EntryAtmosphere';
import { TrackCover } from '@/components/TrackCover';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { mobile } from './SoundRoom';

export type CollectionIcon = keyof typeof Ionicons.glyphMap;
const light = { bg: '#F3F5FA', surface: '#FFFFFF', raised: '#E5EAF3', text: '#152033', muted: '#4C5C73', faint: '#5D6B80', blue: '#245E98', violet: '#6A49A8', line: 'rgba(28,48,76,.12)' };
export function useCollectionPalette() {
  return useMobileSettings().resolvedTheme === 'light' ? light : mobile;
}

export function CollectionSurface({ children, protectStatusBar = true }: { children: React.ReactNode; protectStatusBar?: boolean }) {
  const p = useCollectionPalette();
  const insets = useSafeAreaInsets();
  return <EntryMotionScope><View style={{ flex: 1, backgroundColor: p.bg }}>{children}{protectStatusBar ? <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: p.bg }} /> : null}</View></EntryMotionScope>;
}

/** A single native entrance, stopped offscreen or with reduced motion. */
export function CollectionReveal({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const motion = useEntryMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const revealed = useRef(false);
  useEffect(() => {
    if (!motion) { progress.stopAnimation(); progress.setValue(1); return; }
    if (revealed.current) return;
    revealed.current = true;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 320, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [motion, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}

export function CollectionIconButton({ icon, label, onPress, badge = 0 }: { icon: CollectionIcon; label: string; onPress: () => void; badge?: number }) {
  const p = useCollectionPalette();
  return <EntryPressable accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} non lus` : label} onPress={onPress} style={s.icon}>
    <Ionicons name={icon} size={23} color={p.text} />
    {badge > 0 ? <View style={[s.dot, { backgroundColor: p.blue }]} /> : null}
  </EntryPressable>;
}

export function CollectionHeader({ title, eyebrow, actions, onBack }: { title: string; eyebrow?: string; actions?: React.ReactNode; onBack?: () => void }) {
  const p = useCollectionPalette();
  return <View style={s.header}>
    {onBack ? <CollectionIconButton icon="arrow-back" label="Retour" onPress={onBack} /> : null}
    <View style={s.grow}>{eyebrow ? <Text style={[s.eyebrow, { color: p.blue }]}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text></View>
    <View style={s.actions}>{actions}</View>
  </View>;
}

export function CollectionTabs<T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon?: CollectionIcon; count?: number }[]; value: T; onChange: (value: T) => void }) {
  const p = useCollectionPalette();
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
    {options.map(option => {
      const selected = value === option.value;
      return <EntryPressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={[s.tab, { backgroundColor: selected ? p.text : p.surface }]}>
        {option.icon ? <Ionicons name={option.icon} size={16} color={selected ? p.bg : p.muted} /> : null}
        <Text style={[s.tabText, { color: selected ? p.bg : p.muted }]}>{option.label}{option.count != null ? `  ${option.count}` : ''}</Text>
      </EntryPressable>;
    })}
  </ScrollView>;
}

export function CollectionHeading({ title, detail, action, onPress }: { title: string; detail?: string; action?: string; onPress?: () => void }) {
  const p = useCollectionPalette();
  return <View style={s.sectionHeading}><View style={s.grow}><Text accessibilityRole="header" style={[s.sectionTitle, { color: p.text }]}>{title}</Text>{detail ? <Text style={[s.meta, { color: p.muted }]}>{detail}</Text> : null}</View>
    {onPress ? <EntryPressable accessibilityRole="button" onPress={onPress} style={s.textAction}><Text style={{ color: p.blue, fontWeight: '700', fontSize: 12 }}>{action || 'Tout voir'}</Text><Ionicons name="arrow-forward" size={16} color={p.blue} /></EntryPressable> : null}
  </View>;
}

export function CollectionEmpty({ icon = 'musical-notes-outline', title, text, action, onPress, loading }: { icon?: CollectionIcon; title: string; text?: string; action?: string; onPress?: () => void; loading?: boolean }) {
  const p = useCollectionPalette();
  return <View style={s.empty}>
    <View style={[s.emptyIcon, { backgroundColor: p.raised }]}>{loading ? <ActivityIndicator color={p.blue} /> : <Ionicons name={icon} size={28} color={p.blue} />}</View>
    <Text style={[s.sectionTitle, { color: p.text, textAlign: 'center' }]}>{title}</Text>
    {text ? <Text style={[s.emptyText, { color: p.muted }]}>{text}</Text> : null}
    {onPress ? <EntryPressable accessibilityRole="button" onPress={onPress} style={[s.emptyAction, { backgroundColor: p.text }]}><Text style={{ color: p.bg, fontWeight: '700' }}>{action}</Text></EntryPressable> : null}
  </View>;
}

export function musicArtist(track: Track) { return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura'; }
export function musicCount(value?: number) { return Intl.NumberFormat('fr', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0); }

// Presentational only: the screen owns playback, navigation and all requests.
export function MusicRow({ track, playing, onPlay, onOpen, onMore, subtitle }: { track: Track; playing?: boolean; onPlay: () => void; onOpen?: () => void; onMore?: () => void; subtitle?: string }) {
  const p = useCollectionPalette();
  const animateCover = useEntryMotion(Boolean(playing));
  return <View style={s.row}>
    <EntryPressable accessibilityRole="button" accessibilityLabel={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`} onPress={onPlay} style={s.rowArt}>
      <TrackCover track={track} active={animateCover} autoPlayVideo={animateCover} style={s.rowCover} />
      {playing ? <View style={s.playingShade}><Ionicons name="pause" size={22} color="#FFFFFF" /></View> : null}
    </EntryPressable>
    <EntryPressable accessibilityRole="button" accessibilityLabel={`${onOpen ? 'Ouvrir' : 'Écouter'} ${track.title}`} onPress={onOpen || onPlay} style={s.rowCopy}>
      <Text numberOfLines={1} style={[s.trackTitle, { color: playing ? p.blue : p.text }]}>{track.title}</Text>
      <Text numberOfLines={1} style={[s.meta, { color: p.muted }]}>{subtitle || musicArtist(track)}</Text>
    </EntryPressable>
    {onMore ? <CollectionIconButton icon="ellipsis-horizontal" label={`Options de ${track.title}`} onPress={onMore} /> : <CollectionIconButton icon={playing ? 'pause' : 'play-outline'} label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`} onPress={onPlay} />}
  </View>;
}

export function MusicTile({ track, playing, onPlay, onOpen, onMore, width = 156, privateTrack }: { track: Track; playing?: boolean; onPlay: () => void; onOpen: () => void; onMore?: () => void; width?: number | `${number}%`; privateTrack?: boolean }) {
  const p = useCollectionPalette();
  const animateCover = useEntryMotion(Boolean(playing));
  return <View style={{ width, gap: 9 }}>
    <View style={[s.tileArt, { backgroundColor: p.raised }]}>
      <EntryPressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${track.title}`} onPress={onOpen} style={StyleSheet.absoluteFillObject}>
        <TrackCover track={track} active={animateCover} autoPlayVideo={animateCover} style={StyleSheet.absoluteFillObject} />
      </EntryPressable>
      <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,.38)']} style={StyleSheet.absoluteFillObject} />
      {privateTrack ? <View style={s.private}><Ionicons name="lock-closed" size={11} color="#FFF" /><Text style={{ color: '#FFF', fontSize: 10 }}>Privé</Text></View> : null}
      <EntryPressable accessibilityRole="button" accessibilityLabel={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`} onPress={onPlay} style={[s.play, { backgroundColor: playing ? '#B9DFFF' : '#F5F7FC' }]}><Ionicons name={playing ? 'pause' : 'play'} size={20} color="#111A29" /></EntryPressable>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><EntryPressable accessibilityRole="button" onPress={onOpen} style={s.grow}><Text numberOfLines={1} style={[s.trackTitle, { color: p.text }]}>{track.title}</Text><Text numberOfLines={1} style={[s.meta, { color: p.muted }]}>{musicArtist(track)}</Text></EntryPressable>{onMore ? <CollectionIconButton icon="ellipsis-horizontal" label={`Options de ${track.title}`} onPress={onMore} /> : null}</View>
  </View>;
}

const s = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 }, header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 }, actions: { flexDirection: 'row' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 5 }, title: { fontSize: 30, fontWeight: '800', letterSpacing: 0 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, dot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },
  tabs: { gap: 8, paddingVertical: 8 }, tab: { minHeight: 44, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 7 }, tabText: { fontSize: 13, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 }, sectionTitle: { fontSize: 21, fontWeight: '800', letterSpacing: 0 }, textAction: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center' },
  meta: { fontSize: 12, lineHeight: 18, marginTop: 3 }, trackTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 82, paddingVertical: 8 }, rowArt: { width: 62, height: 62, borderRadius: 14, overflow: 'hidden' }, rowCover: { flex: 0, width: 62, height: 62 }, rowCopy: { flex: 1, minWidth: 0, paddingVertical: 10 }, playingShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'center' },
  tileArt: { width: '100%', aspectRatio: 1, borderRadius: 19, overflow: 'hidden' }, play: { position: 'absolute', right: 10, bottom: 10, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, private: { position: 'absolute', top: 9, left: 9, flexDirection: 'row', gap: 4, padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,.6)' },
  empty: { alignItems: 'center', paddingVertical: 38, paddingHorizontal: 22, gap: 14 }, emptyIcon: { width: 70, height: 70, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }, emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 22, maxWidth: 300 }, emptyAction: { paddingHorizontal: 22, paddingVertical: 15, borderRadius: 24, marginTop: 6 },
});
