import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useClipUploads } from './ClipUploadProvider';

const SIZE = 58;
const RADIUS = 25;
const CIRCUMFERENCE = Math.PI * 2 * RADIUS;

export function ClipUploadIndicator({ top, left }: { top: number; left: number }) {
  const { activeTask, retry } = useClipUploads();
  if (!activeTask) return null;
  const failed = activeTask.status === 'failed';
  const completed = activeTask.status === 'completed';
  const progress = Math.max(0.02, Math.min(1, activeTask.progress || 0));
  const label = failed
    ? 'Réessayer'
    : completed
      ? 'Clip publié'
      : activeTask.status === 'publishing'
        ? 'Publication…'
        : `${Math.round(progress * 100)} %`;

  return (
    <View style={[styles.position, { top, left }]}>
      <Pressable
        accessibilityLabel={failed ? `Échec de l’envoi. ${activeTask.error || ''} Réessayer` : label}
        disabled={!failed}
        onPress={() => retry(activeTask.id)}
        style={styles.control}
      >
        <View style={styles.circle}>
          {activeTask.source.coverUrl ? <Image source={{ uri: activeTask.source.coverUrl }} style={styles.cover} /> : <View style={styles.cover} />}
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="rgba(255,250,242,0.25)" strokeWidth={4} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={failed ? '#D96D63' : completed ? '#4A9EAA' : '#F7F6F3'}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              rotation="-90"
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          </Svg>
          {(failed || completed) ? (
            <View style={[styles.state, failed ? styles.stateFailed : styles.stateCompleted]}>
              <Ionicons name={failed ? 'refresh' : 'checkmark'} size={18} color="#F7F6F3" />
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.label, failed && styles.labelFailed]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 18, width: 72, alignItems: 'center' },
  control: { width: 72, alignItems: 'center', gap: 4 },
  circle: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  cover: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2B2628' },
  state: { position: 'absolute', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stateFailed: { backgroundColor: 'rgba(217,109,99,0.94)' },
  stateCompleted: { backgroundColor: 'rgba(74,158,170,0.94)' },
  label: { maxWidth: 72, color: '#F7F6F3', fontSize: 9, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 4 },
  labelFailed: { color: '#FFD7D2' },
});
