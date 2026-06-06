import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function FullPlayerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const track = player.current;
  const progress = player.durationSec > 0 ? Math.min(1, player.positionSec / player.durationSec) : 0;

  return (
    <Modal visible={visible && !!track} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <LinearGradient
          colors={['rgba(124,92,255,0.38)', 'rgba(0,208,187,0.10)', colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={onClose} style={styles.roundButton}>
            <Ionicons name="chevron-down" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Lecture</Text>
          <View style={styles.roundButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.coverFrame}>
            {track?.coverUrl ? <Image source={{ uri: track.coverUrl }} style={styles.cover} /> : null}
            <Ionicons name="musical-notes" size={54} color={colors.text} />
          </View>

          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={2}>{track?.title || 'Synaura'}</Text>
            <Text style={styles.artist} numberOfLines={1}>
              {track?.artist?.artistName || track?.artist?.name || track?.artist?.username || 'Artiste Synaura'}
            </Text>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatTime(player.positionSec)}</Text>
              <Text style={styles.time}>{formatTime(player.durationSec)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={player.previous} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={28} color={colors.text} />
            </Pressable>
            <Pressable onPress={player.togglePlayPause} style={styles.mainButton}>
              <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={34} color={colors.black} />
            </Pressable>
            <Pressable onPress={player.next} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={28} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  coverFrame: {
    aspectRatio: 1,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(124,92,255,0.25)',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  meta: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  artist: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressWrap: {
    marginTop: spacing.xl,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressFill: {
    height: 5,
    backgroundColor: colors.accent2,
  },
  timeRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
  },
  controls: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  controlButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
