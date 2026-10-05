import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TrackCover } from '@/components/TrackCover';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { musicArtist, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { Track } from '@/api/types';

export function TrackDetailHero({ track, playing, onPlay, onArtist }: { track: Track; playing: boolean; onPlay: () => void; onArtist: () => void }) {
  const p = useCollectionPalette();
  const layout = useResponsiveLayout();
  const size = Math.min(layout.availableContentWidth - 52, layout.isPhoneLandscape ? 166 : 250);
  return <View>
    <View style={[s.stage, { minHeight: size + 64, backgroundColor: p.raised }]}>
      {track.coverUrl ? <Image source={{ uri: track.coverUrl }} blurRadius={28} style={[StyleSheet.absoluteFillObject, { opacity: .55 }]} /> : null}
      <LinearGradient colors={['rgba(8,11,19,.04)', 'rgba(8,11,19,.6)']} style={StyleSheet.absoluteFillObject} />
      <EntryPressable accessibilityRole="button" accessibilityLabel={(playing ? 'Mettre en pause · ' : 'Lire · ') + track.title} onPress={onPlay} style={[s.cover, { width: size, height: size }]}>
        <TrackCover track={track} active={playing} autoPlayVideo={playing} style={StyleSheet.absoluteFillObject} />
      </EntryPressable>
    </View>
    <View style={s.metadata}><View style={{ flex: 1, gap: 9 }}>
      <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{track.title}</Text>
      <EntryPressable accessibilityRole="button" accessibilityLabel={'Profil de ' + musicArtist(track)} disabled={!track.artist?.username} onPress={onArtist} style={s.artist}>
        {track.artist?.avatar ? <Image source={{ uri: track.artist.avatar }} style={s.avatar} /> : <View style={[s.avatar, s.fallback, { backgroundColor: p.raised }]}><Ionicons name="person-outline" size={15} color={p.blue} /></View>}
        <Text style={[s.artistName, { color: p.muted }]}>{musicArtist(track)}</Text><Ionicons name="chevron-forward" size={15} color={p.faint} />
      </EntryPressable>
    </View>
    <EntryPressable accessibilityRole="button" accessibilityLabel={playing ? 'Mettre en pause' : 'Lire le morceau'} onPress={onPlay} style={[s.play, { backgroundColor: p.text }]}><Ionicons name={playing ? 'pause' : 'play'} size={26} color={p.bg} /></EntryPressable></View>
  </View>;
}
const s = StyleSheet.create({
  stage: { overflow: 'hidden', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  cover: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#182031', elevation: 10, shadowColor: '#000', shadowOpacity: .32, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 24 },
  title: { fontSize: 29, fontWeight: '800', letterSpacing: 0 },
  artist: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8, alignSelf: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14 }, fallback: { alignItems: 'center', justifyContent: 'center' }, artistName: { fontSize: 15, flexShrink: 1 },
  play: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
});
