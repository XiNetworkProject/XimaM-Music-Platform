import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import Video from 'react-native-video';
import type { Track } from '@/api/types';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

type Props = {
  track?: Track | null;
  source?: string | null;
  videoSource?: string | null;
  posterSource?: string | null;
  active?: boolean;
  autoPlayVideo?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
};

function firstValid(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || null;
}

export function getTrackCoverImage(track?: Track | null) {
  return firstValid(track?.coverVideoPosterUrl, track?.musicVideoPosterUrl, track?.coverUrl);
}

function inferVideoUrlFromPoster(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes('/video/upload/') || !parsed.pathname.includes('f_jpg')) return null;
    const path = parsed.pathname
      .replace('/video/upload/so_0,f_jpg/', '/video/upload/f_mp4,q_auto/')
      .replace('/video/upload/f_jpg,so_0/', '/video/upload/f_mp4,q_auto/')
      .replace(/\.(jpg|jpeg|png|webp)$/i, '.mp4');
    return `${parsed.origin}${path}${parsed.search || ''}`;
  } catch {
    return null;
  }
}

export function getTrackCoverVideo(track?: Track | null) {
  return firstValid(track?.coverVideoUrl, inferVideoUrlFromPoster(track?.coverVideoPosterUrl), inferVideoUrlFromPoster(track?.coverUrl));
}

export function TrackCover({
  track,
  source,
  videoSource,
  posterSource,
  active = true,
  autoPlayVideo = false,
  style,
  imageStyle,
  contentFit = 'cover',
}: Props) {
  const { settings } = useMobileSettings();
  const image = firstValid(posterSource, source, getTrackCoverImage(track));
  const video = useMemo(
    () => firstValid(videoSource, getTrackCoverVideo(track), inferVideoUrlFromPoster(posterSource), inferVideoUrlFromPoster(source)),
    [posterSource, source, track, videoSource],
  );
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = !!video && !videoFailed && active && autoPlayVideo && settings.coverVideos && !settings.dataSaver && !settings.reducedMotion;

  return (
    <View style={[styles.root, style]}>
      {image ? (
        <Image source={{ uri: image }} style={[StyleSheet.absoluteFill, imageStyle]} resizeMode={contentFit === 'contain' ? 'contain' : 'cover'} />
      ) : null}
      {showVideo ? (
        <Video
          source={{ uri: video }}
          paused={false}
          muted
          volume={0}
          repeat
          resizeMode={contentFit === 'contain' ? 'contain' : 'cover'}
          disableFocus
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          poster={image || undefined}
          style={StyleSheet.absoluteFill}
          onError={() => setVideoFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: 'rgba(23,19,19,0.08)',
  },
});
