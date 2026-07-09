import React from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { colors } from '@/theme/tokens';

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function formatDuration(seconds?: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  if (!safe) return '';
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function PostAttachedTrackCard({
  track,
  playing,
  compact = false,
  onPlay,
  onOpen,
}: {
  track: Track;
  playing: boolean;
  compact?: boolean;
  onPlay: () => void;
  onOpen?: () => void;
}) {
  const duration = formatDuration(track.duration);
  const bars = [8, 16, 11, 22, 13, 19, 10, 24, 14, 18];

  const openFullPlayer = () => {
    onPlay();
    setTimeout(() => DeviceEventEmitter.emit('synaura:open-full-player'), 80);
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Pressable onPress={onOpen} style={[styles.coverWrap, compact && styles.coverWrapCompact]}>
        <TrackCover track={track} active={playing} autoPlayVideo={playing} style={styles.cover} />
      </Pressable>
      <View style={styles.copy}>
        <View style={styles.kickerRow}>
          <View style={styles.badge}>
            <Ionicons name="radio-outline" size={10} color="#FFFFFF" />
            <Text style={styles.badgeText}>Son attaché</Text>
          </View>
          {duration ? <Text style={styles.duration}>{duration}</Text> : null}
        </View>
        <Pressable onPress={onOpen}>
          <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.artist}>{artistName(track)}</Text>
        </Pressable>
        <View style={styles.wave}>
          {bars.map((height, index) => (
            <View key={index} style={[styles.waveBar, { height: playing ? height : Math.max(5, Math.round(height * 0.45)) }]} />
          ))}
          <Text style={styles.waveText}>{playing ? 'En lecture' : 'Waveform'}</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Pressable onPress={onPlay} style={styles.play}>
          <Ionicons name={playing ? 'pause' : 'play'} size={17} color={colors.black} />
        </Pressable>
        <Pressable onPress={openFullPlayer} style={styles.full}>
          <Ionicons name="expand-outline" size={15} color="rgba(255,255,255,0.72)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#111111',
    padding: 11,
  },
  cardCompact: { borderRadius: 18, padding: 9 },
  coverWrap: {
    width: 74,
    height: 74,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  coverWrapCompact: { width: 58, height: 58, borderRadius: 15 },
  cover: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(115,87,198,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  duration: { color: 'rgba(255,255,255,0.42)', fontSize: 10, fontWeight: '900' },
  title: { marginTop: 7, color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  artist: { marginTop: 2, color: 'rgba(255,255,255,0.52)', fontSize: 11, fontWeight: '800' },
  wave: {
    marginTop: 9,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 9,
  },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' },
  waveText: { marginLeft: 'auto', color: 'rgba(255,255,255,0.34)', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  buttons: { gap: 8 },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  full: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});

