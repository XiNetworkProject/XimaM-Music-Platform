import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { addMomentReaction, createComment } from '@/api/client';
import type { HomeComment, MomentReactionType, Track } from '@/api/types';
import { fmtTime } from '@/components/swipe/helpers';
import { invalidateTrackMoments, loadTrackMoments, WaveformSeekBar } from '@/components/swipe/WaveformSeekBar';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { colors, radius, spacing } from '@/theme/tokens';
import { MOMENT_REACTIONS, type ReactionMeta } from '@/constants/momentReactions';

export { MOMENT_REACTIONS } from '@/constants/momentReactions';
export type { ReactionMeta } from '@/constants/momentReactions';

type Props = {
  track: Track;
  position: number;
  duration: number;
  isPlaying?: boolean;
  momentsEnabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onSeek: (seconds: number) => void;
  onCommentCreated?: (comment: HomeComment) => void;
};

export function MomentWaveform({
  track,
  position,
  duration,
  isPlaying = false,
  momentsEnabled = true,
  compact = false,
  style,
  onSeek,
  onCommentCreated,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [hasRealWaveform, setHasRealWaveform] = useState(false);
  const [selectedSecond, setSelectedSecond] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reactionBusy, setReactionBusy] = useState<MomentReactionType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const trackId = track._id;
  const safeDuration = Math.max(1, duration || track.duration || 0);
  const selectedMoment = Math.max(0, Math.min(safeDuration, selectedSecond ?? position ?? 0));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void loadTrackMoments(trackId, momentsEnabled)
      .then((result) => {
        if (mounted) setHasRealWaveform(Boolean(result.peaks?.length));
      })
      .catch(() => {
        if (mounted) setHasRealWaveform(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [momentsEnabled, refreshKey, trackId]);

  useEffect(() => {
    setSelectedSecond(null);
    setComposerOpen(false);
    setCommentText('');
    setMessage(null);
  }, [trackId]);

  const refreshMoments = () => {
    invalidateTrackMoments(trackId);
    setRefreshKey((value) => value + 1);
  };

  const seek = (seconds: number) => {
    const next = Math.max(0, Math.min(safeDuration, seconds));
    setSelectedSecond(next);
    onSeek(next);
  };

  const openComposer = (seconds: number) => {
    const next = Math.max(0, Math.min(safeDuration, seconds));
    setSelectedSecond(next);
    setComposerOpen(true);
    void Haptics.selectionAsync().catch(() => {});
  };

  const submitComment = async () => {
    const value = commentText.trim();
    if (!value || submittingComment || !momentsEnabled) return;
    setSubmittingComment(true);
    setMessage(null);
    try {
      const comment = await createComment('track', trackId, value, { timestampSeconds: selectedMoment });
      setCommentText('');
      setComposerOpen(false);
      setSelectedSecond(comment.timestampSeconds ?? selectedMoment);
      refreshMoments();
      onCommentCreated?.(comment);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error && /auth|autor|connect/i.test(error.message)
        ? 'Connecte-toi pour commenter ce moment.'
        : 'Impossible de publier ce commentaire.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const addReaction = async (reactionType: MomentReactionType) => {
    if (reactionBusy || !momentsEnabled) return;
    setReactionBusy(reactionType);
    setMessage(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await addMomentReaction(trackId, reactionType, selectedMoment);
      refreshMoments();
    } catch (error) {
      setMessage(error instanceof Error && /auth|autor|connect/i.test(error.message)
        ? 'Connecte-toi pour réagir à ce moment.'
        : 'Réaction impossible pour le moment.');
    } finally {
      setReactionBusy(null);
    }
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{hasRealWaveform ? 'WAVEFORM RÉELLE' : 'TIMELINE DE LECTURE'}</Text>
          <Text style={styles.title}>Moments précis</Text>
        </View>
        <View style={[styles.status, isPlaying && styles.statusPlaying]}>
          {loading ? <ActivityIndicator size="small" color={colors.white} /> : <View style={[styles.statusDot, isPlaying && styles.statusDotPlaying]} />}
          <Text style={styles.statusText}>{fmtTime(selectedMoment)}</Text>
        </View>
      </View>

      <WaveformSeekBar
        trackId={trackId}
        position={position}
        duration={safeDuration}
        onSeek={seek}
        showMoments={momentsEnabled}
        height={compact ? 54 : 64}
        barCount={compact ? 76 : 92}
        immersive
        onCreateMoment={momentsEnabled ? openComposer : undefined}
        refreshKey={refreshKey}
        style={styles.waveform}
      />

      {momentsEnabled ? (
        <View style={styles.tools}>
          <View style={styles.toolHeader}>
            <View>
              <Text style={styles.toolTitle}>Réagir à {fmtTime(selectedMoment)}</Text>
              <Text style={styles.toolSubtitle}>Les réactions proches sont regroupées automatiquement.</Text>
            </View>
            <MotionPressable onPress={() => setComposerOpen((value) => !value)} style={styles.commentButton} scaleTo={0.94}>
              <Ionicons name="create-outline" size={14} color={colors.white} />
            </MotionPressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionRail}>
            {MOMENT_REACTIONS.map((reaction) => (
              <MotionPressable
                key={reaction.type}
                accessibilityLabel={reaction.label}
                disabled={Boolean(reactionBusy)}
                onPress={() => void addReaction(reaction.type)}
                style={[styles.reactionChip, { borderColor: `${reaction.color}55` }]}
                scaleTo={0.94}
              >
                {reactionBusy === reaction.type ? <ActivityIndicator size="small" color={reaction.color} /> : <Ionicons name={reaction.icon} size={14} color={reaction.color} />}
                <Text style={styles.reactionText}>{reaction.shortLabel}</Text>
              </MotionPressable>
            ))}
          </ScrollView>

          {composerOpen ? (
            <Reveal distance={6} duration={260} style={styles.composer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={`Ce moment à ${fmtTime(selectedMoment)}...`}
                placeholderTextColor="rgba(17,17,17,0.38)"
                multiline
                style={styles.input}
              />
              <MotionPressable
                accessibilityLabel="Publier le commentaire"
                disabled={!commentText.trim() || submittingComment}
                onPress={() => void submitComment()}
                style={styles.sendButton}
                scaleTo={0.9}
              >
                {submittingComment ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={16} color={colors.white} />}
              </MotionPressable>
            </Reveal>
          ) : null}
        </View>
      ) : (
        <View style={styles.disabledBox}>
          <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.48)" />
          <Text style={styles.disabledText}>Commentaires horodatés et réactions indisponibles sur cette source.</Text>
        </View>
      )}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', backgroundColor: colors.black, padding: spacing.md, shadowColor: colors.black, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  cardCompact: { padding: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '900' },
  title: { marginTop: 3, color: colors.white, fontSize: 16, fontWeight: '900' },
  status: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 7, paddingHorizontal: 9, backgroundColor: 'rgba(255,255,255,0.08)' },
  statusPlaying: { backgroundColor: 'rgba(74,158,170,0.18)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.34)' },
  statusDotPlaying: { backgroundColor: colors.cyan },
  statusText: { color: 'rgba(255,255,255,0.76)', fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
  waveform: { marginTop: spacing.md },
  tools: { marginTop: spacing.md, gap: spacing.sm },
  toolHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  toolTitle: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '900' },
  toolSubtitle: { marginTop: 3, maxWidth: 260, color: 'rgba(255,255,255,0.42)', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  commentButton: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  reactionRail: { gap: 7, paddingRight: spacing.md },
  reactionChip: { minHeight: 36, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 9 },
  reactionText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, minHeight: 48, maxHeight: 92, borderRadius: 8, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 13, fontWeight: '700' },
  sendButton: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  disabledBox: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', padding: spacing.sm },
  disabledText: { flex: 1, color: 'rgba(255,255,255,0.48)', fontSize: 10, lineHeight: 15, fontWeight: '800' },
  message: { marginTop: spacing.sm, color: '#F3A39C', fontSize: 11, fontWeight: '800' },
});

export default MomentWaveform;
