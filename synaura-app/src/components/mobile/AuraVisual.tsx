import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Video from 'react-native-video';
import type { Track } from '@/api/types';
import { getTrackCoverImage, getTrackCoverVideo, toCloudinaryVideoUrl } from '@/components/TrackCover';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

type Props = {
  track?: Track | null;
  active?: boolean;
  playing?: boolean;
};

const FALLBACK_PALETTES = [
  ['#7357C6', '#4A9EAA', '#D96D63'],
  ['#4A9EAA', '#D96D63', '#F7F6F3'],
  ['#D96D63', '#7357C6', '#4A9EAA'],
  ['#111111', '#7357C6', '#4A9EAA'],
];

function isVideoUrl(url?: string | null) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(String(url || '').trim());
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function colorsForTrack(track?: Track | null) {
  const real = (track?.dominantColors || [])
    .map((value) => String(value || '').trim())
    .filter((value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) || /^rgba?\(/i.test(value))
    .slice(0, 3);
  if (real.length >= 2) return real;
  return FALLBACK_PALETTES[hashSeed(track?._id || track?.title || 'synaura') % FALLBACK_PALETTES.length];
}

function visualSource(track?: Track | null) {
  const explicit = track?.visualUrl || null;
  if (explicit) return explicit;
  return getTrackCoverVideo(track) || getTrackCoverImage(track);
}

export function AuraVisual({ track, active = true, playing = false }: Props) {
  const { settings } = useMobileSettings();
  const motion = useRef(new Animated.Value(0)).current;
  const [videoFailed, setVideoFailed] = useState(false);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const colors = useMemo(() => colorsForTrack(track), [track]);
  const image = getTrackCoverImage(track);
  const visual = visualSource(track);
  const visualType = track?.visualType || (isVideoUrl(visual) ? 'video' : 'image');
  const fallbackVideo = toCloudinaryVideoUrl(visual);
  const video = useVideoFallback && fallbackVideo ? fallbackVideo : visual;
  const auraEnabled = track?.auraVisualEnabled !== false && settings.dynamicBackground;
  const animate = Boolean(auraEnabled && active && playing && !settings.reducedMotion);
  const showVideo = Boolean(
    auraEnabled &&
    active &&
    visual &&
    visualType === 'video' &&
    !videoFailed &&
    settings.coverVideos &&
    !settings.dataSaver &&
    !settings.reducedMotion,
  );

  useEffect(() => {
    setVideoFailed(false);
    setUseVideoFallback(false);
  }, [visual]);

  useEffect(() => {
    if (!animate) {
      motion.stopAnimation();
      Animated.timing(motion, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 5600, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 5600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animate, motion]);

  const driftA = motion.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] });
  const driftB = motion.interpolate({ inputRange: [0, 1], outputRange: [16, -14] });
  const scaleA = motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const scaleB = motion.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.96] });
  const imageScale = motion.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1.16] });

  return (
    <View pointerEvents="none" style={styles.root}>
      <LinearGradient
        colors={['#12100f', colors[0] || '#7357C6', colors[1] || '#4A9EAA', '#12100f']}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {auraEnabled && image ? (
        <Animated.Image
          source={{ uri: image }}
          blurRadius={38}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, styles.coverGlow, { transform: [{ scale: imageScale }] }]}
        />
      ) : null}
      {showVideo && video ? (
        <Video
          source={{ uri: video }}
          paused={!active || !playing}
          muted
          volume={0}
          repeat
          resizeMode="cover"
          disableFocus
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          poster={image || undefined}
          style={StyleSheet.absoluteFill}
          onError={() => {
            if (!useVideoFallback && fallbackVideo && fallbackVideo !== visual) {
              setUseVideoFallback(true);
              return;
            }
            setVideoFailed(true);
          }}
        />
      ) : null}
      <Animated.View style={[styles.colorWash, { opacity: 0.28, transform: [{ translateX: driftA }, { scale: scaleA }] }]}>
        <LinearGradient
          colors={[colors[0] || '#7357C6', 'rgba(18,16,15,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View style={[styles.colorWash, { opacity: 0.22, transform: [{ translateY: driftB }, { scale: scaleB }] }]}>
        <LinearGradient
          colors={['rgba(18,16,15,0)', colors[1] || '#4A9EAA', colors[2] || '#D96D63']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <LinearGradient
        colors={['rgba(18,16,15,0.34)', 'rgba(18,16,15,0.72)', 'rgba(244,239,230,0.92)', '#F4EFE6']}
        locations={[0, 0.42, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#12100f' },
  coverGlow: { opacity: 0.42 },
  colorWash: { ...StyleSheet.absoluteFillObject },
});

export default AuraVisual;
