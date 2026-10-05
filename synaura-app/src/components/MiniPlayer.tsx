import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { trackArtistName } from '@/components/swipe/helpers';
import { TrackCover } from '@/components/TrackCover';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useEntryMotion } from '@/components/entry/EntryAtmosphere';

type Props = { activeRoute?: string; onOpen?: () => void };
const DOCK_ROUTES = new Set(['Swipe', 'Discover', 'Library', 'Profile']);
const HIDDEN_ROUTES = new Set(['Swipe', 'Notifications', 'Conversation', 'Upload', 'ClipComposer', 'CreatePost', 'CreateVariation', 'CreateHub', 'AIStudio', 'Welcome', 'Login', 'Register', 'ForgotPassword', 'Onboarding', 'PhoneAuth']);
export function MiniPlayer({ activeRoute = '', onOpen }: Props) {
  const layout = useResponsiveLayout();
  const player = usePlayer();
  const progress = usePlayerProgress(500);
  const p = useCollectionPalette();
  const reveal = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const visible = Boolean(player.current && !HIDDEN_ROUTES.has(activeRoute));
  const animate = useEntryMotion(visible);
  const width = Math.min(layout.safeWidth - 20, 560);
  const hasDock = DOCK_ROUTES.has(activeRoute);
  useEffect(() => {
    Animated.timing(reveal, { toValue: visible ? 1 : 0, duration: animate ? 240 : 0, useNativeDriver: true }).start();
    return () => reveal.stopAnimation();
  }, [visible, animate, reveal]);
  const settle = () => {
    if (!animate) drag.setValue(0);
    else Animated.spring(drag, { toValue: 0, speed: 26, bounciness: 5, useNativeDriver: true }).start();
  };
  const step = (next: boolean) => {
    void Haptics.selectionAsync().catch(() => {});
    void (next ? player.next() : player.previous()).catch(() => {});
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 || (g.dy < -22 && Math.abs(g.dy) > Math.abs(g.dx)),
    onPanResponderMove: (_, g) => { if (animate) drag.setValue(Math.max(-72, Math.min(72, g.dx))); },
    onPanResponderRelease: (_, g) => {
      if (g.dy < -50 && Math.abs(g.dy) > Math.abs(g.dx)) onOpen?.();
      else if (g.dx < -70) step(true);
      else if (g.dx > 70) step(false);
      settle();
    },
    onPanResponderTerminate: settle,
  }), [player, onOpen, drag, animate]);
  if (!player.current) return null;
  const percentage = progress.durationSec > 0 ? Math.min(1, Math.max(0, progress.positionSec / progress.durationSec)) : 0;
  return <Animated.View pointerEvents={visible ? 'box-none' : 'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    {...pan.panHandlers} style={[s.wrap, { width, left: layout.insets.left + (layout.safeWidth - width) / 2,
      bottom: hasDock ? layout.dockHeight + Math.max(layout.insets.bottom, 7) + 6 : layout.insets.bottom + 10,
      opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }, { translateX: drag }] }]}>
    <View style={[s.card, { backgroundColor: p.raised, shadowColor: '#000' }]}>
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir le lecteur · ' + player.current.title} onPress={onOpen} style={s.open}>
          <View style={[s.cover, { backgroundColor: p.surface }]}><TrackCover track={player.current} active={animate && player.isPlaying} autoPlayVideo={animate && player.isPlaying} style={StyleSheet.absoluteFillObject} /></View>
          <View style={s.copy}><Text numberOfLines={1} style={[s.title, { color: p.text }]}>{player.current.title}</Text><View style={s.artistLine}>{player.isPlaying ? <View style={[s.dot, { backgroundColor: p.blue }]} /> : null}<Text numberOfLines={1} style={[s.artist, { color: p.muted }]}>{trackArtistName(player.current)}</Text></View></View>
        </Pressable>
        <EntryPressable accessibilityRole="button" accessibilityLabel={player.isPlaying ? 'Mettre en pause' : 'Lire'} accessibilityState={{ busy: player.isLoading }} onPress={() => void player.togglePlayPause().catch(() => {})} style={[s.play, { backgroundColor: p.text }]}><Ionicons name={player.isLoading ? 'ellipsis-horizontal' : player.isPlaying ? 'pause' : 'play'} size={23} color={p.bg} /></EntryPressable>
        <EntryPressable accessibilityRole="button" accessibilityLabel="Morceau suivant" onPress={() => step(true)} style={s.next}><Ionicons name="play-skip-forward" size={21} color={p.text} /></EntryPressable>
      </View>
      <View pointerEvents="none" style={[s.progress, { backgroundColor: p.line }]}><View style={{ height: 2, width: `${percentage * 100}%`, backgroundColor: p.blue }} /></View>
    </View>
  </Animated.View>;
}
const s = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 30 }, card: { borderRadius: 22, overflow: 'hidden', elevation: 10, shadowOpacity: .16, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6 },
  open: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 48 },
  cover: { width: 46, height: 46, borderRadius: 15, overflow: 'hidden' }, copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700' }, artistLine: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 4 },
  artist: { fontSize: 12, flexShrink: 1 }, dot: { width: 5, height: 5, borderRadius: 3 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  next: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, progress: { height: 2, marginHorizontal: 18 },
});
