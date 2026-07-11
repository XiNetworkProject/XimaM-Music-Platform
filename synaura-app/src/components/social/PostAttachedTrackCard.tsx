import React from 'react';
import { DeviceEventEmitter, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Track } from '@/api/types';
import { TrackCover } from '@/components/TrackCover';
import { colors } from '@/theme/tokens';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { WaveformSeekBar } from '@/components/swipe/WaveformSeekBar';
import { MotionPressable } from '@/components/motion/Motion';

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
  const player = usePlayer();
  const isCurrent = player.current?._id === track._id;

  const openFullPlayer = () => {
    onPlay();
    setTimeout(() => DeviceEventEmitter.emit('synaura:open-full-player'), 80);
  };

  const seek = async (seconds: number) => {
    if (!isCurrent) await player.playTrack(track);
    await player.seekTo(seconds);
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
        {isCurrent ? (
          <ActiveAttachedWaveform track={track} onSeek={(seconds) => void seek(seconds)} />
        ) : (
          <WaveformSeekBar trackId={track._id} position={0} duration={track.duration || 0} onSeek={(seconds) => void seek(seconds)} showMoments={false} showTimes={false} height={22} barCount={34} style={styles.wave} />
        )}
      </View>
      <View style={styles.buttons}>
        <MotionPressable accessibilityLabel={playing ? 'Pause' : 'Lecture'} onPress={onPlay} style={styles.play} scaleTo={0.9}>
          <Ionicons name={playing ? 'pause' : 'play'} size={17} color={colors.black} />
        </MotionPressable>
        <MotionPressable accessibilityLabel="Ouvrir le lecteur" onPress={openFullPlayer} style={styles.full} scaleTo={0.9}>
          <Ionicons name="expand-outline" size={15} color="rgba(255,255,255,0.72)" />
        </MotionPressable>
      </View>
    </View>
  );
}

function ActiveAttachedWaveform({ track, onSeek }: { track: Track; onSeek: (seconds: number) => void }) {
  const progress = usePlayerProgress(160);
  return <WaveformSeekBar trackId={track._id} position={progress.positionSec} duration={progress.durationSec || track.duration || 0} onSeek={onSeek} showMoments={false} showTimes={false} height={22} barCount={34} style={styles.wave} />;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#111111',
    padding: 11,
  },
  cardCompact: { borderRadius: 8, padding: 9 },
  coverWrap: {
    width: 74,
    height: 74,
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  coverWrapCompact: { width: 58, height: 58, borderRadius: 8 },
  cover: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(115,87,198,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  duration: { color: 'rgba(255,255,255,0.42)', fontSize: 10, fontWeight: '900' },
  title: { marginTop: 7, color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  artist: { marginTop: 2, color: 'rgba(255,255,255,0.52)', fontSize: 11, fontWeight: '800' },
  wave: { marginTop: 9 },
  buttons: { gap: 8 },
  play: {
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  full: {
    width: 40,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});
