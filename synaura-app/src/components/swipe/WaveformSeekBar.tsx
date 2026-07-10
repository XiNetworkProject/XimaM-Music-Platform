import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Image, PanResponder, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getMomentReactions, getTimestampedComments, getTrackWaveform } from '@/api/client';
import type { HomeComment, MomentReaction, MomentReactionCluster, MomentReactionType } from '@/api/types';
import { MOMENT_REACTIONS } from '@/components/mobile/MomentWaveform';
import { fmtTime } from './helpers';
import { InteractiveSeekBar } from './InteractiveSeekBar';

// Barre de lecture waveform partagée (Scroll + lecteur plein écran) : vraies
// peaks issues du cache serveur track_waveforms (calculées côté web via Web
// Audio API — impossible à décoder côté React Native). Tant qu'aucune vraie
// waveform n'existe pour le morceau, on retombe honnêtement sur la barre de
// progression classique : jamais de barres inventées présentées comme le son.

type TrackMoments = {
  peaks: number[] | null;
  duration: number;
  comments: HomeComment[];
  reactions: MomentReaction[];
};

// Cache module-level : le Scroll monte/démonte les slides en permanence, on ne
// re-télécharge pas les peaks/marqueurs d'un morceau déjà vus dans la session.
const momentsCache = new Map<string, TrackMoments>();
const momentsInFlight = new Map<string, Promise<TrackMoments>>();

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
      const empty: TrackMoments = { peaks: null, duration: 0, comments: [], reactions: [] };
      return empty;
    });

  momentsInFlight.set(trackId, promise);
  return promise;
}

/** Invalide le cache d'un morceau (après publication d'un commentaire/réaction). */
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

const CLUSTER_WINDOW_SECONDS = 4;

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
    clusters.push({ id: `cluster-${reaction.id}`, timestampSeconds: reaction.timestampSeconds, total: 1, topType: reaction.reactionType, byType: { [reaction.reactionType]: 1 } });
  });
  return clusters;
}

function reactionMeta(type: MomentReactionType) {
  return MOMENT_REACTIONS.find((reaction) => reaction.type === type) || MOMENT_REACTIONS[0];
}

type Marker =
  | { kind: 'comment'; id: string; timestampSeconds: number; comment: HomeComment }
  | { kind: 'cluster'; id: string; timestampSeconds: number; cluster: MomentReactionCluster };

// Rayon de détection tactile autour d'un marqueur (bien plus large que le
// point visuel lui-même, pour rester utilisable au doigt).
const MARKER_HIT_RADIUS = 18;
const DRAG_THRESHOLD = 6;

