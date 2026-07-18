import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MusicClip } from '@/api/types';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { SynauraImage } from '@/components/ui/SynauraImage';

const VISIBILITY_LABELS: Record<MusicClip['visibility'], string> = {
  published: 'Public',
  hidden: 'Privé',
  draft: 'Brouillon',
};

export function ProfileClipCard({
  clip,
  owner = false,
  style,
  onPress,
  onManage,
}: {
  clip: MusicClip;
  owner?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
  onManage?: () => void;
}) {
  const fallbackArtwork = clip.sourceTrack.coverUrl || null;
  const [artwork, setArtwork] = useState<string | null>(clip.posterUrl || fallbackArtwork);
  const title = clip.caption || clip.sourceTrack.title || 'Clip Synaura';

  useEffect(() => {
    setArtwork(clip.posterUrl || fallbackArtwork);
  }, [clip.posterUrl, fallbackArtwork]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le Clip ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
    >
      {artwork ? <SynauraImage source={{ uri: artwork }} lowPriority onError={() => setArtwork(artwork === fallbackArtwork ? null : fallbackArtwork)} style={StyleSheet.absoluteFillObject} /> : (
        <View style={styles.fallback}><Ionicons name="film-outline" size={30} color={colors.textTertiary} /></View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(13,13,13,0.05)', 'rgba(13,13,13,0.12)', 'rgba(13,13,13,0.94)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topRow}>
        <View style={[styles.status, clip.visibility === 'published' ? styles.statusPublic : styles.statusPrivate]}>
          <View style={[styles.statusDot, { backgroundColor: clip.visibility === 'published' ? colors.cyan : colors.coral }]} />
          <Text style={styles.statusText}>{owner ? VISIBILITY_LABELS[clip.visibility] : 'Clip'}</Text>
        </View>
        {owner && onManage ? (
          <Pressable
            accessibilityLabel="Gérer ce Clip"
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onManage();
            }}
            style={styles.more}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.warmWhite} />
          </Pressable>
        ) : null}
      </View>

      <View pointerEvents="none" style={styles.play}><Ionicons name="play" size={18} color={colors.black} /></View>

      <View pointerEvents="none" style={styles.copy}>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
        {clip.caption ? <Text numberOfLines={1} style={styles.track}>{clip.sourceTrack.title}</Text> : null}
        <View style={styles.metrics}>
          <View style={styles.metric}><Ionicons name="heart" size={11} color={colors.warmWhite} /><Text style={styles.metricText}>{clip.likesCount}</Text></View>
          <View style={styles.metric}><Ionicons name="chatbubble" size={10} color={colors.warmWhite} /><Text style={styles.metricText}>{clip.commentsCount}</Text></View>
          <Text numberOfLines={1} style={styles.duration}>{Math.max(0, Math.round(clip.sourceTrackDurationSeconds))} s</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    ...shadows.soft,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong },
  topRow: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  status: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 8, borderWidth: StyleSheet.hairlineWidth },
  statusPublic: { backgroundColor: 'rgba(13,13,13,0.72)', borderColor: 'rgba(74,158,170,0.42)' },
  statusPrivate: { backgroundColor: 'rgba(13,13,13,0.82)', borderColor: 'rgba(217,109,99,0.42)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.warmWhite, fontSize: 8, fontWeight: '900' },
  more: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,13,13,0.76)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(247,246,243,0.24)' },
  play: { position: 'absolute', top: '39%', left: '50%', width: 42, height: 42, marginLeft: -21, marginTop: -21, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingLeft: 2, backgroundColor: colors.warmWhite, ...shadows.floating },
  copy: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
  title: { color: colors.warmWhite, fontSize: 13, lineHeight: 16, fontWeight: '900' },
  track: { marginTop: 3, color: 'rgba(247,246,243,0.68)', fontSize: 9, fontWeight: '700' },
  metrics: { minHeight: 19, marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 9 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metricText: { color: 'rgba(247,246,243,0.8)', fontSize: 8, fontWeight: '800' },
  duration: { flex: 1, color: 'rgba(247,246,243,0.58)', textAlign: 'right', fontSize: 8, fontWeight: '800' },
});
