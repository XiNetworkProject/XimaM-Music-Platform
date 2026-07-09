import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  addMomentReaction,
  createComment,
  getMomentReactions,
  getTimestampedComments,
  getTrackWaveform,
} from '@/api/client';
import type {
  HomeComment,
  MomentReaction,
  MomentReactionCluster,
  MomentReactionType,
  Track,
} from '@/api/types';
import { fmtTime } from '@/components/swipe/helpers';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  track: Track;
  position: number;
  duration: number;
  isPlaying?: boolean;
  momentsEnabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  onSeek: (seconds: number) => void;
  onCommentCreated?: (comment: HomeComment) => void;
};

type ReactionMeta = {
  type: MomentReactionType;
  label: string;
  shortLabel: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const REACTIONS: ReactionMeta[] = [
  { type: 'drop', label: 'Drop incroyable', shortLabel: 'Drop', icon: 'flame', color: '#D96D63' },
  { type: 'emotional', label: 'Passage emotionnel', shortLabel: 'Emotion', icon: 'water', color: '#4A9EAA' },
  { type: 'mindblown', label: 'Moment fou', shortLabel: 'Fou', icon: 'sparkles', color: '#7357C6' },
  { type: 'favorite', label: 'Passage prefere', shortLabel: 'Favori', icon: 'heart', color: '#7357C6' },
  { type: 'vocals', label: 'Voix / punchline', shortLabel: 'Voix', icon: 'mic', color: '#D96D63' },
  { type: 'production', label: 'Production', shortLabel: 'Prod', icon: 'headset', color: '#4A9EAA' },
];

const CLUSTER_WINDOW_SECONDS = 4;

function reactionMeta(type: MomentReactionType) {
  return REACTIONS.find((reaction) => reaction.type === type) || REACTIONS[0];
}

function samplePeaks(peaks: number[], targetCount: number) {
  if (!peaks.length) return [];
  if (peaks.length <= targetCount) return peaks;
  const bucket = peaks.length / targetCount;
  return Array.from({ length: targetCount }, (_, index) => {
    const start = Math.floor(index * bucket);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucket));
    return Math.max(...peaks.slice(start, end));
  });
}

function clusterReactions(reactions: MomentReaction[]): MomentReactionCluster[] {
  const sorted = [...reactions].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const clusters: MomentReactionCluster[] = [];

  sorted.forEach((reaction) => {
    const last = clusters[clusters.length - 1];
    if (last && reaction.timestampSeconds - last.timestampSeconds <= CLUSTER_WINDOW_SECONDS) {
      last.total += 1;
      last.byType[reaction.reactionType] = (last.byType[reaction.reactionType] || 0) + 1;
      const top = Object.entries(last.byType).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] as MomentReactionType | undefined;
      if (top) last.topType = top;
      return;
    }

    clusters.push({
      id: `cluster-${reaction.id}`,
      timestampSeconds: reaction.timestampSeconds,
      total: 1,
      topType: reaction.reactionType,
      byType: { [reaction.reactionType]: 1 },
    });
  });

  return clusters;
}

