import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getMomentReactions, getTimestampedComments, getTrackWaveform } from '@/api/client';
import type { HomeComment, MomentReaction } from '@/api/types';
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

type Props = {
  trackId: string;
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** Affiche les marqueurs commentaires/réactions horodatés (points discrets). */
  showMoments?: boolean;
  /** Hauteur de la zone waveform (hors ligne des temps). */
  height?: number;
  showTimes?: boolean;
  barCount?: number;
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
  style,
}: Props) {
  const [width, setWidth] = useState(0);
  const [moments, setMoments] = useState<TrackMoments | null>(() => momentsCache.get(trackId) || null);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);

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

  const safeDuration = Math.max(1, duration || moments?.duration || 0);
  const visiblePos = draggingValue ?? position;
  const progress = Math.max(0, Math.min(1, visiblePos / safeDuration));

  const bars = useMemo(() => (moments?.peaks ? samplePeaks(moments.peaks, barCount) : []), [barCount, moments?.peaks]);

  const secondFromEvent = useCallback((event: GestureResponderEvent) => {
    if (width <= 0) return 0;
    const x = Math.max(0, Math.min(width, event.nativeEvent.locationX));
    return (x / width) * safeDuration;
  }, [safeDuration, width]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const next = secondFromEvent(event);
      draggingRef.current = next;
      setDraggingValue(next);
    },
    onPanResponderMove: (event) => {
      const next = secondFromEvent(event);
      draggingRef.current = next;
      setDraggingValue(next);
    },
    onPanResponderRelease: () => {
      if (draggingRef.current != null) onSeek(draggingRef.current);
      draggingRef.current = null;
      setDraggingValue(null);
    },
    onPanResponderTerminate: () => {
      draggingRef.current = null;
      setDraggingValue(null);
    },
  }), [onSeek, secondFromEvent]);

  // Pas encore de vraie waveform en cache pour ce morceau : barre classique,
  // mêmes gestes, zéro donnée inventée.
  if (!bars.length) {
    return (
      <View style={style}>
        <InteractiveSeekBar position={position} duration={duration} onSeek={onSeek} variant="dark" />
      </View>
    );
  }

  const comments = showMoments ? (moments?.comments || []).slice(0, 40) : [];
  const reactions = showMoments ? (moments?.reactions || []).slice(0, 60) : [];

  return (
    <View style={style}>
      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        style={[styles.waveZone, { height }]}
      >
        <View style={styles.bars}>
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
          return <View key={`c-${comment.id}`} pointerEvents="none" style={[styles.commentDot, { left: `${left}%` }]} />;
        })}
        {reactions.map((reaction) => {
          const left = Math.max(0, Math.min(100, (reaction.timestampSeconds / safeDuration) * 100));
          return <View key={`r-${reaction.id}`} pointerEvents="none" style={[styles.reactionDot, { left: `${left}%` }]} />;
        })}

        {draggingValue != null ? (
          <View
            pointerEvents="none"
            style={[styles.bubble, { left: Math.max(0, Math.min(width - 56, progress * width - 28)) }]}
          >
            <Text style={styles.bubbleText}>{fmtTime(draggingValue)}</Text>
          </View>
        ) : null}
      </View>

      {showTimes ? (
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmtTime(visiblePos)}</Text>
          <Text style={styles.timeText}>{fmtTime(safeDuration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  waveZone: { justifyContent: 'center' },
  bars: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'center' },
  bar: { width: '100%', borderRadius: 999 },
  barDim: { backgroundColor: 'rgba(255,250,242,0.24)' },
  commentDot: {
    position: 'absolute',
    top: 0,
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: 3,
    backgroundColor: '#4A9EAA',
  },
  reactionDot: {
    position: 'absolute',
    bottom: 0,
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: 3,
    backgroundColor: '#D96D63',
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
  timeRow: { marginTop: 3, flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: 'rgba(255,250,242,0.55)', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default WaveformSeekBar;
