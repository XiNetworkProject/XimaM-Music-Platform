import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { ClipPath, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { getMomentReactions, getTimestampedComments, getTrackWaveform } from '@/api/client';
import type { HomeComment, MomentReaction, MomentReactionType } from '@/api/types';
import { MOMENT_REACTIONS } from '@/constants/momentReactions';
import { fmtTime } from './helpers';
import { InteractiveSeekBar } from './InteractiveSeekBar';

// Les peaks viennent exclusivement du cache serveur track_waveforms. Si le
// morceau n'en possede pas encore, on affiche une barre de progression sobre :
// aucune waveform decorative n'est presentee comme une donnee audio reelle.
export type TrackMoments = {
  peaks: number[] | null;
  duration: number;
  comments: HomeComment[];
  reactions: MomentReaction[];
};

type MomentCluster = {
  id: string;
  timestampSeconds: number;
  comments: HomeComment[];
  reactions: MomentReaction[];
  byType: Partial<Record<MomentReactionType, number>>;
  topType?: MomentReactionType;
};

const momentsCache = new Map<string, TrackMoments>();
const momentsInFlight = new Map<string, Promise<TrackMoments>>();
const MAX_VISIBLE_MOMENTS = 34;
const DRAG_THRESHOLD = 5;

export function loadTrackMoments(trackId: string, withMoments: boolean): Promise<TrackMoments> {
  const cached = momentsCache.get(trackId);
  if (cached) return Promise.resolve(cached);
  const inFlight = momentsInFlight.get(trackId);
  if (inFlight) return inFlight;

  const promise = Promise.all([
    getTrackWaveform(trackId).catch(() => null),
    withMoments ? getTimestampedComments(trackId).catch(() => []) : Promise.resolve([]),
    withMoments ? getMomentReactions(trackId).catch(() => []) : Promise.resolve([]),
  ])
    .then(([waveform, comments, reactions]) => {
      const result: TrackMoments = {
        peaks: waveform?.peaks?.length ? waveform.peaks : null,
        duration: Number(waveform?.duration || 0),
        comments,
        reactions,
      };
      momentsCache.set(trackId, result);
      momentsInFlight.delete(trackId);
      return result;
    })
    .catch(() => {
      momentsInFlight.delete(trackId);
      return { peaks: null, duration: 0, comments: [], reactions: [] };
    });

  momentsInFlight.set(trackId, promise);
  return promise;
}

export function invalidateTrackMoments(trackId: string) {
  momentsCache.delete(trackId);
}

function samplePeaks(peaks: number[], targetCount: number) {
  if (peaks.length <= targetCount) return peaks;
  const bucket = peaks.length / targetCount;
  return Array.from({ length: targetCount }, (_, index) => {
    const start = Math.floor(index * bucket);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucket));
    return Math.max(...peaks.slice(start, end));
  });
}

function topReaction(byType: Partial<Record<MomentReactionType, number>>) {
  return Object.entries(byType).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] as MomentReactionType | undefined;
}