type Props = {
  trackId: string;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** Affiche les marqueurs commentaires/réactions horodatés, cliquables. */
  showMoments?: boolean;
  /** Hauteur de la zone waveform (hors ligne des temps). */
  height?: number;
  showTimes?: boolean;
  barCount?: number;
  /** Experience enrichie du lecteur plein ecran. */
  immersive?: boolean;
  /** Ouvre la creation d'un moment a la position courante. */
  onCreateMoment?: (seconds: number) => void;
  style?: ViewStyle;
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
  style,
}: Props) {
  const [width, setWidth] = useState(0);
  const [moments, setMoments] = useState<TrackMoments | null>(() => momentsCache.get(trackId) || null);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const draggingRef = useRef<number | null>(null);
  const pressedMarkerRef = useRef<Marker | null>(null);
  const pressStartXRef = useRef(0);
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
  }, [showMoments, trackId]);

  useEffect(() => {
    setActiveMarkerId(null);
  }, [trackId]);

  const safeDuration = Math.max(1, duration || moments?.duration || 0);
  const visiblePos = draggingValue ?? position;
  const progress = Math.max(0, Math.min(1, visiblePos / safeDuration));

  const bars = useMemo(() => (moments?.peaks ? samplePeaks(moments.peaks, barCount) : []), [barCount, moments?.peaks]);
  const comments = showMoments ? (moments?.comments || []).slice(0, 40) : [];
  const clusters = useMemo(() => (showMoments ? clusterReactions(moments?.reactions || []).slice(0, 40) : []), [showMoments, moments?.reactions]);

  const markers = useMemo<Marker[]>(() => [
    ...comments.map((comment): Marker => ({ kind: 'comment', id: `c-${comment.id}`, timestampSeconds: Number(comment.timestampSeconds || 0), comment })),
    ...clusters.map((cluster): Marker => ({ kind: 'cluster', id: cluster.id, timestampSeconds: cluster.timestampSeconds, cluster })),
  ], [comments, clusters]);

  const activeMarker = activeMarkerId ? markers.find((m) => m.id === activeMarkerId) || null : null;
  const momentsCount = comments.length + (moments?.reactions.length || 0);

  const findNearbyMarker = useCallback((x: number): Marker | null => {
    if (width <= 0 || !markers.length) return null;
    let best: Marker | null = null;
    let bestDist = MARKER_HIT_RADIUS;
    for (const marker of markers) {
      const markerX = Math.max(0, Math.min(width, (marker.timestampSeconds / safeDuration) * width));
      const dist = Math.abs(markerX - x);
      if (dist <= bestDist) {
        best = marker;
        bestDist = dist;
      }
    }
    return best;
  }, [markers, safeDuration, width]);

  const secondFromX = useCallback((x: number) => (width > 0 ? (Math.max(0, Math.min(width, x)) / width) * safeDuration : 0), [safeDuration, width]);

  const pulseWhileScrubbing = useCallback((seconds: number) => {
    const bucket = Math.floor(seconds / 8);
    if (bucket === lastHapticBucketRef.current) return;
    lastHapticBucketRef.current = bucket;
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      const x = event.nativeEvent.locationX;
      pressStartXRef.current = x;
      const marker = findNearbyMarker(x);
      if (marker) {
        // Attente : ne démarre le drag que si le doigt bouge vraiment (sinon
        // c'est un tap sur le marqueur, pas un seek).
        pressedMarkerRef.current = marker;
        return;
      }
      pressedMarkerRef.current = null;
      const next = secondFromX(x);
      draggingRef.current = next;
      setDraggingValue(next);
      setActiveMarkerId(null);
      pulseWhileScrubbing(next);
    },
    onPanResponderMove: (event: GestureResponderEvent) => {
      const x = event.nativeEvent.locationX;
      if (pressedMarkerRef.current) {
        if (Math.abs(x - pressStartXRef.current) < DRAG_THRESHOLD) return;
        pressedMarkerRef.current = null;
      }
      const next = secondFromX(x);
      draggingRef.current = next;
      setDraggingValue(next);
      pulseWhileScrubbing(next);
    },
    onPanResponderRelease: () => {
      if (pressedMarkerRef.current) {
        const marker = pressedMarkerRef.current;
        pressedMarkerRef.current = null;
        setActiveMarkerId((current) => (current === marker.id ? null : marker.id));
        onSeek(marker.timestampSeconds);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
      if (draggingRef.current != null) {
        onSeek(draggingRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      draggingRef.current = null;
      lastHapticBucketRef.current = -1;
      setDraggingValue(null);
    },
    onPanResponderTerminate: () => {
      pressedMarkerRef.current = null;
      draggingRef.current = null;
      lastHapticBucketRef.current = -1;
      setDraggingValue(null);
    },
  }), [findNearbyMarker, onSeek, pulseWhileScrubbing, secondFromX]);

  const immersiveHeader = immersive ? (
    <View style={styles.immersiveHeader}>
      <View style={styles.immersiveIdentity}>
        <View style={styles.identityIcon}>
          <Ionicons name="pulse" size={12} color="#FFFAF2" />
        </View>
        <Text style={styles.identityLabel}>SYNAURA MOMENTS</Text>
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
          <Ionicons name="add" size={14} color="#FFFAF2" />
          <Text style={styles.createMomentText}>Reagir</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  // Pas encore de vraie waveform en cache pour ce morceau : barre classique,
  // mêmes gestes, zéro donnée inventée.
  if (!bars.length) {
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
      {activeMarker ? (
        <MarkerBubble marker={activeMarker} width={width} onClose={() => setActiveMarkerId(null)} />
      ) : null}

      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        style={[styles.waveZone, immersive && styles.waveZoneImmersive, { height }]}
      >
        {immersive ? <View pointerEvents="none" style={styles.waveAxis} /> : null}
        <View style={styles.bars} pointerEvents="none">
          {bars.map((peak, index) => {
            const filled = index / Math.max(1, bars.length - 1) <= progress;
            return (
              <View key={index} style={[styles.barSlot]}>
                {filled ? (
                  <LinearGradient
                    colors={['#7357C6', '#4A9EAA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.bar, { height: `${Math.max(10, Math.round(peak * 100))}%` }]}
                  />
                ) : (
                  <View style={[styles.bar, styles.barDim, { height: `${Math.max(10, Math.round(peak * 100))}%` }]} />
                )}
              </View>
            );
          })}
        </View>

        {comments.map((comment) => {
          const ts = Number(comment.timestampSeconds || 0);
          const left = Math.max(0, Math.min(100, (ts / safeDuration) * 100));
          const id = `c-${comment.id}`;
          return (
            <View key={id} pointerEvents="none" style={[styles.commentMarker, { left: `${left}%` }, activeMarkerId === id && styles.markerActive]}>
              <Ionicons name="chatbubble" size={8} color="#FFFAF2" />
            </View>
          );
        })}
        {clusters.map((cluster) => {
          const left = Math.max(0, Math.min(100, (cluster.timestampSeconds / safeDuration) * 100));
          const meta = reactionMeta(cluster.topType);
          return (
            <View
              key={cluster.id}
              pointerEvents="none"
              style={[styles.reactionMarker, { left: `${left}%`, backgroundColor: meta.color }, activeMarkerId === cluster.id && styles.markerActive]}
            >
              <Ionicons name={meta.icon} size={8} color="#FFFAF2" />
            </View>
          );
        })}

        {draggingValue != null && !pressedMarkerRef.current ? (
          <View
            pointerEvents="none"
            style={[styles.bubble, { left: Math.max(0, Math.min(width - 56, progress * width - 28)) }]}
          >
            <Text style={styles.bubbleText}>{fmtTime(draggingValue)}</Text>
          </View>
        ) : null}

        {immersive ? (
          <View pointerEvents="none" style={[styles.playhead, { left: `${progress * 100}%` }]}>
            <View style={styles.playheadCap} />
          </View>
        ) : null}
      </View>

      {showTimes ? (
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmtTime(visiblePos)}</Text>
          <Text style={styles.timeText}>{immersive ? `-${fmtTime(Math.max(0, safeDuration - visiblePos))}` : fmtTime(safeDuration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MarkerBubble({ marker, width, onClose }: { marker: Marker; width: number; onClose: () => void }) {
  if (marker.kind === 'comment') {
    const { comment } = marker;
    return (
      <View style={[styles.bubbleCard, { maxWidth: Math.max(200, width - 16) }]}>
        <View style={styles.bubbleAvatar}>
          {comment.user.avatar ? (
            <Image source={{ uri: comment.user.avatar }} style={StyleSheet.absoluteFillObject} />
          ) : (
            <Text style={styles.bubbleAvatarText}>{(comment.user.name || comment.user.username || '?').slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.bubbleMeta} numberOfLines={1}>
            {comment.user.name} · {fmtTime(Number(comment.timestampSeconds || 0))}
          </Text>
          <Text style={styles.bubbleText2} numberOfLines={2}>{comment.content}</Text>
        </View>
        <Text onPress={onClose} style={styles.bubbleClose}>✕</Text>
      </View>
    );
  }

  const { cluster } = marker;
  const meta = reactionMeta(cluster.topType);
  const breakdown = Object.entries(cluster.byType)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .map(([type, count]) => `${reactionMeta(type as MomentReactionType).shortLabel} ×${count}`)
    .join(' · ');

  return (
    <View style={[styles.bubbleCard, { maxWidth: Math.max(200, width - 16) }]}>
      <View style={[styles.bubbleAvatar, { backgroundColor: meta.color }]}>
        <Ionicons name={meta.icon} size={16} color="#FFFAF2" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.bubbleMeta} numberOfLines={1}>
          {fmtTime(cluster.timestampSeconds)} · {cluster.total} réaction{cluster.total > 1 ? 's' : ''}
        </Text>
        <Text style={styles.bubbleText2} numberOfLines={1}>{breakdown}</Text>
      </View>
      <Text onPress={onClose} style={styles.bubbleClose}>✕</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  waveZone: { justifyContent: 'center' },
  waveZoneImmersive: {
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,250,242,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.1)',
  },
  immersiveHeader: {
    minHeight: 32,
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  immersiveIdentity: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  identityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7357C6',
  },
  identityLabel: { color: 'rgba(255,250,242,0.82)', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  momentCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#FFFAF2',
    backgroundColor: 'rgba(255,250,242,0.13)',
    fontSize: 9,
    fontWeight: '900',
  },
  createMomentButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(115,87,198,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.2)',
  },
  createMomentButtonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  createMomentText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900' },
  waveAxis: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255,250,242,0.09)',
  },
  bars: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'center' },
  bar: { width: '100%', borderRadius: 999 },
  barDim: { backgroundColor: 'rgba(255,250,242,0.24)' },
  commentMarker: {
    position: 'absolute',
    top: 2,
    width: 15,
    height: 15,
    marginLeft: -7.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A9EAA',
    borderWidth: 1.5,
    borderColor: '#FFFAF2',
  },
  reactionMarker: {
    position: 'absolute',
    bottom: 2,
    width: 15,
    height: 15,
    marginLeft: -7.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFAF2',
  },
  markerActive: {
    transform: [{ scale: 1.35 }],
  },
  playhead: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 2,
    marginLeft: -1,
    borderRadius: 2,
    backgroundColor: '#FFFAF2',
    shadowColor: '#111111',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  playheadCap: {
    position: 'absolute',
    top: -2,
    left: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFAF2',
  },
  bubble: {
    position: 'absolute',
    top: -30,
    width: 56,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  bubbleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  bubbleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(10,8,8,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  bubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bubbleAvatarText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900' },
  bubbleMeta: { color: 'rgba(255,250,242,0.55)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  bubbleText2: { marginTop: 2, color: '#FFFAF2', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  bubbleClose: { color: 'rgba(255,250,242,0.5)', fontSize: 12, fontWeight: '900', paddingHorizontal: 2 },
  timeRow: { marginTop: 3, flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: 'rgba(255,250,242,0.55)', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default WaveformSeekBar;
