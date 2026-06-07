import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fmtTime } from './helpers';

type Variant = 'dark' | 'warm';

type Props = {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  variant?: Variant;
};

const PALETTE: Record<Variant, {
  trackBg: string;
  fillStart: string;
  fillEnd: string;
  knob: string;
  knobShadow: string;
  bubbleBg: string;
  bubbleBorder: string;
  bubbleText: string;
  time: string;
}> = {
  dark: {
    trackBg: 'rgba(255,250,242,0.18)',
    fillStart: '#FFFAF2',
    fillEnd: '#A78BFA',
    knob: '#FFFAF2',
    knobShadow: '#A855F7',
    bubbleBg: 'rgba(0,0,0,0.78)',
    bubbleBorder: 'rgba(255,255,255,0.18)',
    bubbleText: '#FFFFFF',
    time: 'rgba(255,255,255,0.55)',
  },
  warm: {
    trackBg: 'rgba(23,19,19,0.12)',
    fillStart: '#7C5CFF',
    fillEnd: '#FF4B7A',
    knob: '#171313',
    knobShadow: '#7C5CFF',
    bubbleBg: '#171313',
    bubbleBorder: 'rgba(255,255,255,0.06)',
    bubbleText: '#FFFAF2',
    time: 'rgba(23,19,19,0.5)',
  },
};

export function InteractiveSeekBar({ position, duration, onSeek, variant = 'dark' }: Props) {
  const [width, setWidth] = useState(0);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const [bubbleX, setBubbleX] = useState(0);
  const palette = PALETTE[variant];

  const safeDuration = duration > 0 ? duration : 1;
  const visiblePos = draggingValue ?? position;
  const progress = Math.max(0, Math.min(1, visiblePos / safeDuration));

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => handleAt(event),
    onPanResponderMove: (event) => handleAt(event),
    onPanResponderRelease: () => {
      if (draggingValue != null) onSeek(draggingValue);
      setDraggingValue(null);
    },
    onPanResponderTerminate: () => setDraggingValue(null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [draggingValue, onSeek, width]);

  function handleAt(event: GestureResponderEvent) {
    if (width <= 0) return;
    const x = Math.max(0, Math.min(width, event.nativeEvent.locationX));
    const ratio = x / width;
    const next = ratio * safeDuration;
    setBubbleX(x);
    setDraggingValue(next);
  }

  return (
    <View>
      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        style={styles.track}
      >
        <View style={[styles.fillBack, { backgroundColor: palette.trackBg }]} pointerEvents="none" />
        <View style={[styles.fillWrap, { width: `${progress * 100}%` }]} pointerEvents="none">
          <LinearGradient
            colors={[palette.fillStart, palette.fillEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View
          style={[
            styles.knob,
            { left: `${progress * 100}%`, backgroundColor: palette.knob, shadowColor: palette.knobShadow },
          ]}
          pointerEvents="none"
        />
        {draggingValue != null ? (
          <View
            style={[
              styles.bubble,
              {
                left: Math.max(0, Math.min(width - 56, bubbleX - 28)),
                backgroundColor: palette.bubbleBg,
                borderColor: palette.bubbleBorder,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.bubbleText, { color: palette.bubbleText }]}>{fmtTime(draggingValue)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: palette.time }]}>{fmtTime(visiblePos)}</Text>
        <Text style={[styles.timeText, { color: palette.time }]}>{fmtTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 20, justifyContent: 'center' },
  fillBack: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 999 },
  fillWrap: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  knob: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    marginLeft: -6.5,
    top: 3.5,
    borderWidth: 2,
    borderColor: 'rgba(255,250,242,0.9)',
    shadowOpacity: 0.38,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  bubble: {
    position: 'absolute',
    top: -32,
    width: 56,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timeRow: { marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default InteractiveSeekBar;