function clusterMoments(comments: HomeComment[], reactions: MomentReaction[], windowSeconds: number): MomentCluster[] {
  const events = [
    ...comments.map((comment) => ({ kind: 'comment' as const, timestamp: Number(comment.timestampSeconds || 0), comment })),
    ...reactions.map((reaction) => ({ kind: 'reaction' as const, timestamp: reaction.timestampSeconds, reaction })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const clusters: MomentCluster[] = [];
  for (const event of events) {
    const last = clusters[clusters.length - 1];
    if (!last || event.timestamp - last.timestampSeconds > windowSeconds) {
      clusters.push({
        id: `moment-${event.timestamp}-${clusters.length}`,
        timestampSeconds: event.timestamp,
        comments: event.kind === 'comment' ? [event.comment] : [],
        reactions: event.kind === 'reaction' ? [event.reaction] : [],
        byType: event.kind === 'reaction' ? { [event.reaction.reactionType]: 1 } : {},
        topType: event.kind === 'reaction' ? event.reaction.reactionType : undefined,
      });
      continue;
    }

    if (event.kind === 'comment') last.comments.push(event.comment);
    else {
      last.reactions.push(event.reaction);
      last.byType[event.reaction.reactionType] = (last.byType[event.reaction.reactionType] || 0) + 1;
      last.topType = topReaction(last.byType);
    }
    const allTimestamps = [
      ...last.comments.map((comment) => Number(comment.timestampSeconds || 0)),
      ...last.reactions.map((reaction) => reaction.timestampSeconds),
    ];
    last.timestampSeconds = allTimestamps.reduce((sum, value) => sum + value, 0) / allTimestamps.length;
  }
  return clusters;
}

function fitMomentClusters(comments: HomeComment[], reactions: MomentReaction[], initialWindow: number) {
  let windowSeconds = initialWindow;
  let clusters = clusterMoments(comments, reactions, windowSeconds);
  while (clusters.length > MAX_VISIBLE_MOMENTS && windowSeconds < 18) {
    windowSeconds *= 1.45;
    clusters = clusterMoments(comments, reactions, windowSeconds);
  }
  return clusters;
}

function waveformPath(peaks: number[], width: number, height: number) {
  if (!peaks.length || width <= 0 || height <= 0) return '';
  const middle = height / 2;
  const amplitude = height * 0.43;
  const points = peaks.map((peak, index) => ({
    x: peaks.length === 1 ? 0 : (index / (peaks.length - 1)) * width,
    y: middle - Math.max(0.07, Math.min(1, peak)) * amplitude,
  }));
  const lower = points.map((point) => ({ x: point.x, y: height - point.y })).reverse();

  const curvedLine = (items: Array<{ x: number; y: number }>) => {
    let result = `M ${items[0].x.toFixed(2)} ${items[0].y.toFixed(2)}`;
    for (let index = 1; index < items.length; index += 1) {
      const previous = items[index - 1];
      const current = items[index];
      const midX = (previous.x + current.x) / 2;
      const midY = (previous.y + current.y) / 2;
      result += ` Q ${previous.x.toFixed(2)} ${previous.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    }
    const last = items[items.length - 1];
    return `${result} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  };

  const upperPath = curvedLine(points);
  const lowerPath = curvedLine(lower).replace(/^M [^Q|L]+/, '');
  const lastUpper = points[points.length - 1];
  const firstLower = lower[0];
  return `${upperPath} L ${firstLower.x.toFixed(2)} ${firstLower.y.toFixed(2)} ${lowerPath} Z`;
}

function reactionMeta(type?: MomentReactionType) {
  return MOMENT_REACTIONS.find((reaction) => reaction.type === type) || MOMENT_REACTIONS[0];
}

type Props = {
  trackId: string;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  showMoments?: boolean;
  height?: number;
  showTimes?: boolean;
  barCount?: number;
  immersive?: boolean;
  onCreateMoment?: (seconds: number) => void;
  refreshKey?: string | number;
  style?: StyleProp<ViewStyle>;
};

export function WaveformSeekBar({
  trackId,
  position,
  duration,
  onSeek,
  showMoments = true,
  height = 44,
  showTimes = true,
  barCount = 56,
  immersive = false,
  onCreateMoment,
  refreshKey = 0,
  style,
}: Props) {
  const reactId = useId();
  const [width, setWidth] = useState(0);
  const [moments, setMoments] = useState<TrackMoments | null>(() => momentsCache.get(trackId) || null);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const draggingRef = useRef<number | null>(null);
  const lastHapticBucketRef = useRef(-1);

  useEffect(() => {
    let mounted = true;
    const cached = momentsCache.get(trackId);
    if (cached) {
      setMoments(cached);
      return;
    }
    setMoments(null);
    void loadTrackMoments(trackId, showMoments).then((result) => {
      if (mounted) setMoments(result);
    });
    return () => {
      mounted = false;
    };
  }, [refreshKey, showMoments, trackId]);

  useEffect(() => setActiveMarkerId(null), [trackId]);

  const safeDuration = Math.max(1, duration || moments?.duration || 0);
  const visiblePos = draggingValue ?? position;
  const progress = Math.max(0, Math.min(1, visiblePos / safeDuration));
  const sampledPeaks = useMemo(
    () => moments?.peaks ? samplePeaks(moments.peaks, Math.max(52, Math.min(104, Math.round(barCount * 1.6)))) : [],
    [barCount, moments?.peaks],
  );
  const path = useMemo(() => waveformPath(sampledPeaks, width, height), [height, sampledPeaks, width]);
  const comments = showMoments ? (moments?.comments || []).slice(0, 180) : [];
  const reactions = showMoments ? (moments?.reactions || []) : [];
  const clusterWindow = Math.min(6, Math.max(1.8, safeDuration / Math.max(32, (width || 320) / 11)));
  const clusters = useMemo(
    () => fitMomentClusters(comments, reactions, clusterWindow),
    [clusterWindow, comments, reactions],
  );
  const activeMarker = activeMarkerId ? clusters.find((cluster) => cluster.id === activeMarkerId) || null : null;
  const momentsCount = comments.length + reactions.length;
  const clipId = `wave-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const secondFromX = useCallback(
    (x: number) => width > 0 ? (Math.max(0, Math.min(width, x)) / width) * safeDuration : 0,
    [safeDuration, width],
  );

  const findNearbyMarker = useCallback((x: number) => {
    if (width <= 0 || !clusters.length) return null;
    let best: MomentCluster | null = null;
    let bestDistance = 21;
    for (const cluster of clusters) {
      const markerX = (cluster.timestampSeconds / safeDuration) * width;
      const distance = Math.abs(markerX - x);
      if (distance <= bestDistance) {
        best = cluster;
        bestDistance = distance;
      }
    }
    return best;
  }, [clusters, safeDuration, width]);

  const pulseWhileScrubbing = useCallback((seconds: number) => {
    const bucket = Math.floor(seconds / 8);
    if (bucket === lastHapticBucketRef.current) return;
    lastHapticBucketRef.current = bucket;
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const beginScrub = useCallback((x: number) => {
    const next = secondFromX(x);
    draggingRef.current = next;
    setDraggingValue(next);
    setActiveMarkerId(null);
    pulseWhileScrubbing(next);
  }, [pulseWhileScrubbing, secondFromX]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Le fil vertical reste prioritaire. La waveform ne capture que les gestes
    // clairement horizontaux, ce qui supprime l'impression de scroll bloque.
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > DRAG_THRESHOLD
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2
    ),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => beginScrub(event.nativeEvent.locationX),
    onPanResponderMove: (event) => beginScrub(event.nativeEvent.locationX),
    onPanResponderRelease: () => {
      if (draggingRef.current != null) {
        onSeek(draggingRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      draggingRef.current = null;
      lastHapticBucketRef.current = -1;
      setDraggingValue(null);
    },
    onPanResponderTerminate: () => {
      draggingRef.current = null;
      lastHapticBucketRef.current = -1;
      setDraggingValue(null);
    },
  }), [beginScrub, onSeek]);

  const handleTap = useCallback((event: GestureResponderEvent) => {
    const x = event.nativeEvent.locationX;
    const marker = findNearbyMarker(x);
    if (marker) {
      setActiveMarkerId((current) => current === marker.id ? null : marker.id);
      onSeek(marker.timestampSeconds);
    } else {
      const next = secondFromX(x);
      setActiveMarkerId(null);
      onSeek(next);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [findNearbyMarker, onSeek, secondFromX]);

  const handleLongPress = useCallback((event: GestureResponderEvent) => {
    if (!onCreateMoment) return;
    const seconds = secondFromX(event.nativeEvent.locationX);
    onCreateMoment(seconds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [onCreateMoment, secondFromX]);

  const immersiveHeader = immersive ? (
    <View style={styles.immersiveHeader}>
      <View style={styles.immersiveIdentity}>
        <View style={styles.identityIcon}><Ionicons name="pulse" size={12} color="#FFFFFF" /></View>
        <Text style={styles.identityLabel}>MOMENTS SYNAURA</Text>
        {momentsCount > 0 ? <Text style={styles.momentCount}>{momentsCount}</Text> : null}
      </View>
      {onCreateMoment ? (
        <Pressable
          accessibilityLabel={`Reagir a ${fmtTime(visiblePos)}`}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onCreateMoment(visiblePos);
          }}
          style={({ pressed }) => [styles.createMomentButton, pressed && styles.createMomentButtonPressed]}
        >
          <Ionicons name="add" size={14} color="#FFFFFF" />
          <Text style={styles.createMomentText}>Reagir</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  if (!sampledPeaks.length) {
    return (
      <View style={style}>
        {immersiveHeader}
        <InteractiveSeekBar position={position} duration={duration} onSeek={onSeek} variant="dark" />
      </View>
    );
  }

  return (
    <View style={style}>
      {immersiveHeader}
      {activeMarker ? <MarkerBubble marker={activeMarker} width={width} onClose={() => setActiveMarkerId(null)} /> : null}
      <Pressable
        {...panResponder.panHandlers}
        accessibilityLabel="Position de lecture et moments du morceau"
        delayLongPress={420}
        onPress={handleTap}
        onLongPress={onCreateMoment ? handleLongPress : undefined}
        onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        style={[styles.waveZone, immersive ? styles.waveZoneImmersive : styles.waveZoneDefault, { height }]}
      >
        {width > 0 && path ? (
          <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`${clipId}-gradient`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={immersive ? '#7357C6' : '#FFFFFF'} />
                <Stop offset="0.58" stopColor={immersive ? '#4A9EAA' : '#D7D0EA'} />
                <Stop offset="1" stopColor={immersive ? '#D96D63' : '#FFFFFF'} />
              </LinearGradient>
              <ClipPath id={`${clipId}-progress`}>
                <Rect x={0} y={0} width={Math.max(0, width * progress)} height={height} />
              </ClipPath>
            </Defs>
            <Path d={path} fill="rgba(255,255,255,0.22)" />
            <Path d={path} fill={`url(#${clipId}-gradient)`} clipPath={`url(#${clipId}-progress)`} />
          </Svg>
        ) : null}
        <View pointerEvents="none" style={styles.waveAxis} />

        {clusters.map((cluster) => {
          const left = Math.max(0, Math.min(100, (cluster.timestampSeconds / safeDuration) * 100));
          const total = cluster.comments.length + cluster.reactions.length;
          const hasBoth = cluster.comments.length > 0 && cluster.reactions.length > 0;
          const meta = reactionMeta(cluster.topType);
          const backgroundColor = hasBoth ? '#7357C6' : cluster.comments.length ? '#4A9EAA' : meta.color;
          const icon = hasBoth ? 'pulse' : cluster.comments.length ? 'chatbubble' : meta.icon;
          return (
            <View
              key={cluster.id}
              pointerEvents="none"
              style={[
                styles.momentMarker,
                { left: `${left}%`, backgroundColor },
                activeMarkerId === cluster.id && styles.markerActive,
              ]}
            >
              <Ionicons name={icon} size={8} color="#FFFFFF" />
              {total > 1 ? <Text style={styles.markerCount}>{total > 99 ? '99+' : total}</Text> : null}
            </View>
          );
        })}

        {draggingValue != null ? (
          <View pointerEvents="none" style={[styles.scrubBubble, { left: Math.max(0, Math.min(width - 58, progress * width - 29)) }]}>
            <Text style={styles.scrubBubbleText}>{fmtTime(draggingValue)}</Text>
          </View>
        ) : null}
        <View pointerEvents="none" style={[styles.playhead, !immersive && styles.playheadCompact, { left: `${progress * 100}%` }]}>
          {immersive ? <View style={styles.playheadCap} /> : null}
        </View>
      </Pressable>

      {showTimes ? (
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmtTime(visiblePos)}</Text>
          <Text style={styles.timeText}>{immersive ? `-${fmtTime(Math.max(0, safeDuration - visiblePos))}` : fmtTime(safeDuration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MarkerBubble({ marker, width, onClose }: { marker: MomentCluster; width: number; onClose: () => void }) {
  const latestComment = marker.comments.at(-1);
  const total = marker.comments.length + marker.reactions.length;
  const meta = reactionMeta(marker.topType);
  const reactionBreakdown = Object.entries(marker.byType)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 3)
    .map(([type, count]) => `${reactionMeta(type as MomentReactionType).shortLabel} x${count}`)
    .join(' · ');

  return (
    <View style={[styles.bubbleCard, { maxWidth: Math.max(210, width - 12) }]}>
      <View style={[styles.bubbleAvatar, !latestComment && { backgroundColor: meta.color }]}>
        {latestComment?.user.avatar ? (
          <Image source={{ uri: latestComment.user.avatar }} style={StyleSheet.absoluteFillObject} />
        ) : latestComment ? (
          <Text style={styles.bubbleAvatarText}>{(latestComment.user.name || latestComment.user.username || '?').slice(0, 1).toUpperCase()}</Text>
        ) : (
          <Ionicons name={meta.icon} size={15} color="#FFFFFF" />
        )}
      </View>
      <View style={styles.bubbleCopy}>
        <Text style={styles.bubbleMeta} numberOfLines={1}>
          {fmtTime(marker.timestampSeconds)} · {total} moment{total > 1 ? 's' : ''}
        </Text>
        {latestComment ? <Text style={styles.bubbleText} numberOfLines={2}>{latestComment.content}</Text> : null}
        {reactionBreakdown ? <Text style={styles.bubbleReaction} numberOfLines={1}>{reactionBreakdown}</Text> : null}
      </View>
      <Pressable accessibilityLabel="Fermer le moment" onPress={onClose} hitSlop={8} style={styles.bubbleClose}>
        <Ionicons name="close" size={14} color="rgba(255,255,255,0.62)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  waveZone: { justifyContent: 'center', overflow: 'visible' },
  waveZoneImmersive: {
    borderRadius: 10,
    backgroundColor: 'rgba(17,17,17,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  waveZoneDefault: {
    borderRadius: 8,
    backgroundColor: 'rgba(17,17,17,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  immersiveHeader: {
    minHeight: 32,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  immersiveIdentity: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  identityIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7357C6' },
  identityLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 9, fontWeight: '900' },
  momentCount: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 7, textAlign: 'center', textAlignVertical: 'center', color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.12)', fontSize: 9, fontWeight: '900' },
  createMomentButton: { minHeight: 30, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(115,87,198,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  createMomentButtonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  createMomentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  waveAxis: { position: 'absolute', left: 0, right: 0, top: '50%', height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.1)' },
  momentMarker: { position: 'absolute', top: -5, minWidth: 18, height: 18, marginLeft: -9, paddingHorizontal: 4, borderRadius: 6, flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF', shadowColor: '#111111', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  markerActive: { transform: [{ scale: 1.28 }] },
  markerCount: { color: '#FFFFFF', fontSize: 7, fontWeight: '900', fontVariant: ['tabular-nums'] },
  playhead: { position: 'absolute', top: -3, bottom: -3, width: 2, marginLeft: -1, borderRadius: 2, backgroundColor: '#FFFFFF', shadowColor: '#111111', shadowOpacity: 0.35, shadowRadius: 4, elevation: 4 },
  playheadCompact: { top: 1, bottom: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
  playheadCap: { position: 'absolute', top: -2, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  scrubBubble: { position: 'absolute', top: -32, width: 58, paddingVertical: 5, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(17,17,17,0.9)' },
  scrubBubbleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  bubbleCard: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, marginBottom: 7, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(17,17,17,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  bubbleAvatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  bubbleCopy: { flex: 1, minWidth: 0 },
  bubbleMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  bubbleText: { marginTop: 2, color: '#FFFFFF', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  bubbleReaction: { marginTop: 2, color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '800' },
  bubbleClose: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  timeRow: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: 'rgba(255,255,255,0.56)', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default WaveformSeekBar;