function buildPlaceholderBars(count: number) {
  return Array.from({ length: count }, (_, index) => 0.18 + (index % 5) * 0.015);
}

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
  const [width, setWidth] = useState(0);
  const [waveform, setWaveform] = useState<{ duration: number; peaks: number[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<HomeComment[]>([]);
  const [reactions, setReactions] = useState<MomentReaction[]>([]);
  const [selectedSecond, setSelectedSecond] = useState<number | null>(null);
  const [draggingSecond, setDraggingSecond] = useState<number | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reactionBusy, setReactionBusy] = useState<MomentReactionType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const draggingRef = useRef<number | null>(null);

  const trackId = track._id;
  const safeDuration = Math.max(1, duration || waveform?.duration || track.duration || 0);
  const selectedMoment = Math.max(0, Math.min(safeDuration, draggingSecond ?? selectedSecond ?? position ?? 0));
  const progress = Math.max(0, Math.min(1, (draggingSecond ?? position ?? 0) / safeDuration));
  const barCount = compact ? 42 : 64;
  const hasRealWaveform = Boolean(waveform?.peaks?.length);
  const bars = useMemo(
    () => {
      const sampled = samplePeaks(waveform?.peaks || [], barCount);
      return sampled.length ? sampled : buildPlaceholderBars(barCount);
    },
    [barCount, waveform?.peaks],
  );
  const clusters = useMemo(() => clusterReactions(reactions), [reactions]);
  const activeComment = activeCommentId ? comments.find((comment) => comment.id === activeCommentId) || null : null;
  const activeCluster = activeClusterId ? clusters.find((cluster) => cluster.id === activeClusterId) || null : null;

  useEffect(() => {
    let mounted = true;
    setWaveform(null);
    setComments([]);
    setReactions([]);
    setMessage(null);
    setSelectedSecond(null);
    setLoading(true);

    Promise.all([
      getTrackWaveform(trackId),
      momentsEnabled ? getTimestampedComments(trackId) : Promise.resolve([]),
      momentsEnabled ? getMomentReactions(trackId) : Promise.resolve([]),
    ])
      .then(([nextWaveform, nextComments, nextReactions]) => {
        if (!mounted) return;
        setWaveform(nextWaveform);
        setComments(nextComments);
        setReactions(nextReactions);
      })
      .catch(() => {
        if (mounted) setMessage('Moments indisponibles pour le moment.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [momentsEnabled, trackId]);

  const secondFromEvent = useCallback((event: GestureResponderEvent) => {
    if (width <= 0) return 0;
    const x = Math.max(0, Math.min(width, event.nativeEvent.locationX));
    return Math.max(0, Math.min(safeDuration, (x / width) * safeDuration));
  }, [safeDuration, width]);

  const seekToMoment = useCallback((seconds: number) => {
    const next = Math.max(0, Math.min(safeDuration, seconds));
    setSelectedSecond(next);
    setActiveCommentId(null);
    setActiveClusterId(null);
    onSeek(next);
  }, [onSeek, safeDuration]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderMove: (event) => {
      const next = secondFromEvent(event);
      draggingRef.current = next;
      setDraggingSecond(next);
    },
    onPanResponderRelease: () => {
      if (draggingRef.current != null) seekToMoment(draggingRef.current);
      draggingRef.current = null;
      setDraggingSecond(null);
    },
    onPanResponderTerminate: () => {
      draggingRef.current = null;
      setDraggingSecond(null);
    },
  }), [secondFromEvent, seekToMoment]);

  const handleTimelinePress = (event: GestureResponderEvent) => {
    seekToMoment(secondFromEvent(event));
    Haptics.selectionAsync().catch(() => {});
  };

  const submitComment = async () => {
    const value = commentText.trim();
    if (!value || submittingComment || !momentsEnabled) return;
    setSubmittingComment(true);
    setMessage(null);
    try {
      const comment = await createComment('track', trackId, value, { timestampSeconds: selectedMoment });
      setComments((current) => [...current, comment].sort((a, b) => Number(a.timestampSeconds || 0) - Number(b.timestampSeconds || 0)));
      setCommentText('');
      setComposerOpen(false);
      setSelectedSecond(comment.timestampSeconds ?? selectedMoment);
      setActiveCommentId(comment.id);
      onCommentCreated?.(comment);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      const fallback = error instanceof Error && /auth|autor|connect/i.test(error.message)
        ? 'Connecte-toi pour commenter ce moment.'
        : 'Impossible de publier ce commentaire.';
      setMessage(fallback);
    } finally {
      setSubmittingComment(false);
    }
  };

  const addReaction = async (reactionType: MomentReactionType) => {
    if (reactionBusy || !momentsEnabled) return;
    const temp: MomentReaction = {
      id: `local-${reactionType}-${Date.now()}`,
      reactionType,
      timestampSeconds: Math.round(selectedMoment),
    };
    setReactionBusy(reactionType);
    setMessage(null);
    setReactions((current) => [...current, temp]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const saved = await addMomentReaction(trackId, reactionType, selectedMoment);
      setReactions((current) => current.map((reaction) => reaction.id === temp.id ? saved : reaction));
    } catch (error) {
      setReactions((current) => current.filter((reaction) => reaction.id !== temp.id));
      const fallback = error instanceof Error && /auth|autor|connect/i.test(error.message)
        ? 'Connecte-toi pour reagir a ce moment.'
        : 'Reaction impossible pour le moment.';
      setMessage(fallback);
    } finally {
      setReactionBusy(null);
    }
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>{hasRealWaveform ? 'Waveform reelle' : 'Timeline du morceau'}</Text>
          <Text numberOfLines={1} style={styles.title}>Moments precis</Text>
        </View>
        <View style={[styles.statusPill, isPlaying && styles.statusPillActive]}>
          {loading ? <ActivityIndicator size="small" color={isPlaying ? colors.paper : colors.textSecondary} /> : <Ionicons name={hasRealWaveform ? 'pulse' : 'time-outline'} size={13} color={isPlaying ? colors.paper : colors.textSecondary} />}
          <Text style={[styles.statusText, isPlaying && styles.statusTextActive]}>{fmtTime(selectedMoment)}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleTimelinePress}
        onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        style={[styles.waveform, compact && styles.waveformCompact]}
        {...panResponder.panHandlers}
      >
        <View style={styles.bars}>
          {bars.map((peak, index) => {
            const filled = index / Math.max(1, bars.length - 1) <= progress;
            return (
              <View
                key={`${index}-${peak}`}
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(8, Math.round((hasRealWaveform ? peak : 0.16) * 100))}%`,
                    backgroundColor: filled
                      ? index % 3 === 0 ? '#7357C6' : index % 3 === 1 ? '#4A9EAA' : '#D96D63'
                      : hasRealWaveform ? 'rgba(17,17,17,0.16)' : 'rgba(17,17,17,0.08)',
                  },
                ]}
              />
            );
          })}
        </View>

        {comments.slice(0, 80).map((comment) => {
          const ts = Number(comment.timestampSeconds || 0);
          const left = Math.max(0, Math.min(100, (ts / safeDuration) * 100));
          return (
            <Pressable
              key={comment.id}
              onPress={() => {
                setSelectedSecond(ts);
                setActiveCommentId(comment.id);
                setActiveClusterId(null);
                onSeek(ts);
              }}
              style={[styles.commentMarker, { left: `${left}%` }]}
            >
              <Ionicons name="chatbubble" size={9} color={colors.paper} />
            </Pressable>
          );
        })}

        {clusters.slice(0, 80).map((cluster) => {
          const meta = reactionMeta(cluster.topType);
          const left = Math.max(0, Math.min(100, (cluster.timestampSeconds / safeDuration) * 100));
          return (
            <Pressable
              key={cluster.id}
              onPress={() => {
                setSelectedSecond(cluster.timestampSeconds);
                setActiveClusterId(cluster.id);
                setActiveCommentId(null);
                onSeek(cluster.timestampSeconds);
              }}
              style={[styles.reactionMarker, { left: `${left}%`, backgroundColor: meta.color }]}
            >
              <Ionicons name={meta.icon} size={9} color={colors.paper} />
              {cluster.total > 1 ? <Text style={styles.markerCount}>{cluster.total}</Text> : null}
            </Pressable>
          );
        })}

        <View style={[styles.playhead, { left: `${progress * 100}%` }]} pointerEvents="none" />
      </Pressable>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{fmtTime(draggingSecond ?? position)}</Text>
        <Text style={styles.timeText}>{fmtTime(safeDuration)}</Text>
      </View>

      {activeComment ? (
        <View style={styles.momentBubble}>
          <Ionicons name="chatbubble-ellipses" size={15} color="#4A9EAA" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.bubbleMeta}>{fmtTime(Number(activeComment.timestampSeconds || 0))} par {activeComment.user.name}</Text>
            <Text numberOfLines={2} style={styles.bubbleText}>{activeComment.content}</Text>
          </View>
        </View>
      ) : null}

      {activeCluster ? (
        <View style={styles.momentBubble}>
          <Ionicons name={reactionMeta(activeCluster.topType).icon} size={15} color={reactionMeta(activeCluster.topType).color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.bubbleMeta}>{fmtTime(activeCluster.timestampSeconds)} · {activeCluster.total} reaction{activeCluster.total > 1 ? 's' : ''}</Text>
            <Text numberOfLines={1} style={styles.bubbleText}>
              {Object.entries(activeCluster.byType).map(([type, count]) => `${reactionMeta(type as MomentReactionType).shortLabel} x${count}`).join(' · ')}
            </Text>
          </View>
        </View>
      ) : null}

      {momentsEnabled ? (
        <View style={styles.tools}>
          <View style={styles.toolHeader}>
            <Text style={styles.toolTitle}>Reagir a {fmtTime(selectedMoment)}</Text>
            <Pressable onPress={() => setComposerOpen((value) => !value)} style={styles.commentButton}>
              <Ionicons name="create-outline" size={13} color={colors.paper} />
              <Text style={styles.commentButtonText}>Commenter</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionRail}>
            {REACTIONS.map((reaction) => (
              <Pressable
                key={reaction.type}
                disabled={Boolean(reactionBusy)}
                onPress={() => void addReaction(reaction.type)}
                style={[styles.reactionChip, { borderColor: `${reaction.color}55` }]}
              >
                {reactionBusy === reaction.type ? (
                  <ActivityIndicator size="small" color={reaction.color} />
                ) : (
                  <Ionicons name={reaction.icon} size={14} color={reaction.color} />
                )}
                <Text style={styles.reactionText}>{reaction.shortLabel}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {composerOpen ? (
            <View style={styles.composer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={`Ce moment a ${fmtTime(selectedMoment)}...`}
                placeholderTextColor="rgba(17,17,17,0.38)"
                multiline
                style={styles.input}
              />
              <Pressable
                disabled={!commentText.trim() || submittingComment}
                onPress={() => void submitComment()}
                style={[styles.sendButton, (!commentText.trim() || submittingComment) && styles.sendButtonDisabled]}
              >
                {submittingComment ? <ActivityIndicator color={colors.paper} /> : <Ionicons name="send" size={16} color={colors.paper} />}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.disabledBox}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.disabledText}>Commentaires horodates et reactions indisponibles sur cette source.</Text>
        </View>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    padding: spacing.md,
  },
  cardCompact: { padding: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { marginTop: 2, color: colors.text, fontSize: 15, fontWeight: '900' },
  statusPill: {
    minHeight: 30,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(17,17,17,0.055)',
  },
  statusPillActive: { backgroundColor: colors.black },
  statusText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statusTextActive: { color: colors.paper },
  waveform: {
    marginTop: spacing.md,
    height: 104,
    justifyContent: 'center',
  },
  waveformCompact: { height: 82 },
  bars: {
    height: '76%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bar: {
    flex: 1,
    minHeight: 4,
    borderRadius: 999,
  },
  playhead: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    width: 2,
    marginLeft: -1,
    borderRadius: 2,
    backgroundColor: colors.black,
  },
  commentMarker: {
    position: 'absolute',
    top: 4,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A9EAA',
    borderWidth: 2,
    borderColor: colors.paper,
  },
  reactionMarker: {
    position: 'absolute',
    bottom: 3,
    minWidth: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  markerCount: { color: colors.paper, fontSize: 8, fontWeight: '900' },
  timeRow: { marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: colors.textTertiary, fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
  momentBubble: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(17,17,17,0.055)',
    padding: spacing.sm,
  },
  bubbleMeta: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  bubbleText: { marginTop: 2, color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  tools: { marginTop: spacing.md, gap: spacing.sm },
  toolHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  toolTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  commentButton: {
    minHeight: 32,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.black,
  },
  commentButtonText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  reactionRail: { gap: 7, paddingRight: spacing.md },
  reactionChip: {
    minHeight: 34,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.sm,
  },
  reactionText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  sendButtonDisabled: { opacity: 0.38 },
  disabledBox: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(17,17,17,0.045)',
    padding: spacing.sm,
  },
  disabledText: { flex: 1, color: colors.textTertiary, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  message: { marginTop: spacing.sm, color: colors.danger, fontSize: 11, fontWeight: '800' },
});

export default MomentWaveform;
